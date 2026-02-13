export const DAY_LOCKING_COOKIE = 'euangelion_day_locking'

type RequestWithCookies = {
  cookies: { get: (name: string) => { value: string } | undefined }
}

function normalizeToggle(value: string | null | undefined): boolean | null {
  if (!value) return null
  const normalized = value.trim().toLowerCase()
  if (['on', 'true', '1', 'enabled'].includes(normalized)) return true
  if (['off', 'false', '0', 'disabled'].includes(normalized)) return false
  return null
}

export function getDefaultDayLockingEnabled(): boolean {
  const fromEnv = normalizeToggle(process.env.DAY_LOCKING_DEFAULT)
  if (fromEnv !== null) return fromEnv
  // Default OFF so testing flow is frictionless unless explicitly enabled.
  return false
}

export function isDayLockingEnabledForRequest(
  request: RequestWithCookies,
): boolean {
  const cookieValue = request.cookies.get(DAY_LOCKING_COOKIE)?.value
  const fromCookie = normalizeToggle(cookieValue)
  if (fromCookie !== null) return fromCookie
  return getDefaultDayLockingEnabled()
}

export function serializeDayLockingCookie(enabled: boolean): string {
  return `${DAY_LOCKING_COOKIE}=${enabled ? 'on' : 'off'}; Path=/; Max-Age=31536000; SameSite=Lax`
}
