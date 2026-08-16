'use client'

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
} from 'react'
import {
  chapterAt,
  chapterBounds,
  formatTime,
  type NarrationTrack,
} from '@/lib/audio/tracks'
import NarrationChapters from '@/components/NarrationChapters'
import NarrationMiniBar from '@/components/NarrationMiniBar'
import SpeedSheet, {
  type SkipSeconds,
  type Speed,
} from '@/components/audio/SpeedSheet'
import SleepTimer, {
  type SleepMode,
  type SleepSelection,
} from '@/components/audio/SleepTimer'
import {
  ChapterNextIcon,
  ChapterPrevIcon,
  ChaptersIcon,
  ClipIcon,
  PauseIcon,
  PlayIcon,
  SkipBackIcon,
  SkipForwardIcon,
  SleepIcon,
} from '@/components/audio/TransportIcons'
import {
  fetchServerPosition,
  pushPosition,
  readLocalPosition,
  resolvePosition,
} from '@/lib/audio/listening-progress'

const SPEED_KEY = 'euangelion:narration-speed'
const SKIP_KEY = 'euangelion:narration-skip'
/** Below this, treat a stored position as "start from the top". */
const RESUME_FLOOR_S = 20
/** Within this of the end, the reader finished — do not resume there. */
const RESUME_TAIL_S = 30
/**
 * Back-a-chapter restarts the CURRENT chapter unless you are already at its
 * head. Jumping straight to the previous one would make the control useless
 * for "play that section again", which is the common case.
 */
const CHAPTER_RESTART_WINDOW_S = 3
/** Sleep fade length. Long enough to read as a fade, short enough not to drift. */
const FADE_MS = 5000
/** Device preferences never change underneath us; only this component writes them. */
const NOOP_SUBSCRIBE = () => () => {}

/** A device preference, not the reading. Losing it costs nothing. */
function readNumber(key: string, fallback: number): number {
  try {
    const raw = Number(localStorage.getItem(key))
    return Number.isFinite(raw) && raw > 0 ? raw : fallback
  } catch {
    return fallback
  }
}

export interface NarrationPlayerProps {
  slug: string
  title: string
  track: NarrationTrack
  artworkSrc?: string
  className?: string
}

/**
 * Pre-rendered narration transport.
 *
 * Unlike the Web Speech fallback this drives a real `<audio>` element, which
 * is what makes listening while working possible: the browser registers it as
 * media, so playback survives a backgrounded tab, the lock screen shows
 * transport controls, and headphone buttons work. `speechSynthesis` cannot do
 * any of that — it is not a media element, so the Media Session API has
 * nothing to attach to.
 *
 * SA-058 rebuilt the control surface on the Audible model without growing the
 * box. Word-buttons became glyphs, which bought the row space for chapter
 * stepping, a speed sheet reaching 2×, and a sleep timer. The founder's note
 * was that the footprint was already right and the transport was not.
 */
export default function NarrationPlayer({
  slug,
  title,
  track,
  artworkSrc,
  className,
}: NarrationPlayerProps) {
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const panelRef = useRef<HTMLElement | null>(null)
  const [playing, setPlaying] = useState(false)
  /**
   * The mini bar is earned, not default. It appears only after the reader has
   * actually started listening AND scrolled the panel away, so a reader who
   * never presses play never meets a media widget.
   */
  const [hasStarted, setHasStarted] = useState(false)
  const [chaptersOpen, setChaptersOpen] = useState(false)
  const [speedOpen, setSpeedOpen] = useState(false)
  const [sleepOpen, setSleepOpen] = useState(false)
  const [panelVisible, setPanelVisible] = useState(true)
  const [current, setCurrent] = useState(0)
  const [duration, setDuration] = useState(track.duration)

  /**
   * Device preferences, read without a mount effect.
   *
   * Three approaches were wrong before this one. A mount effect is a
   * cascading render (react-hooks/set-state-in-effect). A lazy `useState`
   * initialiser reads localStorage during SSR, where it does not exist, and
   * mismatches on hydration. Restoring inside `loadedmetadata` looked right —
   * it is client-side and runs before first play — but that event never fires
   * in jsdom, and in a browser it will not fire at all if the audio stalls or
   * 404s, silently dropping the reader's remembered speed.
   *
   * `useSyncExternalStore` is the pattern AudioPlayer already uses for the
   * same problem: the server snapshot is the fallback, the client snapshot is
   * the stored value, and React reconciles the two passes itself. The chosen-
   * this-session value layers on top so the control stays settable.
   */
  const storedSpeed = useSyncExternalStore(
    NOOP_SUBSCRIBE,
    () => readNumber(SPEED_KEY, 1),
    () => 1,
  )
  const storedSkip = useSyncExternalStore(
    NOOP_SUBSCRIBE,
    () => (readNumber(SKIP_KEY, 15) === 30 ? 30 : 15),
    () => 15 as const,
  )
  const [chosenSpeed, setChosenSpeed] = useState<number | null>(null)
  const [chosenSkip, setChosenSkip] = useState<SkipSeconds | null>(null)
  const speed = chosenSpeed ?? storedSpeed
  const skipSeconds: SkipSeconds = chosenSkip ?? (storedSkip as SkipSeconds)
  const [sleepMode, setSleepMode] = useState<SleepMode | null>(null)
  const [sleepEndsAt, setSleepEndsAt] = useState<number | null>(null)
  const [sleepRemaining, setSleepRemaining] = useState<number | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [resumedFrom, setResumedFrom] = useState<number | null>(null)
  /**
   * A clip in progress. Holds the moment CAPTURED AT PRESS, not read at save —
   * the reading keeps playing while the reader types, and a clip that drifted
   * to wherever they finished writing would point at the wrong line.
   */
  const [clip, setClip] = useState<{
    t: number
    chapter: string
    chapterIndex: number
  } | null>(null)
  const [clipNote, setClipNote] = useState('')
  const [clipSaving, setClipSaving] = useState(false)
  const [clipError, setClipError] = useState<string | null>(null)

  /**
   * Restore a previous position, unless the reader was at the very start or
   * had effectively finished.
   *
   * This runs on `loadedmetadata` rather than in an effect for two reasons: a
   * seek issued before the browser knows the duration is silently discarded,
   * and setting state synchronously inside an effect triggers a cascading
   * render.
   */
  const restorePosition = useCallback(
    async (audio: HTMLAudioElement) => {
      const end = Number.isFinite(audio.duration)
        ? audio.duration
        : track.duration

      // BOTH sides are read before seeking. Seeking to the local value first
      // and correcting after would yank the reader mid-sentence on every load
      // that had a newer position on another device.
      const local = readLocalPosition(slug)
      const server = await fetchServerPosition(slug)
      const saved = resolvePosition(local, server)

      if (
        saved !== null &&
        saved > RESUME_FLOOR_S &&
        saved < end - RESUME_TAIL_S
      ) {
        audio.currentTime = saved
        setCurrent(saved)
        setResumedFrom(saved)
      }
    },
    [slug, track.duration],
  )

  /** Apply a rate to the element AND remember it. */
  const applySpeed = useCallback((next: number) => {
    const audio = audioRef.current
    if (audio) {
      audio.playbackRate = next
      // Without this a 2× reading is chipmunked and unusable — the whole point
      // of the speed control. Both spellings are set: the unprefixed property
      // is standard now, the prefixed one is still what older WebKit reads.
      audio.preservesPitch = true
      ;(
        audio as HTMLAudioElement & { webkitPreservesPitch?: boolean }
      ).webkitPreservesPitch = true
    }
    setChosenSpeed(next)
    try {
      localStorage.setItem(SPEED_KEY, String(next))
    } catch {
      // device preference; losing it costs nothing
    }
  }, [])

  /**
   * Seconds of real playback since the last server write, so the account can
   * accumulate a true listening total rather than inferring one from position.
   */
  const listenedSince = useRef(0)
  const lastTick = useRef<number | null>(null)

  const flushProgress = useCallback(
    (options: { flush?: boolean; ended?: boolean } = {}) => {
      const audio = audioRef.current
      if (!audio) return
      pushPosition({
        slug,
        seconds: options.ended ? 0 : audio.currentTime,
        duration: audio.duration || track.duration,
        listenedDelta: listenedSince.current,
        ended: options.ended,
        flush: options.flush,
      })
      listenedSince.current = 0
    },
    [slug, track.duration],
  )

  // Persist while playing. The local cache is written on every call; the
  // account at most once per 30s (see pushPosition). A DB write every 5s, as
  // the old interval did, would be punishing under the Workers 10ms CPU budget.
  useEffect(() => {
    if (!playing) return
    const id = window.setInterval(() => {
      const audio = audioRef.current
      if (audio && !audio.paused) flushProgress()
    }, 5000)
    return () => window.clearInterval(id)
  }, [playing, flushProgress])

  /**
   * Save on the way out.
   *
   * `pagehide` covers tab close, navigation and the iOS back-forward cache;
   * `visibilitychange` covers a phone being locked or the app being
   * backgrounded, which on mobile is the far more common way a reading ends.
   * Both flush through `sendBeacon`, because a fetch is cancelled with the page
   * at exactly the moment the position matters most.
   */
  useEffect(() => {
    const save = () => flushProgress({ flush: true })
    const onVisibility = () => {
      if (document.visibilityState === 'hidden') save()
    }
    window.addEventListener('pagehide', save)
    document.addEventListener('visibilitychange', onVisibility)
    return () => {
      window.removeEventListener('pagehide', save)
      document.removeEventListener('visibilitychange', onVisibility)
    }
  }, [flushProgress])

  // Track whether the Audio Edition panel is on screen. The two surfaces hand
  // off to each other: when the panel is readable, the bar retires.
  useEffect(() => {
    const panel = panelRef.current
    if (!panel || typeof IntersectionObserver === 'undefined') return
    const observer = new IntersectionObserver(
      ([entry]) => setPanelVisible(entry.isIntersecting),
      // A sliver counts as present, so the bar does not flicker in and out
      // while the panel is halfway off the top of the viewport.
      { threshold: 0, rootMargin: '-64px 0px -64px 0px' },
    )
    observer.observe(panel)
    return () => observer.disconnect()
  }, [])

  // The reader-theme button is fixed to the bottom-left at z-200, so while the
  // in-page Audio Edition panel is on screen it lands directly on top of the
  // −15 control. The mini bar already solves this with `data-narration-bar`;
  // this is the same handshake for the panel. Flag only — the lift lives in
  // globals.css, next to the mini-bar rule.
  useEffect(() => {
    const root = document.documentElement
    if (panelVisible) {
      root.setAttribute('data-narration-panel', 'true')
    } else {
      root.removeAttribute('data-narration-panel')
    }
    return () => root.removeAttribute('data-narration-panel')
  }, [panelVisible])

  const returnToPanel = useCallback(() => {
    const panel = panelRef.current
    if (!panel) return
    const reduced =
      typeof window !== 'undefined' &&
      window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
    panel.scrollIntoView({
      behavior: reduced ? 'auto' : 'smooth',
      block: 'center',
    })
  }, [])

  const toggle = useCallback(() => {
    const audio = audioRef.current
    if (!audio) return
    if (audio.paused) {
      void audio.play().catch(() => {
        setError('Playback was blocked. Tap play again.')
      })
    } else {
      audio.pause()
      // Pausing is a deliberate stop, so it syncs now rather than waiting
      // up to 30s for the throttle to open.
      flushProgress({ flush: true })
    }
  }, [flushProgress])

  const skip = useCallback(
    (delta: number) => {
      const audio = audioRef.current
      if (!audio) return
      audio.currentTime = Math.min(
        Math.max(audio.currentTime + delta, 0),
        audio.duration || track.duration,
      )
      setCurrent(audio.currentTime)
    },
    [track.duration],
  )

  const seekTo = useCallback((seconds: number) => {
    const audio = audioRef.current
    if (!audio) return
    audio.currentTime = seconds
    setCurrent(seconds)
    setResumedFrom(null)
  }, [])

  const bounds = chapterBounds(track.chapters, current, duration)

  /**
   * Step a chapter. Back restarts the current one unless already at its head —
   * see CHAPTER_RESTART_WINDOW_S.
   */
  const stepChapter = useCallback(
    (direction: -1 | 1) => {
      const chapters = track.chapters ?? []
      const at = chapterBounds(chapters, current, duration)
      if (!at) return
      if (direction === -1) {
        const target =
          current - at.start > CHAPTER_RESTART_WINDOW_S
            ? at.start
            : (chapters[at.index - 1]?.t ?? 0)
        seekTo(target)
        return
      }
      const next = chapters[at.index + 1]
      if (next) seekTo(next.t)
    },
    [track.chapters, current, duration, seekTo],
  )

  /**
   * Fade out, then pause.
   *
   * A hard stop mid-sentence is the opposite of what a sleep timer on a
   * devotional is for. Volume is restored after pausing so the next play does
   * not start silent.
   */
  const fadeOutAndPause = useCallback(() => {
    const audio = audioRef.current
    if (!audio) return
    const reduced =
      typeof window !== 'undefined' &&
      window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
    if (reduced || typeof requestAnimationFrame === 'undefined') {
      audio.pause()
      return
    }
    const startVolume = audio.volume
    const startedAt = performance.now()
    const tick = () => {
      const ratio = Math.min((performance.now() - startedAt) / FADE_MS, 1)
      audio.volume = startVolume * (1 - ratio)
      if (ratio < 1) {
        requestAnimationFrame(tick)
        return
      }
      audio.pause()
      audio.volume = startVolume
    }
    requestAnimationFrame(tick)
  }, [])

  const selectSleep = useCallback((selection: SleepSelection) => {
    if (selection === 'off') {
      setSleepMode(null)
      setSleepEndsAt(null)
      setSleepRemaining(null)
      return
    }
    setSleepMode(selection)
    if (selection === 'end-of-chapter') {
      setSleepEndsAt(null)
      setSleepRemaining(null)
      return
    }
    setSleepEndsAt(Date.now() + selection * 60_000)
  }, [])

  // Countdown for the fixed-duration sleep modes.
  useEffect(() => {
    if (sleepEndsAt === null) return
    const tick = () => {
      const left = sleepEndsAt - Date.now()
      setSleepRemaining(Math.max(0, left))
      if (left <= 0) {
        fadeOutAndPause()
        setSleepMode(null)
        setSleepEndsAt(null)
        setSleepRemaining(null)
      }
    }
    tick()
    const id = window.setInterval(tick, 1000)
    return () => window.clearInterval(id)
  }, [sleepEndsAt, fadeOutAndPause])

  // End-of-chapter sleep: fires as the current chapter's boundary is crossed.
  const sleepChapterEnd = useRef<number | null>(null)
  useEffect(() => {
    if (sleepMode !== 'end-of-chapter') {
      sleepChapterEnd.current = null
      return
    }
    // Latch the boundary when the mode is set, so that seeking afterwards does
    // not silently move the goalposts.
    if (sleepChapterEnd.current === null && bounds) {
      sleepChapterEnd.current = bounds.end
    }
  }, [sleepMode, bounds])

  /**
   * Advance the clock, and fire the end-of-chapter sleep as the boundary is
   * crossed.
   *
   * Both live in the `timeupdate` handler rather than in an effect watching
   * `current`. Reacting to your own state in an effect is what
   * react-hooks/set-state-in-effect exists to catch, and it is the wrong shape
   * here anyway: crossing a boundary is an event, not a derived value.
   */
  const handleTimeUpdate = useCallback(
    (seconds: number) => {
      // Accumulate REAL elapsed listening between ticks, clamped so a seek or
      // a suspended tab cannot be counted as time spent. `timeupdate` fires
      // roughly 4x/second, so a gap larger than a couple of seconds means the
      // reader jumped or the tab slept — neither is listening.
      const previous = lastTick.current
      if (previous !== null) {
        const delta = seconds - previous
        if (delta > 0 && delta < 2) listenedSince.current += delta
      }
      lastTick.current = seconds

      setCurrent(seconds)
      const target = sleepChapterEnd.current
      if (sleepMode !== 'end-of-chapter' || target === null) return
      if (seconds >= target - 0.25) {
        fadeOutAndPause()
        setSleepMode(null)
        sleepChapterEnd.current = null
      }
    },
    [sleepMode, fadeOutAndPause],
  )

  // Media Session: lock-screen metadata and OS transport handlers. This is the
  // whole point of using a media element rather than speechSynthesis.
  useEffect(() => {
    if (typeof navigator === 'undefined' || !('mediaSession' in navigator))
      return
    const ms = navigator.mediaSession
    try {
      ms.metadata = new window.MediaMetadata({
        title,
        artist: 'Euangelion',
        album: 'Audio Edition',
        artwork: artworkSrc
          ? [
              { src: artworkSrc, sizes: '512x512', type: 'image/png' },
              { src: artworkSrc, sizes: '192x192', type: 'image/png' },
            ]
          : [],
      })
    } catch {
      // metadata is optional; transport still works without it
    }
    ms.setActionHandler('play', () => toggle())
    ms.setActionHandler('pause', () => toggle())
    ms.setActionHandler('seekbackward', () => skip(-skipSeconds))
    ms.setActionHandler('seekforward', () => skip(skipSeconds))
    ms.setActionHandler('seekto', (details) => {
      if (typeof details.seekTime === 'number') seekTo(details.seekTime)
    })
    // Chapter stepping reaches the lock screen too — on a phone in a pocket
    // this is the only way to move a section.
    try {
      ms.setActionHandler('previoustrack', () => stepChapter(-1))
      ms.setActionHandler('nexttrack', () => stepChapter(1))
    } catch {
      // some browsers reject unknown actions; harmless
    }
    return () => {
      for (const action of [
        'play',
        'pause',
        'seekbackward',
        'seekforward',
        'seekto',
        'previoustrack',
        'nexttrack',
      ] as const) {
        try {
          ms.setActionHandler(action, null)
        } catch {
          // some browsers reject unknown actions; harmless
        }
      }
    }
  }, [title, artworkSrc, toggle, skip, seekTo, stepChapter, skipSeconds])

  useEffect(() => {
    if (typeof navigator === 'undefined' || !('mediaSession' in navigator))
      return
    navigator.mediaSession.playbackState = playing ? 'playing' : 'paused'
  }, [playing])

  /**
   * Jump to a chapter: move the audio AND bring the page to the same section.
   *
   * The founder's ask was to "quickly scroll to the section I want as it
   * relates to the audio player" — so a chapter is a position in both the
   * reading and the recording, and selecting one must not leave the eye and
   * the ear in different places.
   */
  const seekToChapter = useCallback(
    (seconds: number, module: number) => {
      seekTo(seconds)
      const el = document.getElementById(`devotional-section-${module}`)
      if (!el) return
      const reduced =
        typeof window !== 'undefined' &&
        window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
      el.scrollIntoView({
        behavior: reduced ? 'auto' : 'smooth',
        block: 'start',
      })
    },
    [seekTo],
  )

  const activeChapter = chapterAt(track.chapters, current)
  const activeModule = activeChapter?.module ?? null

  /**
   * Mark the section being read.
   *
   * Keyed on the MODULE, not the clock: this runs when the reading crosses
   * into a new section — roughly once a minute — rather than on every
   * `timeupdate` tick. One query and one class toggle, no scroll listeners and
   * no observers, so it costs effectively nothing while playing.
   */
  useEffect(() => {
    if (activeModule === null || !playing) return
    const el = document.getElementById(`devotional-section-${activeModule}`)
    if (!el) return
    el.setAttribute('data-narrating', 'true')
    return () => el.removeAttribute('data-narrating')
  }, [activeModule, playing])

  const openClip = useCallback(() => {
    const at = chapterBounds(track.chapters, current, duration)
    setClip({
      t: Math.round(current),
      chapter: track.chapters?.[at?.index ?? 0]?.label ?? 'Opening',
      chapterIndex: at?.index ?? 0,
    })
    setClipNote('')
    setClipError(null)
  }, [track.chapters, current, duration])

  const saveClip = useCallback(async () => {
    if (!clip || clipSaving) return
    setClipSaving(true)
    setClipError(null)
    try {
      const response = await fetch('/api/annotations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          devotionalSlug: slug,
          annotationType: 'note',
          body: clipNote.trim() || null,
          style: {
            kind: 'clip',
            t: clip.t,
            chapter: clip.chapter,
            chapterIndex: clip.chapterIndex,
            editedAt: new Date().toISOString(),
          },
        }),
      })
      if (!response.ok) {
        // Signed out is the common case and gets its own sentence; anything
        // else is reported rather than swallowed.
        setClipError(
          response.status === 401
            ? 'Sign in to keep clips'
            : "Couldn't save that clip",
        )
        return
      }
      window.dispatchEvent(new CustomEvent('libraryUpdated'))
      setClip(null)
    } catch {
      setClipError("Couldn't save that clip")
    } finally {
      setClipSaving(false)
    }
  }, [clip, clipNote, clipSaving, slug])

  const progressPct = duration > 0 ? (current / duration) * 100 : 0
  const hasChapters = Boolean(track.chapters?.length)
  const sleepLabel =
    sleepMode === 'end-of-chapter'
      ? 'chapter'
      : sleepRemaining !== null
        ? `${Math.max(1, Math.ceil(sleepRemaining / 60_000))}m`
        : null

  /**
   * One line, one element.
   *
   * Deliberately assembled as a single string rather than nested spans: with
   * an inner span the elapsed/total pair matches a text query twice — once on
   * the span and once on its parent — which is ambiguous for a test and for a
   * screen reader reading the live region.
   */
  const metaLine = [
    `${formatTime(current)} / ${formatTime(duration)}`,
    bounds && track.chapters
      ? `${bounds.index + 1} of ${track.chapters.length}`
      : null,
    bounds ? `${formatTime(Math.max(0, bounds.end - current))} left` : null,
  ]
    .filter(Boolean)
    .join(' · ')

  return (
    <>
      <section
        ref={panelRef}
        /* Rules above and below rather than a box. A bordered card sat on the
           page as a widget; two hairlines read as a break in the article, which
           is what this actually is. */
        className={`narration-player ${className ?? ''}`}
        aria-label="Audio edition"
      >
        <audio
          ref={audioRef}
          src={track.src}
          preload="metadata"
          onPlay={() => {
            setPlaying(true)
            setHasStarted(true)
            setError(null)
          }}
          onPause={() => setPlaying(false)}
          onTimeUpdate={(e) => handleTimeUpdate(e.currentTarget.currentTime)}
          onLoadedMetadata={(e) => {
            if (Number.isFinite(e.currentTarget.duration)) {
              setDuration(e.currentTarget.duration)
            }
            // Apply the remembered rate BEFORE the first play, or the opening
            // seconds run at 1× and then jump. The VALUE comes from
            // useSyncExternalStore above, so it is already correct on first
            // render even when this event never fires.
            e.currentTarget.playbackRate = speed
            e.currentTarget.preservesPitch = true
            restorePosition(e.currentTarget)
          }}
          onEnded={() => {
            setPlaying(false)
            flushProgress({ flush: true, ended: true })
          }}
          onError={() => setError('This reading could not be loaded.')}
        />

        {/* The caption. Founder-chosen 2026-08-16 from five mocked directions:
            Spotify Audiobooks and The Atlantic independently arrived at the
            same shape — a captioned rail above a centred transport — and the
            typographic restraint comes from Waking Up. So the section names
            itself with the chapter being read, set as an italic serif caption
            rather than an uppercase system label. Where a track has no
            chapters the slot still identifies the panel. */}
        <div className="narration-inner">
          <p className="narration-caption">
            {activeChapter?.label ?? 'Audio edition'}
          </p>
          <p className="narration-meta oldstyle-nums" aria-live="polite">
            {metaLine}
          </p>

          <label className="narration-seek">
            <span className="sr-only">Seek within the reading</span>
            <input
              type="range"
              min={0}
              max={Math.max(duration, 1)}
              step={1}
              value={current}
              onChange={(e) => seekTo(Number(e.target.value))}
              aria-valuetext={`${formatTime(current)} of ${formatTime(duration)}`}
              style={{ ['--pct' as string]: `${progressPct}%` }}
            />
            {/* Chapter marks. pointer-events:none so they can never steal a drag
              from the slider underneath — the range input remains the only
              interactive element, and the keyboard/AT affordance with it. */}
            {hasChapters && (
              <span className="narration-ticks" aria-hidden="true">
                {track.chapters!.map((chapter) => (
                  <i
                    key={`${chapter.t}-${chapter.module}`}
                    style={{
                      left: `${(chapter.t / Math.max(duration, 1)) * 100}%`,
                    }}
                  />
                ))}
              </span>
            )}
          </label>

          {/* Three cells: speed alone left, transport centred, utilities right.
            The centre is `auto` and the flanks are `1fr`, so at 375px only the
            outer cells compress and the transport never wraps — which is what
            broke the previous row (SA-058 predecessor: labels split mid-word
            and the buttons overlapped). */}
          <div className="narration-row">
            <div className="narration-cell narration-cell-left">
              <button
                type="button"
                className="narration-util narration-util-speed"
                onClick={() => setSpeedOpen(true)}
                aria-haspopup="dialog"
                aria-label={`Playback speed, currently ${speed}×`}
              >
                {speed}&times;
              </button>
            </div>

            <div className="narration-transport">
              {hasChapters && (
                <button
                  type="button"
                  className="narration-step narration-step-chapter"
                  onClick={() => stepChapter(-1)}
                  aria-label="Previous chapter"
                >
                  <ChapterPrevIcon size={17} />
                </button>
              )}

              <button
                type="button"
                className="narration-step"
                onClick={() => skip(-skipSeconds)}
                aria-label={`Back ${skipSeconds} seconds`}
              >
                <SkipBackIcon size={21} seconds={skipSeconds} />
              </button>

              <button
                type="button"
                className="narration-play"
                onClick={toggle}
                aria-pressed={playing}
                /* Deliberately NOT "Pause the reading" — the mini bar owns that
                 label, and both can be mounted at once, which made
                 getByLabelText ambiguous for a screen reader as much as for a
                 test. This button sits inside <section aria-label="Audio
                 edition">, so the landmark already supplies the context the
                 wording would repeat. */
                aria-label={playing ? 'Pause' : 'Play'}
              >
                {playing ? <PauseIcon size={22} /> : <PlayIcon size={22} />}
              </button>

              <button
                type="button"
                className="narration-step"
                onClick={() => skip(skipSeconds)}
                aria-label={`Forward ${skipSeconds} seconds`}
              >
                <SkipForwardIcon size={21} seconds={skipSeconds} />
              </button>

              {hasChapters && (
                <button
                  type="button"
                  className="narration-step narration-step-chapter"
                  onClick={() => stepChapter(1)}
                  aria-label="Next chapter"
                >
                  <ChapterNextIcon size={17} />
                </button>
              )}
            </div>

            <div className="narration-cell narration-cell-right">
              <button
                type="button"
                className="narration-util"
                onClick={openClip}
                aria-label="Clip this moment"
              >
                <ClipIcon size={17} />
              </button>

              <button
                type="button"
                className={`narration-util${sleepLabel ? ' is-armed' : ''}`}
                onClick={() => setSleepOpen(true)}
                aria-haspopup="dialog"
                aria-label={
                  sleepLabel
                    ? `Sleep timer, ${sleepMode === 'end-of-chapter' ? 'end of chapter' : `${sleepLabel} remaining`}`
                    : 'Sleep timer'
                }
              >
                {sleepLabel ? (
                  <span className="narration-util-text">{sleepLabel}</span>
                ) : (
                  <SleepIcon size={17} />
                )}
              </button>

              {hasChapters && (
                <button
                  type="button"
                  className="narration-util"
                  onClick={() => setChaptersOpen(true)}
                  aria-haspopup="dialog"
                  aria-label={`Chapters — ${track.chapters!.length} sections`}
                >
                  <ChaptersIcon size={18} />
                </button>
              )}
            </div>
          </div>

          {clip && (
            <div className="narration-clip">
              <p className="narration-clip-head oldstyle-nums">
                {clip.chapter} &middot; {formatTime(clip.t)}
              </p>
              <textarea
                className="narration-clip-input"
                aria-label="Note on this moment"
                placeholder="What did you hear? (optional)"
                rows={2}
                maxLength={4000}
                value={clipNote}
                onChange={(event) => setClipNote(event.target.value)}
                autoFocus
              />
              <div className="narration-clip-actions">
                <button
                  type="button"
                  className="narration-clip-save"
                  onClick={() => void saveClip()}
                  disabled={clipSaving}
                >
                  {clipSaving ? 'Saving…' : 'Save clip'}
                </button>
                <button
                  type="button"
                  className="narration-clip-cancel"
                  onClick={() => setClip(null)}
                >
                  Cancel
                </button>
                {clipError && (
                  <span className="narration-clip-error" role="status">
                    {clipError}
                  </span>
                )}
              </div>
            </div>
          )}

          {resumedFrom !== null && !playing && (
            <p className="vw-small text-muted mt-2">
              Picking up where you left off, at {formatTime(resumedFrom)}.{' '}
              <button
                type="button"
                className="underline"
                onClick={() => seekTo(0)}
              >
                Start from the beginning
              </button>
            </p>
          )}

          {error && (
            <p
              className="vw-small mt-3"
              role="status"
              style={{ color: 'var(--color-crimson, #c4192e)' }}
            >
              {error}
            </p>
          )}
        </div>

        <style jsx>{`
          /* Waking Up's restraint: the chapter is a caption in the reading
             face, not an uppercase system label shouting above the article. */
          .narration-caption {
            margin: 0;
            text-align: center;
            font-family: var(--font-family-serif, Georgia, serif);
            font-style: italic;
            font-size: 1.02rem;
            line-height: 1.25;
            color: var(--color-text-primary, var(--color-fg));
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
          }

          .narration-meta {
            margin: 0.15rem 0 0;
            text-align: center;
            font-size: 0.68rem;
            letter-spacing: 0.02em;
            color: var(--color-text-muted, var(--color-text-secondary));
          }

          .narration-row {
            display: grid;
            grid-template-columns: 1fr auto 1fr;
            align-items: center;
            margin-top: 0.35rem;
          }

          .narration-cell {
            display: flex;
            align-items: center;
            min-width: 0;
          }
          .narration-cell-right {
            justify-content: flex-end;
          }

          .narration-transport {
            display: flex;
            align-items: center;
            gap: 0.3rem;
          }

          .narration-step,
          .narration-util,
          .narration-play {
            display: inline-flex;
            align-items: center;
            justify-content: center;
            min-width: 44px;
            min-height: 44px;
            background: transparent;
            border: 0;
            color: var(
              --color-text-secondary,
              var(--color-text-primary, var(--color-fg))
            );
            line-height: 1;
          }
          .narration-step:hover,
          .narration-util:hover {
            color: var(--color-text-primary, var(--color-fg));
          }
          .narration-step:focus-visible,
          .narration-util:focus-visible,
          .narration-play:focus-visible {
            outline: 2px solid var(--color-gold);
            outline-offset: 2px;
          }

          /* The anchor. A filled disc rather than another outlined square, so
             the eye lands on it before anything else in the row. Both halves
             set explicitly per theme — never bg-gold, which is cobalt in
             light mode (SA-047). */
          .narration-play {
            min-width: 52px;
            min-height: 52px;
            border-radius: 50%;
            background: var(--color-text-primary, var(--color-fg));
            color: var(--color-bg);
            margin-inline: 0.15rem;
          }
          .narration-play:hover {
            opacity: 0.88;
          }

          .narration-util-speed,
          .narration-util-text {
            font-size: 0.72rem;
            letter-spacing: 0.04em;
            font-variant-numeric: oldstyle-nums;
          }
          .narration-util.is-armed {
            color: var(--color-text-primary, var(--color-fg));
          }

          /* At 375px the five centre controls need every pixel, so the flanks
             give theirs up rather than the transport wrapping. Chapter steps
             are the first to go: they are reachable from the chapter sheet, the
             lock screen and the mini bar, whereas play and skip are not.
             Nothing overlaps and nothing breaks mid-word — which is exactly
             what the previous single-row layout did at this width. */
          @media (max-width: 400px) {
            .narration-transport {
              gap: 0.1rem;
            }
            .narration-step,
            .narration-util {
              min-width: 40px;
            }
          }
          /* Measured at 375px: with all eight controls the centre group is
             wider than the row, and the right cell was pushed INTO it —
             "Next chapter" overlapped "Sleep timer" by 7px. Eight controls
             need roughly 460px to sit side by side at a 44px target.
             Chapter stepping is what gives way, because it is the only pair
             reachable three other ways (the chapter sheet, the lock screen,
             and the mini bar). Spotify's phone layout drops it here too. */
          @media (max-width: 460px) {
            .narration-step-chapter {
              display: none;
            }
          }

          .narration-seek {
            display: block;
            position: relative;
            margin-top: 0.5rem;
          }
          .narration-seek input {
            width: 100%;
            height: 44px;
            -webkit-appearance: none;
            appearance: none;
            background: transparent;
            cursor: pointer;
          }
          .narration-seek input::-webkit-slider-runnable-track {
            height: 3px;
            background: linear-gradient(
              to right,
              var(--color-gold) var(--pct),
              var(--color-border) var(--pct)
            );
          }
          .narration-seek input::-moz-range-track {
            height: 3px;
            background: linear-gradient(
              to right,
              var(--color-gold) var(--pct),
              var(--color-border) var(--pct)
            );
          }
          .narration-seek input::-webkit-slider-thumb {
            -webkit-appearance: none;
            appearance: none;
            width: 13px;
            height: 13px;
            margin-top: -5px;
            border-radius: 50%;
            background: var(--color-gold);
          }
          .narration-seek input::-moz-range-thumb {
            width: 13px;
            height: 13px;
            border: 0;
            border-radius: 50%;
            background: var(--color-gold);
          }

          .narration-ticks {
            position: absolute;
            inset-inline: 0;
            top: 50%;
            height: 9px;
            transform: translateY(-50%);
            pointer-events: none;
          }
          .narration-ticks i {
            position: absolute;
            top: 0;
            width: 1px;
            height: 100%;
            background: var(--color-border-strong, var(--color-border));
            opacity: 0.9;
          }

          /* The clip panel opens IN the transport rather than as a sheet: the
             reading keeps playing, and a modal would make marking a moment
             feel like leaving it. */
          .narration-clip {
            margin-top: 0.9rem;
            padding: 0.75rem 0.85rem;
            border: 1px solid var(--color-border);
          }
          .narration-clip-head {
            margin: 0 0 0.5rem;
            font-size: 0.62rem;
            letter-spacing: 0.14em;
            text-transform: uppercase;
            color: var(--color-gold);
          }
          .narration-clip-input {
            display: block;
            width: 100%;
            padding: 0.5rem 0.6rem;
            background: transparent;
            border: 1px solid var(--color-border);
            color: var(--color-text-primary, var(--color-fg));
            font-family: var(--font-family-serif, Georgia, serif);
            font-size: 0.95rem;
            line-height: 1.5;
            resize: vertical;
          }
          .narration-clip-input:focus-visible {
            outline: 2px solid var(--color-gold);
            outline-offset: 1px;
          }
          .narration-clip-actions {
            display: flex;
            flex-wrap: wrap;
            align-items: center;
            gap: 0.5rem;
            margin-top: 0.6rem;
          }
          .narration-clip-save,
          .narration-clip-cancel {
            min-height: 44px;
            padding-inline: 0.9rem;
            font-size: 0.62rem;
            letter-spacing: 0.14em;
            text-transform: uppercase;
            border: 1px solid var(--color-border);
            background: transparent;
            color: var(--color-text-primary, var(--color-fg));
          }
          .narration-clip-save {
            border-color: var(--color-text-primary, var(--color-fg));
            background: var(--color-text-primary, var(--color-fg));
            color: var(--color-bg);
          }
          .narration-clip-error {
            font-size: 0.7rem;
            color: var(--color-crimson, #c4192e);
          }

          .narration-player {
            border-block: 1px solid var(--color-border);
            padding-block: 1rem;
          }

          /* The RULES run the full width of the stage, matching the other
             horizontal rules on the page, so the panel reads as a break in the
             article. The CONTROLS do not: measured on a 1280px desktop the
             stage is 1161px, which put the speed chip about a thousand pixels
             from the play button and stretched the rail far past the text
             column. "Speed and sleep in opposite corners" only reads as one
             object while the corners are close enough to see together, so the
             contents sit on the reading measure and centre. */
          .narration-inner {
            max-width: 42rem;
            margin-inline: auto;
          }
        `}</style>
      </section>

      {hasStarted && !panelVisible && (
        <NarrationMiniBar
          title={title}
          playing={playing}
          current={current}
          duration={duration}
          onToggle={toggle}
          onSkip={skip}
          onSeek={seekTo}
          onReturnToPanel={returnToPanel}
          skipSeconds={skipSeconds}
          chapterLabel={activeChapter?.label ?? null}
          onOpenChapters={hasChapters ? () => setChaptersOpen(true) : undefined}
        />
      )}

      {chaptersOpen && hasChapters && (
        <NarrationChapters
          title={title}
          chapters={track.chapters!}
          currentTime={current}
          onSeek={seekToChapter}
          onClose={() => setChaptersOpen(false)}
        />
      )}

      {speedOpen && (
        <SpeedSheet
          speed={speed}
          skipSeconds={skipSeconds}
          onSelectSpeed={(next: Speed) => applySpeed(next)}
          onSelectSkip={(next: SkipSeconds) => {
            setChosenSkip(next)
            try {
              localStorage.setItem(SKIP_KEY, String(next))
            } catch {
              // device preference; losing it costs nothing
            }
          }}
          onClose={() => setSpeedOpen(false)}
        />
      )}

      {sleepOpen && (
        <SleepTimer
          active={sleepMode}
          remainingMs={sleepRemaining}
          onSelect={selectSleep}
          onClose={() => setSleepOpen(false)}
        />
      )}
    </>
  )
}
