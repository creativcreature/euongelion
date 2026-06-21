/**
 * Text-to-speech adapter layer for the Euangelion "Audio Edition".
 *
 * The deliverable is a FREE, on-device reader built on the browser's
 * Web Speech API (`window.speechSynthesis`). No API keys, no network,
 * no cost. The devotional is read one segment at a time so the player
 * can highlight / scrub by section.
 *
 * The `TtsAdapter` interface is intentionally minimal so a future
 * server-side / neural-voice adapter can be dropped in behind the same
 * shape WITHOUT changing the player. We do NOT ship a fake/paid adapter
 * here — only the real Web Speech implementation. If a browser does not
 * support speech synthesis, `WebSpeechTtsAdapter.isSupported()` returns
 * false and the UI must render an honest "unavailable" state.
 */

/** One readable unit — a title or an ordered passage of the devotional. */
export interface TtsSegment {
  /** Stable id for highlight/scrub mapping (e.g. "seg-3"). */
  id: string
  /** Short label shown in the player ("Scripture", "Prayer", "Day title"…). */
  label: string
  /** The actual text spoken aloud. Plain text only — no markup. */
  text: string
}

/** Events the player subscribes to. */
export type TtsEvent =
  | { type: 'start' }
  | { type: 'segmentStart'; index: number; segment: TtsSegment }
  | { type: 'segmentEnd'; index: number; segment: TtsSegment }
  | { type: 'pause' }
  | { type: 'resume' }
  | { type: 'end' }
  | { type: 'stop' }
  | { type: 'error'; message: string }

export type TtsListener = (event: TtsEvent) => void

export type TtsStatus = 'idle' | 'playing' | 'paused'

export interface TtsAdapter {
  /** True when this adapter can actually speak in the current runtime. */
  isSupported(): boolean
  /** Begin reading the given ordered segments from `startIndex`. */
  speak(segments: TtsSegment[], startIndex?: number): void
  pause(): void
  resume(): void
  stop(): void
  /** Jump to a segment by index and continue reading from there. */
  seekToSegment(index: number): void
  /** Subscribe to player events. Returns an unsubscribe function. */
  on(listener: TtsListener): () => void
  /** Current transport status. */
  getStatus(): TtsStatus
  /** Index of the segment currently being read (-1 when idle). */
  getCurrentIndex(): number
}

/**
 * Concrete adapter over the browser Web Speech API.
 *
 * Why per-segment utterances instead of one big utterance: it lets the
 * player highlight the active section, scrub forward/back a section at a
 * time, and keeps each utterance short enough to dodge the long-text
 * cutoff bug present in several browsers' speechSynthesis engines.
 */
export class WebSpeechTtsAdapter implements TtsAdapter {
  private segments: TtsSegment[] = []
  private index = -1
  private status: TtsStatus = 'idle'
  private listeners = new Set<TtsListener>()
  private rate: number
  private voice: SpeechSynthesisVoice | null = null
  /** Guards against the `onend` that fires when WE call cancel(). */
  private suppressEnd = false

  constructor(options: { rate?: number } = {}) {
    this.rate = options.rate ?? 0.96
  }

  static isSupportedInRuntime(): boolean {
    return (
      typeof window !== 'undefined' &&
      'speechSynthesis' in window &&
      typeof window.SpeechSynthesisUtterance !== 'undefined'
    )
  }

  isSupported(): boolean {
    return WebSpeechTtsAdapter.isSupportedInRuntime()
  }

  on(listener: TtsListener): () => void {
    this.listeners.add(listener)
    return () => {
      this.listeners.delete(listener)
    }
  }

  getStatus(): TtsStatus {
    return this.status
  }

  getCurrentIndex(): number {
    return this.index
  }

  setRate(rate: number): void {
    this.rate = rate
  }

  private emit(event: TtsEvent): void {
    for (const listener of this.listeners) listener(event)
  }

  /**
   * Pick the MOST NATURALISTIC English voice the runtime offers — free only
   * (Web Speech surfaces the OS / browser neural voices at no cost). Quality
   * varies wildly by platform, so we rank rather than grab-first:
   *   - "Natural"/"Neural"  → the modern neural engines (e.g. Microsoft Online
   *     Natural, Google neural) — by far the most lifelike.
   *   - "Enhanced"/"Premium" → the downloadable hi-fi OS voices (iOS/macOS).
   *   - known-good named voices (Samantha, Ava, Siri, Google US English,
   *     Microsoft Aria/Jenny…) → the good defaults shipped per platform.
   *   - en-US slightly preferred over en-GB over any English.
   *   - "compact"/eSpeak/Eloquence robotic fallbacks → penalised.
   * Voices load async, so this is re-resolved on each speak(); on the rare
   * runtime where nothing scores we fall back to any English / the first voice.
   */
  private resolveVoice(): SpeechSynthesisVoice | null {
    if (!this.isSupported()) return null
    const voices = window.speechSynthesis.getVoices()
    if (!voices.length) return null

    const score = (v: SpeechSynthesisVoice): number => {
      const name = (v.name || '').toLowerCase()
      const lang = (v.lang || '').toLowerCase()
      if (!/^en/.test(lang)) return -1 // English content → English voice
      let s = 0
      if (/natural|neural/.test(name)) s += 100
      if (/enhanced|premium/.test(name)) s += 80
      if (
        /\b(ava|samantha|siri|allison|serena|zoe|evan|nathan|joelle|nicky|tom|alex)\b/.test(
          name,
        )
      )
        s += 60
      if (/google (us|uk) english/.test(name)) s += 55
      if (
        /microsoft (aria|jenny|guy|michelle|ana|natasha|libby|sonia|ryan)/.test(
          name,
        )
      )
        s += 55
      if (/en[-_]us/.test(lang)) s += 10
      else if (/en[-_]gb/.test(lang)) s += 6
      if (/compact|eloquence|espeak|pico|robot/.test(name)) s -= 40
      return s
    }

    let best: SpeechSynthesisVoice | null = null
    let bestScore = -Infinity
    for (const v of voices) {
      const sc = score(v)
      if (sc > bestScore) {
        bestScore = sc
        best = v
      }
    }
    if (!best || bestScore < 0) {
      best = voices.find((v) => /^en/i.test(v.lang)) || voices[0] || null
    }
    return best ?? null
  }

  speak(segments: TtsSegment[], startIndex = 0): void {
    if (!this.isSupported()) {
      this.emit({
        type: 'error',
        message: 'Speech synthesis is not available in this browser.',
      })
      return
    }
    const cleaned = segments.filter((s) => s.text.trim().length > 0)
    if (cleaned.length === 0) {
      this.emit({ type: 'error', message: 'There is nothing to read aloud.' })
      return
    }

    // Reset any in-flight queue from a prior session.
    this.suppressEnd = true
    window.speechSynthesis.cancel()
    this.suppressEnd = false

    this.segments = cleaned
    this.voice = this.resolveVoice()
    const clampedStart = Math.min(Math.max(startIndex, 0), cleaned.length - 1)
    this.status = 'playing'
    this.emit({ type: 'start' })
    this.speakFrom(clampedStart)
  }

  private speakFrom(index: number): void {
    if (index < 0 || index >= this.segments.length) {
      this.finish()
      return
    }
    this.index = index
    const segment = this.segments[index]

    const utterance = new SpeechSynthesisUtterance(segment.text)
    utterance.rate = this.rate
    utterance.pitch = 1
    utterance.volume = 1
    if (this.voice) {
      utterance.voice = this.voice
      utterance.lang = this.voice.lang
    }

    utterance.onstart = () => {
      this.emit({ type: 'segmentStart', index, segment })
    }
    utterance.onend = () => {
      if (this.suppressEnd) return
      this.emit({ type: 'segmentEnd', index, segment })
      const next = index + 1
      if (next < this.segments.length && this.status === 'playing') {
        this.speakFrom(next)
      } else if (next >= this.segments.length) {
        this.finish()
      }
    }
    utterance.onerror = (event) => {
      // "interrupted"/"canceled" are expected when WE cancel; don't surface.
      const reason = (event as SpeechSynthesisErrorEvent).error
      if (reason === 'interrupted' || reason === 'canceled') return
      this.emit({
        type: 'error',
        message: 'The reader hit a snag. Try again.',
      })
    }

    window.speechSynthesis.speak(utterance)
  }

  pause(): void {
    if (!this.isSupported() || this.status !== 'playing') return
    window.speechSynthesis.pause()
    this.status = 'paused'
    this.emit({ type: 'pause' })
  }

  resume(): void {
    if (!this.isSupported() || this.status !== 'paused') return
    window.speechSynthesis.resume()
    this.status = 'playing'
    this.emit({ type: 'resume' })
  }

  stop(): void {
    if (!this.isSupported()) return
    this.suppressEnd = true
    window.speechSynthesis.cancel()
    this.suppressEnd = false
    this.status = 'idle'
    this.index = -1
    this.emit({ type: 'stop' })
  }

  seekToSegment(index: number): void {
    if (!this.isSupported() || this.segments.length === 0) return
    const clamped = Math.min(Math.max(index, 0), this.segments.length - 1)
    // Restart the queue at the target segment. cancel() then speakFrom().
    this.suppressEnd = true
    window.speechSynthesis.cancel()
    this.suppressEnd = false
    this.status = 'playing'
    this.speakFrom(clamped)
  }

  private finish(): void {
    this.status = 'idle'
    this.index = -1
    this.emit({ type: 'end' })
  }
}

/**
 * Factory — returns a real adapter, or null when the runtime can't speak.
 * Callers MUST handle null with an honest "unavailable" UI (no fake player).
 */
export function createTtsAdapter(options?: {
  rate?: number
}): WebSpeechTtsAdapter | null {
  if (!WebSpeechTtsAdapter.isSupportedInRuntime()) return null
  return new WebSpeechTtsAdapter(options)
}
