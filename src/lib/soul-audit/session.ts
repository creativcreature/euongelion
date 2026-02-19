import { cookies } from 'next/headers'
import { randomUUID } from 'crypto'

export const AUDIT_SESSION_COOKIE = 'euangelion_audit_session'
const SESSION_MAX_AGE_SECONDS = 30 * 24 * 60 * 60

function writeSessionCookie(
  cookieStore: Awaited<ReturnType<typeof cookies>>,
  token: string,
) {
  cookieStore.set(AUDIT_SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: SESSION_MAX_AGE_SECONDS,
    path: '/',
  })
}

export async function getOrCreateAuditSessionToken(): Promise<string> {
  const cookieStore = await cookies()
  const existing = cookieStore.get(AUDIT_SESSION_COOKIE)?.value
  if (existing) return existing

  const token = randomUUID()
  writeSessionCookie(cookieStore, token)
  return token
}

export async function rotateAuditSessionToken(): Promise<string> {
  const cookieStore = await cookies()
  const token = randomUUID()
  writeSessionCookie(cookieStore, token)
  return token
}
