/**
 * The Word of the Day — the homepage's opening block (founder-directed
 * 2026-08-20: "we lead with the word... the verse of the day - pulled from
 * the daily bread, which changes daily").
 *
 * The Word is the Daily Bread's daily proverb, computed with the SAME
 * deterministic algorithm the paper's generator uses (shared pure functions
 * in src/lib/edition/generators/proverb.ts) — so the homepage prints exactly
 * what the paper prints, with no database dependency.
 *
 * The corpus is a STATIC IMPORT bundled at build time. The earlier runtime
 * loaders both fail in production: fs does not exist on Workers (SA-042),
 * and a self-fetch of the page's own zone re-enters the same Worker, which
 * Cloudflare blocks as recursion — the live Word block shipped its Rule-1
 * fallback until this import replaced them. The corpus is committed, so
 * bundling it is the one loader that works at build, in dev, and inside the
 * Worker's ISR revalidation alike.
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
import bundledProverbs from '../../../public/bibles/BSB/PRO.json'

export interface WordOfTheDay {
  reference: string
  text: string
  translation: string
}

type ProverbsBook = Record<string, Record<string, string>>

export type BookLoader = () => Promise<ProverbsBook>

async function loadBundledBook(): Promise<ProverbsBook> {
  const book = bundledProverbs as ProverbsBook
  if (!book || Object.keys(book).length === 0) {
    throw new Error('word of the day: bundled BSB Proverbs corpus is empty')
  }
  return book
}

export async function getWordOfTheDay(
  loadBook: BookLoader = loadBundledBook,
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
