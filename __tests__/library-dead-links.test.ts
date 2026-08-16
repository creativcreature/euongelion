/**
 * Founder, 2026-08-16: "the linking in Library doesnt work. I cant find the
 * pages that the saved items come from when I click them. Says page not found."
 *
 * Diagnosis, from the founder's real rows in production rather than from
 * guessing: every SAVED slug resolves to a live URL (all nine probed returned
 * 200), so the saved shelf was not the culprit. The dead links are in
 * **Completed Wake-Up Pages**, which built `/devotional/${item.slug}` directly
 * — bypassing `resolveDevotionalHref`, the guarded helper that exists precisely
 * because `/devotional/<series-slug>` is a 404.
 *
 * Those completion rows come from localStorage and can name slugs that no
 * longer exist: Wake-Up was retired (SA-033/F-084) and the catalog has been
 * rewritten repeatedly since. A slug recorded a year ago is not a promise that
 * a page is still there.
 *
 * The fix is to stop guessing. `SERIES_DATA` knows every real day slug, so a
 * slug that is not a devotional, not a series and not a plan day is not
 * linkable — and is rendered as plain text rather than as a link to a 404.
 */
import { describe, expect, it } from 'vitest'
import { resolveDevotionalHref } from '@/components/DevotionalLibraryRail'
import { SERIES_DATA } from '@/data/series'

const A_REAL_DAY = SERIES_DATA['he-cannot-deny-himself'].days[0].slug

describe('resolveDevotionalHref', () => {
  it('links a real devotional day', () => {
    expect(resolveDevotionalHref(A_REAL_DAY)).toBe(`/devotional/${A_REAL_DAY}`)
  })

  it('sends a series slug to the series page, not to a 404', () => {
    // SA-039 made the series the unit of saving, so saved rows carry bare
    // series slugs. /devotional/he-cannot-deny-himself does not exist.
    expect(resolveDevotionalHref('he-cannot-deny-himself')).toBe(
      '/series/he-cannot-deny-himself',
    )
  })

  it('sends a plan day to the personal reader', () => {
    // SA-059 swapped the routes: /today is now YOUR reading.
    expect(resolveDevotionalHref('plan-abc123-day-2')).toBe('/today')
  })

  it('refuses to link a slug no longer in the catalog', () => {
    // The actual defect. A retired Wake-Up page, or any slug recorded before a
    // catalog rewrite, must not be presented as a working link.
    expect(resolveDevotionalHref('some-retired-wake-up-page')).toBeNull()
    expect(resolveDevotionalHref('')).toBeNull()
  })

  it('never invents a /devotional/ URL for an unknown slug', () => {
    // The old behaviour, pinned so it cannot come back: anything unrecognised
    // fell through to `/devotional/${slug}` and 404'd on click.
    for (const slug of ['nope', 'wake-up-day-99', 'deleted-series-day-1']) {
      const href = resolveDevotionalHref(slug)
      expect(href === null || !href.startsWith('/devotional/')).toBe(true)
    }
  })
})
