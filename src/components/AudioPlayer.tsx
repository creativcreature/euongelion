'use client'

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
} from 'react'
import {
  WebSpeechTtsAdapter,
  type TtsSegment,
  type TtsStatus,
} from '@/lib/audio/tts-adapter'
import { getNarrationTrack } from '@/lib/audio/tracks'
import NarrationPlayer from '@/components/NarrationPlayer'

const NOOP_SUBSCRIBE = () => () => {}

/**
 * Reads "can this browser speak" without a setState-in-effect.
 * Returns null during SSR + first hydration render (so the UI shows
 * nothing until the client snapshot resolves), then the real boolean.
 */
function useSpeechSupported(): boolean | null {
  return useSyncExternalStore<boolean | null>(
    NOOP_SUBSCRIBE,
    () => WebSpeechTtsAdapter.isSupportedInRuntime(),
    () => null,
  )
}

/** True when the reader prefers reduced motion (live-updating). */
function usePrefersReducedMotion(): boolean {
  const subscribe = (cb: () => void) => {
    const mql = window.matchMedia('(prefers-reduced-motion: reduce)')
    mql.addEventListener('change', cb)
    return () => mql.removeEventListener('change', cb)
  }
  return useSyncExternalStore(
    subscribe,
    () => window.matchMedia('(prefers-reduced-motion: reduce)').matches,
    () => false,
  )
}

export interface AudioPlayerProps {
  /** Devotional / day title — also used for Media Session metadata. */
  title: string
  /** Ordered, plain-text segments to read aloud. */
  segments: TtsSegment[]
  /** Square artwork for the OS media notification (library/PWA icon). */
  artworkSrc?: string
  /**
   * Devotional slug. When a pre-rendered narration track exists for it, that
   * is played instead of synthesising speech — a real media element, so it
   * survives a backgrounded tab and drives the lock screen.
   */
  slug?: string
  className?: string
}

/**
 * Calm, on-device Audio Edition player.
 *
 * - Drives `WebSpeechTtsAdapter` (free Web Speech API, no keys, no cost).
 * - Reads one segment at a time; highlights + lets the reader scrub by
 *   section (prev / next / tap a section).
 * - Wires the Media Session API so lock-screen / OS controls work.
 * - When `speechSynthesis` is undefined, renders an HONEST unavailable
 *   state — never a fake/silent player.
 * - Respects prefers-reduced-motion: the progress fill stops animating.
 */
/**
 * Chooses the reader for this devotional.
 *
 * A pre-rendered narration track wins whenever one exists: it is a real media
 * element, so playback continues in a backgrounded tab and the OS shows
 * transport controls. Everything else falls back to synthesised speech, which
 * keeps every devotional listenable while the catalog is still being rendered.
 */
export default function AudioPlayer(props: AudioPlayerProps) {
  const track = getNarrationTrack(props.slug)
  if (track && props.slug) {
    return (
      <NarrationPlayer
        slug={props.slug}
        title={props.title}
        track={track}
        artworkSrc={props.artworkSrc}
        className={props.className}
      />
    )
  }
  return <SpeechSynthesisPlayer {...props} />
}

function SpeechSynthesisPlayer({
  title,
  segments,
  artworkSrc,
  className,
}: AudioPlayerProps) {
  const adapterRef = useRef<WebSpeechTtsAdapter | null>(null)
  const supported = useSpeechSupported()
  const reducedMotion = usePrefersReducedMotion()
  const [status, setStatus] = useState<TtsStatus>('idle')
  const [activeIndex, setActiveIndex] = useState(-1)
  const [error, setError] = useState<string | null>(null)

  const readable = useMemo(
    () => segments.filter((s) => s.text.trim().length > 0),
    [segments],
  )

  // Build the adapter once support is confirmed; subscribe to its events.
  useEffect(() => {
    if (!supported) return
    const adapter = new WebSpeechTtsAdapter()
    adapterRef.current = adapter

    const unsubscribe = adapter.on((event) => {
      switch (event.type) {
        case 'start':
          setStatus('playing')
          setError(null)
          break
        case 'segmentStart':
          setActiveIndex(event.index)
          break
        case 'pause':
          setStatus('paused')
          break
        case 'resume':
          setStatus('playing')
          break
        case 'end':
        case 'stop':
          setStatus('idle')
          setActiveIndex(-1)
          break
        case 'error':
          setError(event.message)
          setStatus('idle')
          break
      }
    })

    return () => {
      unsubscribe()
      adapter.stop()
      adapterRef.current = null
    }
  }, [supported])

  // ── Media Session ────────────────────────────────────────────────
  // Keep metadata + transport handlers in sync with playback so OS /
  // lock-screen controls drive the same adapter.
  const playFromCurrent = useCallback(() => {
    const adapter = adapterRef.current
    if (!adapter) return
    if (adapter.getStatus() === 'paused') {
      adapter.resume()
    } else {
      const startAt = activeIndex >= 0 ? activeIndex : 0
      adapter.speak(readable, startAt)
    }
  }, [activeIndex, readable])

  const pause = useCallback(() => adapterRef.current?.pause(), [])
  const stop = useCallback(() => adapterRef.current?.stop(), [])

  const nextSegment = useCallback(() => {
    const adapter = adapterRef.current
    if (!adapter) return
    const target = Math.min(
      (adapter.getCurrentIndex() < 0 ? 0 : adapter.getCurrentIndex()) + 1,
      readable.length - 1,
    )
    adapter.seekToSegment(target)
  }, [readable.length])

  const prevSegment = useCallback(() => {
    const adapter = adapterRef.current
    if (!adapter) return
    const target = Math.max(
      (adapter.getCurrentIndex() < 0 ? 0 : adapter.getCurrentIndex()) - 1,
      0,
    )
    adapter.seekToSegment(target)
  }, [])

  useEffect(() => {
    if (!supported || typeof navigator === 'undefined') return
    if (!('mediaSession' in navigator)) return
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
      // MediaMetadata can throw on malformed artwork; metadata is optional.
    }

    ms.setActionHandler('play', () => playFromCurrent())
    ms.setActionHandler('pause', () => pause())
    ms.setActionHandler('stop', () => stop())
    ms.setActionHandler('previoustrack', () => prevSegment())
    ms.setActionHandler('nexttrack', () => nextSegment())

    return () => {
      ms.setActionHandler('play', null)
      ms.setActionHandler('pause', null)
      ms.setActionHandler('stop', null)
      ms.setActionHandler('previoustrack', null)
      ms.setActionHandler('nexttrack', null)
    }
  }, [
    supported,
    title,
    artworkSrc,
    playFromCurrent,
    pause,
    stop,
    prevSegment,
    nextSegment,
  ])

  // Reflect transport state into the OS where supported.
  useEffect(() => {
    if (typeof navigator === 'undefined' || !('mediaSession' in navigator))
      return
    navigator.mediaSession.playbackState =
      status === 'playing' ? 'playing' : status === 'paused' ? 'paused' : 'none'
  }, [status])

  // ── Render ───────────────────────────────────────────────────────

  // Pre-hydration: render nothing distracting (avoids SSR/CSR mismatch).
  if (supported === null) return null

  if (!supported) {
    return (
      <section
        className={`border px-4 py-3 ${className ?? ''}`}
        style={{ borderColor: 'var(--color-border)' }}
        aria-label="Audio edition"
      >
        <p className="text-label vw-small mb-1 text-gold">AUDIO EDITION</p>
        <p className="vw-small text-secondary">
          Audio isn’t available in this browser. Try Safari, Chrome, or Edge to
          hear this reading aloud.
        </p>
      </section>
    )
  }

  if (readable.length === 0) {
    return (
      <section
        className={`border px-4 py-3 ${className ?? ''}`}
        style={{ borderColor: 'var(--color-border)' }}
        aria-label="Audio edition"
      >
        <p className="text-label vw-small mb-1 text-gold">AUDIO EDITION</p>
        <p className="vw-small text-secondary">
          There’s no readable text for this entry yet.
        </p>
      </section>
    )
  }

  const isPlaying = status === 'playing'
  const isActive = status !== 'idle'
  const progressIndex = activeIndex >= 0 ? activeIndex : 0
  const progressPct = isActive
    ? Math.round(((progressIndex + 1) / readable.length) * 100)
    : 0

  return (
    <section
      className={`audio-player border px-4 py-4 ${className ?? ''}`}
      style={{ borderColor: 'var(--color-border)' }}
      aria-label="Audio edition"
    >
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <p className="text-label vw-small text-gold">AUDIO EDITION</p>
        <p className="vw-small text-muted oldstyle-nums" aria-live="polite">
          {isActive
            ? `Section ${progressIndex + 1} of ${readable.length}`
            : `${readable.length} sections`}
        </p>
      </div>

      <div className="flex items-center gap-3">
        {/* Previous section */}
        <button
          type="button"
          className="audio-player-step text-label vw-small text-secondary"
          onClick={prevSegment}
          disabled={!isActive}
          aria-label="Previous section"
        >
          ‹‹
        </button>

        {/* Play / Pause — primary calm control */}
        <button
          type="button"
          className="audio-player-toggle cta-major text-label vw-small px-5 py-2"
          onClick={isPlaying ? pause : playFromCurrent}
          aria-pressed={isPlaying}
        >
          {isPlaying ? 'PAUSE' : isActive ? 'RESUME' : 'LISTEN'}
        </button>

        {/* Next section */}
        <button
          type="button"
          className="audio-player-step text-label vw-small text-secondary"
          onClick={nextSegment}
          disabled={!isActive}
          aria-label="Next section"
        >
          ››
        </button>

        {isActive && (
          <button
            type="button"
            className="audio-player-step text-label vw-small text-muted ml-auto"
            onClick={stop}
            aria-label="Stop reading"
          >
            STOP
          </button>
        )}
      </div>

      {/* Section progress — a quiet bar, not a waveform. No motion when the
          reader prefers reduced motion. */}
      <div
        className="audio-player-track mt-4"
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={progressPct}
        aria-label="Reading progress"
      >
        <span
          className="audio-player-fill"
          style={{
            width: `${progressPct}%`,
            transition: reducedMotion
              ? 'none'
              : 'width var(--motion-slow) var(--motion-ease)',
          }}
        />
      </div>

      {/* Founder direction 2026-07-28: no section scrubber. Listing every
          section title above the article read as a table of contents and
          spoiled the devotional's headings before the first line — the page
          must open as an editorial, not an index. Section navigation stays
          available through the ‹‹ / ›› controls and the progress bar. */}

      {error && (
        <p
          className="vw-small mt-3"
          role="status"
          style={{ color: 'var(--color-crimson, #c4192e)' }}
        >
          {error}
        </p>
      )}

      <style jsx>{`
        .audio-player-track {
          width: 100%;
          height: 3px;
          background: var(--color-border);
          overflow: hidden;
        }
        .audio-player-fill {
          display: block;
          height: 100%;
          background: var(--color-gold);
        }
        .audio-player-step {
          min-width: 44px;
          min-height: 44px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          background: transparent;
          border: 1px solid var(--color-border);
          line-height: 1;
        }
        .audio-player-step:disabled {
          opacity: 0.4;
          cursor: not-allowed;
        }
        .audio-player-toggle {
          min-height: 44px;
        }
      `}</style>
    </section>
  )
}
