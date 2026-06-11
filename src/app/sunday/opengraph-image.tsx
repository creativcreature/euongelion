/**
 * OG image for /sunday — The Sunday Edition.
 *
 * Renders a duotone share card with:
 *   - "THE SUNDAY EDITION · WEEK N, YEAR" kicker
 *   - Series title as the main headline (italic serif)
 *   - Anchor verse from the selected devotional
 *   - EUANGELION.APP/SUNDAY in the footer
 *
 * Generated server-side on every request; ISR-cached for 6 hours.
 */

import { makeOgImageResponse, OG_SIZES } from '@/lib/og-card'
import {
  pickSundayEntry,
  fetchSundayDevotional,
  isoWeekNumber,
  isoWeekYear,
} from '@/lib/sunday-edition'

export const runtime = 'nodejs'
export const alt = 'Euangelion — The Sunday Edition'
export const size = OG_SIZES.landscape
export const contentType = 'image/png'

export default async function SundayOgImage() {
  const now = new Date()
  const entry = pickSundayEntry(now)
  const week = isoWeekNumber(now)
  const year = isoWeekYear(now)

  // Try to fetch anchor verse from the devotional
  let verse: string | undefined
  let verseRef: string | undefined

  try {
    const raw = await fetchSundayDevotional(entry.daySlug)
    if (raw) {
      // Module-format: find scripture module
      const data = raw as unknown as {
        modules?: Array<{ type: string; passage?: string; reference?: string }>
        anchorVerse?: string
        framework?: string
      }
      const scriptureModule = data.modules?.find((m) => m.type === 'scripture')
      verse = scriptureModule?.passage?.slice(0, 180)
      verseRef =
        scriptureModule?.reference ?? data.anchorVerse ?? data.framework
    }
  } catch {
    // Non-fatal — card renders without verse
  }

  return makeOgImageResponse({
    title: entry.seriesTitle,
    kicker: `THE SUNDAY EDITION · WEEK ${week}, ${year}`,
    verse,
    verseRef,
    url: 'EUANGELION.APP/SUNDAY',
    format: 'landscape',
  })
}
