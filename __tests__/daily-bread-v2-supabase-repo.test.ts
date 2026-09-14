// @vitest-environment node
/**
 * Daily Bread V2 Supabase repository (SA-142 / F-184): reads retry transient
 * upstream errors with a fresh query per attempt (the first production CI run
 * hit a real 504 "Gateway Timeout"); non-transient errors and writes are not
 * retried; row mapping round-trips.
 */
import { describe, expect, it, vi } from 'vitest'
import {
  isTransientReadError,
  SupabaseDailyBreadRepository,
  type SupabaseLike,
} from '@/lib/daily-bread/repository/supabase'

/** A chainable fake PostgREST builder whose terminal await yields `results` in order. */
function fakeClient(results: { data: unknown; error: { message: string } | null }[]) {
  let call = 0
  const builds = { count: 0 }
  const builder = () => {
    builds.count += 1
    const b: Record<string, unknown> = {}
    for (const m of ['select', 'eq', 'in', 'lt', 'lte', 'gt', 'gte', 'order', 'limit']) b[m] = () => b
    b.maybeSingle = () => b
    b.then = (resolve: (v: unknown) => unknown) => resolve(results[Math.min(call++, results.length - 1)])
    return b
  }
  const rpc = vi.fn(async () => results[Math.min(call++, results.length - 1)])
  const client = { from: () => builder(), rpc } as unknown as SupabaseLike
  return { client, builds, rpc }
}

describe('supabase repository', () => {
  it('classifies transient upstream errors', () => {
    expect(isTransientReadError({ message: 'Gateway Timeout' })).toBe(true)
    expect(isTransientReadError({ message: 'TypeError: fetch failed' })).toBe(true)
    expect(isTransientReadError({ message: '503 Service Unavailable' })).toBe(true)
    expect(isTransientReadError({ message: 'permission denied for table daily_bread_editions' })).toBe(false)
    expect(isTransientReadError(null)).toBe(false)
  })

  it('retries a transient read with a fresh query and succeeds', async () => {
    const { client, builds } = fakeClient([
      { data: null, error: { message: 'Gateway Timeout' } },
      { data: { lifecycle: 'published' }, error: null },
    ])
    const repo = new SupabaseDailyBreadRepository(client, { attempts: 3, delayMs: 1 })
    expect(await repo.getLifecycle('2026-09-13')).toBe('published')
    expect(builds.count).toBe(2)
  })

  it('gives up after the attempt budget with a loud error', async () => {
    const { client, builds } = fakeClient([{ data: null, error: { message: 'Gateway Timeout' } }])
    const repo = new SupabaseDailyBreadRepository(client, { attempts: 3, delayMs: 1 })
    await expect(repo.getLatestPublished('2026-09-13')).rejects.toThrow(/read latest edition failed: Gateway Timeout/)
    expect(builds.count).toBe(3)
  })

  it('does not retry a non-transient read error', async () => {
    const { client, builds } = fakeClient([{ data: null, error: { message: 'permission denied' } }])
    const repo = new SupabaseDailyBreadRepository(client, { attempts: 3, delayMs: 1 })
    await expect(repo.listArchive({ limit: 5 })).rejects.toThrow(/permission denied/)
    expect(builds.count).toBe(1)
  })

  it('never retries a write, even on a transient error', async () => {
    const { client, rpc } = fakeClient([{ data: null, error: { message: 'TypeError: fetch failed' } }])
    const repo = new SupabaseDailyBreadRepository(client, { attempts: 3, delayMs: 1 })
    await expect(repo.publish('2026-09-13')).rejects.toThrow(/publish failed/)
    expect(rpc).toHaveBeenCalledTimes(1)
  })
})
