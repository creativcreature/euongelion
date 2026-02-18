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
  const consentRoutePath = path.join(
    process.cwd(),
    'src',
    'app',
    'api',
    'soul-audit',
    'consent',
    'route.ts',
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

  const results = fs.readFileSync(resultsPath, 'utf8')
  const consentRoute = fs.readFileSync(consentRoutePath, 'utf8')
  const selectRoute = fs.readFileSync(selectRoutePath, 'utf8')

  it('requires recorded consent token state before option unlock in results UI', () => {
    expect(results).toContain('const [consentToken, setConsentToken]')
    expect(results).toContain('const selectionUnlocked = Boolean(')
    expect(results).toContain(
      'consentFingerprint === currentConsentFingerprint',
    )
    expect(results).toContain('Record Consent')
    expect(results).toContain('Consent Recorded')
  })

  it('returns required-action metadata for essential consent gates in APIs', () => {
    expect(consentRoute).toContain('ESSENTIAL_CONSENT_REQUIRED')
    expect(consentRoute).toContain('requiredActions')
    expect(selectRoute).toContain('ESSENTIAL_CONSENT_REQUIRED')
    expect(selectRoute).toContain('requiredActions')
  })

  it('returns crisis detail metadata for crisis acknowledgement gates in APIs', () => {
    expect(consentRoute).toContain('CRISIS_ACK_REQUIRED')
    expect(consentRoute).toContain('crisisRequirement(true)')
    expect(selectRoute).toContain('CRISIS_ACK_REQUIRED')
    expect(selectRoute).toContain('crisisRequirement(true)')
  })
})
