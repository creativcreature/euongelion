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
 *   - annotations + session_bookmarks + push_subscriptions keyed to the
 *     auth user id, which is what the two-site-states routes (F-105) write
 *     into their session_token column when signed in
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
  // NOT listed: audit_option_telemetry. Migration 009 declares it but it does
  // not exist in production (PGRST205, verified 2026-08-16 — 009 was only
  // partially applied). Adding it here would make EVERY export report a
  // partial failure, telling readers their data may be incomplete when it is
  // not. See __tests__/privacy-table-coverage.test.ts, which holds this as a
  // documented exception rather than letting the two lists drift silently.
  'consent_records',
  'audit_selections',
  'devotional_plan_instances',
  'annotations',
  'session_bookmarks',
  'mock_account_sessions',
  // Device endpoint + keys (migration 015). Added to the deletion cascade
  // after an account deletion was found leaving push subscriptions orphaned;
  // the export half was missed at the same time.
  'push_subscriptions',
] as const

// Tables above whose `session_token` column ALSO holds auth user ids.
//
// The two-site-states data ruling (F-105, CHANGELOG 2026-08-16); its
// CHANGELOG SA label collides with the canonical decisions file and is
// deliberately not cited here. That ruling made save-state account-only:
// /api/annotations and /api/bookmarks write `session_token = user.id` for a
// signed-in reader, and /api/push/subscribe + /api/push/preferences key
// push_subscriptions the same way (`user?.id ?? auditToken`). Those rows
// are reachable from no user_sessions token and never appear in the
// per-session sweep below. Left out, a reader's own notes, highlights, and
// push endpoints are missing from the file that claims to be all of their
// data (GDPR Art. 15). Kept in step with the deletion cascade's list by
// __tests__/account-deletion-user-keyed.test.ts.
//
// DOCUMENTED RESIDUAL GAP — covered by neither helper: before commit
// cccee2f6 these routes wrote `session_token` = the euangelion_audit_session
// cookie's randomUUID for EVERY caller, signed-in included, and that token
// was never inserted into user_sessions. Rows written in that era under an
// audit-session UUID are reachable by neither this export nor the deletion
// cascade — there is no stored link from the user to that UUID. Closing it
// is pending a decision on linking that cookie's token to accounts.
const USER_ID_KEYED_SESSION_TOKEN_TABLES = [
  'annotations',
  'session_bookmarks',
  'push_subscriptions',
] as const

const USER_ID_TABLES = [
  'bookmarks',
  'user_progress',
  'soul_audit_responses',
  // These four were deletable but not exportable — a complete right to erasure
  // beside an incomplete right of access (GDPR Art. 15). The two lists are
  // hand-maintained in separate files, so they drifted silently; the pairing is
  // pinned now by __tests__/privacy-table-coverage.test.ts.
  'soul_audit_sessions',
  'active_series',
  'scheduled_series_swap',
  'archived_series',
  // Cross-device audio resume (migration 018).
  'listening_progress',
] as const

async function safeSelectByColumn(
  supabase: ReturnType<typeof createAdminClient>,
  table: string,
  column: string,
  value: string | string[],
  partialFailures: string[],
  failureLabel: string = `${table}:${column}`,
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
      partialFailures.push(failureLabel)
      return []
    }
    return data ?? []
  } catch {
    partialFailures.push(failureLabel)
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

  // 3b) Rows the user-id-keyed routes (F-105) keyed to the auth user id
  // rather than to a user_sessions token. The user id IS the session_token
  // value on these rows, so they are reported as one more session entry
  // under that value rather than invented into a new shape. Appended only
  // when it holds something: an always-present entry of empty arrays would
  // tell a reader with no notes that they have a session they never had.
  //
  // Failures here are labelled `table:user_id` so they stay distinguishable
  // from the per-token sweep in step 3, which reports `table:session_token`
  // for the same tables — one flaky table must not read as two.
  const userKeyedSessionRows: Record<string, unknown[]> = {}
  for (const table of USER_ID_KEYED_SESSION_TOKEN_TABLES) {
    userKeyedSessionRows[table] = await safeSelectByColumn(
      supabase,
      table,
      'session_token',
      userId,
      partialFailures,
      `${table}:user_id`,
    )
  }
  // Shape symmetry with the per-token entries in step 3, which always carry
  // these two keys. Plans hang off session tokens, never off a user id
  // written as a session_token, so both are structurally empty here.
  userKeyedSessionRows.devotional_plan_days = []
  userKeyedSessionRows.devotional_day_citations = []
  if (Object.values(userKeyedSessionRows).some((rows) => rows.length > 0)) {
    result.sessions.push({
      sessionToken: userId,
      rowsBySource: userKeyedSessionRows,
    })
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
