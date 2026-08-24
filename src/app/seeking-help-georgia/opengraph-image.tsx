/**
 * Link preview card for /seeking-help-georgia.
 *
 * Picture-led: the page's own hero rides the top of the card so a shared link
 * looks like the page rather than like a press release. The lead is a JPEG
 * derivative rather than the page's webp, because Satori cannot decode webp
 * and would render an empty band.
 */

import { makeOgImageResponseWithLead, OG_SIZES } from '@/lib/og-card'

export const runtime = 'nodejs'
export const alt =
  'If you need help in Georgia — verified crisis, shelter, food, and legal help lines'
export const size = OG_SIZES.landscape
export const contentType = 'image/png'

export default async function OGImage() {
  return makeOgImageResponseWithLead({
    title: 'If you need help in Georgia',
    kicker: 'OUTREACH · FREE · NO SIGN-UP',
    url: 'EUANGELION.APP/SEEKING-HELP-GEORGIA',
    format: 'landscape',
    imagePath: '/images/og-lead/seeking-help-georgia.jpg',
  })
}
