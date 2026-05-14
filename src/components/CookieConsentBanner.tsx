'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import {
  SITE_CONSENT_REQUIRED_EVENT,
  SITE_CONSENT_UPDATED_EVENT,
  createSiteConsent,
  readSiteConsentFromDocument,
  serializeSiteConsentCookie,
  type SiteConsent,
} from '@/lib/site-consent'

export default function CookieConsentBanner() {
  const headingRef = useRef<HTMLHeadingElement | null>(null)
  const requiredPulseTimeoutRef = useRef<number | null>(null)
  // 2026-05-14 hydration fix: was initialized via `typeof document`
  // which returns different visibility on server vs client first
  // render, causing React #418 (banner in client tree, absent in
  // server tree → entire reader tree regenerated, devotionals
  // appeared "not loading"). Now starts hidden; useEffect resolves
  // the real visibility after mount.
  const [visible, setVisible] = useState(false)
  const [isRequiredAttention, setIsRequiredAttention] = useState(false)

  // Resolve cookie-consent state client-side only (mount). Same
  // escape-hatch pattern as the masthead time + folio date.
  useEffect(() => {
    if (typeof document === 'undefined') return
    if (!readSiteConsentFromDocument()) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- intentional: client-only initial visibility to avoid React #418
      setVisible(true)
    }
  }, [])

  useEffect(() => {
    if (!visible) return
    headingRef.current?.focus()
  }, [visible])

  useEffect(() => {
    const handleConsentRequired = () => {
      setVisible(true)
      setIsRequiredAttention(true)

      if (requiredPulseTimeoutRef.current !== null) {
        window.clearTimeout(requiredPulseTimeoutRef.current)
      }
      requiredPulseTimeoutRef.current = window.setTimeout(() => {
        setIsRequiredAttention(false)
      }, 1500)

      window.requestAnimationFrame(() => {
        headingRef.current?.focus()
      })
    }

    window.addEventListener(SITE_CONSENT_REQUIRED_EVENT, handleConsentRequired)
    return () => {
      window.removeEventListener(
        SITE_CONSENT_REQUIRED_EVENT,
        handleConsentRequired,
      )
      if (requiredPulseTimeoutRef.current !== null) {
        window.clearTimeout(requiredPulseTimeoutRef.current)
      }
    }
  }, [])

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
    setIsRequiredAttention(false)
    setVisible(false)
    void persistSessionPrivacy(consent)
  }

  if (!visible) return null

  return (
    <aside
      className={`cookie-consent-banner${
        isRequiredAttention ? ' is-required' : ''
      }`}
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
