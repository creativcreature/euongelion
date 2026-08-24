/**
 * Homepage OG card — /
 *
 * Duotone Cobalt + Cream card using the shared og-card helper.
 * Verse: the site's brand tagline (not reader-personalised content).
 */

import { makeOgImageResponseWithLead, OG_SIZES } from '@/lib/og-card'

export const runtime = 'nodejs'
export const alt = 'Euangelion — Daily bread for the cluttered, hungry soul'
export const size = OG_SIZES.landscape
export const contentType = 'image/png'

export default async function OGImage() {
  return makeOgImageResponseWithLead({
    title: 'Daily bread for the cluttered, hungry soul.',
    kicker: 'EUANGELION · GOOD NEWS',
    verse: 'Give us this day our daily bread.',
    verseRef: 'Matthew 6:11',
    url: 'EUANGELION.APP',
    format: 'landscape',
    imagePath: '/images/og-lead/home.jpg',
  })
}
