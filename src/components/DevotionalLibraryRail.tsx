'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { ALL_SERIES_ORDER, SERIES_DATA } from '@/data/series'
import { useProgressStore } from '@/stores/progressStore'

type LibraryMenuKey =
  | 'today'
  | 'bookmarks'
  | 'highlights'
  | 'notes'
  | 'chat-history'
  | 'archive'
  | 'trash'

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

type ActiveDayRow = {
  day: number
  title: string
  scriptureReference: string
  scriptureText: string
  status: 'current' | 'unlocked' | 'locked' | 'archived' | 'onboarding'
  route: string
  lockMessage?: string
  unlockAt?: string
}

type ActiveDaysPayload = {
  ok?: boolean
  hasPlan?: boolean
  planToken?: string
  seriesSlug?: string
  currentDay?: number | null
  dayLocking?: 'enabled' | 'disabled'
  days?: ActiveDayRow[]
}

type CompletionRow = {
  slug: string
  title: string
  series: string
  completedAt: string
}

type ArchivedArtifactKind = 'bookmark' | 'annotation'

type ArchivedArtifact = {
  id: string
  kind: ArchivedArtifactKind
  devotionalSlug: string
  label: string
  sublabel?: string | null
  createdAt: string
  annotationType?: AnnotationRow['annotation_type']
  anchorText?: string | null
  body?: string | null
  style?: Record<string, unknown> | null
}

type TrashedArtifact = ArchivedArtifact & {
  trashedAt: string
}

const ARCHIVE_STORAGE_KEY = 'euangelion-library-archived-artifacts-v1'
const TRASH_STORAGE_KEY = 'euangelion-library-trash-artifacts-v1'
const LOCKED_DAY_REMINDER_KEY = 'euangelion-locked-day-reminders-v1'

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

function parsePlanSlug(
  devotionalSlug: string,
): { token: string; day: number } | null {
  const planMatch = devotionalSlug.match(/^plan-([a-f0-9-]+)-day-(\d+)$/i)
  if (!planMatch) return null
  return {
    token: planMatch[1],
    day: Number.parseInt(planMatch[2], 10),
  }
}

function resolveDevotionalHref(devotionalSlug: string): string {
  const plan = parsePlanSlug(devotionalSlug)
  if (plan) {
    return `/soul-audit/results?planToken=${plan.token}#plan-day-${plan.day}`
  }
  return `/wake-up/devotional/${devotionalSlug}`
}

function resolveDevotionalLabel(devotionalSlug: string): string {
  const plan = parsePlanSlug(devotionalSlug)
  if (plan) return `Plan Day ${plan.day}`
  return SLUG_META.get(devotionalSlug)?.title || devotionalSlug
}

function resolveSeriesLabel(devotionalSlug: string): string {
  const plan = parsePlanSlug(devotionalSlug)
  if (plan) return 'Soul Audit Plan'
  return SLUG_META.get(devotionalSlug)?.series || 'Wake-Up'
}

function safeParseLocalArray<T>(key: string): T[] {
  if (typeof window === 'undefined') return []
  const raw = window.localStorage.getItem(key)
  if (!raw) return []
  try {
    const parsed = JSON.parse(raw) as unknown
    return Array.isArray(parsed) ? (parsed as T[]) : []
  } catch {
    return []
  }
}

function safeParseLocalRecord(key: string): Record<string, boolean> {
  if (typeof window === 'undefined') return {}
  const raw = window.localStorage.getItem(key)
  if (!raw) return {}
  try {
    const parsed = JSON.parse(raw) as unknown
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      return {}
    }
    return Object.fromEntries(
      Object.entries(parsed).filter((entry) => typeof entry[1] === 'boolean'),
    )
  } catch {
    return {}
  }
}

function formatUnlockDate(value: string | undefined): string {
  if (!value) return 'Next scheduled unlock at 7:00 AM local time.'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) {
    return 'Next scheduled unlock at 7:00 AM local time.'
  }
  return date.toLocaleString('en-US', {
    weekday: 'short',
    month: 'short',
    day: '2-digit',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  })
}

function normalizeInitialTab(value: string | undefined): LibraryMenuKey {
  if (
    value === 'today' ||
    value === 'bookmarks' ||
    value === 'highlights' ||
    value === 'notes' ||
    value === 'chat-history' ||
    value === 'archive' ||
    value === 'trash'
  ) {
    return value
  }

  if (value === 'favorite-verses') return 'highlights'
  if (value === 'chat-notes') return 'chat-history'
  return 'today'
}

export default function DevotionalLibraryRail({
  className = '',
  initialTab = 'today',
}: {
  className?: string
  initialTab?: string
}) {
  const [active, setActive] = useState<LibraryMenuKey>(
    normalizeInitialTab(initialTab),
  )
  const [activeDays, setActiveDays] = useState<ActiveDayRow[]>([])
  const [activePlanToken, setActivePlanToken] = useState<string | null>(null)
  const [activeSeriesSlug, setActiveSeriesSlug] = useState<string | null>(null)
  const [bookmarks, setBookmarks] = useState<BookmarkRow[]>([])
  const [highlights, setHighlights] = useState<AnnotationRow[]>([])
  const [notes, setNotes] = useState<AnnotationRow[]>([])
  const [chatHistory, setChatHistory] = useState<AnnotationRow[]>([])
  const [archivePlans, setArchivePlans] = useState<PlanArchiveRow[]>([])
  const [archivedArtifacts, setArchivedArtifacts] = useState<
    ArchivedArtifact[]
  >([])
  const [trashedArtifacts, setTrashedArtifacts] = useState<TrashedArtifact[]>(
    [],
  )
  const [lockedDayTeaser, setLockedDayTeaser] = useState<ActiveDayRow | null>(
    null,
  )
  const [dayReminders, setDayReminders] = useState<Record<string, boolean>>({})
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

  useEffect(() => {
    setArchivedArtifacts(
      safeParseLocalArray<ArchivedArtifact>(ARCHIVE_STORAGE_KEY),
    )
    setTrashedArtifacts(safeParseLocalArray<TrashedArtifact>(TRASH_STORAGE_KEY))
    setDayReminders(safeParseLocalRecord(LOCKED_DAY_REMINDER_KEY))
  }, [])

  function persistArchiveState(
    nextArchive: ArchivedArtifact[],
    nextTrash: TrashedArtifact[],
  ) {
    setArchivedArtifacts(nextArchive)
    setTrashedArtifacts(nextTrash)
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(
        ARCHIVE_STORAGE_KEY,
        JSON.stringify(nextArchive),
      )
      window.localStorage.setItem(TRASH_STORAGE_KEY, JSON.stringify(nextTrash))
    }
  }

  async function loadLibrary() {
    setLoading(true)
    setError(null)

    try {
      const [activeDaysRes, bookmarksRes, annotationsRes, archiveRes] =
        await Promise.all([
          fetch('/api/daily-bread/active-days', { cache: 'no-store' }),
          fetch('/api/bookmarks', { cache: 'no-store' }),
          fetch('/api/annotations', { cache: 'no-store' }),
          fetch('/api/soul-audit/archive', { cache: 'no-store' }),
        ])

      const [activeDaysJson, bookmarksJson, annotationsJson, archiveJson] =
        await Promise.all([
          activeDaysRes.json().catch(() => ({})),
          bookmarksRes.json().catch(() => ({})),
          annotationsRes.json().catch(() => ({})),
          archiveRes.json().catch(() => ({})),
        ])

      const activeDaysPayload = activeDaysJson as ActiveDaysPayload
      const annotationRows = Array.isArray(
        (annotationsJson as { annotations?: unknown[] }).annotations,
      )
        ? ((annotationsJson as { annotations: AnnotationRow[] })
            .annotations as AnnotationRow[])
        : []

      setActiveDays(
        Array.isArray(activeDaysPayload.days)
          ? [...activeDaysPayload.days].sort((a, b) => a.day - b.day)
          : [],
      )
      setLockedDayTeaser((current) => {
        if (!current || !Array.isArray(activeDaysPayload.days)) return current
        const nextMatch = activeDaysPayload.days.find(
          (day) => day.day === current.day,
        )
        return nextMatch ?? null
      })
      setActivePlanToken(
        typeof activeDaysPayload.planToken === 'string'
          ? activeDaysPayload.planToken
          : null,
      )
      setActiveSeriesSlug(
        typeof activeDaysPayload.seriesSlug === 'string'
          ? activeDaysPayload.seriesSlug
          : null,
      )
      setBookmarks(
        Array.isArray((bookmarksJson as { bookmarks?: unknown[] }).bookmarks)
          ? ((bookmarksJson as { bookmarks: BookmarkRow[] })
              .bookmarks as BookmarkRow[])
          : [],
      )
      setHighlights(
        annotationRows.filter((row) => row.annotation_type === 'highlight'),
      )
      setChatHistory(
        annotationRows.filter(
          (row) =>
            row.annotation_type === 'note' &&
            String(row.style?.source || '') === 'chat',
        ),
      )
      setNotes(
        annotationRows.filter(
          (row) =>
            row.annotation_type === 'note' &&
            String(row.style?.source || '') !== 'chat',
        ),
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
    setActive(normalizeInitialTab(initialTab))
  }, [initialTab])

  useEffect(() => {
    const handler = () => {
      void loadLibrary()
    }
    window.addEventListener('libraryUpdated', handler)
    return () => window.removeEventListener('libraryUpdated', handler)
  }, [])

  async function archiveBookmarkRow(bookmark: BookmarkRow) {
    const response = await fetch(
      `/api/bookmarks?devotionalSlug=${encodeURIComponent(bookmark.devotional_slug)}`,
      { method: 'DELETE' },
    )
    if (!response.ok) {
      const payload = (await response.json().catch(() => ({}))) as {
        error?: string
      }
      setError(payload.error || 'Unable to archive bookmark.')
      return
    }

    setBookmarks((prev) =>
      prev.filter((row) => row.devotional_slug !== bookmark.devotional_slug),
    )
    const artifact: ArchivedArtifact = {
      id: `bookmark:${bookmark.id}`,
      kind: 'bookmark',
      devotionalSlug: bookmark.devotional_slug,
      label: resolveDevotionalLabel(bookmark.devotional_slug),
      sublabel: bookmark.note || 'Saved bookmark',
      createdAt: bookmark.created_at,
    }
    persistArchiveState([artifact, ...archivedArtifacts], trashedArtifacts)
  }

  async function archiveAnnotationRow(annotation: AnnotationRow) {
    const response = await fetch(
      `/api/annotations?annotationId=${encodeURIComponent(annotation.id)}`,
      {
        method: 'DELETE',
      },
    )
    if (!response.ok) {
      const payload = (await response.json().catch(() => ({}))) as {
        error?: string
      }
      setError(payload.error || 'Unable to archive annotation.')
      return
    }

    setHighlights((prev) => prev.filter((row) => row.id !== annotation.id))
    setNotes((prev) => prev.filter((row) => row.id !== annotation.id))
    setChatHistory((prev) => prev.filter((row) => row.id !== annotation.id))

    const artifact: ArchivedArtifact = {
      id: `annotation:${annotation.id}`,
      kind: 'annotation',
      devotionalSlug: annotation.devotional_slug,
      label: resolveDevotionalLabel(annotation.devotional_slug),
      sublabel: annotation.anchor_text || annotation.body || 'Saved annotation',
      createdAt: annotation.created_at,
      annotationType: annotation.annotation_type,
      anchorText: annotation.anchor_text,
      body: annotation.body,
      style: annotation.style,
    }
    persistArchiveState([artifact, ...archivedArtifacts], trashedArtifacts)
  }

  async function restoreArtifact(artifact: ArchivedArtifact | TrashedArtifact) {
    if (artifact.kind === 'bookmark') {
      const response = await fetch('/api/bookmarks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          devotionalSlug: artifact.devotionalSlug,
          note: artifact.sublabel ?? null,
        }),
      })
      if (!response.ok) {
        const payload = (await response.json().catch(() => ({}))) as {
          error?: string
        }
        setError(payload.error || 'Unable to restore bookmark.')
        return
      }
    }

    if (artifact.kind === 'annotation') {
      const response = await fetch('/api/annotations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          devotionalSlug: artifact.devotionalSlug,
          annotationType: artifact.annotationType ?? 'note',
          anchorText: artifact.anchorText ?? null,
          body: artifact.body ?? null,
          style: artifact.style ?? null,
        }),
      })
      if (!response.ok) {
        const payload = (await response.json().catch(() => ({}))) as {
          error?: string
        }
        setError(payload.error || 'Unable to restore annotation.')
        return
      }
    }

    persistArchiveState(
      archivedArtifacts.filter((item) => item.id !== artifact.id),
      trashedArtifacts.filter((item) => item.id !== artifact.id),
    )
    await loadLibrary()
    window.dispatchEvent(new CustomEvent('libraryUpdated'))
  }

  function moveArtifactToTrash(artifact: ArchivedArtifact) {
    const nextArchive = archivedArtifacts.filter(
      (item) => item.id !== artifact.id,
    )
    const nextTrash: TrashedArtifact[] = [
      {
        ...artifact,
        trashedAt: new Date().toISOString(),
      },
      ...trashedArtifacts,
    ]
    persistArchiveState(nextArchive, nextTrash)
  }

  function removeArtifactPermanently(artifactId: string) {
    persistArchiveState(
      archivedArtifacts,
      trashedArtifacts.filter((item) => item.id !== artifactId),
    )
  }

  function reminderKey(day: ActiveDayRow): string {
    const planToken = activePlanToken || 'no-plan'
    return `${planToken}:${day.day}`
  }

  function toggleReminder(day: ActiveDayRow) {
    const key = reminderKey(day)
    setDayReminders((current) => {
      const next = {
        ...current,
        [key]: !current[key],
      }
      if (typeof window !== 'undefined') {
        window.localStorage.setItem(
          LOCKED_DAY_REMINDER_KEY,
          JSON.stringify(next),
        )
      }
      return next
    })
  }

  const counts = {
    today: activeDays.length,
    bookmarks: bookmarks.length,
    highlights: highlights.length,
    notes: notes.length,
    'chat-history': chatHistory.length,
    archive:
      archivePlans.length + completionRows.length + archivedArtifacts.length,
    trash: trashedArtifacts.length,
  } as const
  const libraryTabs: Array<[LibraryMenuKey, string]> = [
    ['today', 'Today + 7 Days'],
    ['bookmarks', 'Bookmarks'],
    ['highlights', 'Highlights'],
    ['notes', 'Notes'],
    ['chat-history', 'Chat History'],
    ['archive', 'Archive'],
    ['trash', 'Trash'],
  ]

  return (
    <section
      className={`grid gap-6 md:grid-cols-[280px_minmax(0,1fr)] ${className}`.trim()}
    >
      <aside
        className="shell-sticky-panel border-subtle bg-surface-raised p-4 md:h-fit"
        aria-label="Devotional library menu"
      >
        <p className="text-label vw-small mb-4 text-gold">LIBRARY</p>
        <nav
          className="grid gap-2"
          role="tablist"
          aria-label="Daily Bread library sections"
        >
          {libraryTabs.map(([key, label]) => (
            <button
              key={key}
              type="button"
              onClick={() => setActive(key)}
              role="tab"
              id={`library-tab-${key}`}
              aria-selected={active === key}
              aria-controls={`library-panel-${key}`}
              className={`text-label vw-small flex items-center justify-between border px-3 py-2 text-left ${
                active === key
                  ? 'bg-surface-raised text-[var(--color-text-primary)]'
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

      <div
        className="border-subtle bg-page p-4 md:p-6"
        role="tabpanel"
        id={`library-panel-${active}`}
        aria-labelledby={`library-tab-${active}`}
      >
        {loading ? (
          <p className="vw-small text-muted">Loading library...</p>
        ) : error ? (
          <p className="vw-small text-secondary">{error}</p>
        ) : (
          <>
            {active === 'today' && (
              <div>
                <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                  <p className="text-label vw-small text-gold">
                    TODAY + 7 DAYS
                  </p>
                  {activeSeriesSlug && (
                    <p className="vw-small text-muted">
                      {activeSeriesSlug.toUpperCase()}
                    </p>
                  )}
                </div>
                {activeDays.length === 0 ? (
                  <p className="vw-small text-muted">
                    No active devotional plan yet. Start a Soul Audit to begin.
                  </p>
                ) : (
                  <>
                    <div className="space-y-2">
                      {activeDays.map((day) => {
                        const dayReminderEnabled =
                          dayReminders[reminderKey(day)]
                        return (
                          <div
                            key={`active-day-${day.day}`}
                            className="border px-3 py-2"
                            style={{ borderColor: 'var(--color-border)' }}
                          >
                            <div className="mb-1 flex flex-wrap items-center justify-between gap-2">
                              <p className="text-label vw-small text-gold">
                                DAY {day.day}
                              </p>
                              <p className="text-label vw-small text-muted">
                                {day.status.toUpperCase()}
                              </p>
                            </div>
                            {day.status === 'locked' ? (
                              <>
                                <p className="vw-small text-secondary">
                                  {day.title}
                                </p>
                                <button
                                  type="button"
                                  className="text-label vw-small mt-2 link-highlight"
                                  onClick={() => setLockedDayTeaser(day)}
                                  aria-label={`View teaser for day ${day.day}`}
                                >
                                  View teaser
                                </button>
                                {dayReminderEnabled ? (
                                  <p className="vw-small mt-1 text-muted">
                                    Reminder enabled.
                                  </p>
                                ) : null}
                              </>
                            ) : (
                              <Link
                                href={day.route}
                                className="vw-small link-highlight text-secondary"
                              >
                                {day.title}
                              </Link>
                            )}
                            <p className="vw-small mt-1 text-muted">
                              {day.scriptureReference}
                            </p>
                          </div>
                        )
                      })}
                    </div>

                    {lockedDayTeaser && (
                      <div
                        className="mt-4 border px-3 py-3"
                        style={{ borderColor: 'var(--color-border)' }}
                      >
                        <p className="text-label vw-small text-gold">
                          LOCKED DAY TEASER
                        </p>
                        <p className="vw-small mt-2 text-secondary">
                          Day {lockedDayTeaser.day}: {lockedDayTeaser.title}
                        </p>
                        <p className="vw-small mt-1 text-muted">
                          {lockedDayTeaser.scriptureReference}
                        </p>
                        <p className="text-serif-italic vw-small mt-2 text-secondary">
                          {lockedDayTeaser.scriptureText}
                        </p>
                        <p className="vw-small mt-2 text-muted">
                          Unlocks: {formatUnlockDate(lockedDayTeaser.unlockAt)}
                        </p>
                        {lockedDayTeaser.lockMessage ? (
                          <p className="vw-small mt-1 text-muted">
                            {lockedDayTeaser.lockMessage}
                          </p>
                        ) : null}
                        <div className="mt-3 flex flex-wrap items-center gap-4">
                          <button
                            type="button"
                            className="text-label vw-small link-highlight"
                            onClick={() => toggleReminder(lockedDayTeaser)}
                            aria-label={`${
                              dayReminders[reminderKey(lockedDayTeaser)]
                                ? 'Disable'
                                : 'Enable'
                            } reminder for day ${lockedDayTeaser.day}`}
                          >
                            {dayReminders[reminderKey(lockedDayTeaser)]
                              ? 'Disable reminder'
                              : 'Enable reminder'}
                          </button>
                          <button
                            type="button"
                            className="text-label vw-small link-highlight"
                            onClick={() => setLockedDayTeaser(null)}
                            aria-label="Close locked day teaser"
                          >
                            Close teaser
                          </button>
                        </div>
                      </div>
                    )}
                  </>
                )}
                {activePlanToken && (
                  <p className="vw-small mt-3 text-muted">
                    Active plan token: {activePlanToken}
                  </p>
                )}
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
                        className="flex items-start justify-between gap-3 border px-3 py-2"
                        style={{ borderColor: 'var(--color-border)' }}
                      >
                        <div>
                          <Link
                            href={resolveDevotionalHref(
                              bookmark.devotional_slug,
                            )}
                            className="vw-small link-highlight text-secondary"
                          >
                            {resolveDevotionalLabel(bookmark.devotional_slug)}
                          </Link>
                          <p className="vw-small text-muted">
                            {bookmark.note ||
                              resolveSeriesLabel(bookmark.devotional_slug)}
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => void archiveBookmarkRow(bookmark)}
                          className="text-label vw-small link-highlight"
                          aria-label={`Archive bookmark for ${resolveDevotionalLabel(
                            bookmark.devotional_slug,
                          )}`}
                        >
                          Archive
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {active === 'highlights' && (
              <div>
                <p className="text-label vw-small mb-3 text-gold">Highlights</p>
                {highlights.length === 0 ? (
                  <p className="vw-small text-muted">
                    No highlights saved yet.
                  </p>
                ) : (
                  <div className="space-y-2">
                    {highlights.map((row) => (
                      <div
                        key={row.id}
                        className="border px-3 py-2"
                        style={{ borderColor: 'var(--color-border)' }}
                      >
                        <div className="mb-2 flex items-center justify-between gap-3">
                          <Link
                            href={resolveDevotionalHref(row.devotional_slug)}
                            className="vw-small link-highlight text-muted"
                          >
                            {resolveDevotionalLabel(row.devotional_slug)}
                          </Link>
                          <button
                            type="button"
                            onClick={() => void archiveAnnotationRow(row)}
                            className="text-label vw-small link-highlight"
                            aria-label={`Archive highlight from ${resolveDevotionalLabel(
                              row.devotional_slug,
                            )}`}
                          >
                            Archive
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

            {active === 'notes' && (
              <div>
                <p className="text-label vw-small mb-3 text-gold">Notes</p>
                {notes.length === 0 ? (
                  <p className="vw-small text-muted">No notes saved yet.</p>
                ) : (
                  <div className="space-y-2">
                    {notes.map((note) => (
                      <div
                        key={note.id}
                        className="border px-3 py-2"
                        style={{ borderColor: 'var(--color-border)' }}
                      >
                        <div className="mb-2 flex items-center justify-between gap-3">
                          <Link
                            href={resolveDevotionalHref(note.devotional_slug)}
                            className="vw-small link-highlight text-muted"
                          >
                            {resolveDevotionalLabel(note.devotional_slug)}
                          </Link>
                          <button
                            type="button"
                            onClick={() => void archiveAnnotationRow(note)}
                            className="text-label vw-small link-highlight"
                            aria-label={`Archive note from ${resolveDevotionalLabel(
                              note.devotional_slug,
                            )}`}
                          >
                            Archive
                          </button>
                        </div>
                        <p className="vw-small text-secondary">{note.body}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {active === 'chat-history' && (
              <div>
                <p className="text-label vw-small mb-3 text-gold">
                  Chat History
                </p>
                {chatHistory.length === 0 ? (
                  <p className="vw-small text-muted">
                    No chat notes saved yet.
                  </p>
                ) : (
                  <div className="space-y-2">
                    {chatHistory.map((note) => (
                      <div
                        key={note.id}
                        className="border px-3 py-2"
                        style={{ borderColor: 'var(--color-border)' }}
                      >
                        <div className="mb-2 flex items-center justify-between gap-3">
                          <Link
                            href={resolveDevotionalHref(note.devotional_slug)}
                            className="vw-small link-highlight text-muted"
                          >
                            {resolveDevotionalLabel(note.devotional_slug)}
                          </Link>
                          <button
                            type="button"
                            onClick={() => void archiveAnnotationRow(note)}
                            className="text-label vw-small link-highlight"
                            aria-label={`Archive chat note from ${resolveDevotionalLabel(
                              note.devotional_slug,
                            )}`}
                          >
                            Archive
                          </button>
                        </div>
                        <p className="vw-small text-secondary">{note.body}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

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
                            {plan.days.slice(0, 7).map((day) => (
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

                <div>
                  <p className="text-label vw-small mb-3 text-gold">
                    Archived Artifacts
                  </p>
                  {archivedArtifacts.length === 0 ? (
                    <p className="vw-small text-muted">
                      Nothing manually archived yet.
                    </p>
                  ) : (
                    <div className="space-y-2">
                      {archivedArtifacts.map((item) => (
                        <div
                          key={item.id}
                          className="border px-3 py-2"
                          style={{ borderColor: 'var(--color-border)' }}
                        >
                          <div className="mb-1 flex flex-wrap items-center justify-between gap-2">
                            <p className="text-label vw-small text-gold">
                              {item.kind.toUpperCase()}
                            </p>
                            <p className="vw-small text-muted">
                              {formatDate(item.createdAt)}
                            </p>
                          </div>
                          <p className="vw-small text-secondary">
                            {item.label}
                          </p>
                          {item.sublabel ? (
                            <p className="vw-small mt-1 text-muted">
                              {item.sublabel}
                            </p>
                          ) : null}
                          <div className="mt-2 flex items-center gap-4">
                            <button
                              type="button"
                              className="text-label vw-small link-highlight"
                              onClick={() => void restoreArtifact(item)}
                            >
                              Restore
                            </button>
                            <button
                              type="button"
                              className="text-label vw-small link-highlight"
                              onClick={() => moveArtifactToTrash(item)}
                            >
                              Move To Trash
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {active === 'trash' && (
              <div>
                <p className="text-label vw-small mb-3 text-gold">Trash</p>
                {trashedArtifacts.length === 0 ? (
                  <p className="vw-small text-muted">Trash is empty.</p>
                ) : (
                  <div className="space-y-2">
                    {trashedArtifacts.map((item) => (
                      <div
                        key={item.id}
                        className="border px-3 py-2"
                        style={{ borderColor: 'var(--color-border)' }}
                      >
                        <div className="mb-1 flex flex-wrap items-center justify-between gap-2">
                          <p className="text-label vw-small text-gold">
                            {item.kind.toUpperCase()}
                          </p>
                          <p className="vw-small text-muted">
                            Trashed {formatDate(item.trashedAt)}
                          </p>
                        </div>
                        <p className="vw-small text-secondary">{item.label}</p>
                        {item.sublabel ? (
                          <p className="vw-small mt-1 text-muted">
                            {item.sublabel}
                          </p>
                        ) : null}
                        <div className="mt-2 flex items-center gap-4">
                          <button
                            type="button"
                            className="text-label vw-small link-highlight"
                            onClick={() => void restoreArtifact(item)}
                          >
                            Restore
                          </button>
                          <button
                            type="button"
                            className="text-label vw-small link-highlight"
                            onClick={() => removeArtifactPermanently(item.id)}
                          >
                            Delete Forever
                          </button>
                        </div>
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
