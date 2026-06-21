/**
 * OG card for /soul-audit
 *
 * Surfaces the Soul Audit question framing on share.
 * Verse: a canonical Scripture anchor for the soul-examination theme.
 * No reader text, no personalisation.
 */

import { makeOgImageResponse, OG_SIZES } from '@/lib/og-card'

export const runtime = 'nodejs'
export const alt = 'Euangelion Soul Audit — What are you wrestling with today?'
export const size = OG_SIZES.landscape
export const contentType = 'image/png'

export default function SoulAuditOgImage() {
  return makeOgImageResponse({
    title: 'What are you wrestling with today?',
    kicker: 'SOUL AUDIT · EUANGELION',
    verse:
      'Search me, O God, and know my heart; test me and know my anxious thoughts.',
    verseRef: 'Psalm 139:23',
    url: 'EUANGELION.APP/SOUL-AUDIT',
    format: 'landscape',
  })
}
