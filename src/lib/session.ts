import { cookies } from 'next/headers'
import { createAdminClient } from './supabase/admin'
import type { UserSession, UserSessionInsert } from '@/types/database'

const SESSION_COOKIE_NAME = 'euangelion_session'
// The cookie shipped misspelled for months — live sessions still ride on it.
// Reads fall back to the legacy name until those cookies age out (30-day TTL);
// writes only ever use the corrected name.
const LEGACY_SESSION_COOKIE_NAME = 'euongelion_session'
const SESSION_MAX_AGE = 30 * 24 * 60 * 60 // 30 days in seconds
const LAST_ACTIVE_WRITE_INTERVAL_MS = 60_000

const lastActiveWriteBySessionId = new Map<string, number>()

/**
 * Generate a cryptographically random session token
 */
function generateToken(): string {
  const bytes = new Uint8Array(32)
  crypto.getRandomValues(bytes)
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('')
}

/**
 * Get the session token from the cookie
 */
export async function getSessionToken(): Promise<string | null> {
  const cookieStore = await cookies()
  return (
    cookieStore.get(SESSION_COOKIE_NAME)?.value ??
    cookieStore.get(LEGACY_SESSION_COOKIE_NAME)?.value ??
    null
  )
}

/**
 * Set the session cookie
 */
export async function setSessionCookie(token: string): Promise<void> {
  const cookieStore = await cookies()
  cookieStore.set(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: SESSION_MAX_AGE,
    path: '/',
  })
  if (cookieStore.get(LEGACY_SESSION_COOKIE_NAME)) {
    cookieStore.delete(LEGACY_SESSION_COOKIE_NAME)
  }
}

/**
 * Clear the session cookie
 */
export async function clearSessionCookie(): Promise<void> {
  const cookieStore = await cookies()
  cookieStore.delete(SESSION_COOKIE_NAME)
  cookieStore.delete(LEGACY_SESSION_COOKIE_NAME)
}

/**
 * Get the current session from the database
 * Returns null if no session exists or session is expired
 */
export async function getSession(): Promise<UserSession | null> {
  const token = await getSessionToken()
  if (!token) return null

  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from('user_sessions')
    .select('*')
    .eq('session_token', token)
    .gt('expires_at', new Date().toISOString())
    .single()

  if (error || !data) return null

  // Throttle last_active_at writes to avoid contention on rapid concurrent checks.
  const now = Date.now()
  const lastWrite = lastActiveWriteBySessionId.get(data.id) ?? 0
  if (now - lastWrite >= LAST_ACTIVE_WRITE_INTERVAL_MS) {
    lastActiveWriteBySessionId.set(data.id, now)
    void supabase
      .from('user_sessions')
      .update({ last_active_at: new Date(now).toISOString() })
      .eq('id', data.id)
  }

  return data as UserSession
}

/**
 * Create a new anonymous session
 */
export async function createSession(
  options?: Partial<UserSessionInsert>,
): Promise<UserSession> {
  const token = generateToken()
  const supabase = createAdminClient()

  const { data, error } = await supabase
    .from('user_sessions')
    .insert({
      session_token: token,
      ...options,
    })
    .select()
    .single()

  if (error || !data) {
    throw new Error(`Failed to create session: ${error?.message}`)
  }

  await setSessionCookie(token)
  return data as UserSession
}

/**
 * Get or create a session — ensures a session always exists
 */
export async function getOrCreateSession(): Promise<UserSession> {
  const existing = await getSession()
  if (existing) return existing
  return createSession()
}

/**
 * Update session data
 */
export async function updateSession(
  sessionId: string,
  updates: Partial<UserSession>,
): Promise<UserSession | null> {
  const supabase = createAdminClient()

  const { data, error } = await supabase
    .from('user_sessions')
    .update(updates)
    .eq('id', sessionId)
    .select()
    .single()

  if (error || !data) return null
  return data as UserSession
}

/**
 * Tables keyed by `session_token` that should follow a user across devices.
 * Each entry is `[table, columnName]`; most use `session_token`, but
 * `soul_audit_jobs` uses `session_id`.
 *
 * `annotations` and `session_bookmarks` were removed here per the
 * two-site-states data ruling (F-105, CHANGELOG 2026-08-16); its CHANGELOG
 * SA label collides with the canonical decisions file and is deliberately
 * not cited here. That ruling made save-state account-only, and
 * /api/annotations + /api/bookmarks now write `session_token = user.id` —
 * so a signed-in reader's rows are keyed to the auth user id, never to the
 * random hex token this function moves between. The UPDATE matched zero
 * rows for every user and always would: it looked for a token those routes
 * stopped writing under that ruling, and the token it migrated TO is not
 * one the routes read back. Their data is carried by the user id itself, so
 * there is nothing to migrate. Deletion and export still cover both keyings
 * — see src/lib/privacy/account-deletion.ts.
 */
const SESSION_KEYED_TABLES: ReadonlyArray<readonly [string, string]> = [
  ['devotional_plan_instances', 'session_token'],
  ['audit_runs', 'session_token'],
  ['consent_records', 'session_token'],
  ['soul_audit_jobs', 'session_id'],
]

/**
 * Migrate all session-keyed data rows from `fromToken` to `toToken`.
 * Used when consolidating a returning user's prior anonymous sessions
 * into the session they signed in on.
 *
 * Each UPDATE runs through the admin client (RLS-bypass) and tolerates
 * Supabase being unavailable (mirrors the safe* pattern in repository.ts).
 * Returns the count of UPDATEs attempted (not row counts — Supabase REST
 * UPDATE responses don't reliably surface affected_rows).
 */
export async function migrateSessionData(
  fromToken: string,
  toToken: string,
): Promise<{ updatesAttempted: number }> {
  if (!fromToken || !toToken || fromToken === toToken) {
    return { updatesAttempted: 0 }
  }

  let supabase
  try {
    supabase = createAdminClient()
  } catch {
    return { updatesAttempted: 0 }
  }

  let updatesAttempted = 0
  for (const [table, column] of SESSION_KEYED_TABLES) {
    try {
      const result = await (
        supabase as unknown as {
          from: (t: string) => {
            update: (v: object) => {
              eq: (c: string, v: string) => Promise<{ error: unknown }>
            }
          }
        }
      )
        .from(table)
        .update({ [column]: toToken })
        .eq(column, fromToken)
      updatesAttempted += 1
      const error = (result as { error?: unknown }).error
      if (error) {
        console.error(
          `[migrateSessionData] ${table}.${column} ${fromToken} → ${toToken} failed:`,
          error,
        )
      }
    } catch (err) {
      console.error(
        `[migrateSessionData] ${table}.${column} threw:`,
        err instanceof Error ? err.message : err,
      )
    }
  }
  return { updatesAttempted }
}

/**
 * Link an anonymous session to an authenticated user.
 *
 * Beyond setting `user_sessions.user_id` on the current row (which has
 * always worked), this also consolidates any prior anonymous sessions
 * the user has under a different cookie — typically because they signed
 * in once on phone and now on laptop. For each prior anonymous session
 * tied to this user_id, all session-keyed data rows are migrated to
 * the current `session_token` so the returning user sees their plans,
 * audit history, etc. instead of an empty surface. Notes, highlights,
 * and saved devotionals need no migration — the two-site-states routes
 * (F-105) key them to the auth user id, so they already follow the
 * account.
 *
 * Schema note: data tables (devotional_plan_instances, audit_runs,
 * consent_records, soul_audit_jobs) do NOT have a `user_id` column —
 * they are keyed by `session_token` (or `session_id` for
 * soul_audit_jobs). Migration therefore moves the session reference,
 * not a user_id.
 */
export async function linkSessionToUser(
  sessionId: string,
  userId: string,
): Promise<UserSession | null> {
  const linked = await updateSession(sessionId, {
    user_id: userId,
  } as Partial<UserSession>)
  if (!linked) return null

  const supabase = createAdminClient()
  // Find any OTHER user_sessions that already belong to this user (e.g.
  // prior sign-ins on different devices). Their data needs to follow the
  // user to the current session.
  const { data: priorSessions, error: priorError } = await supabase
    .from('user_sessions')
    .select('session_token')
    .eq('user_id', userId)
    .neq('id', sessionId)
  if (priorError || !priorSessions) return linked

  for (const prior of priorSessions as Array<{ session_token: string }>) {
    if (!prior.session_token) continue
    await migrateSessionData(prior.session_token, linked.session_token)
  }

  return linked
}

/**
 * Destroy the current session
 */
export async function destroySession(): Promise<void> {
  const token = await getSessionToken()
  if (!token) return

  const supabase = createAdminClient()
  await supabase.from('user_sessions').delete().eq('session_token', token)
  await clearSessionCookie()
}
