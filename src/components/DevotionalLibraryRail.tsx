'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useProgressStore } from '@/stores/progressStore'
import { ALL_SERIES_ORDER, SERIES_DATA } from '@/data/series'

type LibraryMenuKey = 'archive' | 'bookmarks' | 'chat-notes' | 'favorite-verses'

type BookmarkRow = {
  id: string
  devotional_slug: string
  note: string | null
  created_at: string
}

type AnnotationRow = {
  id: string
  devotional_slug: string
  annotation_type: 'note' | 'highlight' | 'sticky' | 'sticker'
  anchor_text: string | null
  body: string | null
  style: Record<string, unknown> | null
  created_at: string
}

type PlanArchiveRow = {
  planToken: string
  seriesSlug: string
  createdAt: string
  route: string
  days: Array<{
    day: number
    title: string
    route: string
  }>
}

type CompletionRow = {
  slug: string
  title: string
  series: string
  completedAt: string
}

function buildSlugMetaMap() {
  const map = new Map<string, { title: string; series: string }>()
  for (const seriesSlug of ALL_SERIES_ORDER) {
    const series = SERIES_DATA[seriesSlug]
    if (!series) continue
    for (const day of series.days) {
      map.set(day.slug, {
        title: day.title,
        series: series.title,
      })
    }
  }
  return map
}

const SLUG_META = buildSlugMetaMap()

function formatDate(value: string): string {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: '2-digit',
    year: 'numeric',
  })
}

export default function DevotionalLibraryRail({
  className = '',
  initialTab = 'archive',
}: {
  className?: string
  initialTab?: LibraryMenuKey
}) {
  const [active, setActive] = useState<LibraryMenuKey>(initialTab)
  const [bookmarks, setBookmarks] = useState<BookmarkRow[]>([])
  const [chatNotes, setChatNotes] = useState<AnnotationRow[]>([])
  const [favoriteVerses, setFavoriteVerses] = useState<AnnotationRow[]>([])
  const [archivePlans, setArchivePlans] = useState<PlanArchiveRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const completions = useProgressStore((s) => s.completions)

  const completionRows = useMemo<CompletionRow[]>(() => {
    return [...completions]
      .sort((a, b) => b.completedAt.localeCompare(a.completedAt))
      .map((item) => {
        const meta = SLUG_META.get(item.slug)
        return {
          slug: item.slug,
          title: meta?.title || item.slug,
          series: meta?.series || 'Wake-Up',
          completedAt: item.completedAt,
        }
      })
  }, [completions])

  async function loadLibrary() {
    setLoading(true)
    setError(null)

    try {
      const [bookmarksRes, chatNotesRes, favoritesRes, archiveRes] =
        await Promise.all([
          fetch('/api/bookmarks', { cache: 'no-store' }),
          fetch('/api/annotations?annotationType=note&styleSource=chat', {
            cache: 'no-store',
          }),
          fetch(
            '/api/annotations?annotationType=highlight&styleKind=favorite_verse',
            {
              cache: 'no-store',
            },
          ),
          fetch('/api/soul-audit/archive', { cache: 'no-store' }),
        ])

      const [bookmarksJson, chatNotesJson, favoritesJson, archiveJson] =
        await Promise.all([
          bookmarksRes.json().catch(() => ({})),
          chatNotesRes.json().catch(() => ({})),
          favoritesRes.json().catch(() => ({})),
          archiveRes.json().catch(() => ({})),
        ])

      setBookmarks(
        Array.isArray((bookmarksJson as { bookmarks?: unknown[] }).bookmarks)
          ? ((bookmarksJson as { bookmarks: BookmarkRow[] })
              .bookmarks as BookmarkRow[])
          : [],
      )
      setChatNotes(
        Array.isArray(
          (chatNotesJson as { annotations?: unknown[] }).annotations,
        )
          ? ((chatNotesJson as { annotations: AnnotationRow[] })
              .annotations as AnnotationRow[])
          : [],
      )
      setFavoriteVerses(
        Array.isArray(
          (favoritesJson as { annotations?: unknown[] }).annotations,
        )
          ? ((favoritesJson as { annotations: AnnotationRow[] })
              .annotations as AnnotationRow[])
          : [],
      )
      setArchivePlans(
        Array.isArray((archiveJson as { archive?: unknown[] }).archive)
          ? ((archiveJson as { archive: PlanArchiveRow[] })
              .archive as PlanArchiveRow[])
          : [],
      )
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to load library.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void loadLibrary()
  }, [])

  useEffect(() => {
    setActive(initialTab)
  }, [initialTab])

  useEffect(() => {
    const handler = () => {
      void loadLibrary()
    }
    window.addEventListener('libraryUpdated', handler)
    return () => window.removeEventListener('libraryUpdated', handler)
  }, [])

  async function removeBookmarkRow(devotionalSlug: string) {
    await fetch(
      `/api/bookmarks?devotionalSlug=${encodeURIComponent(devotionalSlug)}`,
      { method: 'DELETE' },
    )
    setBookmarks((prev) =>
      prev.filter((row) => row.devotional_slug !== devotionalSlug),
    )
  }

  async function removeAnnotationRow(annotationId: string) {
    await fetch(
      `/api/annotations?annotationId=${encodeURIComponent(annotationId)}`,
      { method: 'DELETE' },
    )
    setChatNotes((prev) => prev.filter((row) => row.id !== annotationId))
    setFavoriteVerses((prev) => prev.filter((row) => row.id !== annotationId))
  }

  const counts = {
    archive: archivePlans.length + completionRows.length,
    bookmarks: bookmarks.length,
    'chat-notes': chatNotes.length,
    'favorite-verses': favoriteVerses.length,
  } as const

  return (
    <section
      className={`grid gap-6 md:grid-cols-[260px_minmax(0,1fr)] ${className}`.trim()}
    >
      <aside
        className="border-subtle bg-surface-raised p-4 md:sticky md:top-24 md:h-fit"
        aria-label="Devotional library menu"
      >
        <p className="text-label vw-small mb-4 text-gold">LIBRARY</p>
        <nav className="grid gap-2">
          {(
            [
              ['archive', 'Archived Pages'],
              ['bookmarks', 'Bookmarks'],
              ['chat-notes', 'Chat Notes'],
              ['favorite-verses', 'Favorite Verses'],
            ] as Array<[LibraryMenuKey, string]>
          ).map(([key, label]) => (
            <button
              key={key}
              type="button"
              onClick={() => setActive(key)}
              className={`text-label vw-small flex items-center justify-between border px-3 py-2 text-left ${
                active === key
                  ? 'text-[var(--color-text-primary)]'
                  : 'text-muted'
              }`}
              style={{ borderColor: 'var(--color-border)' }}
            >
              <span>{label}</span>
              <span className="oldstyle-nums">{counts[key]}</span>
            </button>
          ))}
        </nav>
      </aside>

      <div className="border-subtle bg-page p-4 md:p-6">
        {loading ? (
          <p className="vw-small text-muted">Loading library...</p>
        ) : error ? (
          <p className="vw-small text-secondary">{error}</p>
        ) : (
          <>
            {active === 'archive' && (
              <div className="space-y-6">
                <div>
                  <p className="text-label vw-small mb-3 text-gold">
                    Curated Plan Archive
                  </p>
                  {archivePlans.length === 0 ? (
                    <p className="vw-small text-muted">
                      No curated plans archived yet.
                    </p>
                  ) : (
                    <div className="space-y-3">
                      {archivePlans.map((plan) => (
                        <div
                          key={plan.planToken}
                          className="border px-3 py-3"
                          style={{ borderColor: 'var(--color-border)' }}
                        >
                          <div className="mb-2 flex items-center justify-between gap-3">
                            <Link
                              href={plan.route}
                              className="text-label vw-small link-highlight"
                            >
                              Open Plan
                            </Link>
                            <span className="vw-small text-muted">
                              {formatDate(plan.createdAt)}
                            </span>
                          </div>
                          <div className="grid gap-2 md:grid-cols-2">
                            {plan.days.slice(0, 5).map((day) => (
                              <Link
                                key={`${plan.planToken}-${day.day}`}
                                href={day.route}
                                className="vw-small block border px-2 py-2 text-secondary"
                                style={{ borderColor: 'var(--color-border)' }}
                              >
                                Day {day.day}: {day.title}
                              </Link>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div>
                  <p className="text-label vw-small mb-3 text-gold">
                    Completed Wake-Up Pages
                  </p>
                  {completionRows.length === 0 ? (
                    <p className="vw-small text-muted">
                      No completed pages yet.
                    </p>
                  ) : (
                    <div className="space-y-2">
                      {completionRows.map((item) => (
                        <div
                          key={item.slug}
                          className="flex items-center justify-between gap-3 border px-3 py-2"
                          style={{ borderColor: 'var(--color-border)' }}
                        >
                          <Link
                            href={`/wake-up/devotional/${item.slug}`}
                            className="vw-small link-highlight text-secondary"
                          >
                            {item.title}
                          </Link>
                          <span className="vw-small text-muted">
                            {formatDate(item.completedAt)}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {active === 'bookmarks' && (
              <div>
                <p className="text-label vw-small mb-3 text-gold">Bookmarks</p>
                {bookmarks.length === 0 ? (
                  <p className="vw-small text-muted">No bookmarks yet.</p>
                ) : (
                  <div className="space-y-2">
                    {bookmarks.map((bookmark) => (
                      <div
                        key={bookmark.id}
                        className="flex items-center justify-between gap-3 border px-3 py-2"
                        style={{ borderColor: 'var(--color-border)' }}
                      >
                        <div>
                          <Link
                            href={`/wake-up/devotional/${bookmark.devotional_slug}`}
                            className="vw-small link-highlight text-secondary"
                          >
                            {SLUG_META.get(bookmark.devotional_slug)?.title ||
                              bookmark.devotional_slug}
                          </Link>
                          <p className="vw-small text-muted">
                            {bookmark.note || 'Saved bookmark'}
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() =>
                            void removeBookmarkRow(bookmark.devotional_slug)
                          }
                          className="text-label vw-small text-muted"
                        >
                          Remove
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {active === 'chat-notes' && (
              <div>
                <p className="text-label vw-small mb-3 text-gold">Chat Notes</p>
                {chatNotes.length === 0 ? (
                  <p className="vw-small text-muted">
                    No chat notes saved yet.
                  </p>
                ) : (
                  <div className="space-y-2">
                    {chatNotes.map((note) => (
                      <div
                        key={note.id}
                        className="border px-3 py-2"
                        style={{ borderColor: 'var(--color-border)' }}
                      >
                        <div className="mb-2 flex items-center justify-between gap-3">
                          <Link
                            href={`/wake-up/devotional/${note.devotional_slug}`}
                            className="vw-small link-highlight text-muted"
                          >
                            {SLUG_META.get(note.devotional_slug)?.title ||
                              note.devotional_slug}
                          </Link>
                          <button
                            type="button"
                            onClick={() => void removeAnnotationRow(note.id)}
                            className="text-label vw-small text-muted"
                          >
                            Remove
                          </button>
                        </div>
                        <p className="vw-small text-secondary">{note.body}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {active === 'favorite-verses' && (
              <div>
                <p className="text-label vw-small mb-3 text-gold">
                  Favorite Verses
                </p>
                {favoriteVerses.length === 0 ? (
                  <p className="vw-small text-muted">
                    Highlight text in a devotional, then tap Save Verse.
                  </p>
                ) : (
                  <div className="space-y-2">
                    {favoriteVerses.map((row) => (
                      <div
                        key={row.id}
                        className="border px-3 py-2"
                        style={{ borderColor: 'var(--color-border)' }}
                      >
                        <div className="mb-2 flex items-center justify-between gap-3">
                          <Link
                            href={`/wake-up/devotional/${row.devotional_slug}`}
                            className="vw-small link-highlight text-muted"
                          >
                            {SLUG_META.get(row.devotional_slug)?.series ||
                              'Devotional'}
                          </Link>
                          <button
                            type="button"
                            onClick={() => void removeAnnotationRow(row.id)}
                            className="text-label vw-small text-muted"
                          >
                            Remove
                          </button>
                        </div>
                        <p className="text-serif-italic vw-small text-secondary">
                          {row.anchor_text || row.body}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </section>
  )
}
