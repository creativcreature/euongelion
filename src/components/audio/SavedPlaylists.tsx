'use client'

import { useState } from 'react'
import { getAudioElement } from '@/lib/audio/audio-element'
import { formatRuntime, queueDuration } from '@/lib/audio/queue-builder'
import { useAudioStore } from '@/stores/audioStore'
import { usePlaylistsStore } from '@/stores/playlistsStore'

/**
 * Playlists a reader kept, in the library.
 *
 * Founder ruling, 2026-08-19: playlists are stored in the library. They are made
 * from whatever is queued — saving is one tap in the drawer — so this surface
 * only has to play, rename and delete them. There is deliberately no
 * create-empty-then-fill flow, because that is the one nobody finishes.
 *
 * Renders nothing until a reader has saved one. An empty shelf explaining a
 * feature they have not used is clutter on a page that is already dense.
 */
export default function SavedPlaylists() {
  const playlists = usePlaylistsStore((s) => s.playlists)
  const rename = usePlaylistsStore((s) => s.rename)
  const removePlaylist = usePlaylistsStore((s) => s.remove)
  const start = useAudioStore((s) => s.start)
  const [editing, setEditing] = useState<string | null>(null)
  const [draft, setDraft] = useState('')

  if (!playlists.length) return null

  return (
    <section className="pl" aria-labelledby="pl-heading">
      <p className="pl-eyebrow">Kept</p>
      <h2 id="pl-heading" className="pl-title">
        Your playlists
      </h2>

      <ul className="pl-list">
        {playlists.map((playlist) => (
          <li key={playlist.id}>
            <div className="pl-row">
              <button
                type="button"
                className="pl-play"
                aria-label={`Play ${playlist.name}`}
                onClick={() => {
                  start({
                    items: playlist.items,
                    source: 'saved',
                    label: playlist.name,
                  })
                  // Synchronous inside the tap, or iOS drops the grant.
                  const audio = getAudioElement()
                  if (audio) void audio.play().catch(() => {})
                }}
              >
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M8 5v14l11-7z" />
                </svg>
              </button>

              <div className="pl-text">
                {editing === playlist.id ? (
                  <input
                    className="pl-input"
                    value={draft}
                    autoFocus
                    aria-label={`Rename ${playlist.name}`}
                    onChange={(e) => setDraft(e.target.value)}
                    onBlur={() => {
                      rename(playlist.id, draft)
                      setEditing(null)
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        rename(playlist.id, draft)
                        setEditing(null)
                      }
                      if (e.key === 'Escape') setEditing(null)
                    }}
                  />
                ) : (
                  <span className="pl-name">{playlist.name}</span>
                )}
                <span className="pl-meta oldstyle-nums">
                  {playlist.items.length}{' '}
                  {playlist.items.length === 1 ? 'reading' : 'readings'} ·{' '}
                  {formatRuntime(queueDuration(playlist.items))}
                </span>
              </div>

              <button
                type="button"
                className="pl-icon"
                aria-label={`Rename ${playlist.name}`}
                onClick={() => {
                  setDraft(playlist.name)
                  setEditing(playlist.id)
                }}
              >
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M3 17.25V21h3.75L17.8 9.94l-3.75-3.75zM20.7 7.04a1 1 0 0 0 0-1.41l-2.34-2.34a1 1 0 0 0-1.41 0l-1.83 1.83 3.75 3.75z" />
                </svg>
              </button>
              <button
                type="button"
                className="pl-icon"
                aria-label={`Delete ${playlist.name}`}
                onClick={() => removePlaylist(playlist.id)}
              >
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M18.3 5.7 12 12l6.3 6.3-1.4 1.4L10.6 13.4 4.3 19.7 2.9 18.3 9.2 12 2.9 5.7 4.3 4.3l6.3 6.3 6.3-6.3z" />
                </svg>
              </button>
            </div>
          </li>
        ))}
      </ul>

      <style jsx>{`
        .pl {
          margin: 2rem 0;
          border-top: 1px solid var(--color-border);
          padding-top: 1rem;
        }
        .pl-eyebrow {
          font-size: 0.55rem;
          letter-spacing: 0.17em;
          text-transform: uppercase;
          color: var(--color-gold);
          margin-bottom: 0.2rem;
        }
        .pl-title {
          font-family: var(--font-family-serif, Georgia, serif);
          font-style: italic;
          font-size: 1.3rem;
          line-height: 1.15;
          margin-bottom: 0.7rem;
          color: var(--color-text-primary, var(--color-fg));
        }
        .pl-list {
          list-style: none;
          margin: 0;
          padding: 0;
        }
        .pl-row {
          display: flex;
          align-items: center;
          gap: 0.4rem;
          border-bottom: 1px solid var(--color-border);
        }
        .pl-play {
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
        .pl-play svg {
          width: 16px;
          height: 16px;
          fill: currentColor;
        }
        .pl-text {
          flex: 1 1 auto;
          min-width: 0;
          display: flex;
          flex-direction: column;
          padding: 0.5rem 0;
        }
        .pl-name {
          font-family: var(--font-family-serif, Georgia, serif);
          font-size: 1rem;
          color: var(--color-text-primary, var(--color-fg));
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
        .pl-input {
          font-family: var(--font-family-serif, Georgia, serif);
          font-size: 1rem;
          background: transparent;
          color: var(--color-text-primary, var(--color-fg));
          border: 0;
          border-bottom: 1px solid var(--color-gold);
          padding: 0.1rem 0;
        }
        .pl-meta {
          font-size: 0.58rem;
          letter-spacing: 0.07em;
          color: var(--color-text-muted, var(--color-text-secondary));
        }
        .pl-icon {
          display: grid;
          place-items: center;
          min-width: 40px;
          min-height: 44px;
          background: transparent;
          border: 0;
          color: var(--color-text-muted, var(--color-text-secondary));
          cursor: pointer;
        }
        .pl-icon svg {
          width: 14px;
          height: 14px;
          fill: currentColor;
        }
        .pl-play:focus-visible,
        .pl-icon:focus-visible,
        .pl-input:focus-visible {
          outline: 2px solid var(--color-gold);
          outline-offset: -2px;
        }
      `}</style>
    </section>
  )
}
