/**
 * F-070 — reminder picker persistence.
 *
 * Two layers, both honest:
 *  1. Device-local: the chosen window persists in the settings store
 *     (localStorage `euangelion-settings`) so the choice survives before any
 *     push subscription exists.
 *  2. Server-side: /api/push/preferences persists the window onto the
 *     session's push_subscriptions row(s) — the row the hourly sender reads.
 *     The route refuses (501) when VAPID is unconfigured and reports
 *     subscribed:false rather than pretending when no subscription exists.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'

const db = vi.hoisted(() => ({
  rows: [] as Array<Record<string, unknown>>,
  error: null as { message: string } | null,
  updates: [] as Array<{ values: Record<string, unknown>; token: string }>,
  deletes: [] as Array<{ token: string; endpoint: string }>,
}))

vi.mock('@/lib/auth', () => ({
  getUser: vi.fn(async () => null),
}))

vi.mock('@/lib/soul-audit/session', () => ({
  getOrCreateAuditSessionToken: vi.fn(async () => 'session-abc'),
}))

vi.mock('@/lib/supabase/admin', () => ({
  createAdminClient: () => ({
    from: (_table: string) => ({
      select: (_cols: string) => ({
        eq: (_c: string, _v: string) => ({
          order: (_col: string, _opts: { ascending: boolean }) => ({
            limit: async (_n: number) => ({ data: db.rows, error: db.error }),
          }),
        }),
      }),
      update: (values: Record<string, unknown>) => ({
        eq: (_c: string, token: string) => ({
          select: async (_cols: string) => {
            db.updates.push({ values, token })
            return { data: db.rows, error: db.error }
          },
        }),
      }),
      delete: () => ({
        eq: (_c1: string, token: string) => ({
          eq: (_c2: string, endpoint: string) => ({
            select: async (_cols: string) => {
              db.deletes.push({ token, endpoint })
              return { data: db.rows, error: db.error }
            },
          }),
        }),
      }),
    }),
  }),
}))

import {
  DELETE as preferencesDelete,
  GET as preferencesGet,
  POST as preferencesPost,
} from '@/app/api/push/preferences/route'

function getRequest() {
  return new NextRequest('http://localhost/api/push/preferences')
}

function postRequest(body: Record<string, unknown>) {
  return new NextRequest('http://localhost/api/push/preferences', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  })
}

function deleteRequest(body: Record<string, unknown>) {
  return new NextRequest('http://localhost/api/push/preferences', {
    method: 'DELETE',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  })
}

describe('settings store — device-local picker persistence', () => {
  beforeEach(() => {
    window.localStorage.clear()
    vi.resetModules()
  })

  it('persists the chosen window to euangelion-settings', async () => {
    const { useSettingsStore } = await import('@/stores/settingsStore')
    expect(useSettingsStore.getState().reminderWindow).toBeNull()

    useSettingsStore.getState().setReminderWindow('evening')

    const raw = window.localStorage.getItem('euangelion-settings')
    expect(raw).toBeTruthy()
    const parsed = JSON.parse(raw as string) as {
      state: { reminderWindow?: string }
    }
    expect(parsed.state.reminderWindow).toBe('evening')
  })

  it('drops an invalid persisted window on rehydrate instead of trusting it', async () => {
    window.localStorage.setItem(
      'euangelion-settings',
      JSON.stringify({
        state: { reminderWindow: 'brunch' },
        version: 0,
      }),
    )
    const { useSettingsStore } = await import('@/stores/settingsStore')
    useSettingsStore.persist.rehydrate()
    expect(useSettingsStore.getState().reminderWindow).toBeNull()
  })
})

describe('/api/push/preferences — server-side persistence', () => {
  beforeEach(() => {
    db.rows = []
    db.error = null
    db.updates = []
    db.deletes = []
    vi.stubEnv('NEXT_PUBLIC_VAPID_PUBLIC_KEY', 'BFakeTestVapidKey')
  })

  afterEach(() => {
    vi.unstubAllEnvs()
  })

  it('POST returns 501 (honest disabled) when VAPID is unconfigured', async () => {
    vi.stubEnv('NEXT_PUBLIC_VAPID_PUBLIC_KEY', '')
    const response = await preferencesPost(postRequest({ window: 'morning' }))
    expect(response.status).toBe(501)
    expect(db.updates).toHaveLength(0)
  })

  it('POST rejects an unknown window', async () => {
    const response = await preferencesPost(postRequest({ window: 'brunch' }))
    expect(response.status).toBe(400)
    expect(db.updates).toHaveLength(0)
  })

  it('POST rejects an invalid timezone', async () => {
    const response = await preferencesPost(
      postRequest({ window: 'morning', timezone: 'Not/AZone' }),
    )
    expect(response.status).toBe(400)
    expect(db.updates).toHaveLength(0)
  })

  it('POST persists window + timezone onto the session subscription rows', async () => {
    db.rows = [{ endpoint: 'https://push.example/e1' }]
    const response = await preferencesPost(
      postRequest({ window: 'evening', timezone: 'America/New_York' }),
    )
    expect(response.status).toBe(200)
    const payload = (await response.json()) as {
      ok: boolean
      subscribed: boolean
      window: string
    }
    expect(payload).toMatchObject({
      ok: true,
      subscribed: true,
      window: 'evening',
    })
    expect(db.updates).toHaveLength(1)
    expect(db.updates[0].token).toBe('session-abc')
    expect(db.updates[0].values).toMatchObject({
      reminder_window: 'evening',
      timezone: 'America/New_York',
    })
  })

  it('POST reports subscribed:false when the session has no subscription (no pretending)', async () => {
    db.rows = []
    const response = await preferencesPost(postRequest({ window: 'midday' }))
    expect(response.status).toBe(200)
    const payload = (await response.json()) as { subscribed: boolean }
    expect(payload.subscribed).toBe(false)
  })

  it('GET reports configured + stored window', async () => {
    db.rows = [
      {
        reminder_window: 'early_morning',
        timezone: 'Europe/London',
        updated_at: '2026-07-01T00:00:00Z',
      },
    ]
    const response = await preferencesGet(getRequest())
    expect(response.status).toBe(200)
    const payload = (await response.json()) as Record<string, unknown>
    expect(payload).toMatchObject({
      ok: true,
      configured: true,
      subscribed: true,
      window: 'early_morning',
      timezone: 'Europe/London',
    })
  })

  it('GET surfaces a loud 500 when the columns are missing (migration 017 unapplied)', async () => {
    db.error = {
      message: 'column push_subscriptions.reminder_window does not exist',
    }
    const response = await preferencesGet(getRequest())
    expect(response.status).toBe(500)
    const payload = (await response.json()) as { error?: string }
    expect(payload.error).toMatch(/migration 017/i)
  })

  it('DELETE removes only this session + endpoint pairing', async () => {
    db.rows = [{ id: 'row-1' }]
    const response = await preferencesDelete(
      deleteRequest({ endpoint: 'https://push.example/e1' }),
    )
    expect(response.status).toBe(200)
    const payload = (await response.json()) as { removed: number }
    expect(payload.removed).toBe(1)
    expect(db.deletes).toEqual([
      { token: 'session-abc', endpoint: 'https://push.example/e1' },
    ])
  })

  it('DELETE rejects a non-https endpoint', async () => {
    const response = await preferencesDelete(
      deleteRequest({ endpoint: 'http://insecure.example/e1' }),
    )
    expect(response.status).toBe(400)
    expect(db.deletes).toHaveLength(0)
  })
})
