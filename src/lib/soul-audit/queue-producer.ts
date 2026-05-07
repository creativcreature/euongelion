/**
 * queue-producer.ts — Phase 5 async runtime producer.
 *
 * Sends a `compose_full_plan` message to the SOUL_AUDIT_QUEUE so the
 * queue consumer can compose the entire 7-day plan in the background
 * without depending on the user's tab staying open.
 *
 * Gated by `PHASE_5_ASYNC_ENABLED=on`. When disabled (default), the
 * producer is a no-op and the existing fire-and-forget pattern in
 * `/api/soul-audit/select` continues to handle generation.
 *
 * Returns `{ enqueued: boolean, reason? }` so the caller can log
 * whether the message went onto the queue. NEVER throws — when the
 * Queue binding is unavailable or the send fails, returns
 * `enqueued: false` with a reason and the existing fallback fires.
 *
 * See docs/runbooks/phase5-async-runtime.md for the activation
 * checklist (worker-wrap + binding setup + secret).
 */

import type {
  ComposeFullPlanPayload,
  SoulAuditQueueMessage,
} from './queue-types'

interface CloudflareQueue {
  send(message: SoulAuditQueueMessage): Promise<void>
}

export interface EnqueueResult {
  enqueued: boolean
  reason?: 'disabled' | 'no-binding' | 'send-failed'
}

/** True when the Phase 5 async runtime is actively wired. */
export function asyncRuntimeEnabled(): boolean {
  return process.env.PHASE_5_ASYNC_ENABLED === 'on'
}

async function getQueue(): Promise<CloudflareQueue | null> {
  try {
    const { getCloudflareContext } = await import('@opennextjs/cloudflare')
    const { env } = await getCloudflareContext({ async: true })
    const candidate = (env as { SOUL_AUDIT_QUEUE?: CloudflareQueue })
      .SOUL_AUDIT_QUEUE
    return candidate ?? null
  } catch {
    return null
  }
}

/**
 * Enqueue a full-plan composition job. Caller has already created
 * the `soul_audit_jobs` row + `devotional_plan_instances` row and
 * is just kicking off async work.
 */
export async function enqueueComposeFullPlan(
  payload: ComposeFullPlanPayload,
): Promise<EnqueueResult> {
  if (!asyncRuntimeEnabled()) {
    return { enqueued: false, reason: 'disabled' }
  }
  const queue = await getQueue()
  if (!queue) {
    return { enqueued: false, reason: 'no-binding' }
  }
  try {
    await queue.send({ type: 'compose_full_plan', payload })
    return { enqueued: true }
  } catch (error) {
    console.error(
      '[queue-producer] send failed:',
      error instanceof Error ? error.message : error,
    )
    return { enqueued: false, reason: 'send-failed' }
  }
}
