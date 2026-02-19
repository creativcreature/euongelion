'use client'

import { useEffect, useState } from 'react'
import { Analytics } from '@vercel/analytics/next'
import {
  SITE_CONSENT_UPDATED_EVENT,
  readSiteConsentFromDocument,
  type SiteConsent,
} from '@/lib/site-consent'

export default function ConsentAwareAnalytics() {
  const [enabled, setEnabled] = useState(false)

  useEffect(() => {
    const syncFromCookie = () => {
      const consent = readSiteConsentFromDocument()
      setEnabled(Boolean(consent?.analyticsOptIn))
    }

    const onConsentUpdated = (event: Event) => {
      const detail = (event as CustomEvent<SiteConsent>).detail
      if (detail) {
        setEnabled(Boolean(detail.analyticsOptIn))
        return
      }
      syncFromCookie()
    }

    syncFromCookie()
    window.addEventListener(SITE_CONSENT_UPDATED_EVENT, onConsentUpdated)
    return () => {
      window.removeEventListener(SITE_CONSENT_UPDATED_EVENT, onConsentUpdated)
    }
  }, [])

  if (!enabled) return null
  return <Analytics />
}
