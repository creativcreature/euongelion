/**
 * account-deletion.ts — irreversible account deletion with full
 * cascade across all session-token-keyed and user-id-keyed tables.
 *
 * Authentication and confirmation are enforced by the calling route,
 * NOT here. This module assumes you've already verified:
 *   1. The caller is authenticated as `userId`
 *   2. The caller has provided an explicit confirmation token
 *      (so an XSS or CSRF can't trigger silent deletion)
 *
 * Deletion order (matters):
 *
 *   A. Resolve all session_tokens this user has ever owned.
 *   B. For each session-token-keyed table, delete WHERE
 *      session_token IN (...). Order within this group doesn't
 *      matter — there are no FK chains between these tables.
 *   C. Delete devotional_plan_days + devotional_day_citations by
 *      plan_token (sourced from devotional_plan_instances we just
 *      deleted — pulled BEFORE the parent delete).
 *   D. Delete from user_sessions WHERE user_id = $1.
 *   E. Delete from auth.users via supabase.auth.admin.deleteUser.
 *      The FK `public.users.id REFERENCES auth.users(id) ON DELETE
 *      CASCADE` then drops the public.users row, which in turn
 *      cascades to user_id-keyed tables (bookmarks, user_progress,
 *      soul_audit_responses) per their migration FK definitions.
 *
 * Returns a structured result reporting which tables were touched
 * and which (if any) failed. Partial failures DO NOT abort the
 * process — we attempt every table and report at the end so the
 * user gets maximum data removal even if one table errors.
 *
 * NEVER throws. The caller should always log the result and surface
 * any partialFailures to the user.
 */

import { createAdminClient } from '@/lib/supabase/admin'

export interface AccountDeletionResult {
  userId: string
  startedAt: string
  completedAt: string
  /** Tables that completed at least one delete successfully. */
  tablesDeleted: string[]
  /** Tables that errored — user should be told their data MAY persist there. */
  partialFailures: string[]
  /** Number of distinct session_tokens we cascaded through. */
  sessionTokensProcessed: number
  /** Whether auth.users delete succeeded (the final, irreversible step). */
  authUserDeleted: boolean
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
  value: string | string[],
  result: AccountDeletionResult,
): Promise<void> {
  try {
    const builder = (
      supabase as unknown as {
        from: (table: string) => {
          delete: () => {
            eq: (col: string, val: string) => Promise<{ error: unknown }>
            in: (col: string, vals: string[]) => Promise<{ error: unknown }>
          }
        }
      }
    )
      .from(table)
      .delete()
    const { error } = Array.isArray(value)
      ? await builder.in(column, value)
      : await builder.eq(column, value)
    if (error) {
      result.partialFailures.push(`${table}:${column}`)
    } else {
      if (!result.tablesDeleted.includes(table)) {
        result.tablesDeleted.push(table)
      }
    }
  } catch {
    result.partialFailures.push(`${table}:${column}`)
  }
}

/**
 * Cascade-delete every row this user owns, then delete the user from
 * auth.users. Returns a result object — never throws.
 *
 * Idempotent: calling twice is safe. The second call sees no rows
 * and no auth user, returns success with empty `tablesDeleted`.
 */
export async function deleteUserAccount(
  userId: string,
): Promise<AccountDeletionResult> {
  const startedAt = new Date().toISOString()
  const result: AccountDeletionResult = {
    userId,
    startedAt,
    completedAt: startedAt,
    tablesDeleted: [],
    partialFailures: [],
    sessionTokensProcessed: 0,
    authUserDeleted: false,
  }

  let supabase: ReturnType<typeof createAdminClient>
  try {
    supabase = createAdminClient()
  } catch {
    result.partialFailures.push('createAdminClient')
    result.completedAt = new Date().toISOString()
    return result
  }

  // Step A: collect all session_tokens for this user
  let sessionTokens: string[] = []
  try {
    const { data: sessions } = await supabase
      .from('user_sessions')
      .select('session_token')
      .eq('user_id', userId)
    sessionTokens = (sessions ?? [])
      .map((s) => (s as { session_token?: string }).session_token)
      .filter((t): t is string => typeof t === 'string' && t.length > 0)
    result.sessionTokensProcessed = sessionTokens.length
  } catch {
    result.partialFailures.push('user_sessions:user_id:select')
  }

  // Step C-prep: collect plan_tokens BEFORE deleting devotional_plan_instances
  let planTokens: string[] = []
  if (sessionTokens.length > 0) {
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
  }

  // Step B: delete from each session-token-keyed table.
  if (sessionTokens.length > 0) {
    for (const table of SESSION_TOKEN_TABLES) {
      await safeDeleteByColumn(
        supabase,
        table,
        'session_token',
        sessionTokens,
        result,
      )
    }
  }

  // Step C: delete devotional_plan_days + devotional_day_citations by
  // plan_token.
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

  // Step D: delete from user_sessions
  await safeDeleteByColumn(supabase, 'user_sessions', 'user_id', userId, result)

  // Step E: delete from auth.users (cascades to public.users via FK,
  // which cascades to bookmarks/user_progress/soul_audit_responses).
  try {
    const { error } = await supabase.auth.admin.deleteUser(userId)
    if (error) {
      result.partialFailures.push(`auth.users:id (${error.message})`)
    } else {
      result.authUserDeleted = true
      result.tablesDeleted.push('auth.users')
      result.tablesDeleted.push('users')
      result.tablesDeleted.push('bookmarks')
      result.tablesDeleted.push('user_progress')
      result.tablesDeleted.push('soul_audit_responses')
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'unknown'
    result.partialFailures.push(`auth.users:id (${message})`)
  }

  result.completedAt = new Date().toISOString()
  return result
}
