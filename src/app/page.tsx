import HomeClient from './HomeClient'
import { getWordOfTheDay, type WordOfTheDay } from '@/lib/home/word-of-the-day'

/**
 * The homepage — a thin ISR server wrapper (the-Word-leads rebuild,
 * founder-directed 2026-08-20). The page opens with the Word of the Day,
 * pulled from the Daily Bread edition, so the HTML revalidates hourly —
 * the exact cadence /daily-bread already uses ("revalidate every hour so
 * the edition date is always correct"). This replaces the prior year-long
 * static cache; everything interactive lives in HomeClient.
 */
export const revalidate = 3600

export default async function Home() {
  let word: WordOfTheDay | null = null
  try {
    word = await getWordOfTheDay()
  } catch (error) {
    // Rule 1: never silently empty — the block renders visibly unavailable,
    // and the failure is loud in the logs. The page itself survives; a
    // missing verse row must not take down the whole front door.
    console.error('[homepage] word of the day unavailable:', error)
  }
  return <HomeClient word={word} />
}
