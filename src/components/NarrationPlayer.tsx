'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { formatTime, type NarrationTrack } from '@/lib/audio/tracks'
import NarrationMiniBar from '@/components/NarrationMiniBar'

const SPEEDS = [0.8, 1, 1.25, 1.5] as const
const SKIP_SECONDS = 15
const RESUME_KEY = 'euangelion:narration-position'
/** Below this, treat a stored position as "start from the top". */
const RESUME_FLOOR_S = 20
/** Within this of the end, the reader finished — do not resume there. */
const RESUME_TAIL_S = 30

interface StoredPositions {
  [slug: string]: number
}

function readPositions(): StoredPositions {
  try {
    return JSON.parse(
      localStorage.getItem(RESUME_KEY) ?? '{}',
    ) as StoredPositions
  } catch {
    return {}
  }
}

function writePosition(slug: string, seconds: number): void {
  try {
    const all = readPositions()
    all[slug] = seconds
    localStorage.setItem(RESUME_KEY, JSON.stringify(all))
  } catch {
    // storage disabled — resuming is a convenience, never a hard requirement
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
  const [panelVisible, setPanelVisible] = useState(true)
  const [current, setCurrent] = useState(0)
  const [duration, setDuration] = useState(track.duration)
  const [speed, setSpeed] = useState<number>(1)
  const [error, setError] = useState<string | null>(null)
  const [resumedFrom, setResumedFrom] = useState<number | null>(null)

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
    (audio: HTMLAudioElement) => {
      const saved = readPositions()[slug]
      const end = Number.isFinite(audio.duration)
        ? audio.duration
        : track.duration
      if (
        typeof saved === 'number' &&
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

  // Persist position periodically while playing.
  useEffect(() => {
    if (!playing) return
    const id = window.setInterval(() => {
      const audio = audioRef.current
      if (audio && !audio.paused) writePosition(slug, audio.currentTime)
    }, 5000)
    return () => window.clearInterval(id)
  }, [playing, slug])

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
      writePosition(slug, audio.currentTime)
    }
  }, [slug])

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

  const cycleSpeed = useCallback(() => {
    const audio = audioRef.current
    if (!audio) return
    const next =
      SPEEDS[
        (SPEEDS.indexOf(speed as (typeof SPEEDS)[number]) + 1) % SPEEDS.length
      ]
    audio.playbackRate = next
    setSpeed(next)
  }, [speed])

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
    ms.setActionHandler('seekbackward', () => skip(-SKIP_SECONDS))
    ms.setActionHandler('seekforward', () => skip(SKIP_SECONDS))
    ms.setActionHandler('seekto', (details) => {
      if (typeof details.seekTime === 'number') seekTo(details.seekTime)
    })
    return () => {
      for (const action of [
        'play',
        'pause',
        'seekbackward',
        'seekforward',
        'seekto',
      ] as const) {
        try {
          ms.setActionHandler(action, null)
        } catch {
          // some browsers reject unknown actions; harmless
        }
      }
    }
  }, [title, artworkSrc, toggle, skip, seekTo])

  useEffect(() => {
    if (typeof navigator === 'undefined' || !('mediaSession' in navigator))
      return
    navigator.mediaSession.playbackState = playing ? 'playing' : 'paused'
  }, [playing])

  const progressPct = duration > 0 ? (current / duration) * 100 : 0

  return (
    <>
      <section
        ref={panelRef}
        className={`narration-player border px-4 py-4 ${className ?? ''}`}
        style={{ borderColor: 'var(--color-border)' }}
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
          onTimeUpdate={(e) => setCurrent(e.currentTarget.currentTime)}
          onLoadedMetadata={(e) => {
            if (Number.isFinite(e.currentTarget.duration)) {
              setDuration(e.currentTarget.duration)
            }
            restorePosition(e.currentTarget)
          }}
          onEnded={() => {
            setPlaying(false)
            writePosition(slug, 0)
          }}
          onError={() => setError('This reading could not be loaded.')}
        />

        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <p className="text-label vw-small text-gold">AUDIO EDITION</p>
          <p className="vw-small text-muted oldstyle-nums" aria-live="polite">
            {formatTime(current)} / {formatTime(duration)}
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            className="narration-step text-label vw-small text-secondary"
            onClick={() => skip(-SKIP_SECONDS)}
            aria-label={`Back ${SKIP_SECONDS} seconds`}
          >
            −{SKIP_SECONDS}
          </button>

          <button
            type="button"
            className="narration-toggle cta-major text-label vw-small px-5 py-2"
            onClick={toggle}
            aria-pressed={playing}
          >
            {playing ? 'PAUSE' : current > 0 ? 'RESUME' : 'LISTEN'}
          </button>

          <button
            type="button"
            className="narration-step text-label vw-small text-secondary"
            onClick={() => skip(SKIP_SECONDS)}
            aria-label={`Forward ${SKIP_SECONDS} seconds`}
          >
            +{SKIP_SECONDS}
          </button>

          <button
            type="button"
            className="narration-step text-label vw-small text-muted ml-auto"
            onClick={cycleSpeed}
            aria-label={`Playback speed ${speed}x`}
          >
            {speed}×
          </button>
        </div>

        <label className="narration-seek mt-4 block">
          <span className="sr-only">Seek within the reading</span>
          <input
            type="range"
            min={0}
            max={Math.max(duration, 1)}
            step={1}
            value={current}
            onChange={(e) => seekTo(Number(e.target.value))}
            style={{ ['--pct' as string]: `${progressPct}%` }}
          />
        </label>

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

        <style jsx>{`
          .narration-step {
            min-width: 44px;
            min-height: 44px;
            display: inline-flex;
            align-items: center;
            justify-content: center;
            background: transparent;
            border: 1px solid var(--color-border);
            line-height: 1;
          }
          .narration-toggle {
            min-height: 44px;
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
          skipSeconds={SKIP_SECONDS}
        />
      )}
    </>
  )
}
