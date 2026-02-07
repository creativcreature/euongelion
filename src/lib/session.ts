import { cookies } from 'next/headers'
import { createAdminClient } from './supabase/admin'
import type { UserSession, UserSessionInsert } from '@/types/database'

const SESSION_COOKIE_NAME = 'euongelion_session'
const SESSION_MAX_AGE = 30 * 24 * 60 * 60 // 30 days in seconds

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
  return cookieStore.get(SESSION_COOKIE_NAME)?.value ?? null
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
}

/**
 * Clear the session cookie
 */
export async function clearSessionCookie(): Promise<void> {
  const cookieStore = await cookies()
  cookieStore.delete(SESSION_COOKIE_NAME)
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

  // Touch last_active_at
  await supabase
    .from('user_sessions')
    .update({ last_active_at: new Date().toISOString() })
    .eq('id', data.id)

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
 * Link an anonymous session to an authenticated user
 */
export async function linkSessionToUser(
  sessionId: string,
  userId: string,
): Promise<UserSession | null> {
  return updateSession(sessionId, { user_id: userId } as Partial<UserSession>)
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
