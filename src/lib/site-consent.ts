export const SITE_CONSENT_COOKIE = 'euangelion_site_consent'
export const SITE_CONSENT_UPDATED_EVENT = 'euangelion:site-consent-updated'
export const SITE_CONSENT_REQUIRED_EVENT = 'euangelion:site-consent-required'

const SITE_CONSENT_VERSION = 1
const SITE_CONSENT_MAX_AGE_SECONDS = 180 * 24 * 60 * 60

type RequestWithCookies = {
  cookies: { get: (name: string) => { value: string } | undefined }
}

export type SiteConsent = {
  version: number
  essentialAccepted: true
  analyticsOptIn: boolean
  recordedAt: string
}

export function createSiteConsent(analyticsOptIn: boolean): SiteConsent {
  return {
    version: SITE_CONSENT_VERSION,
    essentialAccepted: true,
    analyticsOptIn: Boolean(analyticsOptIn),
    recordedAt: new Date().toISOString(),
  }
}

export function parseSiteConsentCookieValue(
  value: string | null | undefined,
): SiteConsent | null {
  if (!value) return null
  try {
    const parsed = JSON.parse(decodeURIComponent(value)) as Partial<SiteConsent>
    if (parsed.version !== SITE_CONSENT_VERSION) return null
    if (parsed.essentialAccepted !== true) return null
    if (typeof parsed.analyticsOptIn !== 'boolean') return null
    if (
      typeof parsed.recordedAt !== 'string' ||
      Number.isNaN(Date.parse(parsed.recordedAt))
    ) {
      return null
    }
    return {
      version: SITE_CONSENT_VERSION,
      essentialAccepted: true,
      analyticsOptIn: parsed.analyticsOptIn,
      recordedAt: parsed.recordedAt,
    }
  } catch {
    return null
  }
}

export function serializeSiteConsentCookie(consent: SiteConsent): string {
  const encoded = encodeURIComponent(JSON.stringify(consent))
  const secure =
    typeof window !== 'undefined' && window.location.protocol === 'https:'
      ? '; Secure'
      : ''
  return `${SITE_CONSENT_COOKIE}=${encoded}; Path=/; Max-Age=${SITE_CONSENT_MAX_AGE_SECONDS}; SameSite=Lax${secure}`
}

export function readSiteConsentFromRequest(
  request: RequestWithCookies,
): SiteConsent | null {
  return parseSiteConsentCookieValue(
    request.cookies.get(SITE_CONSENT_COOKIE)?.value,
  )
}

export function readSiteConsentFromDocument(
  cookieValue?: string,
): SiteConsent | null {
  const source =
    typeof cookieValue === 'string'
      ? cookieValue
      : typeof document !== 'undefined'
        ? document.cookie
        : ''
  if (!source) return null

  const prefix = `${SITE_CONSENT_COOKIE}=`
  for (const token of source.split(';')) {
    const trimmed = token.trim()
    if (!trimmed.startsWith(prefix)) continue
    return parseSiteConsentCookieValue(trimmed.slice(prefix.length))
  }
  return null
}
