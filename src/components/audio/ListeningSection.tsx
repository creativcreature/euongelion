'use client'

import Link from 'next/link'
import { getAudioElement } from '@/lib/audio/audio-element'
import { formatRuntime, queueDuration } from '@/lib/audio/queue-builder'
import { formatTime } from '@/lib/audio/tracks'
import { useAudioStore } from '@/stores/audioStore'
import { useDownloadsStore } from '@/stores/downloadsStore'
import { requestDownload, requestRemove } from '@/lib/audio/downloads'

/**
 * Your listening, in the library.
 *
 * Founder placement, 2026-08-19: listening belongs where saved things already
 * live rather than behind its own address. The library is where *your*
 * listening lives — what is queued, what is playing; discovery of *new*
 * listening is a separate job and does not belong here.
 *
 * The vocabulary is the one every studied queue uses (NYTimes Audio, Apple
 * Podcasts): an "Up next" heading, rows carrying context and runtime, and an
 * empty state that offers a way out instead of a dead end.
 */
export default function ListeningSection() {
  const queue = useAudioStore((s) => s.queue)
  const index = useAudioStore((s) => s.index)
  const label = useAudioStore((s) => s.label)
  const jumpTo = useAudioStore((s) => s.jumpTo)
  const remove = useAudioStore((s) => s.remove)
  const reorder = useAudioStore((s) => s.reorder)
  const clear = useAudioStore((s) => s.clear)
  const downloadStates = useDownloadsStore((s) => s.states)

  const upcoming = queue.slice(index)

  return (
    <section className="ls" aria-labelledby="ls-heading">
      <header className="ls-head">
        <p className="ls-eyebrow">Up next</p>
        <h2 id="ls-heading" className="ls-title">
          {label ?? 'Your listening'}
        </h2>
        {upcoming.length > 1 && (
          <p className="ls-meta oldstyle-nums">
            {upcoming.length} readings ·{' '}
            {formatRuntime(queueDuration(upcoming))}
          </p>
        )}
      </header>

      {queue.length === 0 ? (
        /* An empty state with a route out, not a dead end. */
        <div className="ls-empty">
          <p>Nothing queued.</p>
          <Link href="/series" className="ls-empty-link">
            Find something to listen to
          </Link>
        </div>
      ) : (
        <ol className="ls-list">
          {queue.map((track, i) => {
            const isCurrent = i === index
            const isPast = i < index
            return (
              <li key={track.slug} className={isPast ? 'is-past' : undefined}>
                <div className={`ls-row${isCurrent ? ' is-current' : ''}`}>
                  <button
                    type="button"
                    className="ls-play"
                    aria-label={`Play ${track.title}`}
                    onClick={() => {
                      jumpTo(i)
                      // Synchronous inside the tap, or iOS drops the grant.
                      const audio = getAudioElement()
                      if (audio) void audio.play().catch(() => {})
                    }}
                  >
                    <svg viewBox="0 0 24 24" aria-hidden="true">
                      <path d="M8 5v14l11-7z" />
                    </svg>
                  </button>

                  <Link href={track.href} className="ls-text">
                    {track.context && (
                      <span className="ls-context">{track.context}</span>
                    )}
                    <span className="ls-name">{track.title}</span>
                    <span className="ls-time oldstyle-nums">
                      {formatTime(track.duration)}
                    </span>
                  </Link>

                  <div className="ls-actions">
                    <button
                      type="button"
                      className="ls-icon"
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
                      className="ls-icon"
                      aria-label={`Move ${track.title} down`}
                      disabled={i === queue.length - 1}
                      onClick={() => reorder(i, i + 1)}
                    >
                      <svg viewBox="0 0 24 24" aria-hidden="true">
                        <path d="M12 16l-6-6h12z" />
                      </svg>
                    </button>
                    {/* SA-101: keep for offline. The bytes live in a cache the
                        service worker owns and that survives every deploy. */}
                    <button
                      type="button"
                      className={`ls-icon${downloadStates[track.src] === 'done' ? ' is-saved' : ''}`}
                      aria-label={
                        downloadStates[track.src] === 'done'
                          ? `Remove the download of ${track.title}`
                          : `Download ${track.title} to listen offline`
                      }
                      disabled={downloadStates[track.src] === 'downloading'}
                      onClick={() =>
                        downloadStates[track.src] === 'done'
                          ? requestRemove(track.slug, track.src)
                          : requestDownload(track.slug, track.src)
                      }
                    >
                      {downloadStates[track.src] === 'done' ? (
                        <svg viewBox="0 0 24 24" aria-hidden="true">
                          <path d="M9 16.2 4.8 12l-1.4 1.4L9 19 21 7l-1.4-1.4z" />
                        </svg>
                      ) : (
                        <svg viewBox="0 0 24 24" aria-hidden="true">
                          <path d="M12 16l-6-6h4V4h4v6h4zM4 18h16v2H4z" />
                        </svg>
                      )}
                    </button>
                    <button
                      type="button"
                      className="ls-icon"
                      aria-label={`Remove ${track.title} from the queue`}
                      onClick={() => remove(track.slug)}
                    >
                      <svg viewBox="0 0 24 24" aria-hidden="true">
                        <path d="M18.3 5.7 12 12l6.3 6.3-1.4 1.4L10.6 13.4 4.3 19.7 2.9 18.3 9.2 12 2.9 5.7 4.3 4.3l6.3 6.3 6.3-6.3z" />
                      </svg>
                    </button>
                  </div>
                </div>
              </li>
            )
          })}
        </ol>
      )}

      {queue.length > 0 && (
        <button type="button" className="ls-clear" onClick={clear}>
          Clear the queue
        </button>
      )}

      <style jsx>{`
        .ls {
          margin: 2rem 0 2.5rem;
          border-top: 2px solid var(--color-gold);
          padding-top: 1rem;
        }
        .ls-head {
          margin-bottom: 0.9rem;
        }
        .ls-eyebrow {
          font-size: 0.55rem;
          letter-spacing: 0.17em;
          text-transform: uppercase;
          color: var(--color-gold);
          margin-bottom: 0.2rem;
        }
        .ls-title {
          font-family: var(--font-family-serif, Georgia, serif);
          font-style: italic;
          font-size: 1.35rem;
          line-height: 1.15;
          color: var(--color-text-primary, var(--color-fg));
        }
        .ls-meta {
          margin-top: 0.25rem;
          font-size: 0.62rem;
          letter-spacing: 0.08em;
          color: var(--color-text-muted, var(--color-text-secondary));
          font-variant-numeric: oldstyle-nums;
        }
        .ls-empty {
          padding: 1.1rem 1.15rem;
          border: 1px solid var(--color-border);
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
          align-items: flex-start;
        }
        .ls-empty p {
          color: var(--color-text-muted, var(--color-text-secondary));
          font-size: 0.92rem;
        }
        .ls-empty-link {
          font-size: 0.6rem;
          letter-spacing: 0.13em;
          text-transform: uppercase;
          color: var(--color-gold);
        }
        .ls-list {
          list-style: none;
          margin: 0;
          padding: 0;
        }
        .ls-list :global(li.is-past) {
          opacity: 0.45;
        }
        .ls-row {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          border-bottom: 1px solid var(--color-border);
          box-shadow: inset 3px 0 0 transparent;
        }
        .ls-row.is-current {
          box-shadow: inset 3px 0 0 var(--color-gold);
        }
        .ls-play {
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
        .ls-play svg {
          width: 17px;
          height: 17px;
          fill: currentColor;
        }
        .ls-text {
          flex: 1 1 auto;
          min-width: 0;
          display: flex;
          flex-direction: column;
          padding: 0.55rem 0;
          text-decoration: none;
        }
        .ls-context {
          font-size: 0.53rem;
          letter-spacing: 0.14em;
          text-transform: uppercase;
          color: var(--color-text-muted, var(--color-text-secondary));
        }
        .ls-name {
          font-family: var(--font-family-serif, Georgia, serif);
          font-size: 1rem;
          line-height: 1.25;
          color: var(--color-text-primary, var(--color-fg));
        }
        .ls-time {
          font-size: 0.6rem;
          letter-spacing: 0.06em;
          color: var(--color-text-muted, var(--color-text-secondary));
          font-variant-numeric: oldstyle-nums;
        }
        .ls-actions {
          flex: 0 0 auto;
          display: flex;
          gap: 0.1rem;
        }
        .ls-icon {
          display: grid;
          place-items: center;
          min-width: 40px;
          min-height: 44px;
          background: transparent;
          border: 0;
          color: var(--color-text-muted, var(--color-text-secondary));
          cursor: pointer;
        }
        .ls-icon svg {
          width: 15px;
          height: 15px;
          fill: currentColor;
        }
        .ls-icon:disabled {
          opacity: 0.28;
        }
        .ls-icon.is-saved {
          color: var(--color-gold);
        }
        .ls-icon:focus-visible,
        .ls-play:focus-visible {
          outline: 2px solid var(--color-gold);
          outline-offset: -2px;
        }
        .ls-clear {
          margin-top: 0.9rem;
          min-height: 44px;
          background: transparent;
          border: 0;
          padding: 0;
          font-size: 0.58rem;
          letter-spacing: 0.13em;
          text-transform: uppercase;
          color: var(--color-text-muted, var(--color-text-secondary));
          cursor: pointer;
        }
      `}</style>
    </section>
  )
}
