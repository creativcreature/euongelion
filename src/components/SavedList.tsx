'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'

interface BookmarkItem {
  id: string
  devotional_slug: string
  note: string | null
  created_at: string
}

function titleFromSlug(slug: string): string {
  return slug
    .replace(/-day-(\d+)$/i, ' — Day $1')
    .replace(/-/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase())
}

export default function SavedList() {
  const [items, setItems] = useState<BookmarkItem[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [removing, setRemoving] = useState<string | null>(null)

  const load = useCallback(async () => {
    try {
      const res = await fetch('/api/bookmarks', { cache: 'no-store' })
      if (!res.ok) throw new Error(`Server returned ${res.status}`)
      const data = await res.json()
      setItems(Array.isArray(data.bookmarks) ? data.bookmarks : [])
      setError(null)
    } catch (err) {
      // Do NOT collapse a load failure into items=[] — that would falsely show
      // "Nothing saved yet" to a returning user who actually has saved items.
      // Leave items as-is (null on first load) and surface a real error state.
      setError(
        err instanceof Error
          ? err.message
          : 'Unable to load saved devotionals.',
      )
    }
  }, [])

  useEffect(() => {
    void load()
    const onUpdate = () => void load()
    window.addEventListener('libraryUpdated', onUpdate)
    return () => window.removeEventListener('libraryUpdated', onUpdate)
  }, [load])

  const remove = useCallback(async (slug: string) => {
    setRemoving(slug)
    try {
      const res = await fetch(
        `/api/bookmarks?devotionalSlug=${encodeURIComponent(slug)}`,
        { method: 'DELETE' },
      )
      if (!res.ok) throw new Error(`Server returned ${res.status}`)
      setItems((prev) =>
        prev ? prev.filter((b) => b.devotional_slug !== slug) : prev,
      )
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Unable to remove that item.',
      )
    } finally {
      setRemoving(null)
    }
  }, [])

  // Load failed before we ever got a list — show a real error with a retry,
  // not a misleading "nothing saved yet."
  if (items === null && error) {
    return (
      <div className="mx-auto max-w-lg px-5 py-16 text-center">
        <p className="text-label vw-small mb-3 text-gold">SAVED</p>
        <h1 className="vw-heading-md mb-4">
          We couldn’t load your saved items.
        </h1>
        <p className="vw-body mb-8 text-secondary">
          This is usually a connection hiccup — your saved devotionals are safe.
        </p>
        <button
          type="button"
          className="cta-major"
          onClick={() => {
            setError(null)
            void load()
          }}
        >
          TRY AGAIN
        </button>
      </div>
    )
  }

  if (items === null) {
    return (
      <div className="mx-auto max-w-2xl px-5 py-16 text-center">
        <p className="vw-small text-muted">Loading your saved devotionals…</p>
      </div>
    )
  }

  if (items.length === 0) {
    return (
      <div className="mx-auto max-w-lg px-5 py-16 text-center">
        <p className="text-label vw-small mb-3 text-gold">SAVED</p>
        <h1 className="vw-heading-md mb-4">Nothing saved yet.</h1>
        <p className="vw-body mb-8 text-secondary">
          Tap “Save” on any devotional and it will appear here for you to return
          to.
        </p>
        <Link href="/series" className="cta-major">
          BROWSE SERIES
        </Link>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-2xl px-5 py-8">
      <header className="mb-6">
        <p className="text-label vw-small mb-1 text-gold">SAVED</p>
        <h1 className="vw-heading-md">Your saved devotionals</h1>
        {/* One predictable retrieval pattern (F-030): bookmarks also live in
            the unified library rail alongside highlights, notes, and the plan
            archive. Point there so the two surfaces converge. */}
        <p className="vw-small mt-2 text-muted">
          <Link
            href="/library?tab=bookmarks"
            className="link-highlight text-label"
          >
            VIEW IN YOUR FULL LIBRARY →
          </Link>
        </p>
      </header>

      {error && (
        <p className="vw-small mb-4 text-gold" role="status">
          {error}
        </p>
      )}

      <ul className="list-none space-y-3">
        {items.map((b) => (
          <li
            key={b.id}
            className="flex items-center justify-between gap-4 border px-4 py-3"
            style={{ borderColor: 'var(--color-border)' }}
          >
            <Link
              href={`/wake-up/devotional/${b.devotional_slug}`}
              className="link-highlight flex-1"
            >
              <span className="vw-body block">
                {b.note?.trim() || titleFromSlug(b.devotional_slug)}
              </span>
              <span className="vw-small text-muted">{b.devotional_slug}</span>
            </Link>
            <button
              type="button"
              className="text-label vw-small text-muted"
              disabled={removing === b.devotional_slug}
              onClick={() => void remove(b.devotional_slug)}
              aria-label={`Remove ${b.note || b.devotional_slug}`}
            >
              {removing === b.devotional_slug ? 'REMOVING…' : 'REMOVE'}
            </button>
          </li>
        ))}
      </ul>

      {error && <p className="vw-small mt-4 text-muted">{error}</p>}
    </div>
  )
}
