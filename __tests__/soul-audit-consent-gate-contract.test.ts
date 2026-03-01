import fs from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'

describe('Soul Audit consent gate contract', () => {
  const resultsPath = path.join(
    process.cwd(),
    'src',
    'app',
    'soul-audit',
    'results',
    'page.tsx',
  )
  const selectRoutePath = path.join(
    process.cwd(),
    'src',
    'app',
    'api',
    'soul-audit',
    'select',
    'route.ts',
  )
  const providersPath = path.join(process.cwd(), 'src', 'app', 'providers.tsx')
  const bannerPath = path.join(
    process.cwd(),
    'src',
    'components',
    'CookieConsentBanner.tsx',
  )
  const analyticsPath = path.join(
    process.cwd(),
    'src',
    'components',
    'ConsentAwareAnalytics.tsx',
  )

  const results = fs.readFileSync(resultsPath, 'utf8')
  const selectRoute = fs.readFileSync(selectRoutePath, 'utf8')
  const providers = fs.readFileSync(providersPath, 'utf8')
  const banner = fs.readFileSync(bannerPath, 'utf8')
  const analytics = fs.readFileSync(analyticsPath, 'utf8')

  it('moves consent interaction to site-level cookie notice and keeps results focused on options', () => {
    expect(providers).toContain('<CookieConsentBanner />')
    expect(banner).toContain('Cookie Notice')
    expect(banner).toContain('Use Essential Only')
    expect(banner).toContain('Accept All Cookies')
    expect(results).toContain('readSiteConsentFromDocument')
    expect(results).toContain('const optionSelectionReady = Boolean(')
    expect(results).not.toContain('const [consentToken, setConsentToken]')
    expect(results).not.toContain('Record Consent')
    expect(analytics).toContain('readSiteConsentFromDocument')
  })

  it('returns required-action metadata for essential consent gates in select API', () => {
    // Consent is now inline in select (no separate consent route)
    expect(selectRoute).toContain('ESSENTIAL_CONSENT_REQUIRED')
    expect(selectRoute).toContain('requiredActions')
  })

  it('returns crisis detail metadata for crisis acknowledgement gates in select API', () => {
    expect(selectRoute).toContain('CRISIS_ACK_REQUIRED')
    expect(selectRoute).toContain('crisisRequirement(true)')
  })
})
