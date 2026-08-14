'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import ClippingsList from '@/components/ClippingsList'
import LibraryView from '@/components/LibraryView'
import { ALL_SERIES_ORDER, SERIES_DATA } from '@/data/series'
import { isSeriesSlug } from '@/lib/library/series-save'
import { isClippingsSupported, listClippings } from '@/lib/clippings'
import { useDevotionalLibraryStore } from '@/stores/devotionalLibraryStore'
import { useProgressStore } from '@/stores/progressStore'

type LibraryMenuKey =
  | 'series'
  | 'today'
  | 'bookmarks'
  | 'highlights'
  | 'notes'
  | 'chat-history'
  | 'clippings'
  | 'archive'
  | 'trash'

// Canonical tab order — the single source of truth used for rendering,
// keyboard roving navigation, and URL deep-link resolution.
//
// F-068 (library consolidation): this rail is the ONE library. `series` holds
// the series lifecycle (active / saved / paused / completed — the old
// /library top section) and is the default tab; `clippings` holds the
// device-local commonplace book that used to live at /clippings. `series` is
// deliberately NOT folded into `archive` — archive carries plan history,
// completed Wake-Up pages, and manually archived artifacts, a different data
// model from the series lifecycle.
const LIBRARY_TAB_ORDER: LibraryMenuKey[] = [
  'series',
  'today',
  'bookmarks',
  'highlights',
  'notes',
  'chat-history',
  'clippings',
  'archive',
  'trash',
]

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

type HighlightColor = 'yellow' | 'blue' | 'green' | 'pink' | 'purple'
const HIGHLIGHT_COLORS: HighlightColor[] = [
  'yellow',
  'blue',
  'green',
  'pink',
  'purple',
]

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
  // SA-039: a saved row may now name a SERIES rather than a day. Send those to
  // the series page — /devotional/<series-slug> is a 404.
  if (isSeriesSlug(devotionalSlug)) return `/series/${devotionalSlug}`
  const plan = parsePlanSlug(devotionalSlug)
  if (plan) {
    // Plan reading canonically lives at /daily-bread (SA-023: the dedicated
    // plan reader is retired, and /soul-audit/results does not resolve a
    // ?planToken deep link on its own). Same silo-correct routing the old
    // /saved page shipped for plan-day bookmarks.
    return '/daily-bread'
  }
  return `/devotional/${devotionalSlug}`
}

function resolveDevotionalLabel(devotionalSlug: string): string {
  if (isSeriesSlug(devotionalSlug)) {
    return SERIES_DATA[devotionalSlug]?.title ?? devotionalSlug
  }
  const plan = parsePlanSlug(devotionalSlug)
  if (plan) return `Plan Day ${plan.day}`
  return SLUG_META.get(devotionalSlug)?.title || devotionalSlug
}

function resolveSeriesLabel(devotionalSlug: string): string {
  if (isSeriesSlug(devotionalSlug)) {
    const days = SERIES_DATA[devotionalSlug]?.days.length ?? 0
    return days ? `Whole series · ${days} days` : 'Whole series'
  }
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

function resolveHighlightColor(style: Record<string, unknown> | null) {
  const candidate = String(style?.color || '')
    .trim()
    .toLowerCase()
  return HIGHLIGHT_COLORS.includes(candidate as HighlightColor)
    ? (candidate as HighlightColor)
    : 'yellow'
}

function mergeHighlightStyle(
  style: Record<string, unknown> | null,
  color: HighlightColor,
) {
  return {
    ...(style ?? {}),
    color,
  }
}

export function normalizeLibraryTab(
  value: string | null | undefined,
): LibraryMenuKey {
  if (
    value === 'series' ||
    value === 'today' ||
    value === 'bookmarks' ||
    value === 'highlights' ||
    value === 'notes' ||
    value === 'chat-history' ||
    value === 'clippings' ||
    value === 'archive' ||
    value === 'trash'
  ) {
    return value
  }

  // Aliases — keep every historical / human-friendly deep link resolving to a
  // real tab so no URL is ever a dead end.
  if (value === 'favorites' || value === 'favorite-verses') return 'highlights'
  if (value === 'saved') return 'bookmarks'
  if (value === 'chat-notes') return 'chat-history'
  return 'series'
}

export default function DevotionalLibraryRail({
  className = '',
  initialTab = 'series',
  onTabChange,
}: {
  className?: string
  initialTab?: string
  /**
   * Notified whenever the active tab changes (button click or keyboard).
   * The parent uses this to keep the page URL (`?tab=`) in sync so every
   * section is deep-linkable. Optional — the rail is fully usable standalone.
   */
  onTabChange?: (tab: LibraryMenuKey) => void
}) {
  const [active, setActiveState] = useState<LibraryMenuKey>(
    normalizeLibraryTab(initialTab),
  )
  // Mobile drawer: the section picker collapses behind a trigger on small
  // screens so the rail is reachable without scrolling past every panel.
  const [drawerOpen, setDrawerOpen] = useState(false)
  const tabRefs = useRef<Record<string, HTMLButtonElement | null>>({})

  const selectTab = useCallback(
    (key: LibraryMenuKey, opts?: { focus?: boolean }) => {
      setActiveState(key)
      setDrawerOpen(false)
      onTabChange?.(key)
      if (opts?.focus) {
        // Defer so the ref points at the (re-rendered) selected tab.
        requestAnimationFrame(() => tabRefs.current[key]?.focus())
      }
    },
    [onTabChange],
  )

  // ARIA roving-tabindex keyboard model: Left/Right (and Up/Down for the
  // stacked layout) move between tabs, Home/End jump to the ends.
  const onTabKeyDown = useCallback(
    (event: React.KeyboardEvent, key: LibraryMenuKey) => {
      const index = LIBRARY_TAB_ORDER.indexOf(key)
      let nextIndex: number | null = null
      switch (event.key) {
        case 'ArrowRight':
        case 'ArrowDown':
          nextIndex = (index + 1) % LIBRARY_TAB_ORDER.length
          break
        case 'ArrowLeft':
        case 'ArrowUp':
          nextIndex =
            (index - 1 + LIBRARY_TAB_ORDER.length) % LIBRARY_TAB_ORDER.length
          break
        case 'Home':
          nextIndex = 0
          break
        case 'End':
          nextIndex = LIBRARY_TAB_ORDER.length - 1
          break
        default:
          return
      }
      event.preventDefault()
      selectTab(LIBRARY_TAB_ORDER[nextIndex], { focus: true })
    },
    [selectTab],
  )
  const [activeDays, setActiveDays] = useState<ActiveDayRow[]>([])
  const [activePlanToken, setActivePlanToken] = useState<string | null>(null)
  const [activeSeriesSlug, setActiveSeriesSlug] = useState<string | null>(null)
  const [bookmarks, setBookmarks] = useState<BookmarkRow[]>([])
  const [highlights, setHighlights] = useState<AnnotationRow[]>([])
  const [updatingHighlightIds, setUpdatingHighlightIds] = useState<string[]>([])
  const [notes, setNotes] = useState<AnnotationRow[]>([])
  const [stickyNotes, setStickyNotes] = useState<AnnotationRow[]>([])
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

  // Series lifecycle (F-068): the SERIES tab renders <LibraryView />, which
  // manages its own actions; the rail only subscribes for the tab count.
  // hydrate() is lazy + idempotent, so calling it here and in LibraryView is
  // safe and keeps the count correct even when another tab is open.
  const hydrateSeriesLibrary = useDevotionalLibraryStore((s) => s.hydrate)
  const seriesActive = useDevotionalLibraryStore((s) => s.active)
  const seriesSaved = useDevotionalLibraryStore((s) => s.saved)
  const seriesArchived = useDevotionalLibraryStore((s) => s.archived)

  useEffect(() => {
    void hydrateSeriesLibrary()
  }, [hydrateSeriesLibrary])

  // Clippings live in device-local IndexedDB (see src/lib/clippings.ts); the
  // rail only tracks the count for the tab badge. Read failures are surfaced
  // inside the CLIPPINGS panel itself by <ClippingsList /> — the badge does
  // not duplicate that error state.
  const [clippingsCount, setClippingsCount] = useState(0)

  useEffect(() => {
    if (!isClippingsSupported()) return
    let cancelled = false
    const loadClippingsCount = async () => {
      try {
        const list = await listClippings()
        if (!cancelled) setClippingsCount(list.length)
      } catch {
        // ClippingsList owns the honest error state for this data.
      }
    }
    void loadClippingsCount()
    const onUpdate = () => void loadClippingsCount()
    window.addEventListener('clippingsUpdated', onUpdate)
    return () => {
      cancelled = true
      window.removeEventListener('clippingsUpdated', onUpdate)
    }
  }, [])

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
          fetch('/api/soul-audit/manage', { cache: 'no-store' }),
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
      setStickyNotes(
        annotationRows.filter((row) => row.annotation_type === 'sticky'),
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

  // Keep the active tab in sync when the parent updates `initialTab` from the
  // URL (deep link, browser back/forward). This is a one-way mirror — we do
  // NOT fire onTabChange here, or back/forward would re-push the same entry.
  useEffect(() => {
    setActiveState(normalizeLibraryTab(initialTab))
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
    setStickyNotes((prev) => prev.filter((row) => row.id !== annotation.id))
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

  async function updateHighlightColor(
    annotation: AnnotationRow,
    color: HighlightColor,
  ) {
    setUpdatingHighlightIds((current) =>
      current.includes(annotation.id) ? current : [...current, annotation.id],
    )
    try {
      const response = await fetch('/api/annotations', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          annotationId: annotation.id,
          anchorText: annotation.anchor_text,
          body: annotation.body,
          style: mergeHighlightStyle(annotation.style, color),
        }),
      })
      const payload = (await response.json().catch(() => ({}))) as {
        code?: string
        error?: string
      }
      if (!response.ok) {
        if (payload.code === 'AUTH_REQUIRED_SAVE_STATE') {
          if (typeof window !== 'undefined') {
            const redirect = `${window.location.pathname}${window.location.search}`
            window.location.assign(
              `/auth/sign-in?redirect=${encodeURIComponent(redirect)}`,
            )
          }
          return
        }
        setError(payload.error || 'Unable to update highlight color.')
        return
      }

      setHighlights((current) =>
        current.map((row) =>
          row.id === annotation.id
            ? {
                ...row,
                style: mergeHighlightStyle(row.style, color),
              }
            : row,
        ),
      )
      window.dispatchEvent(new CustomEvent('libraryUpdated'))
    } finally {
      setUpdatingHighlightIds((current) =>
        current.filter((id) => id !== annotation.id),
      )
    }
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
    series: (seriesActive ? 1 : 0) + seriesSaved.length + seriesArchived.length,
    today: activeDays.length,
    bookmarks: bookmarks.length,
    highlights: highlights.length,
    notes: notes.length + stickyNotes.length,
    'chat-history': chatHistory.length,
    clippings: clippingsCount,
    archive:
      archivePlans.length + completionRows.length + archivedArtifacts.length,
    trash: trashedArtifacts.length,
  } as const
  const TAB_LABELS: Record<LibraryMenuKey, string> = {
    series: 'Series',
    today: 'Today + 7 Days',
    bookmarks: 'Bookmarks',
    highlights: 'Highlights',
    notes: 'Notes',
    'chat-history': 'Chat History',
    clippings: 'Clippings',
    archive: 'Archive',
    trash: 'Trash',
  }
  const activeLabel = TAB_LABELS[active]

  return (
    <section
      className={`grid gap-6 md:grid-cols-[280px_minmax(0,1fr)] ${className}`.trim()}
    >
      <aside
        className="shell-sticky-panel border-subtle bg-surface-raised p-4 md:h-fit"
        aria-label="Devotional library menu"
      >
        <p className="text-label vw-small mb-4 text-gold">LIBRARY</p>

        {/* Mobile drawer trigger — the tablist is verbose on a phone, so it
            collapses behind one tap. Hidden on desktop (md:hidden) where the
            full list always shows. Touch target >= 44px. */}
        <button
          type="button"
          className="text-label vw-small flex w-full items-center justify-between border px-3 py-3 text-left md:hidden affordance"
          style={{
            borderColor: 'var(--color-border)',
            minHeight: '44px',
            color: 'var(--color-text-primary)',
          }}
          aria-expanded={drawerOpen}
          aria-controls="library-section-tablist"
          onClick={() => setDrawerOpen((open) => !open)}
        >
          <span>
            {activeLabel}
            <span className="oldstyle-nums text-muted">
              {' '}
              · {counts[active]}
            </span>
          </span>
          <span aria-hidden="true">{drawerOpen ? '✕' : '☰'}</span>
        </button>

        <nav
          id="library-section-tablist"
          className={`gap-2 ${drawerOpen ? 'mt-2 grid' : 'hidden'} md:mt-0 md:grid`}
          role="tablist"
          aria-orientation="vertical"
          aria-label="Library sections"
        >
          {LIBRARY_TAB_ORDER.map((key) => (
            <button
              key={key}
              type="button"
              ref={(node) => {
                tabRefs.current[key] = node
              }}
              onClick={() => selectTab(key)}
              onKeyDown={(event) => onTabKeyDown(event, key)}
              role="tab"
              id={`library-tab-${key}`}
              aria-selected={active === key}
              aria-controls={`library-panel-${key}`}
              tabIndex={active === key ? 0 : -1}
              className={`text-label vw-small flex items-center justify-between border px-3 py-2 text-left affordance ${
                active === key
                  ? 'bg-surface-raised text-[var(--color-text-primary)]'
                  : 'text-muted'
              }`}
              style={{
                borderColor:
                  active === key ? 'var(--color-gold)' : 'var(--color-border)',
                minHeight: '44px',
              }}
            >
              <span>{TAB_LABELS[key]}</span>
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
        {/* SERIES and CLIPPINGS own their data (devotionalLibraryStore /
            device-local IndexedDB) and render their own loading + error
            states, so they are not gated on the rail's API fetch below. */}
        {active === 'series' && <LibraryView />}

        {active === 'clippings' && <ClippingsList />}

        {active !== 'series' && active !== 'clippings' && loading ? (
          <p className="vw-small text-muted">Loading library...</p>
        ) : active !== 'series' && active !== 'clippings' && error ? (
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
                  <div className="py-8 text-center">
                    {/* D-18 (F-074): typographic empty state — one quiet
                        sentence + one contextual CTA. No illustration: this
                        tab's empty meaning ("no plan yet") is an invitation,
                        and the words carry it. */}
                    <p className="vw-body mb-6 text-secondary">
                      No plan is walking with you yet &mdash; the Soul Audit
                      composes one around what you name.
                    </p>
                    <Link href="/soul-audit" className="cta-major">
                      BEGIN THE SOUL AUDIT
                    </Link>
                  </div>
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
                  <div className="py-8 text-center">
                    {/* Riso empty-state illustration (imagery run 2026-07-10):
                        a ribbon holding a place in a closed book — what a
                        bookmark is for. */}
                    <Image
                      src="/images/site/samples/empty-bookmarks.webp"
                      alt=""
                      width={320}
                      height={240}
                      className="mx-auto mb-5"
                      loading="lazy"
                    />
                    <p className="vw-body mb-6 text-secondary">
                      Nothing kept yet. Mark a passage as you read and it will
                      hold your place here.
                    </p>
                    <Link href="/today" className="cta-major">
                      READ TODAY&rsquo;S EDITION
                    </Link>
                  </div>
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
                  <div className="py-8 text-center">
                    {/* Riso empty-state illustration (D-18, imagery library):
                        a single lit clay oil lamp — a highlight keeps one
                        line burning after the book is closed (Ps 119:105).
                        Source: library/decorative/sym-oil-lamp-clay-linocut. */}
                    <Image
                      src="/images/site/empty-states/empty-highlights.webp"
                      alt=""
                      width={320}
                      height={240}
                      className="mx-auto mb-5"
                      loading="lazy"
                    />
                    <p className="vw-body mb-6 text-secondary">
                      No lines marked yet. Highlight a passage as you read and
                      it will keep its light here.
                    </p>
                    <Link href="/today" className="cta-major">
                      READ TODAY&rsquo;S EDITION
                    </Link>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {highlights.map((row) => {
                      const color = resolveHighlightColor(row.style)
                      return (
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
                          <p
                            className={`text-serif-italic vw-small text-secondary reader-highlight-snippet reader-highlight-snippet--${color}`}
                          >
                            {row.anchor_text || row.body}
                          </p>
                          <div className="mt-2 flex items-center gap-2">
                            <span className="text-label vw-small text-muted">
                              Color:
                            </span>
                            <div className="reader-highlight-color-row">
                              {HIGHLIGHT_COLORS.map((option) => (
                                <button
                                  key={`${row.id}-${option}`}
                                  type="button"
                                  className={`reader-highlight-swatch reader-highlight-swatch--${option} ${
                                    color === option ? 'is-active' : ''
                                  }`}
                                  onClick={() =>
                                    void updateHighlightColor(row, option)
                                  }
                                  aria-label={`Set highlight color to ${option}`}
                                  disabled={updatingHighlightIds.includes(
                                    row.id,
                                  )}
                                />
                              ))}
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            )}

            {active === 'notes' && (
              <div>
                <p className="text-label vw-small mb-3 text-gold">Notes</p>
                {notes.length === 0 && stickyNotes.length === 0 ? (
                  <div className="py-8 text-center">
                    {/* Riso empty-state illustration (D-18, imagery library):
                        a hand with reed pen poised over a mostly blank scroll
                        — the note not yet written. Source:
                        library/poster/nt-paul-prison-writing-v2. */}
                    <Image
                      src="/images/site/empty-states/empty-notes.webp"
                      alt=""
                      width={280}
                      height={280}
                      className="mx-auto mb-5"
                      loading="lazy"
                    />
                    <p className="vw-body mb-6 text-secondary">
                      No notes yet. Write as you read and your words will gather
                      here.
                    </p>
                    <Link href="/today" className="cta-major">
                      READ TODAY&rsquo;S EDITION
                    </Link>
                  </div>
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

                    {stickyNotes.length > 0 && (
                      <div className="pt-3">
                        <p className="text-label vw-small mb-2 text-gold">
                          Stickies
                        </p>
                        <div className="space-y-2">
                          {stickyNotes.map((sticky) => (
                            <div
                              key={sticky.id}
                              className="border px-3 py-2"
                              style={{ borderColor: 'var(--color-border)' }}
                            >
                              <div className="mb-2 flex items-center justify-between gap-3">
                                <Link
                                  href={resolveDevotionalHref(
                                    sticky.devotional_slug,
                                  )}
                                  className="vw-small link-highlight text-muted"
                                >
                                  {resolveDevotionalLabel(
                                    sticky.devotional_slug,
                                  )}
                                </Link>
                                <button
                                  type="button"
                                  onClick={() =>
                                    void archiveAnnotationRow(sticky)
                                  }
                                  className="text-label vw-small link-highlight"
                                  aria-label={`Archive sticky from ${resolveDevotionalLabel(
                                    sticky.devotional_slug,
                                  )}`}
                                >
                                  Archive
                                </button>
                              </div>
                              <p className="vw-small text-secondary">
                                {sticky.body}
                              </p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
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
                  <div className="py-8 text-center">
                    {/* Riso empty-state illustration (D-18, imagery library):
                        the conversation at the well (John 4) — questions
                        asked and answered is exactly what this tab keeps.
                        Source: library/decorative/story-woman-at-well-conversation. */}
                    <Image
                      src="/images/site/empty-states/empty-chat-history.webp"
                      alt=""
                      width={320}
                      height={215}
                      className="mx-auto mb-5"
                      loading="lazy"
                    />
                    <p className="vw-body mb-6 text-secondary">
                      Nothing kept from the study chat yet. When an exchange is
                      worth returning to, save it and it will wait here.
                    </p>
                    <Link href="/today" className="cta-major">
                      READ TODAY&rsquo;S EDITION
                    </Link>
                  </div>
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
                  {/* D-18: archive is a utility surface — text-first empties,
                      one quiet sentence each, tightened to the pattern. */}
                  {archivePlans.length === 0 ? (
                    <p className="vw-small text-muted">
                      No past plans yet &mdash; a plan rests here when it ends
                      or is replaced.
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
                      No pages finished yet &mdash; each completed reading is
                      recorded here.
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
                            href={`/devotional/${item.slug}`}
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
                      Nothing set aside yet &mdash; archived bookmarks and notes
                      wait here.
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
                {/* D-18: trash is a utility surface — text-first, one quiet
                    sentence describing the real restore/delete behavior. */}
                {trashedArtifacts.length === 0 ? (
                  <p className="vw-small text-muted">
                    The trash is empty &mdash; discarded items can be restored
                    from here until you delete them for good.
                  </p>
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
