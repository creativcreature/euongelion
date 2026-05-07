import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { ComposeFullPlanPayload } from '@/lib/soul-audit/queue-types'

const ORIGINAL_ENV = { ...process.env }

afterEach(() => {
  vi.unstubAllGlobals()
  vi.resetModules()
  process.env = { ...ORIGINAL_ENV }
})

// Mock SOUL_AUDIT_QUEUE binding via Cloudflare context
let queueAvailable = true
let queueShouldThrow = false
let lastSent: unknown = null

beforeEach(() => {
  queueAvailable = true
  queueShouldThrow = false
  lastSent = null
})

vi.mock('@opennextjs/cloudflare', () => ({
  getCloudflareContext: async () => ({
    env: queueAvailable
      ? {
          SOUL_AUDIT_QUEUE: {
            send: async (msg: unknown) => {
              if (queueShouldThrow) throw new Error('simulated queue failure')
              lastSent = msg
            },
          },
        }
      : {},
  }),
}))

const PAYLOAD: ComposeFullPlanPayload = {
  jobId: 'job-1',
  planToken: 'plan-1',
  runId: 'run-1',
  sessionToken: 'tok-1',
  userInput: 'I am wrestling with x',
  theme: 'identity',
  scriptureAnchor: 'Genesis 1:27',
  totalContentDays: 5,
  timezone: 'America/New_York',
  timezoneOffsetMinutes: -300,
}

describe('asyncRuntimeEnabled', () => {
  it('returns false when env flag is unset', async () => {
    delete process.env.PHASE_5_ASYNC_ENABLED
    const { asyncRuntimeEnabled } =
      await import('@/lib/soul-audit/queue-producer')
    expect(asyncRuntimeEnabled()).toBe(false)
  })

  it("returns true only when env is exactly 'on'", async () => {
    process.env.PHASE_5_ASYNC_ENABLED = 'on'
    const { asyncRuntimeEnabled } =
      await import('@/lib/soul-audit/queue-producer')
    expect(asyncRuntimeEnabled()).toBe(true)
    process.env.PHASE_5_ASYNC_ENABLED = 'true'
    expect(asyncRuntimeEnabled()).toBe(false) // strict
  })
})

describe('enqueueComposeFullPlan', () => {
  it('returns enqueued=false with reason=disabled when env flag is off', async () => {
    delete process.env.PHASE_5_ASYNC_ENABLED
    const { enqueueComposeFullPlan } =
      await import('@/lib/soul-audit/queue-producer')
    const result = await enqueueComposeFullPlan(PAYLOAD)
    expect(result.enqueued).toBe(false)
    expect(result.reason).toBe?.('disabled') ??
      expect(result.reason).toBe('disabled')
  })

  it('returns enqueued=false with reason=no-binding when queue is unavailable', async () => {
    process.env.PHASE_5_ASYNC_ENABLED = 'on'
    queueAvailable = false
    const { enqueueComposeFullPlan } =
      await import('@/lib/soul-audit/queue-producer')
    const result = await enqueueComposeFullPlan(PAYLOAD)
    expect(result.enqueued).toBe(false)
    expect(result.reason).toBe('no-binding')
  })

  it('returns enqueued=true and sends the message when configured', async () => {
    process.env.PHASE_5_ASYNC_ENABLED = 'on'
    const { enqueueComposeFullPlan } =
      await import('@/lib/soul-audit/queue-producer')
    const result = await enqueueComposeFullPlan(PAYLOAD)
    expect(result.enqueued).toBe(true)
    expect(lastSent).toEqual({
      type: 'compose_full_plan',
      payload: PAYLOAD,
    })
  })

  it('returns enqueued=false with reason=send-failed on queue throw', async () => {
    process.env.PHASE_5_ASYNC_ENABLED = 'on'
    queueShouldThrow = true
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    const { enqueueComposeFullPlan } =
      await import('@/lib/soul-audit/queue-producer')
    const result = await enqueueComposeFullPlan(PAYLOAD)
    expect(result.enqueued).toBe(false)
    expect(result.reason).toBe('send-failed')
    errorSpy.mockRestore()
  })
})

describe('PlanOrchestrator (Durable Object)', () => {
  it('returns null on first GET (no state yet)', async () => {
    const { PlanOrchestrator } =
      await import('@/lib/soul-audit/plan-orchestrator')
    const storage = new Map<string, unknown>()
    const fakeState = {
      storage: {
        get: async <T>(k: string) => storage.get(k) as T | undefined,
        put: async (k: string, v: unknown) => {
          storage.set(k, v)
        },
        delete: async (k: string) => storage.delete(k),
      },
      blockConcurrencyWhile: async <T>(fn: () => Promise<T>) => fn(),
    }
    const orchestrator = new PlanOrchestrator(fakeState as never)
    // Allow blockConcurrencyWhile to settle
    await new Promise((resolve) => setTimeout(resolve, 0))
    const response = await orchestrator.fetch(
      new Request('https://do.local/state'),
    )
    const body = await response.json()
    expect(body).toBeNull()
  })

  it('persists state via POST /update and reads it back via GET', async () => {
    const { PlanOrchestrator } =
      await import('@/lib/soul-audit/plan-orchestrator')
    const storage = new Map<string, unknown>()
    const fakeState = {
      storage: {
        get: async <T>(k: string) => storage.get(k) as T | undefined,
        put: async (k: string, v: unknown) => {
          storage.set(k, v)
        },
        delete: async (k: string) => storage.delete(k),
      },
      blockConcurrencyWhile: async <T>(fn: () => Promise<T>) => fn(),
    }
    const orchestrator = new PlanOrchestrator(fakeState as never)
    await new Promise((resolve) => setTimeout(resolve, 0))

    const updateBody = {
      jobId: 'job-1',
      planToken: 'plan-1',
      status: 'generating' as const,
      currentDay: 2,
      daysCompleted: [1],
      totalContentDays: 5,
      progressLabel: 'Composing day 2',
    }
    const updateResp = await orchestrator.fetch(
      new Request('https://do.local/update', {
        method: 'POST',
        body: JSON.stringify(updateBody),
        headers: { 'Content-Type': 'application/json' },
      }),
    )
    const updated = await updateResp.json()
    expect(updated.status).toBe('generating')
    expect(updated.currentDay).toBe(2)
    expect(updated.daysCompleted).toEqual([1])
    expect(updated.lastUpdatedAt).toBeTruthy()

    const readResp = await orchestrator.fetch(
      new Request('https://do.local/state'),
    )
    const read = await readResp.json()
    expect(read.status).toBe('generating')
  })

  it('resets state on POST /reset', async () => {
    const { PlanOrchestrator } =
      await import('@/lib/soul-audit/plan-orchestrator')
    const storage = new Map<string, unknown>()
    storage.set('state', {
      jobId: 'job-1',
      planToken: 'plan-1',
      status: 'complete',
      currentDay: 7,
      daysCompleted: [1, 2, 3, 4, 5, 6, 7],
      totalContentDays: 5,
      lastUpdatedAt: '2026-05-07T00:00:00.000Z',
    })
    const fakeState = {
      storage: {
        get: async <T>(k: string) => storage.get(k) as T | undefined,
        put: async (k: string, v: unknown) => {
          storage.set(k, v)
        },
        delete: async (k: string) => storage.delete(k),
      },
      blockConcurrencyWhile: async <T>(fn: () => Promise<T>) => fn(),
    }
    const orchestrator = new PlanOrchestrator(fakeState as never)
    await new Promise((resolve) => setTimeout(resolve, 0))

    const resetResp = await orchestrator.fetch(
      new Request('https://do.local/reset', { method: 'POST' }),
    )
    expect(resetResp.status).toBe(200)
    expect(storage.has('state')).toBe(false)
  })

  it('returns 404 for unknown paths', async () => {
    const { PlanOrchestrator } =
      await import('@/lib/soul-audit/plan-orchestrator')
    const fakeState = {
      storage: {
        get: async () => undefined,
        put: async () => {},
        delete: async () => false,
      },
      blockConcurrencyWhile: async <T>(fn: () => Promise<T>) => fn(),
    }
    const orchestrator = new PlanOrchestrator(fakeState as never)
    const response = await orchestrator.fetch(
      new Request('https://do.local/unknown', { method: 'GET' }),
    )
    expect(response.status).toBe(404)
  })
})
