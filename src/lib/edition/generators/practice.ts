/**
 * The Practice — one doable thing today (SA-090 / F-136).
 *
 * Rotation over the founder-shipped PRACTICES array. These fourteen shipped
 * with F-098 and are already-reviewed editorial, so the rows publish
 * directly — 'practice' is a REVIEWED kind for NET-NEW entries (the weekly
 * LLM pipeline lands drafts), but re-printing shipped content is not a new
 * claim needing new review.
 */
import { PRACTICES, pickForDay } from '@/data/daily-edition'
import type { EditionItem } from '../kinds'

function dayOfYearUTC(date: Date): number {
  const startOfYear = Date.UTC(date.getUTCFullYear(), 0, 1)
  return (
    Math.floor(
      (Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()) -
        startOfYear) /
        86400000,
    ) + 1
  )
}

export async function generatePractice(
  date: Date,
): Promise<EditionItem<'practice'>[]> {
  const practice = pickForDay(PRACTICES, dayOfYearUTC(date))
  if (!practice) {
    throw new Error('PRACTICES is empty — the practice cannot be generated')
  }
  return [
    {
      kind: 'practice',
      publishDate: date.toISOString().slice(0, 10),
      slot: 0,
      status: 'published',
      payload: {
        instruction: practice.instruction,
        reason: practice.reason,
        duration: practice.duration,
      },
    },
  ]
}
