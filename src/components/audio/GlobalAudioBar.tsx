'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useState, useSyncExternalStore } from 'react'
import { formatTime } from '@/lib/audio/tracks'
import {
  getAudioElement,
  subscribeAudioElement,
} from '@/lib/audio/audio-element'
import { currentItem, useAudioStore } from '@/stores/audioStore'

/**
 * The transport that follows you around the site.
 *
 * Shape is taken from what actually ships (Mobbin, 2026-08-19): every
 * persistent player studied — Calm, Substack, Apple News, Neuecast,
 * ElevenReader — docks a rounded card above the tab bar rather than a
 * full-bleed strip.
 *
 * The dismiss control is the one thing our own scroll bar was missing, and
 * both Substack and Apple News carry it. A bar that follows a reader across
 * every route with no way to close it stops being a transport and becomes
 * chrome they cannot escape. Closing it pauses and clears the queue — it is a
 * way out, not a way to hide something still sounding.
 *
 * It retires on the reading it is playing, because the reader's own panel is
 * the better surface there and two transports on one screen is a bug.
 */
export default function GlobalAudioBar() {
  const pathname = usePathname()
  const queue = useAudioStore((s) => s.queue)
  const index = useAudioStore((s) => s.index)
  const label = useAudioStore((s) => s.label)
  const playing = useAudioStore((s) => s.playing)
  const started = useAudioStore((s) => s.started)
  const clear = useAudioStore((s) => s.clear)
  const goNext = useAudioStore((s) => s.next)
  const goPrev = useAudioStore((s) => s.previous)

  const item = currentItem({ queue, index })
  const [remaining, setRemaining] = useState<number | null>(null)
  /**
   * The element, subscribed rather than set from an effect.
   *
   * `useSyncExternalStore` is the pattern this codebase already uses for
   * reading an outside value into render (see `NarrationPlayer`'s speed): the
   * server snapshot is null, the client snapshot is whatever the host has
   * registered, and React reconciles the two passes itself. Setting it from a
   * mount effect is a cascading render, which the compiler rejects.
   */
  const element = useSyncExternalStore(
    subscribeAudioElement,
    getAudioElement,
    () => null,
  )

  useEffect(() => {
    if (!element) return
    const tick = () => {
      const total = element.duration || item?.duration || 0
      setRemaining(total ? Math.max(0, total - element.currentTime) : null)
    }
    tick()
    element.addEventListener('timeupdate', tick)
    element.addEventListener('loadedmetadata', tick)
    return () => {
      element.removeEventListener('timeupdate', tick)
      element.removeEventListener('loadedmetadata', tick)
    }
  }, [element, item])

  // The reader's own panel owns the transport on its own page.
  const onItsOwnReading = item ? pathname === item.href : false
  if (!item || !started || onItsOwnReading) return null

  /**
   * Imperative actions read the element from the registry, not from state.
   * The state copy exists only so the time readout can re-subscribe when the
   * element appears; writing through it would be mutating render state, which
   * the compiler correctly rejects.
   */
  const skip = (delta: number) => {
    const audio = getAudioElement()
    if (!audio) return
    audio.currentTime = Math.min(
      Math.max(audio.currentTime + delta, 0),
      audio.duration || item.duration,
    )
  }

  const toggle = () => {
    const audio = getAudioElement()
    if (!audio) return
    if (playing) audio.pause()
    else void audio.play().catch(() => {})
  }

  const dismiss = () => {
    getAudioElement()?.pause()
    clear()
  }

  return (
    <div className="gab" role="region" aria-label="Now playing">
      <div className="gab-card">
        <Link href={item.href} className="gab-text">
          <span className="gab-title">{item.title}</span>
          <span className="gab-sub">
            {queue.length > 1
              ? `${label ?? 'Up next'} · ${index + 1} of ${queue.length}`
              : (item.context ?? 'Audio edition')}
          </span>
        </Link>

        <div className="gab-controls">
          {queue.length > 1 && (
            <button
              type="button"
              className="gab-btn gab-step"
              aria-label="Previous in queue"
              onClick={() => goPrev()}
              disabled={index === 0}
            >
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="M18 6 8 12l10 6V6zM6 6h2v12H6z" />
              </svg>
            </button>
          )}
          <button
            type="button"
            className="gab-btn"
            aria-label="Back 15 seconds"
            onClick={() => skip(-15)}
          >
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M12 5V2L7 6l5 4V7a5 5 0 1 1-5 5H5a7 7 0 1 0 7-7z" />
            </svg>
          </button>
          <button
            type="button"
            className="gab-btn gab-play"
            aria-label={playing ? 'Pause the reading' : 'Resume the reading'}
            onClick={toggle}
          >
            {playing ? (
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="M7 5h4v14H7zM13 5h4v14h-4z" />
              </svg>
            ) : (
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="M8 5v14l11-7z" />
              </svg>
            )}
          </button>
          <button
            type="button"
            className="gab-btn"
            aria-label="Forward 15 seconds"
            onClick={() => skip(15)}
          >
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M12 5V2l5 4-5 4V7a5 5 0 1 0 5 5h2a7 7 0 1 1-7-7z" />
            </svg>
          </button>
          {queue.length > 1 && (
            <button
              type="button"
              className="gab-btn gab-step"
              aria-label="Next in queue"
              onClick={() => goNext()}
              disabled={index >= queue.length - 1}
            >
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="M6 6l10 6-10 6V6zM16 6h2v12h-2z" />
              </svg>
            </button>
          )}
        </div>

        {remaining !== null && (
          <span className="gab-time oldstyle-nums">
            {formatTime(remaining)} left
          </span>
        )}

        <button
          type="button"
          className="gab-btn gab-close"
          aria-label="Close the player and clear what is up next"
          onClick={dismiss}
        >
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M18.3 5.7 12 12l6.3 6.3-1.4 1.4L10.6 13.4 4.3 19.7 2.9 18.3 9.2 12 2.9 5.7 4.3 4.3l6.3 6.3 6.3-6.3z" />
          </svg>
        </button>
      </div>

      <style jsx>{`
        .gab {
          position: fixed;
          inset-inline: 0;
          /* Sits ABOVE the mobile tab bar, which does not hide for it. */
          bottom: calc(
            var(--mobile-tab-bar-h, 0px) + env(safe-area-inset-bottom, 0px)
          );
          z-index: var(--z-sticky, 300);
          padding: 0.5rem 0.6rem;
          pointer-events: none;
        }
        .gab-card {
          pointer-events: auto;
          display: flex;
          align-items: center;
          gap: 0.6rem;
          max-width: 44rem;
          margin-inline: auto;
          padding: 0.5rem 0.65rem;
          background: var(--color-bg);
          border: 1px solid var(--color-border);
          border-top: 2px solid var(--color-gold);
          box-shadow: 0 6px 24px rgba(0, 0, 0, 0.18);
        }
        .gab-text {
          flex: 1 1 auto;
          min-width: 0;
          display: flex;
          flex-direction: column;
          text-decoration: none;
        }
        .gab-title {
          font-family: var(--font-family-serif, Georgia, serif);
          font-size: 0.92rem;
          line-height: 1.2;
          color: var(--color-text-primary, var(--color-fg));
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
        .gab-sub {
          font-size: 0.58rem;
          letter-spacing: 0.1em;
          text-transform: uppercase;
          color: var(--color-text-muted, var(--color-text-secondary));
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
        .gab-controls {
          display: flex;
          align-items: center;
          gap: 0.15rem;
          flex: 0 0 auto;
        }
        .gab-btn {
          display: grid;
          place-items: center;
          min-width: 44px;
          min-height: 44px;
          background: transparent;
          border: 0;
          color: var(--color-text-primary, var(--color-fg));
          cursor: pointer;
        }
        .gab-btn svg {
          width: 19px;
          height: 19px;
          fill: currentColor;
        }
        .gab-play svg {
          width: 23px;
          height: 23px;
        }
        .gab-btn:disabled {
          opacity: 0.32;
        }
        .gab-btn:focus-visible {
          outline: 2px solid var(--color-gold);
          outline-offset: -2px;
        }
        .gab-time {
          flex: 0 0 auto;
          font-size: 0.62rem;
          letter-spacing: 0.06em;
          color: var(--color-text-muted, var(--color-text-secondary));
          font-variant-numeric: oldstyle-nums;
        }
        /* The readout is what yields when space is tight — never a control. */
        @media (max-width: 560px) {
          .gab-time {
            display: none;
          }
        }
        @media (max-width: 400px) {
          .gab-step {
            display: none;
          }
        }
      `}</style>
    </div>
  )
}
