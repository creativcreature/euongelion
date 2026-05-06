/**
 * data-export.ts — GDPR/CCPA "download my data" implementation.
 *
 * Gathers every row a user owns across all session-token-keyed and
 * user-id-keyed tables into a single structured JSON document.
 *
 * Authentication is enforced by the calling route, NOT here. This
 * module assumes you've already verified the caller owns `userId`.
 *
 * Data scope (per master plan Section 3.9 + Section 0.7):
 *   - public.users row (profile + preferences + Founding Member ts)
 *   - All session_tokens for this user via user_sessions
 *   - For each session_token: audit_runs, audit_options, consent_records,
 *     audit_selections, devotional_plan_instances + days + citations,
 *     annotations, session_bookmarks, mock_account_sessions
 *   - User-id-keyed tables: bookmarks, user_progress, soul_audit_responses
 *
 * Excluded (intentionally):
 *   - Raw API logs (operational, not user-owned)
 *   - audit_option_telemetry (anonymous performance data)
 *   - Stripe billing details (the user can export from Stripe directly)
 *
 * Returns a JSON-serializable object. Caller is responsible for
 * setting Content-Type, Content-Disposition, etc.
 */

import { createAdminClient } from '@/lib/supabase/admin'

export interface DataExportResult {
  /** Schema version for future migrations of the export shape. */
  exportVersion: 1
  exportedAt: string
  user: {
    id: string
    email: string | null
    profile: Record<string, unknown> | null
  }
  sessions: Array<{
    sessionToken: string
    rowsBySource: Record<string, unknown[]>
  }>
  userKeyedRows: {
    bookmarks: unknown[]
    userProgress: unknown[]
    soulAuditResponses: unknown[]
  }
  /** Tables that errored during export. Empty when everything succeeded. */
  partialFailures: string[]
}

const SESSION_TOKEN_TABLES = [
  'audit_runs',
  'audit_options',
  'consent_records',
  'audit_selections',
  'devotional_plan_instances',
  'annotations',
  'session_bookmarks',
  'mock_account_sessions',
] as const

const USER_ID_TABLES = [
  'bookmarks',
  'user_progress',
  'soul_audit_responses',
] as const

async function safeSelectByColumn(
  supabase: ReturnType<typeof createAdminClient>,
  table: string,
  column: string,
  value: string | string[],
  partialFailures: string[],
): Promise<unknown[]> {
  try {
    // The export helper iterates over a typed list of table names that
    // intentionally bypass Supabase's per-table TS overloads — we want
    // a generic select-by-column. Cast through `unknown` once at the
    // call site keeps the rest of the helper strongly typed.
    const builder = (
      supabase as unknown as {
        from: (table: string) => {
          select: (cols: string) => {
            eq: (
              col: string,
              val: string,
            ) => Promise<{
              data: unknown[] | null
              error: unknown
            }>
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
      .from(table)
      .select('*')
    const { data, error } = Array.isArray(value)
      ? await builder.in(column, value)
      : await builder.eq(column, value)
    if (error) {
      partialFailures.push(`${table}:${column}`)
      return []
    }
    return data ?? []
  } catch {
    partialFailures.push(`${table}:${column}`)
    return []
  }
}

/**
 * Gather every row owned by a user. Never throws — partial failures
 * are recorded in `partialFailures` so the user gets a usable export
 * even if one table is temporarily unavailable.
 */
export async function exportUserData(
  userId: string,
): Promise<DataExportResult> {
  const exportedAt = new Date().toISOString()
  const partialFailures: string[] = []
  const result: DataExportResult = {
    exportVersion: 1,
    exportedAt,
    user: { id: userId, email: null, profile: null },
    sessions: [],
    userKeyedRows: {
      bookmarks: [],
      userProgress: [],
      soulAuditResponses: [],
    },
    partialFailures,
  }

  let supabase: ReturnType<typeof createAdminClient>
  try {
    supabase = createAdminClient()
  } catch {
    partialFailures.push('createAdminClient')
    return result
  }

  // 1) public.users row
  try {
    const { data: userRow } = await supabase
      .from('users')
      .select('*')
      .eq('id', userId)
      .maybeSingle()
    if (userRow) {
      const row = userRow as Record<string, unknown>
      result.user.email = typeof row.email === 'string' ? row.email : null
      result.user.profile = row
    }
  } catch {
    partialFailures.push('users:id')
  }

  // 2) Resolve all session_tokens this user has owned.
  let sessionTokens: string[] = []
  try {
    const { data: sessions } = await supabase
      .from('user_sessions')
      .select('session_token')
      .eq('user_id', userId)
    sessionTokens = (sessions ?? [])
      .map((s) => (s as { session_token?: string }).session_token)
      .filter((t): t is string => typeof t === 'string' && t.length > 0)
  } catch {
    partialFailures.push('user_sessions:user_id')
  }

  // 3) For each session_token, gather all session-keyed rows.
  for (const sessionToken of sessionTokens) {
    const rowsBySource: Record<string, unknown[]> = {}
    for (const table of SESSION_TOKEN_TABLES) {
      rowsBySource[table] = await safeSelectByColumn(
        supabase,
        table,
        'session_token',
        sessionToken,
        partialFailures,
      )
    }

    // devotional_plan_days + devotional_day_citations are joined via
    // plan_token, not session_token. Pull plan_tokens from the
    // devotional_plan_instances we just fetched.
    const planRows = rowsBySource.devotional_plan_instances as
      | Array<{ plan_token?: string }>
      | undefined
    const planTokens = (planRows ?? [])
      .map((p) => p.plan_token)
      .filter((t): t is string => typeof t === 'string' && t.length > 0)
    if (planTokens.length > 0) {
      rowsBySource.devotional_plan_days = await safeSelectByColumn(
        supabase,
        'devotional_plan_days',
        'plan_token',
        planTokens,
        partialFailures,
      )
      rowsBySource.devotional_day_citations = await safeSelectByColumn(
        supabase,
        'devotional_day_citations',
        'plan_token',
        planTokens,
        partialFailures,
      )
    } else {
      rowsBySource.devotional_plan_days = []
      rowsBySource.devotional_day_citations = []
    }

    result.sessions.push({ sessionToken, rowsBySource })
  }

  // 4) User-id-keyed tables.
  for (const table of USER_ID_TABLES) {
    const rows = await safeSelectByColumn(
      supabase,
      table,
      'user_id',
      userId,
      partialFailures,
    )
    if (table === 'bookmarks') result.userKeyedRows.bookmarks = rows
    else if (table === 'user_progress') result.userKeyedRows.userProgress = rows
    else if (table === 'soul_audit_responses')
      result.userKeyedRows.soulAuditResponses = rows
  }

  return result
}

/**
 * Pretty-print the export as a JSON string suitable for direct
 * download. Returns a tuple `[body, filename]`.
 */
export function formatExportForDownload(
  result: DataExportResult,
): [body: string, filename: string] {
  const body = JSON.stringify(result, null, 2)
  const safeId = result.user.id.replace(/[^a-z0-9-]/gi, '').slice(0, 16)
  const date = result.exportedAt.slice(0, 10)
  const filename = `euangelion-data-export-${safeId}-${date}.json`
  return [body, filename]
}
