/**
 * devotionalLibraryStore — client state for the user's devotional library:
 * Save (bookmarks), Start (active series), Queue (scheduled Monday swap),
 * and Archive (paused/completed series for restart).
 *
 * Anonymous users get an empty store. Action methods short-circuit when
 * a 401 is returned and emit an `auth-required` event with the original
 * intent so the SignInIntentModal can capture it and replay after the
 * user signs in.
 *
 * Hydration is lazy + idempotent: components call `hydrate()` on mount.
 * Optimistic updates roll back on non-2xx responses.
 */

import { create } from 'zustand'

export type ActiveSeriesSource =
  | 'manual_start'
  | 'soul_audit'
  | 'restart_from_archive'

export type ArchivedSeriesState = 'paused' | 'completed'
export type StartMode = 'replace_now' | 'queue_monday'

export type LibraryIntent =
  | { kind: 'save'; devotionalSlug: string }
  | { kind: 'unsave'; devotionalSlug: string }
  | { kind: 'start'; seriesSlug: string; mode: StartMode }
  | {
      kind: 'restart_archive'
      seriesSlug: string
      from: 'day_1' | 'resume'
    }

export interface ActiveSeriesView {
  seriesSlug: string
  currentDay: number
  source: ActiveSeriesSource
  startedAt: string
  lastOpenedAt: string
  seriesTitle: string | null
}

export interface ScheduledSwapView {
  seriesSlug: string
  startsAt: string
  queuedAt: string
  seriesTitle: string | null
}

export interface SavedDevotionalView {
  devotionalSlug: string
  note: string | null
  savedAt: string
}

export interface ArchivedSeriesView {
  seriesSlug: string
  seriesTitle: string | null
  totalDays: number | null
  furthestDayReached: number
  state: ArchivedSeriesState
  archivedAt: string
}

interface LibraryState {
  active: ActiveSeriesView | null
  scheduledSwap: ScheduledSwapView | null
  saved: SavedDevotionalView[]
  archived: ArchivedSeriesView[]
  hydrated: boolean
  hydrating: boolean
  lastError: string | null

  hydrate: () => Promise<void>
  refresh: () => Promise<void>

  save: (
    devotionalSlug: string,
  ) => Promise<{ ok: boolean; needsAuth?: boolean }>
  unsave: (
    devotionalSlug: string,
  ) => Promise<{ ok: boolean; needsAuth?: boolean }>

  start: (
    seriesSlug: string,
    mode: StartMode,
    options?: { confirm?: boolean },
  ) => Promise<
    | { ok: true; mode: StartMode }
    | {
        ok: false
        needsAuth?: boolean
        needsConfirm?: boolean
        current?: {
          seriesSlug: string
          seriesTitle: string | null
          currentDay: number
        }
      }
  >

  restartFromArchive: (
    seriesSlug: string,
    from: 'day_1' | 'resume',
  ) => Promise<{ ok: boolean; needsAuth?: boolean }>

  clearActive: () => Promise<{ ok: boolean; needsAuth?: boolean }>
  clearScheduledSwap: () => Promise<{ ok: boolean; needsAuth?: boolean }>
}

const INTENT_EVENT = 'euangelion:auth-required-intent'

function emitAuthRequired(intent: LibraryIntent) {
  if (typeof window === 'undefined') return
  window.dispatchEvent(new CustomEvent(INTENT_EVENT, { detail: { intent } }))
}

export function onAuthRequired(
  handler: (intent: LibraryIntent) => void,
): () => void {
  if (typeof window === 'undefined') return () => {}
  const listener = (event: Event) => {
    const detail = (event as CustomEvent<{ intent: LibraryIntent }>).detail
    if (detail?.intent) handler(detail.intent)
  }
  window.addEventListener(INTENT_EVENT, listener)
  return () => window.removeEventListener(INTENT_EVENT, listener)
}

async function jsonFetch(
  input: RequestInfo | URL,
  init?: RequestInit,
): Promise<{ ok: boolean; status: number; body: any }> {
  const response = await fetch(input, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(init?.headers || {}),
    },
    cache: 'no-store',
  })
  let body: any = null
  try {
    body = await response.json()
  } catch {
    body = null
  }
  return { ok: response.ok, status: response.status, body }
}

export const useDevotionalLibraryStore = create<LibraryState>()((set, get) => ({
  active: null,
  scheduledSwap: null,
  saved: [],
  archived: [],
  hydrated: false,
  hydrating: false,
  lastError: null,

  hydrate: async () => {
    if (get().hydrating) return
    if (get().hydrated) return
    set({ hydrating: true })
    try {
      await get().refresh()
      set({ hydrated: true })
    } finally {
      set({ hydrating: false })
    }
  },

  refresh: async () => {
    const [activeRes, savedRes, archiveRes] = await Promise.all([
      jsonFetch('/api/devotionals/active'),
      jsonFetch('/api/devotionals/saved'),
      jsonFetch('/api/devotionals/archive'),
    ])

    // 401 just means "anonymous user" — leave state empty, don't error.
    const active =
      activeRes.ok && activeRes.body?.active
        ? (activeRes.body.active as ActiveSeriesView)
        : null
    const scheduledSwap =
      activeRes.ok && activeRes.body?.scheduledSwap
        ? (activeRes.body.scheduledSwap as ScheduledSwapView)
        : null
    const saved =
      savedRes.ok && Array.isArray(savedRes.body?.saved)
        ? (savedRes.body.saved as SavedDevotionalView[])
        : []
    const archived =
      archiveRes.ok && Array.isArray(archiveRes.body?.archived)
        ? (archiveRes.body.archived as ArchivedSeriesView[])
        : []

    set({ active, scheduledSwap, saved, archived })
  },

  save: async (devotionalSlug: string) => {
    const prev = get().saved
    const optimistic: SavedDevotionalView = {
      devotionalSlug,
      note: null,
      savedAt: new Date().toISOString(),
    }
    if (!prev.some((s) => s.devotionalSlug === devotionalSlug)) {
      set({ saved: [optimistic, ...prev] })
    }
    const result = await jsonFetch('/api/devotionals/saved', {
      method: 'POST',
      body: JSON.stringify({ devotionalSlug }),
    })
    if (result.status === 401) {
      set({ saved: prev })
      emitAuthRequired({ kind: 'save', devotionalSlug })
      return { ok: false, needsAuth: true }
    }
    if (!result.ok) {
      set({ saved: prev, lastError: result.body?.error ?? 'Unable to save.' })
      return { ok: false }
    }
    return { ok: true }
  },

  unsave: async (devotionalSlug: string) => {
    const prev = get().saved
    set({ saved: prev.filter((s) => s.devotionalSlug !== devotionalSlug) })
    const result = await jsonFetch(
      `/api/devotionals/saved?devotionalSlug=${encodeURIComponent(devotionalSlug)}`,
      { method: 'DELETE' },
    )
    if (result.status === 401) {
      set({ saved: prev })
      emitAuthRequired({ kind: 'unsave', devotionalSlug })
      return { ok: false, needsAuth: true }
    }
    if (!result.ok) {
      set({ saved: prev, lastError: result.body?.error ?? 'Unable to remove.' })
      return { ok: false }
    }
    return { ok: true }
  },

  start: async (seriesSlug, mode, options = {}) => {
    const tzOffset =
      typeof Intl !== 'undefined' ? -new Date().getTimezoneOffset() : 0

    const result = await jsonFetch('/api/devotionals/active', {
      method: 'PUT',
      body: JSON.stringify({
        seriesSlug,
        mode,
        confirm: options.confirm ?? false,
        timezoneOffsetMinutes: tzOffset,
      }),
    })
    if (result.status === 401) {
      emitAuthRequired({ kind: 'start', seriesSlug, mode })
      return { ok: false, needsAuth: true }
    }
    if (result.status === 409 && result.body?.code === 'CONFIRM_REQUIRED') {
      return {
        ok: false,
        needsConfirm: true,
        current: {
          seriesSlug: result.body.currentSeriesSlug,
          seriesTitle: result.body.currentSeriesTitle ?? null,
          currentDay: result.body.currentDay,
        },
      }
    }
    if (!result.ok) {
      set({ lastError: result.body?.error ?? 'Unable to start.' })
      return { ok: false }
    }
    await get().refresh()
    return { ok: true, mode }
  },

  restartFromArchive: async (seriesSlug, from) => {
    const result = await jsonFetch('/api/devotionals/archive/restart', {
      method: 'POST',
      body: JSON.stringify({ seriesSlug, from }),
    })
    if (result.status === 401) {
      emitAuthRequired({ kind: 'restart_archive', seriesSlug, from })
      return { ok: false, needsAuth: true }
    }
    if (!result.ok) {
      set({ lastError: result.body?.error ?? 'Unable to restart.' })
      return { ok: false }
    }
    await get().refresh()
    return { ok: true }
  },

  clearActive: async () => {
    const result = await jsonFetch('/api/devotionals/active', {
      method: 'DELETE',
    })
    if (result.status === 401) return { ok: false, needsAuth: true }
    if (!result.ok) return { ok: false }
    await get().refresh()
    return { ok: true }
  },

  clearScheduledSwap: async () => {
    const result = await jsonFetch('/api/devotionals/active?target=swap', {
      method: 'DELETE',
    })
    if (result.status === 401) return { ok: false, needsAuth: true }
    if (!result.ok) return { ok: false }
    await get().refresh()
    return { ok: true }
  },
}))
