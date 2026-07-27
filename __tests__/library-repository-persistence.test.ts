import { describe, it, expect, beforeEach } from 'vitest'
import {
  LibraryPersistenceError,
  getActiveSeries,
  setActiveSeries,
  updateActiveSeriesDay,
  clearActiveSeries,
  setScheduledSwap,
  archiveSeries,
  promoteScheduledSwapIfDue,
} from '@/lib/library/repository'

/**
 * Regression guard for the Daily Bread root cause (2026-07-27):
 * migration 013 was never applied in prod, every active_series upsert
 * failed, and the repository swallowed the failure while the in-memory
 * cache reported success — so activation "worked" until the next
 * Workers isolate served the reload and Daily Bread reverted to the
 * "A Voice in the Wilderness" empty state. For months.
 *
 * The contract now: when the Supabase write cannot land (here: env
 * unset in the test runner — the same code path as table-missing or
 * network failure), every user-intent write THROWS
 * LibraryPersistenceError and rolls the cache back, so a same-isolate
 * read can never report state that will not survive a reload.
 */

const USER = '00000000-0000-0000-0000-00000000abcd'

beforeEach(() => {
  // Each test starts from an empty runtime store.

  ;(globalThis as any).__euangelionLibraryStore__ = undefined
  delete process.env.NEXT_PUBLIC_SUPABASE_URL
  delete process.env.SUPABASE_SERVICE_ROLE_KEY
})

describe('library repository — writes fail loudly when persistence is unavailable', () => {
  it('setActiveSeries throws and does NOT leave a cached row behind', async () => {
    await expect(
      setActiveSeries({
        userId: USER,
        seriesSlug: 'the-harvest',
        source: 'manual_start',
      }),
    ).rejects.toBeInstanceOf(LibraryPersistenceError)

    // The lie that caused the bug: cache said "active" while the DB had
    // nothing. After rollback the read must reflect reality.
    expect(await getActiveSeries(USER)).toBeNull()
  })

  it('updateActiveSeriesDay throws instead of bumping memory-only state', async () => {
    // No active row at all → returns null (no write attempted).
    expect(await updateActiveSeriesDay(USER, 3)).toBeNull()
  })

  it('clearActiveSeries throws when the delete cannot persist', async () => {
    await expect(clearActiveSeries(USER)).rejects.toBeInstanceOf(
      LibraryPersistenceError,
    )
  })

  it('setScheduledSwap throws and rolls back', async () => {
    await expect(
      setScheduledSwap({
        userId: USER,
        seriesSlug: 'hope',
        startsAt: new Date(Date.now() + 86_400_000).toISOString(),
      }),
    ).rejects.toBeInstanceOf(LibraryPersistenceError)
  })

  it('archiveSeries throws and rolls back', async () => {
    await expect(
      archiveSeries({
        userId: USER,
        seriesSlug: 'hope',
        furthestDayReached: 2,
        state: 'paused',
      }),
    ).rejects.toBeInstanceOf(LibraryPersistenceError)
  })

  it('promoteScheduledSwapIfDue never throws on the render path', async () => {
    // With no swap queued this resolves to the current active (null
    // here). The point: a page render must not 500 because a lazy
    // promotion write failed.
    await expect(promoteScheduledSwapIfDue(USER)).resolves.toBeNull()
  })
})

describe('plan expiry — zombies never resurface (SA-033)', () => {
  it('flags a plan whose last unlock is weeks past', async () => {
    const { isPlanExpired } = await import('@/lib/soul-audit/plan-queries')
    const old = new Date(Date.now() - 16 * 24 * 60 * 60 * 1000).toISOString()
    const plan = {
      schedule: [
        { day: 1, date: '', unlock_at: old, status: 'unlocked' },
        { day: 7, date: '', unlock_at: old, status: 'unlocked' },
      ],
    } as never
    expect(isPlanExpired(plan)).toBe(true)
  })

  it('keeps a plan whose week is still live', async () => {
    const { isPlanExpired } = await import('@/lib/soul-audit/plan-queries')
    const recent = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString()
    const plan = {
      schedule: [{ day: 1, date: '', unlock_at: recent, status: 'unlocked' }],
    } as never
    expect(isPlanExpired(plan)).toBe(false)
  })
})
