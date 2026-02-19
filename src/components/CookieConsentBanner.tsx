'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import {
  SITE_CONSENT_UPDATED_EVENT,
  createSiteConsent,
  readSiteConsentFromDocument,
  serializeSiteConsentCookie,
  type SiteConsent,
} from '@/lib/site-consent'

export default function CookieConsentBanner() {
  const headingRef = useRef<HTMLHeadingElement | null>(null)
  const [visible, setVisible] = useState(() =>
    typeof document === 'undefined' ? false : !readSiteConsentFromDocument(),
  )

  useEffect(() => {
    if (!visible) return
    headingRef.current?.focus()
  }, [visible])

  async function persistSessionPrivacy(consent: SiteConsent) {
    try {
      await fetch('/api/mock-account/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mode: 'anonymous',
          analyticsOptIn: consent.analyticsOptIn,
        }),
      })
    } catch {
      // Non-fatal: cookie consent still applies for client-side behavior.
    }
  }

  function applyConsent(analyticsOptIn: boolean) {
    const consent = createSiteConsent(analyticsOptIn)
    document.cookie = serializeSiteConsentCookie(consent)
    window.dispatchEvent(
      new CustomEvent<SiteConsent>(SITE_CONSENT_UPDATED_EVENT, {
        detail: consent,
      }),
    )
    setVisible(false)
    void persistSessionPrivacy(consent)
  }

  if (!visible) return null

  return (
    <aside
      className="cookie-consent-banner"
      role="dialog"
      aria-live="polite"
      aria-labelledby="consent-heading"
      aria-modal="false"
    >
      <h2
        id="consent-heading"
        ref={headingRef}
        tabIndex={-1}
        className="text-label vw-small text-gold"
      >
        Cookie Notice
      </h2>
      <p className="vw-small text-secondary mt-2">
        We use essential cookies to keep core site functions working. Optional
        analytics cookies are off by default.
      </p>
      <p className="vw-small text-secondary mt-2">
        <Link href="/cookie-policy" className="link-highlight">
          Review cookie policy
        </Link>
      </p>
      <div className="cookie-consent-actions mt-4">
        <button
          type="button"
          className="cookie-consent-btn is-essential"
          onClick={() => applyConsent(false)}
        >
          Use Essential Only
        </button>
        <button
          type="button"
          className="cookie-consent-btn is-all"
          onClick={() => applyConsent(true)}
        >
          Accept All Cookies
        </button>
      </div>
    </aside>
  )
}
