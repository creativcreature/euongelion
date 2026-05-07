# Runbook — Phase 5 async runtime (Cloudflare Queues + Durable Objects)

**Status:** SCAFFOLDING SHIPPED. Bindings declared, types + DO class

- producer + queue-message shape are all in place. Activation requires
  the OpenNext worker-wrap step (same blocker as the Cron Trigger
  runbook).
  **Source-of-truth:** Master plan Section 3.8 + founder direction
  2026-05-07 ("approve-now").

---

## What this is

The current paid GENERATE flow is tab-bound: `/select` creates a
`soul_audit_jobs` row, `/select/status` polls and fires-and-forgets
`/generate-day` per day. If the user closes the tab, the chain stops
mid-plan.

Phase 5 fixes this by moving generation to a **real queue + Durable
Object orchestration**:

- `/select` enqueues a `compose_full_plan` message and returns the
  plan token immediately.
- A queue consumer Worker picks up the message and runs the full
  7-day generation in the background (independent of any open tab).
- The Durable Object `PlanOrchestrator` holds per-plan state
  (status, current day, days completed) so the status endpoint can
  report progress without round-tripping to the consumer.
- A status route reads from the DO. The client polls it for UI
  updates.

This unlocks the founder-locked Section 0.2 paid tier (unlimited
GENERATE plans without "stay on the page or you lose it" UX).

## What's shipped today (scaffolding)

**Code (compileable, inert until activated):**

- `src/lib/soul-audit/queue-types.ts` — `SoulAuditQueueMessage`
  shape (`compose_full_plan` and `compose_one_day` variants),
  `PlanOrchestrationState` (DO storage shape).
- `src/lib/soul-audit/plan-orchestrator.ts` — `PlanOrchestrator`
  Durable Object class. HTTP API: `GET /` reads state, `POST /update`
  applies a partial update, `POST /reset` wipes state.
- `src/lib/soul-audit/queue-producer.ts` — `enqueueComposeFullPlan`
  helper gated by `PHASE_5_ASYNC_ENABLED=on`. No-op when disabled.

**Bindings (declared, not yet active):**

- `wrangler.jsonc:queues.producers` — `SOUL_AUDIT_QUEUE` binding
- `wrangler.jsonc:queues.consumers` — consumer with batch size 1,
  3 retries, dead-letter queue `soul-audit-generation-dlq`
- `wrangler.jsonc:durable_objects.bindings` — `PLAN_ORCHESTRATOR`
  binding pointing at the `PlanOrchestrator` class
- `wrangler.jsonc:migrations` — v1 marker for the DO class

**`/api/soul-audit/select` is UNCHANGED.** The existing fire-and-
forget pattern keeps working until the founder activates Phase 5.

## What's NOT shipped (the activation work)

The OpenNext-generated worker (`.open-next/worker.js`) only exports
`fetch`. To activate Phase 5 we need to wrap it with:

1. `queue(batch, env, ctx)` handler — receives queue messages,
   dispatches to `composeFullPlan` (which we still need to write).
2. `PlanOrchestrator` re-export — Cloudflare requires DO classes to
   be exported from the worker entry.

This is the same OpenNext-wrap pattern documented in
`docs/runbooks/retention-cleanup-cron.md`. Done once, both the cron
trigger AND Phase 5 light up.

### Required steps (when ready to activate)

1. **Create Cloudflare Queue:**

   ```bash
   wrangler queues create soul-audit-generation
   wrangler queues create soul-audit-generation-dlq
   ```

2. **Wrap the OpenNext worker.** Sketch:

   ```ts
   // src/cron-and-queue-worker-entry.ts
   // @ts-expect-error — generated at build time
   import openNextWorker from '../.open-next/worker.js'
   import { runRetentionCleanup } from './lib/privacy/retention-cleanup'
   import { handleQueueMessage } from './lib/soul-audit/queue-consumer'
   export { PlanOrchestrator } from './lib/soul-audit/plan-orchestrator'

   export default {
     fetch: openNextWorker.fetch,
     async scheduled(_event, _env, ctx) {
       ctx.waitUntil(runRetentionCleanup())
     },
     async queue(batch, env, ctx) {
       for (const msg of batch.messages) {
         try {
           await handleQueueMessage(msg.body, env, ctx)
           msg.ack()
         } catch (e) {
           console.error('[queue] message failed:', e)
           msg.retry()
         }
       }
     },
   }
   ```

3. **Write `src/lib/soul-audit/queue-consumer.ts`** — the
   `handleQueueMessage(message, env, ctx)` function that:
   - For `compose_full_plan`: calls `composeDay(...)` for days 1-5,
     `composeRecap` for day 6, `composeSabbath` for day 7. Updates
     the DO state at each step.
   - For `compose_one_day`: composes a single day (used for retries
     and partial regeneration).
   - Writes the result to `devotional_plan_days` via the existing
     repository helpers.
   - Calls the DO's `/update` endpoint to update progress.

4. **Update build pipeline** — see retention-cleanup runbook for
   the esbuild step.

5. **Modify `/api/soul-audit/select`:**
   - When `asyncRuntimeEnabled()` returns true, call
     `enqueueComposeFullPlan(...)` and return the plan token
     immediately.
   - When false, existing fire-and-forget continues unchanged.

6. **Update status endpoint** to read from the DO when async runtime
   is enabled. Sketch:

   ```ts
   const id = env.PLAN_ORCHESTRATOR.idFromName(planToken)
   const stub = env.PLAN_ORCHESTRATOR.get(id)
   const response = await stub.fetch('https://do/state')
   const state = await response.json()
   ```

7. **Set the env flag:**

   ```bash
   wrangler secret put PHASE_5_ASYNC_ENABLED  # value: 'on'
   ```

8. **Smoke test in preview** — submit a Soul Audit, watch the
   queue process the message, verify all 7 days land in
   `devotional_plan_days`.

9. **Deploy.**

## Why we didn't activate in the autonomous session

Activating requires:

- Modifying the deploy pipeline (esbuild step + worker entry override)
- Writing the queue consumer with full LLM-call orchestration
- Coordinating the producer/consumer/DO contracts under load

That's a multi-day workstream that needs the founder watching live
preview deployments to verify nothing breaks. The scaffolding is the
right autonomous deliverable: types are locked, the DO class is
written and tested-shape, the producer is gated, and the wrangler
bindings are declared so the wrap-and-activate work is mechanical
when the founder is ready.

## Migration from existing fire-and-forget

The current pattern in `/api/soul-audit/select`:

```
// Today
1. POST /select → create soul_audit_jobs row
2. GET /select/status → polls DB, transitions pending→generating, fires /generate-day
3. /generate-day composes one day, polling continues
4. If user closes tab, chain stops
```

Phase 5 pattern:

```
// After activation
1. POST /select → create soul_audit_jobs row + enqueueComposeFullPlan(...)
                  → return planToken immediately
2. Queue consumer picks up message → composes all 7 days in background
3. Consumer updates PlanOrchestrator DO state at each step
4. GET /select/status → reads from PlanOrchestrator DO
5. User can close tab — generation completes anyway
```

Both can coexist (feature flag controls which path fires). When
confidence is high, remove the fire-and-forget code path.

## Cost

- Cloudflare Queues: $0.40/million operations. At 10k audits/mo with
  ~7 messages/audit (one full-plan + one per day), that's 70k ops/mo
  → $0.028/mo. Effectively free.
- Durable Objects: $0.15/million requests + $0.20/GB-hour storage.
  At 10k audits/mo (one DO per plan, ~10 status reads, retained 7d),
  ~$1/mo.

Total Phase 5 ops cost at launch volume: < $5/mo.

## What I did NOT change

- `/api/soul-audit/select` — unchanged
- `/api/soul-audit/select/status` — unchanged
- `/api/soul-audit/generate-day` — unchanged
- The existing fire-and-forget chain works exactly as it did
- Working-tree state preserved
