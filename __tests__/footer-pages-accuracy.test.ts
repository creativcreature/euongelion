/**
 * Footer / info pages accuracy contract (founder accuracy pass, 2026-08-19).
 *
 * The footer pages make factual claims about how the product works. This
 * suite pins the claims that were corrected in the accuracy pass to the code
 * that makes them true, so the copy and the behaviour cannot drift apart
 * silently again:
 *
 *   - /how-we-write tells the honest byline story (Milo, SA-089), describes
 *     the Daily Bread's computed-vs-reviewed split (SA-090), and no longer
 *     contradicts the retention policy it links to.
 *   - Bookmarks/annotations copy says sign-in is required, matching the
 *     AUTH_REQUIRED_SAVE_STATE gate in the routes (two-site-states, F-105).
 *   - /pricing describes the real free grant (once per verified account,
 *     generation-entitlement.ts), not the never-built quarterly refresh.
 *   - The cookie policy names the cookies the code actually sets and none
 *     of the fabricated ones the old boilerplate listed.
 */
import fs from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'

function read(...segments: string[]): string {
  return fs.readFileSync(path.join(process.cwd(), ...segments), 'utf8')
}

describe('/how-we-write editorial transparency', () => {
  const source = read('src', 'app', 'how-we-write', 'page.tsx')

  it('tells the honest byline story (SA-089)', () => {
    expect(source).toContain('Written by Milo. Edited by James Parker.')
    expect(source).toContain('pen name')
  })

  it('describes the Daily Bread computed-vs-reviewed split (SA-090)', () => {
    expect(source).toContain('THE DAILY BREAD')
    // The word of the day names its real lexicon sources…
    expect(source).toContain('Brown-Driver-Briggs')
    expect(source).toContain('Abbott-Smith')
    // …and those are the same sources the generator documents.
    const wordGenerator = read('src', 'lib', 'edition', 'generators', 'word.ts')
    expect(wordGenerator).toContain('Brown-Driver')
    expect(wordGenerator).toContain('Abbott-Smith')
    // Invented voice goes through review before print.
    expect(source).toContain('passes a human editor first')
  })

  it('no longer contradicts the retention policy about the reflection', () => {
    // The old closing note claimed the reflection was "not retained, stored,
    // or reused" while the bullet above it (and /privacy) said it is stored
    // with the session for 30 days.
    expect(source).not.toContain('not retained, stored, or reused')
    // The old step 3 claimed the selection lives only in browser state; it is
    // saved with the session via saveSelection in the select route.
    expect(source).not.toContain('stored only in')
    const selectRoute = read(
      'src',
      'app',
      'api',
      'soul-audit',
      'select',
      'route.ts',
    )
    expect(selectRoute).toContain('saveSelection')
  })

  it('is honest about what the narration skips', () => {
    expect(source).not.toContain('It is not an abridgement')
    expect(source).toContain('skips deliberately')
  })
})

describe('save-state copy matches the sign-in gate (two-site-states)', () => {
  it('bookmarks and annotations routes both refuse anonymous writes', () => {
    for (const route of ['bookmarks', 'annotations']) {
      const source = read('src', 'app', 'api', route, 'route.ts')
      expect(source).toContain('AUTH_REQUIRED_SAVE_STATE')
    }
  })

  it('retention rows say saving requires sign-in, not anonymous retention', () => {
    const source = read('src', 'lib', 'privacy', 'retention.ts')
    expect(source).not.toContain('days in anonymous mode')
    expect(source).not.toContain('signed-in or mock account')
    const signInMentions = source.match(/Saving requires sign-in/g) ?? []
    expect(signInMentions.length).toBeGreaterThanOrEqual(2)
  })
})

describe('/pricing describes the real entitlements', () => {
  const source = read('src', 'app', 'pricing', 'page.tsx')

  it('free grant is once per verified account, never quarterly', () => {
    expect(source).not.toContain('per quarter')
    expect(source).not.toMatch(/quarterly/i)
    expect(source).toContain('once for free')
    const entitlement = read(
      'src',
      'lib',
      'billing',
      'generation-entitlement.ts',
    )
    expect(entitlement).toContain('ONE free generation')
  })

  it('does not promise features that were never built', () => {
    expect(source).not.toContain('Unlimited Soul Audit re-rolls')
    expect(source).not.toContain('1 AI plan per week')
    expect(source).not.toContain('Wake-Up Magazine')
    // The subscriber allowance is monthly fair-use (generation-entitlement).
    expect(source).toContain('monthly fair-use allowance')
  })
})

describe('cookie policy names the cookies the code actually sets', () => {
  const policy = read('content', 'legal', 'cookie-policy.md')

  it('lists every real first-party cookie name', () => {
    const sessionLib = read('src', 'lib', 'session.ts')
    expect(sessionLib).toContain("'euangelion_session'")
    expect(policy).toContain('euangelion_session')

    const auditSessionLib = read('src', 'lib', 'soul-audit', 'session.ts')
    expect(auditSessionLib).toContain("'euangelion_audit_session'")
    expect(policy).toContain('euangelion_audit_session')

    const consentLib = read('src', 'lib', 'site-consent.ts')
    expect(consentLib).toContain("'euangelion_site_consent'")
    expect(policy).toContain('euangelion_site_consent')
  })

  it('carries none of the old boilerplate fabrications', () => {
    for (const fabricated of [
      'session_id',
      'csrf_token',
      'auth_token',
      '_analytics_id',
      'Google Analytics',
      'cookie banner",',
    ]) {
      expect(policy).not.toContain(fabricated)
    }
  })
})

describe('privacy policy contact and AI-processing claims', () => {
  const policy = read('content', 'legal', 'privacy-policy.md')

  it('uses the real domain for every contact address', () => {
    expect(policy).not.toContain('euangelion.com')
    expect(policy).toContain('privacy@euangelion.app')
  })

  it('does not assert an unverified zero-data-retention contract', () => {
    expect(policy).not.toContain('zero-data-retention')
    expect(policy).toContain('not used to train models')
  })
})

describe('community guidelines describe the real moderation path', () => {
  it('claims human review, not never-built automated checks', () => {
    const source = read('src', 'app', 'community-guidelines', 'page.tsx')
    expect(source).not.toContain('automated safety, plagiarism')
    expect(source).toContain('reviewed by a human editor')
  })
})
