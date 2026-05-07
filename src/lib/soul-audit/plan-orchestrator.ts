/**
 * plan-orchestrator.ts — Phase 5 Durable Object class.
 *
 * One DO instance per plan_token. Holds the per-plan
 * `PlanOrchestrationState` and a method to apply progress events
 * from the queue consumer.
 *
 * NOT YET EXPORTED FROM THE WORKER — see
 * `docs/runbooks/phase5-async-runtime.md` for the activation step
 * (requires wrapping the OpenNext worker entry).
 *
 * Storage strategy: a single `state` key per DO. Cheap reads, atomic
 * writes via DO's built-in transactional storage. Survives Worker
 * restarts.
 *
 * Public API:
 *   GET /                    → returns the current state as JSON
 *   POST /update             → applies a partial state update
 *                              { status?, currentDay?, daysCompleted?, error?, progressLabel? }
 *   POST /reset              → wipes state (for testing / reset flows)
 *
 * The HTTP shape mirrors how Cloudflare DOs are invoked from the
 * Worker — `state.fetch(new Request(url))`. Routes are simple
 * because state lookups are dominated by the single-key read.
 */

// Cloudflare Durable Object types are part of @cloudflare/workers-types
// which is implicitly available in the Workers runtime. We declare
// minimal shape here so the file compiles in the Next.js TypeScript
// context (which doesn't have those globals).
interface DurableObjectStorage {
  get<T>(key: string): Promise<T | undefined>
  put<T>(key: string, value: T): Promise<void>
  delete(key: string): Promise<boolean>
}
interface DurableObjectState {
  storage: DurableObjectStorage
  blockConcurrencyWhile<T>(fn: () => Promise<T>): Promise<T>
}

import type { PlanOrchestrationState } from './queue-types'

const STATE_KEY = 'state'

export class PlanOrchestrator {
  private readonly state: DurableObjectState
  private cached: PlanOrchestrationState | null = null

  constructor(state: DurableObjectState) {
    this.state = state
    // Hydrate cache once at construction. Storage reads are blocking
    // for concurrency-safety but cheap.
    void this.state.blockConcurrencyWhile(async () => {
      this.cached =
        (await this.state.storage.get<PlanOrchestrationState>(STATE_KEY)) ??
        null
    })
  }

  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url)
    const path = url.pathname

    if (request.method === 'GET' && (path === '/' || path === '/state')) {
      return Response.json(this.cached ?? null)
    }

    if (request.method === 'POST' && path === '/update') {
      const body = (await request
        .json()
        .catch(() => null)) as Partial<PlanOrchestrationState> | null
      if (!body) {
        return new Response('Invalid JSON body', { status: 400 })
      }
      const next: PlanOrchestrationState = {
        // Defaults for first write
        jobId: this.cached?.jobId ?? body.jobId ?? '',
        planToken: this.cached?.planToken ?? body.planToken ?? '',
        status: body.status ?? this.cached?.status ?? 'pending',
        currentDay: body.currentDay ?? this.cached?.currentDay ?? 0,
        daysCompleted: body.daysCompleted ?? this.cached?.daysCompleted ?? [],
        totalContentDays:
          body.totalContentDays ?? this.cached?.totalContentDays ?? 5,
        lastUpdatedAt: new Date().toISOString(),
        error: body.error ?? this.cached?.error,
        progressLabel: body.progressLabel ?? this.cached?.progressLabel,
      }
      await this.state.storage.put(STATE_KEY, next)
      this.cached = next
      return Response.json(next)
    }

    if (request.method === 'POST' && path === '/reset') {
      await this.state.storage.delete(STATE_KEY)
      this.cached = null
      return new Response('ok', { status: 200 })
    }

    return new Response('Not found', { status: 404 })
  }
}
