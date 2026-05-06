/**
 * retention-cleanup.ts — implements the 30-day anonymous-data
 * retention policy from master plan Section 0.7 + the existing
 * RETENTION_POLICY in `retention.ts`.
 *
 * Anonymous sessions (`user_sessions.user_id IS NULL`) older than
 * 30 days from `last_active_at` are hard-deleted along with all
 * session-token-keyed rows that reference them. The cascade re-uses
 * the same A→F ordering as `account-deletion.ts` minus the
 * auth.users step (anonymous sessions have no auth user).
 *
 * Trigger model: this module exports a callable
 * `runRetentionCleanup()` that any of the following can invoke:
 *   - A future Cloudflare Cron Trigger (when the binding is added)
 *   - A GitHub Action on a schedule
 *   - A manual ops call to `POST /api/admin/run-retention-cleanup`
 *     guarded by an internal secret
 *   - The local dev console for testing
 *
 * Returns a structured result so the caller can log the cascade
 * and surface partial failures. NEVER throws.
 *
 * Idempotent: re-running the same cleanup is a no-op (the previous
 * run's rows are gone).
 *
 * Safety:
 *   - Only deletes rows where `user_id IS NULL` AND `last_active_at`
 *     is older than the cutoff. Authenticated users are never
 *     touched by this function.
 *   - Authenticated rows (with `user_id` set) are deleted only via
 *     the explicit `deleteUserAccount()` helper.
 */

import { createAdminClient } from '@/lib/supabase/admin'
import { RETENTION_POLICY } from './retention'

export interface RetentionCleanupResult {
  startedAt: string
  completedAt: string
  cutoffIso: string
  /** Number of anonymous sessions identified as expired. */
  expiredSessionsFound: number
  /** Number of session_tokens whose data was successfully removed. */
  sessionTokensProcessed: number
  /** Tables touched at least once. */
  tablesDeleted: string[]
  /** Tables that errored — data MAY persist there. */
  partialFailures: string[]
}

const SESSION_TOKEN_TABLES = [
  'audit_runs',
  'audit_options',
  'audit_option_telemetry',
  'consent_records',
  'audit_selections',
  'devotional_plan_instances',
  'annotations',
  'session_bookmarks',
  'mock_account_sessions',
] as const

async function safeDeleteByColumn(
  supabase: ReturnType<typeof createAdminClient>,
  table: string,
  column: string,
  values: string[],
  result: RetentionCleanupResult,
): Promise<void> {
  if (values.length === 0) return
  try {
    const builder = (
      supabase as unknown as {
        from: (table: string) => {
          delete: () => {
            in: (col: string, vals: string[]) => Promise<{ error: unknown }>
          }
        }
      }
    )
      .from(table)
      .delete()
    const { error } = await builder.in(column, values)
    if (error) {
      result.partialFailures.push(`${table}:${column}`)
    } else if (!result.tablesDeleted.includes(table)) {
      result.tablesDeleted.push(table)
    }
  } catch {
    result.partialFailures.push(`${table}:${column}`)
  }
}

/**
 * Cascade-delete all anonymous-session rows older than the
 * configured retention window. Returns a result object — never
 * throws.
 *
 * @param overrides - Optional overrides for testing:
 *   - `now`: pretend this is the current time (default: Date.now())
 *   - `windowDays`: override the policy window (default:
 *     RETENTION_POLICY.anonymousSessionDays)
 */
export async function runRetentionCleanup(
  overrides: { now?: Date; windowDays?: number } = {},
): Promise<RetentionCleanupResult> {
  const now = overrides.now ?? new Date()
  const windowDays =
    overrides.windowDays ?? RETENTION_POLICY.anonymousSessionDays
  const cutoffMs = now.getTime() - windowDays * 24 * 60 * 60_000
  const cutoffIso = new Date(cutoffMs).toISOString()

  const startedAt = new Date().toISOString()
  const result: RetentionCleanupResult = {
    startedAt,
    completedAt: startedAt,
    cutoffIso,
    expiredSessionsFound: 0,
    sessionTokensProcessed: 0,
    tablesDeleted: [],
    partialFailures: [],
  }

  let supabase: ReturnType<typeof createAdminClient>
  try {
    supabase = createAdminClient()
  } catch {
    result.partialFailures.push('createAdminClient')
    result.completedAt = new Date().toISOString()
    return result
  }

  // Step A: find all anonymous sessions older than cutoff. Two filters:
  //   user_id IS NULL — anonymous only
  //   last_active_at < cutoff — older than retention window
  let expiredSessions: Array<{ session_token: string }> = []
  try {
    const builder = (
      supabase as unknown as {
        from: (table: string) => {
          select: (cols: string) => {
            is: (
              col: string,
              val: null,
            ) => {
              lt: (
                col: string,
                val: string,
              ) => Promise<{
                data: unknown[] | null
                error: unknown
              }>
            }
          }
        }
      }
    )
      .from('user_sessions')
      .select('session_token')
    const { data, error } = await builder
      .is('user_id', null)
      .lt('last_active_at', cutoffIso)
    if (error) {
      result.partialFailures.push('user_sessions:select')
    } else {
      expiredSessions = (data ?? []) as Array<{ session_token: string }>
      result.expiredSessionsFound = expiredSessions.length
    }
  } catch {
    result.partialFailures.push('user_sessions:select')
  }

  if (expiredSessions.length === 0) {
    result.completedAt = new Date().toISOString()
    return result
  }

  const sessionTokens = expiredSessions
    .map((s) => s.session_token)
    .filter((t): t is string => typeof t === 'string' && t.length > 0)

  // Step B-prep: pull plan_tokens BEFORE deleting devotional_plan_instances
  let planTokens: string[] = []
  try {
    const builder = (
      supabase as unknown as {
        from: (table: string) => {
          select: (cols: string) => {
            in: (
              col: string,
              vals: string[],
            ) => Promise<{
              data: unknown[] | null
              error: unknown
            }>
          }
        }
      }
    )
      .from('devotional_plan_instances')
      .select('plan_token')
    const { data: plans } = await builder.in('session_token', sessionTokens)
    planTokens = (plans ?? [])
      .map((p) => (p as { plan_token?: string }).plan_token)
      .filter((t): t is string => typeof t === 'string' && t.length > 0)
  } catch {
    result.partialFailures.push('devotional_plan_instances:plan_token:select')
  }

  // Step B: delete from each session-token-keyed table.
  for (const table of SESSION_TOKEN_TABLES) {
    await safeDeleteByColumn(
      supabase,
      table,
      'session_token',
      sessionTokens,
      result,
    )
  }

  // Step C: delete devotional_plan_days + devotional_day_citations
  if (planTokens.length > 0) {
    await safeDeleteByColumn(
      supabase,
      'devotional_plan_days',
      'plan_token',
      planTokens,
      result,
    )
    await safeDeleteByColumn(
      supabase,
      'devotional_day_citations',
      'plan_token',
      planTokens,
      result,
    )
  }

  // Step D: delete the anonymous user_sessions rows themselves.
  await safeDeleteByColumn(
    supabase,
    'user_sessions',
    'session_token',
    sessionTokens,
    result,
  )

  result.sessionTokensProcessed = sessionTokens.length
  result.completedAt = new Date().toISOString()
  return result
}
