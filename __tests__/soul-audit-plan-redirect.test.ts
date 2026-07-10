import { describe, expect, it } from 'vitest'
import { isRedirectError } from 'next/dist/client/components/redirect-error'
import RetiredPlanReaderPage from '@/app/soul-audit/plan/[planToken]/page'

/**
 * Mobbin polish audit 2026-07-10, P0 #5: the dedicated /soul-audit/plan/[token]
 * reader is retired — /daily-bread is the canonical plan reader. The route
 * segment survives only as a redirect so old bookmarked deep links keep
 * working. This guards that intent: the page must throw Next's redirect
 * control-flow error targeting /daily-bread, never render UI.
 */
describe('/soul-audit/plan/[planToken] (retired reader)', () => {
  it('redirects every old plan deep link to /daily-bread', () => {
    let thrown: unknown = null
    try {
      RetiredPlanReaderPage()
    } catch (error) {
      thrown = error
    }

    expect(thrown).toBeTruthy()
    expect(isRedirectError(thrown)).toBe(true)
    const digest = (thrown as { digest: string }).digest
    // Digest format: NEXT_REDIRECT;<type>;<url>;<status>;
    expect(digest).toContain('NEXT_REDIRECT')
    expect(digest).toContain(';/daily-bread;')
  })
})
