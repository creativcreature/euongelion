import { cookies } from 'next/headers'
import { randomUUID } from 'crypto'

const SESSION_COOKIE = 'euangelion_audit_session'
const SESSION_MAX_AGE_SECONDS = 30 * 24 * 60 * 60

export async function getOrCreateAuditSessionToken(): Promise<string> {
  const cookieStore = await cookies()
  const existing = cookieStore.get(SESSION_COOKIE)?.value
  if (existing) return existing

  const token = randomUUID()
  cookieStore.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: SESSION_MAX_AGE_SECONDS,
    path: '/',
  })
  return token
}
