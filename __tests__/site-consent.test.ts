import { describe, expect, it } from 'vitest'
import {
  SITE_CONSENT_COOKIE,
  createSiteConsent,
  parseSiteConsentCookieValue,
  readSiteConsentFromDocument,
  readSiteConsentFromRequest,
  serializeSiteConsentCookie,
} from '@/lib/site-consent'

describe('site consent cookie helpers', () => {
  it('serializes and parses consent payload', () => {
    const consent = createSiteConsent(true)
    const header = serializeSiteConsentCookie(consent)
    const cookieValue = header.split(';')[0]?.split('=')[1]
    const parsed = parseSiteConsentCookieValue(cookieValue)
    expect(parsed?.essentialAccepted).toBe(true)
    expect(parsed?.analyticsOptIn).toBe(true)
  })

  it('rejects malformed payloads', () => {
    expect(parseSiteConsentCookieValue(undefined)).toBeNull()
    expect(parseSiteConsentCookieValue('not-json')).toBeNull()
    expect(
      parseSiteConsentCookieValue(
        encodeURIComponent(
          JSON.stringify({
            version: 1,
            essentialAccepted: false,
            analyticsOptIn: true,
            recordedAt: new Date().toISOString(),
          }),
        ),
      ),
    ).toBeNull()
  })

  it('reads consent from document cookie string', () => {
    const consent = createSiteConsent(false)
    const encoded = encodeURIComponent(JSON.stringify(consent))
    const parsed = readSiteConsentFromDocument(
      `foo=bar; ${SITE_CONSENT_COOKIE}=${encoded}; baz=qux`,
    )
    expect(parsed?.essentialAccepted).toBe(true)
    expect(parsed?.analyticsOptIn).toBe(false)
  })

  it('reads consent from request cookies', () => {
    const consent = createSiteConsent(true)
    const encoded = encodeURIComponent(JSON.stringify(consent))
    const parsed = readSiteConsentFromRequest({
      cookies: {
        get(name: string) {
          if (name !== SITE_CONSENT_COOKIE) return undefined
          return { value: encoded }
        },
      },
    })
    expect(parsed?.analyticsOptIn).toBe(true)
  })
})
