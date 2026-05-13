/**
 * library/repository.ts — persistence for the user-controlled devotional
 * library: active_series, scheduled_series_swap, archived_series.
 *
 * Mirrors the soul-audit/repository.ts pattern: Supabase canonical with
 * an in-memory module fallback so reads still succeed when Supabase is
 * unreachable (env unset, transient failure). All `*WithFallback`
 * helpers do the cache-then-Supabase dance.
 *
 * Save (bookmark) state is intentionally NOT here — it reuses the
 * existing session_bookmarks table via soul-audit/repository.ts.
 */

import { createAdminClient } from '@/lib/supabase/admin'

export type ActiveSeriesSource =
  | 'manual_start'
  | 'soul_audit'
  | 'restart_from_archive'

export type ArchivedSeriesState = 'paused' | 'completed'

export interface ActiveSeriesRecord {
  user_id: string
  series_slug: string
  current_day: number
  source: ActiveSeriesSource
  started_at: string
  last_opened_at: string
}

export interface ScheduledSeriesSwapRecord {
  user_id: string
  series_slug: string
  starts_at: string
  queued_at: string
}

export interface ArchivedSeriesRecord {
  user_id: string
  series_slug: string
  furthest_day_reached: number
  archived_at: string
  state: ArchivedSeriesState
}

type RuntimeStore = {
  activeByUser: Map<string, ActiveSeriesRecord>
  swapByUser: Map<string, ScheduledSeriesSwapRecord>
  archivedByUser: Map<string, ArchivedSeriesRecord[]>
}

declare global {
  var __euangelionLibraryStore__: RuntimeStore | undefined
}

function getStore(): RuntimeStore {
  if (!global.__euangelionLibraryStore__) {
    global.__euangelionLibraryStore__ = {
      activeByUser: new Map(),
      swapByUser: new Map(),
      archivedByUser: new Map(),
    }
  }
  return global.__euangelionLibraryStore__
}

function maybeSupabase() {
  if (
    !process.env.NEXT_PUBLIC_SUPABASE_URL ||
    !process.env.SUPABASE_SERVICE_ROLE_KEY
  ) {
    return null
  }
  try {
    return createAdminClient()
  } catch {
    return null
  }
}

async function supabaseSelectOne<T>(
  table: string,
  filters: Record<string, string>,
): Promise<T | null> {
  const supabase = maybeSupabase()
  if (!supabase) return null
  try {
    let query = (supabase as any).from(table).select('*')
    for (const [k, v] of Object.entries(filters)) {
      query = query.eq(k, v)
    }
    const { data, error } = (await query.maybeSingle()) as {
      data: T | null
      error: unknown
    }
    if (error) return null
    return data ?? null
  } catch {
    return null
  }
}

async function supabaseSelectMany<T>(
  table: string,
  filters: Record<string, string>,
): Promise<T[]> {
  const supabase = maybeSupabase()
  if (!supabase) return []
  try {
    let query = (supabase as any).from(table).select('*')
    for (const [k, v] of Object.entries(filters)) {
      query = query.eq(k, v)
    }
    const { data, error } = (await query) as {
      data: T[] | null
      error: unknown
    }
    if (error) return []
    return data ?? []
  } catch {
    return []
  }
}

async function supabaseUpsert(
  table: string,
  values: object,
  onConflict?: string,
) {
  const supabase = maybeSupabase()
  if (!supabase) return
  try {
    const builder = (supabase as any).from(table).upsert(values, {
      onConflict: onConflict ?? 'user_id',
    })
    const result = await builder
    if (result.error) {
      console.error(
        `[library.supabaseUpsert] ${table} failed:`,
        result.error.message ?? result.error,
      )
    }
  } catch (err) {
    console.error(
      `[library.supabaseUpsert] ${table} threw:`,
      err instanceof Error ? err.message : err,
    )
  }
}

async function supabaseDelete(table: string, filters: Record<string, string>) {
  const supabase = maybeSupabase()
  if (!supabase) return
  try {
    let query = (supabase as any).from(table).delete()
    for (const [k, v] of Object.entries(filters)) {
      query = query.eq(k, v)
    }
    await query
  } catch {
    // no-op — best effort
  }
}

// ============================================
// active_series
// ============================================

export async function getActiveSeries(
  userId: string,
): Promise<ActiveSeriesRecord | null> {
  const cached = getStore().activeByUser.get(userId)
  if (cached) return cached

  const fetched = await supabaseSelectOne<ActiveSeriesRecord>('active_series', {
    user_id: userId,
  })
  if (fetched) {
    getStore().activeByUser.set(userId, fetched)
  }
  return fetched
}

export async function setActiveSeries(params: {
  userId: string
  seriesSlug: string
  currentDay?: number
  source: ActiveSeriesSource
}): Promise<ActiveSeriesRecord> {
  const now = new Date().toISOString()
  const row: ActiveSeriesRecord = {
    user_id: params.userId,
    series_slug: params.seriesSlug,
    current_day: params.currentDay ?? 1,
    source: params.source,
    started_at: now,
    last_opened_at: now,
  }
  getStore().activeByUser.set(params.userId, row)
  await supabaseUpsert('active_series', row, 'user_id')
  return row
}

export async function touchActiveSeries(userId: string): Promise<void> {
  const existing = await getActiveSeries(userId)
  if (!existing) return
  const next: ActiveSeriesRecord = {
    ...existing,
    last_opened_at: new Date().toISOString(),
  }
  getStore().activeByUser.set(userId, next)
  await supabaseUpsert('active_series', next, 'user_id')
}

export async function clearActiveSeries(userId: string): Promise<void> {
  getStore().activeByUser.delete(userId)
  await supabaseDelete('active_series', { user_id: userId })
}

// ============================================
// scheduled_series_swap
// ============================================

export async function getScheduledSwap(
  userId: string,
): Promise<ScheduledSeriesSwapRecord | null> {
  const cached = getStore().swapByUser.get(userId)
  if (cached) return cached

  const fetched = await supabaseSelectOne<ScheduledSeriesSwapRecord>(
    'scheduled_series_swap',
    { user_id: userId },
  )
  if (fetched) {
    getStore().swapByUser.set(userId, fetched)
  }
  return fetched
}

export async function setScheduledSwap(params: {
  userId: string
  seriesSlug: string
  startsAt: string
}): Promise<ScheduledSeriesSwapRecord> {
  const row: ScheduledSeriesSwapRecord = {
    user_id: params.userId,
    series_slug: params.seriesSlug,
    starts_at: params.startsAt,
    queued_at: new Date().toISOString(),
  }
  getStore().swapByUser.set(params.userId, row)
  await supabaseUpsert('scheduled_series_swap', row, 'user_id')
  return row
}

export async function clearScheduledSwap(userId: string): Promise<void> {
  getStore().swapByUser.delete(userId)
  await supabaseDelete('scheduled_series_swap', { user_id: userId })
}

// ============================================
// archived_series
// ============================================

export async function listArchivedSeries(
  userId: string,
): Promise<ArchivedSeriesRecord[]> {
  const cached = getStore().archivedByUser.get(userId) ?? []
  const fetched = await supabaseSelectMany<ArchivedSeriesRecord>(
    'archived_series',
    { user_id: userId },
  )

  const merged = [...cached, ...fetched]
  const bySlug = new Map<string, ArchivedSeriesRecord>()
  for (const row of merged) {
    bySlug.set(row.series_slug, row)
  }
  const sorted = Array.from(bySlug.values()).sort((a, b) =>
    b.archived_at.localeCompare(a.archived_at),
  )
  getStore().archivedByUser.set(userId, sorted)
  return sorted
}

export async function getArchivedSeries(
  userId: string,
  seriesSlug: string,
): Promise<ArchivedSeriesRecord | null> {
  const all = await listArchivedSeries(userId)
  return all.find((row) => row.series_slug === seriesSlug) ?? null
}

export async function archiveSeries(params: {
  userId: string
  seriesSlug: string
  furthestDayReached: number
  state: ArchivedSeriesState
}): Promise<ArchivedSeriesRecord> {
  // Upsert: if user paused this same series before, keep the higher day-reach.
  const existing = await getArchivedSeries(params.userId, params.seriesSlug)
  const furthest = Math.max(
    existing?.furthest_day_reached ?? 1,
    params.furthestDayReached,
  )
  const row: ArchivedSeriesRecord = {
    user_id: params.userId,
    series_slug: params.seriesSlug,
    furthest_day_reached: furthest,
    archived_at: new Date().toISOString(),
    state: params.state,
  }

  const list = getStore().archivedByUser.get(params.userId) ?? []
  const next = [row, ...list.filter((r) => r.series_slug !== row.series_slug)]
  getStore().archivedByUser.set(params.userId, next)

  await supabaseUpsert('archived_series', row, 'user_id,series_slug')
  return row
}

export async function removeArchivedSeries(
  userId: string,
  seriesSlug: string,
): Promise<void> {
  const list = getStore().archivedByUser.get(userId) ?? []
  getStore().archivedByUser.set(
    userId,
    list.filter((r) => r.series_slug !== seriesSlug),
  )
  await supabaseDelete('archived_series', {
    user_id: userId,
    series_slug: seriesSlug,
  })
}

// ============================================
// Higher-level orchestration helpers
// ============================================

/**
 * Compute the next Monday 00:00 in the given UTC offset (minutes).
 * Used by "Queue for Monday" — keeps the boundary stable across days
 * of the week without needing IANA timezone names client-side.
 *
 * If `now` is itself a Monday before midnight in the user's offset,
 * we still roll forward 7 days so "next Monday" always means a
 * meaningful future date (the user is presumably reading TODAY).
 */
export function nextMondayStartsAt(
  now: Date,
  utcOffsetMinutes: number,
): string {
  // Shift `now` into user-local time, find next Monday 00:00 there,
  // then shift back to UTC for storage.
  const userMs = now.getTime() + utcOffsetMinutes * 60_000
  const userDate = new Date(userMs)
  const dayOfWeek = userDate.getUTCDay() // 0 = Sunday … 1 = Monday
  // Days until next Monday. If today is Monday, jump 7 days forward.
  const daysUntilMonday = dayOfWeek === 1 ? 7 : (8 - dayOfWeek) % 7 || 7
  const targetUser = new Date(
    Date.UTC(
      userDate.getUTCFullYear(),
      userDate.getUTCMonth(),
      userDate.getUTCDate() + daysUntilMonday,
      0,
      0,
      0,
      0,
    ),
  )
  // Shift back to real UTC for storage.
  const targetUtcMs = targetUser.getTime() - utcOffsetMinutes * 60_000
  return new Date(targetUtcMs).toISOString()
}

/**
 * Lazy promotion: if a scheduled swap exists and its starts_at has
 * passed, archive the current active series (state='paused') and
 * promote the queued series. Returns the resulting active series.
 *
 * This runs on every GET /api/devotionals/active so the user never
 * has to "wake up" the system — first request after Monday morning
 * does the work.
 */
export async function promoteScheduledSwapIfDue(
  userId: string,
): Promise<ActiveSeriesRecord | null> {
  const swap = await getScheduledSwap(userId)
  if (!swap) return getActiveSeries(userId)

  if (new Date(swap.starts_at).getTime() > Date.now()) {
    return getActiveSeries(userId)
  }

  const current = await getActiveSeries(userId)
  if (current && current.series_slug !== swap.series_slug) {
    await archiveSeries({
      userId,
      seriesSlug: current.series_slug,
      furthestDayReached: current.current_day,
      state: 'paused',
    })
  }

  const promoted = await setActiveSeries({
    userId,
    seriesSlug: swap.series_slug,
    currentDay: 1,
    source: 'manual_start',
  })
  await clearScheduledSwap(userId)
  return promoted
}

/**
 * Replace current active series immediately. Archives the previous
 * active (if different) so it's restorable from /library, then
 * upserts the new active row.
 */
export async function replaceActiveSeries(params: {
  userId: string
  seriesSlug: string
  source: ActiveSeriesSource
}): Promise<ActiveSeriesRecord> {
  const current = await getActiveSeries(params.userId)
  if (current && current.series_slug !== params.seriesSlug) {
    await archiveSeries({
      userId: params.userId,
      seriesSlug: current.series_slug,
      furthestDayReached: current.current_day,
      state: 'paused',
    })
  }
  // Clear any pending Monday-queued swap — a "replace now" implicitly
  // supersedes a queued swap.
  await clearScheduledSwap(params.userId)
  return setActiveSeries({
    userId: params.userId,
    seriesSlug: params.seriesSlug,
    currentDay: 1,
    source: params.source,
  })
}
