'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useMemo, useState, useSyncExternalStore } from 'react'
import {
  getAudioElement,
  subscribeAudioElement,
} from '@/lib/audio/audio-element'
import { formatRuntime, queueDuration } from '@/lib/audio/queue-builder'
import { formatTime } from '@/lib/audio/tracks'
import { currentItem, useAudioStore } from '@/stores/audioStore'
import { usePlaylistsStore } from '@/stores/playlistsStore'
import OccasionPicker from '@/components/audio/OccasionPicker'
import { allListenable } from '@/lib/audio/occasion'

/**
 * The audio sidebar.
 *
 * Founder, 2026-08-19, twice. First: audio was "clunky on the site in the areas
 * that aren't strictly the devotional" and needs to be "tucked, but not
 * invisible". Then, after the first attempt put a Listen call-to-action on the
 * series page and a "what are you doing?" picker above the shelves: "This
 * placement is extremely intrusive... Audio should be a seperate area
 * (sidebar) non intrusive."
 *
 * So audio has exactly ONE home now. Nothing about it is injected into a
 * reading or browse surface except the small `+` on a day row, which is how a
 * reader adds while navigating. Discovery moved in here too — it used to sit
 * above the series shelves, which is precisely the intrusion complained of.
 *
 * The bar this replaces was a full-width card pinned across the bottom of every
 * page — it announced itself constantly and pushed against the written content,
 * which is the thing the site is actually for. This is a **handle**: a compact
 * pill on one side, carrying only what is playing and how many are behind it.
 * Tap it and the queue comes up as a drawer; dismiss it and it is gone.
 *
 * Not invisible: the handle is always there while a queue exists, it moves when
 * audio is playing, and it states the count so "there are four more after this"
 * is legible without opening anything.
 */
export default function AudioDrawer() {
  const pathname = usePathname()
  const queue = useAudioStore((s) => s.queue)
  const index = useAudioStore((s) => s.index)
  const label = useAudioStore((s) => s.label)
  const playing = useAudioStore((s) => s.playing)
  const started = useAudioStore((s) => s.started)
  const clear = useAudioStore((s) => s.clear)
  const jumpTo = useAudioStore((s) => s.jumpTo)
  const remove = useAudioStore((s) => s.remove)
  const reorder = useAudioStore((s) => s.reorder)
  const goNext = useAudioStore((s) => s.next)
  const savePlaylist = usePlaylistsStore((s) => s.save)

  const open = useAudioStore((s) => s.panelOpen)
  const setOpen = useAudioStore((s) => s.setPanelOpen)
  const [saved, setSaved] = useState<string | null>(null)
  // Computed once per open, not per render — it walks the whole manifest.
  const listenPool = useMemo(() => (open ? allListenable() : []), [open])
  const [remaining, setRemaining] = useState<number | null>(null)

  const element = useSyncExternalStore(
    subscribeAudioElement,
    getAudioElement,
    () => null,
  )
  const item = currentItem({ queue, index })

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

  // Escape closes the drawer, as any sheet on this site does.
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false)
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open, setOpen])

  // The handle needs something playing; the sidebar itself does not — it is
  // openable with an empty queue, because that is where discovery now lives.
  const showHandle = !!item && started && !(pathname === item.href) && !open
  if (!open && !showHandle) return null
  // On the reading it is playing, the reader's own panel is the better surface.

  const audio = () => getAudioElement()
  const upNext = queue.length - index - 1

  return (
    <>
      {/* Two sibling buttons, not one nested in the other: a control inside a
          control is invalid markup and unreachable for a keyboard. */}
      {showHandle && item && (
        <div className="ad-handle-wrap">
          <div className={`ad-handle${playing ? ' is-playing' : ''}`}>
            <button
              type="button"
              className="ad-handle-open"
              aria-expanded={open}
              aria-label={`Now playing: ${item.title}${upNext > 0 ? `, ${upNext} more queued` : ''}. Open the queue.`}
              onClick={() => setOpen(true)}
            >
              <span className="ad-bars" aria-hidden="true">
                <i />
                <i />
                <i />
              </span>
              <span className="ad-handle-title">{item.title}</span>
              {upNext > 0 && <span className="ad-handle-count">+{upNext}</span>}
            </button>
            <button
              type="button"
              className="ad-handle-play"
              aria-label={playing ? 'Pause the reading' : 'Resume the reading'}
              onClick={() => {
                const a = audio()
                if (!a) return
                if (playing) a.pause()
                else void a.play().catch(() => {})
              }}
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
          </div>
        </div>
      )}

      {open && (
        <div className="ad-root">
          <button
            type="button"
            className="ad-scrim"
            aria-label="Close the listening sidebar"
            onClick={() => setOpen(false)}
          />
          <div
            className="ad-drawer"
            role="dialog"
            aria-modal="true"
            aria-label="Listening"
          >
            <div className="ad-grip" aria-hidden="true" />

            <header className="ad-head">
              <div>
                <p className="ad-eyebrow">
                  {item ? (label ?? 'Listening') : 'Listen'}
                </p>
                {item ? (
                  <>
                    <Link href={item.href} className="ad-now">
                      {item.title}
                    </Link>
                    {remaining !== null && (
                      <p className="ad-remaining oldstyle-nums">
                        {formatTime(remaining)} left
                      </p>
                    )}
                  </>
                ) : (
                  <p className="ad-now">Nothing playing</p>
                )}
              </div>
              <button
                type="button"
                className="ad-close"
                onClick={() => setOpen(false)}
              >
                Close
              </button>
            </header>

            {item && (
              <div className="ad-transport">
                <button
                  type="button"
                  className="ad-btn"
                  aria-label="Back 15 seconds"
                  onClick={() => {
                    const a = audio()
                    if (a) a.currentTime = Math.max(0, a.currentTime - 15)
                  }}
                >
                  <svg viewBox="0 0 24 24" aria-hidden="true">
                    <path d="M12 5V2L7 6l5 4V7a5 5 0 1 1-5 5H5a7 7 0 1 0 7-7z" />
                  </svg>
                </button>
                <button
                  type="button"
                  className="ad-btn ad-btn-play"
                  aria-label={
                    playing ? 'Pause the reading' : 'Resume the reading'
                  }
                  onClick={() => {
                    const a = audio()
                    if (!a) return
                    playing ? a.pause() : void a.play().catch(() => {})
                  }}
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
                  className="ad-btn"
                  aria-label="Forward 15 seconds"
                  onClick={() => {
                    const a = audio()
                    if (a) a.currentTime = a.currentTime + 15
                  }}
                >
                  <svg viewBox="0 0 24 24" aria-hidden="true">
                    <path d="M12 5V2l5 4-5 4V7a5 5 0 1 0 5 5h2a7 7 0 1 1-7-7z" />
                  </svg>
                </button>
                <button
                  type="button"
                  className="ad-btn"
                  aria-label="Next in queue"
                  disabled={index >= queue.length - 1}
                  onClick={() => goNext()}
                >
                  <svg viewBox="0 0 24 24" aria-hidden="true">
                    <path d="M6 6l10 6-10 6V6zM16 6h2v12h-2z" />
                  </svg>
                </button>
              </div>
            )}

            {item && (
              <>
                <p className="ad-uplabel">
                  Up next
                  {upNext > 0
                    ? ` · ${formatRuntime(queueDuration(queue.slice(index + 1)))}`
                    : ''}
                </p>

                <ol className="ad-list">
                  {queue.map((track, i) => (
                    <li key={track.slug}>
                      <div
                        className={`ad-row${i === index ? ' is-current' : ''}${i < index ? ' is-past' : ''}`}
                      >
                        <button
                          type="button"
                          className="ad-play"
                          aria-label={`Play ${track.title}`}
                          onClick={() => {
                            jumpTo(i)
                            const a = audio()
                            if (a) void a.play().catch(() => {})
                          }}
                        >
                          <svg viewBox="0 0 24 24" aria-hidden="true">
                            <path d="M8 5v14l11-7z" />
                          </svg>
                        </button>
                        <Link href={track.href} className="ad-text">
                          {track.context && (
                            <span className="ad-context">{track.context}</span>
                          )}
                          <span className="ad-name">{track.title}</span>
                        </Link>
                        <span className="ad-dur oldstyle-nums">
                          {formatTime(track.duration)}
                        </span>
                        <button
                          type="button"
                          className="ad-icon"
                          aria-label={`Move ${track.title} up`}
                          disabled={i === 0}
                          onClick={() => reorder(i, i - 1)}
                        >
                          <svg viewBox="0 0 24 24" aria-hidden="true">
                            <path d="M12 8l6 6H6z" />
                          </svg>
                        </button>
                        <button
                          type="button"
                          className="ad-icon"
                          aria-label={`Remove ${track.title}`}
                          onClick={() => remove(track.slug)}
                        >
                          <svg viewBox="0 0 24 24" aria-hidden="true">
                            <path d="M18.3 5.7 12 12l6.3 6.3-1.4 1.4L10.6 13.4 4.3 19.7 2.9 18.3 9.2 12 2.9 5.7 4.3 4.3l6.3 6.3 6.3-6.3z" />
                          </svg>
                        </button>
                      </div>
                    </li>
                  ))}
                </ol>
              </>
            )}

            {/* Discovery lives HERE now, not above the series shelves. Two
                questions, then a queue — the same picker, moved into audio's
                own area instead of injected into a browse surface. */}
            <div className="ad-find">
              <OccasionPicker pool={listenPool} compact />
            </div>

            {item && (
              <div className="ad-foot">
                {/* Saving is one tap on what is already queued — a create-then-fill
                  flow is the kind nobody finishes. */}
                <button
                  type="button"
                  className="ad-save"
                  onClick={() => {
                    const playlist = savePlaylist(
                      label ?? 'Saved listening',
                      queue,
                    )
                    if (playlist) setSaved(playlist.name)
                  }}
                >
                  {saved ? `Saved as “${saved}”` : 'Save as a playlist'}
                </button>
                <button
                  type="button"
                  className="ad-clear"
                  onClick={() => {
                    audio()?.pause()
                    clear()
                    setOpen(false)
                  }}
                >
                  Clear
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      <style jsx>{`
        .ad-handle-wrap {
          position: fixed;
          inset-inline: 0;
          bottom: calc(
            var(--mobile-tab-bar-h, 0px) + env(safe-area-inset-bottom, 0px)
          );
          z-index: var(--z-sticky, 300);
          display: flex;
          justify-content: flex-end;
          padding: 0.45rem 0.6rem;
          pointer-events: none;
        }
        .ad-handle {
          pointer-events: auto;
          display: inline-flex;
          align-items: center;
          max-width: min(22rem, calc(100vw - 1.6rem));
          background: var(--color-bg);
          border: 1px solid var(--color-border);
          border-left: 3px solid var(--color-gold);
          box-shadow: 0 4px 18px rgba(0, 0, 0, 0.16);
        }
        .ad-handle-open {
          display: inline-flex;
          align-items: center;
          gap: 0.5rem;
          min-width: 0;
          min-height: 44px;
          padding: 0.3rem 0.2rem 0.3rem 0.65rem;
          background: transparent;
          border: 0;
          cursor: pointer;
        }
        .ad-bars {
          display: inline-flex;
          align-items: flex-end;
          gap: 2px;
          height: 13px;
        }
        .ad-bars i {
          width: 2px;
          height: 5px;
          background: var(--color-gold);
        }
        /* Motion only while sounding — that is the "not invisible" part, and it
           stops entirely for anyone who asked for less motion. */
        .ad-handle.is-playing .ad-bars i {
          animation: ad-eq 900ms ease-in-out infinite;
        }
        .ad-handle.is-playing .ad-bars i:nth-child(2) {
          animation-delay: 150ms;
        }
        .ad-handle.is-playing .ad-bars i:nth-child(3) {
          animation-delay: 300ms;
        }
        @keyframes ad-eq {
          0%,
          100% {
            height: 4px;
          }
          50% {
            height: 13px;
          }
        }
        @media (prefers-reduced-motion: reduce) {
          .ad-handle.is-playing .ad-bars i {
            animation: none;
            height: 9px;
          }
        }
        .ad-handle-title {
          font-family: var(--font-family-serif, Georgia, serif);
          font-size: 0.86rem;
          color: var(--color-text-primary, var(--color-fg));
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
        .ad-handle-count {
          font-size: 0.58rem;
          letter-spacing: 0.08em;
          color: var(--color-text-muted, var(--color-text-secondary));
        }
        .ad-handle-play {
          display: grid;
          place-items: center;
          min-width: 44px;
          min-height: 44px;
          background: transparent;
          border: 0;
          color: var(--color-text-primary, var(--color-fg));
          cursor: pointer;
        }
        .ad-handle-play svg {
          width: 17px;
          height: 17px;
          fill: currentColor;
        }
        .ad-handle-open:focus-visible,
        .ad-handle-play:focus-visible {
          outline: 2px solid var(--color-gold);
          outline-offset: -2px;
        }

        .ad-root {
          position: fixed;
          inset: 0;
          z-index: var(--z-modal, 400);
        }
        .ad-scrim {
          position: absolute;
          inset: 0;
          width: 100%;
          border: 0;
          background: color-mix(in srgb, var(--color-bg) 72%, transparent);
          backdrop-filter: blur(2px);
        }
        .ad-drawer {
          position: absolute;
          inset-inline: 0;
          bottom: 0;
          max-height: min(78vh, 44rem);
          display: flex;
          flex-direction: column;
          background: var(--color-bg);
          border-top: 3px solid var(--color-gold);
          padding-bottom: env(safe-area-inset-bottom, 0px);
          animation: ad-in var(--motion-slow, 380ms)
            var(--motion-ease, ease-out) both;
        }
        /* A SIDEBAR on anything with room for one — founder direction: audio
           gets its own area rather than a band across the page. On a phone a
           right-hand sidebar is a full-screen panel anyway, so there it stays a
           bottom sheet, which is also where a thumb is. */
        @media (min-width: 768px) {
          .ad-drawer {
            inset-block: 0;
            inset-inline: auto 0;
            bottom: 0;
            width: min(26rem, 92vw);
            max-height: none;
            margin-inline: 0;
            border-top: 0;
            border-left: 3px solid var(--color-gold);
            animation-name: ad-in-side;
          }
          .ad-grip {
            display: none;
          }
        }
        @keyframes ad-in {
          from {
            transform: translateY(100%);
          }
          to {
            transform: none;
          }
        }
        @keyframes ad-in-side {
          from {
            transform: translateX(100%);
          }
          to {
            transform: none;
          }
        }
        @media (prefers-reduced-motion: reduce) {
          .ad-drawer {
            animation: none;
          }
        }
        .ad-grip {
          width: 2.4rem;
          height: 3px;
          margin: 0.6rem auto 0;
          background: var(--color-border);
        }
        .ad-head {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 1rem;
          padding: 0.8rem 1.2rem 0.7rem;
          border-bottom: 1px solid var(--color-border);
        }
        .ad-eyebrow {
          font-size: 0.53rem;
          letter-spacing: 0.16em;
          text-transform: uppercase;
          color: var(--color-gold);
          margin-bottom: 0.2rem;
        }
        .ad-now {
          font-family: var(--font-family-serif, Georgia, serif);
          font-style: italic;
          font-size: 1.15rem;
          line-height: 1.2;
          color: var(--color-text-primary, var(--color-fg));
          text-decoration: none;
        }
        .ad-remaining {
          margin-top: 0.2rem;
          font-size: 0.6rem;
          letter-spacing: 0.06em;
          color: var(--color-text-muted, var(--color-text-secondary));
        }
        .ad-close {
          flex-shrink: 0;
          min-height: 44px;
          background: transparent;
          border: 0;
          font-size: 0.58rem;
          letter-spacing: 0.12em;
          text-transform: uppercase;
          color: var(--color-text-secondary, var(--color-fg));
          cursor: pointer;
        }
        .ad-transport {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.35rem;
          padding: 0.6rem 0;
          border-bottom: 1px solid var(--color-border);
        }
        .ad-btn {
          display: grid;
          place-items: center;
          min-width: 44px;
          min-height: 44px;
          background: transparent;
          border: 0;
          color: var(--color-text-primary, var(--color-fg));
          cursor: pointer;
        }
        .ad-btn svg {
          width: 20px;
          height: 20px;
          fill: currentColor;
        }
        .ad-btn-play svg {
          width: 26px;
          height: 26px;
        }
        .ad-btn:disabled {
          opacity: 0.3;
        }
        .ad-uplabel {
          padding: 0.7rem 1.2rem 0.3rem;
          font-size: 0.55rem;
          letter-spacing: 0.15em;
          text-transform: uppercase;
          color: var(--color-text-muted, var(--color-text-secondary));
        }
        .ad-list {
          list-style: none;
          margin: 0;
          padding: 0;
          overflow-y: auto;
          overscroll-behavior: contain;
        }
        .ad-list :global(li) {
          margin: 0;
        }
        .ad-row {
          display: flex;
          align-items: center;
          gap: 0.4rem;
          padding-right: 0.6rem;
          border-bottom: 1px solid var(--color-border);
          box-shadow: inset 3px 0 0 transparent;
        }
        .ad-row.is-current {
          box-shadow: inset 3px 0 0 var(--color-gold);
        }
        .ad-row.is-past {
          opacity: 0.45;
        }
        .ad-play {
          flex: 0 0 auto;
          display: grid;
          place-items: center;
          min-width: 44px;
          min-height: 44px;
          background: transparent;
          border: 0;
          color: var(--color-text-primary, var(--color-fg));
          cursor: pointer;
        }
        .ad-play svg {
          width: 15px;
          height: 15px;
          fill: currentColor;
        }
        .ad-text {
          flex: 1 1 auto;
          min-width: 0;
          display: flex;
          flex-direction: column;
          padding: 0.5rem 0;
          text-decoration: none;
        }
        .ad-context {
          font-size: 0.5rem;
          letter-spacing: 0.13em;
          text-transform: uppercase;
          color: var(--color-text-muted, var(--color-text-secondary));
        }
        .ad-name {
          font-family: var(--font-family-serif, Georgia, serif);
          font-size: 0.95rem;
          line-height: 1.25;
          color: var(--color-text-primary, var(--color-fg));
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
        .ad-dur {
          flex: 0 0 auto;
          font-size: 0.58rem;
          color: var(--color-text-muted, var(--color-text-secondary));
        }
        .ad-icon {
          display: grid;
          place-items: center;
          min-width: 38px;
          min-height: 44px;
          background: transparent;
          border: 0;
          color: var(--color-text-muted, var(--color-text-secondary));
          cursor: pointer;
        }
        .ad-icon svg {
          width: 14px;
          height: 14px;
          fill: currentColor;
        }
        .ad-icon:disabled {
          opacity: 0.28;
        }
        .ad-find {
          padding: 1rem 1.2rem;
          border-top: 1px solid var(--color-border);
        }
        .ad-foot {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 1rem;
          padding: 0.8rem 1.2rem;
          border-top: 1px solid var(--color-border);
        }
        .ad-save,
        .ad-clear {
          min-height: 44px;
          background: transparent;
          border: 0;
          padding: 0;
          font-size: 0.58rem;
          letter-spacing: 0.13em;
          text-transform: uppercase;
          cursor: pointer;
        }
        .ad-save {
          color: var(--color-gold);
        }
        .ad-clear {
          color: var(--color-text-muted, var(--color-text-secondary));
        }
        .ad-play:focus-visible,
        .ad-icon:focus-visible,
        .ad-btn:focus-visible,
        .ad-save:focus-visible,
        .ad-clear:focus-visible,
        .ad-close:focus-visible {
          outline: 2px solid var(--color-gold);
          outline-offset: -2px;
        }
      `}</style>
    </>
  )
}
