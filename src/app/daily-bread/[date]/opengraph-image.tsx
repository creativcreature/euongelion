/**
 * OG card for /daily-bread/YYYY-MM-DD (SA-142 / F-184). Built only from the
 * frozen edition's `assets.og` record — serial, title, Scripture. No image
 * generation at request time: the card is the house text card.
 */
import { makeOgImageResponse, OG_SIZES } from '@/lib/og-card'
import { dailyBreadV2Enabled } from '@/lib/daily-bread/flags'
import { loadEditionForDate, serialLabel } from '@/lib/daily-bread/read'
import { errorMessage } from '@/lib/daily-bread/redact'

export const runtime = 'nodejs'
export const alt = 'The Daily Bread — Euangelion'
export const size = OG_SIZES.landscape
export const contentType = 'image/png'
export const revalidate = 3600

export default async function DailyBreadOgImage({
  params,
}: {
  params: Promise<{ date: string }>
}) {
  const { date } = await params
  const fallbackCard = () =>
    makeOgImageResponse({
      title: 'The Daily Bread',
      kicker: 'EUANGELION',
      url: 'EUANGELION.APP/DAILY-BREAD',
      format: 'landscape',
    })
  if (!dailyBreadV2Enabled()) return fallbackCard()
  try {
    const found = await loadEditionForDate(date)
    if (!found || found.edition.lifecycle !== 'published') return fallbackCard()
    const { edition } = found
    return makeOgImageResponse({
      title: edition.assets.og.title,
      kicker: `THE DAILY BREAD · ${serialLabel(edition).toUpperCase()}`,
      verse: edition.assets.og.verse,
      verseRef: edition.assets.og.verseRef,
      url: `EUANGELION.APP/DAILY-BREAD/${edition.editionDate}`,
      format: 'landscape',
    })
  } catch (error) {
    console.error('[daily-bread] og card read failed', errorMessage(error))
    return fallbackCard()
  }
}
