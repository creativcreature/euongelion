/**
 * The Word of the Day — the homepage's opening block (founder-directed
 * 2026-08-20: "we lead with the word... the verse of the day - pulled from
 * the daily bread, which changes daily").
 *
 * The Word is the Daily Bread's daily proverb, computed with the SAME
 * deterministic algorithm the paper's generator uses (shared pure functions
 * in src/lib/edition/generators/proverb.ts) from the committed BSB corpus —
 * so the homepage prints exactly what the paper prints, with no database
 * dependency. Published edition rows were tried first and rejected: the
 * Workers preview proved a date can simply have no published proverb row.
 *
 * The corpus loads fs-first (dev/build), then by self-fetch of the public
 * asset on Workers, where fs does not exist — the same two-strategy pattern
 * as src/lib/today-devotional.ts (SA-042: any server code that reads
 * public/ off disk is broken on Workers).
 *
 * Rule 1: any failure THROWS. The page catches only to render a visibly
 * unavailable Word block — broken looks broken, the page survives.
 *
 * The edition's `verse` kind was NOT used: it is the WEEKLY memory verse,
 * repeating all seven days by design. Swapping this block to it would be a
 * deliberate product change, not a bug fix.
 */
import { effectiveEditionDate } from '@/lib/edition/deadline'
import { buildProverbPool, pickProverb } from '@/lib/edition/generators/proverb'

export interface WordOfTheDay {
  reference: string
  text: string
  translation: string
}

type ProverbsBook = Record<string, Record<string, string>>

export type BookLoader = () => Promise<ProverbsBook>

async function loadProverbsBook(): Promise<ProverbsBook> {
  // Strategy 1: the filesystem — real in `next dev`/build, absent on Workers.
  try {
    const { readFileSync } = await import('node:fs')
    const path = await import('node:path')
    const raw = readFileSync(
      path.join(process.cwd(), 'public', 'bibles', 'BSB', 'PRO.json'),
      'utf8',
    )
    const parsed = JSON.parse(raw) as ProverbsBook
    if (parsed && Object.keys(parsed).length > 0) return parsed
  } catch {
    // fall through to the network strategy
  }

  // Strategy 2: self-fetch the public asset (Cloudflare Workers).
  const base = process.env.NEXT_PUBLIC_APP_URL || 'https://euangelion.app'
  const response = await fetch(`${base}/bibles/BSB/PRO.json`)
  if (!response.ok) {
    throw new Error(
      `word of the day: corpus fetch failed (${response.status}) from ${base}`,
    )
  }
  return (await response.json()) as ProverbsBook
}

export async function getWordOfTheDay(
  loadBook: BookLoader = loadProverbsBook,
  now: Date = new Date(),
): Promise<WordOfTheDay> {
  const book = await loadBook()
  const pool = buildProverbPool(book)
  // The paper keys its day by the 7am-NY flip — match it exactly so the
  // homepage and the Daily Bread always speak the same proverb.
  const editionDate = new Date(`${effectiveEditionDate(now)}T00:00:00Z`)
  const entry = pickProverb(pool, editionDate)
  return { reference: entry.reference, text: entry.text, translation: 'BSB' }
}
