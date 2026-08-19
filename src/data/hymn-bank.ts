/**
 * The Hymnal (SA-094 / F-140).
 *
 * Every lyric line in hymn-bank.json was COPIED by
 * scripts/edition/build-hymn-bank.mjs from The Otterbein Hymnal (1890),
 * Project Gutenberg #16455 — public domain. No model generated any of it;
 * three model attempts were blocked by the output filter, which is why the
 * pipeline is a script over a source file. Attributions come from the
 * hymnal's own credit lines, with a small documented map for the handful
 * of classics it prints uncredited.
 */
import BANK from './hymn-bank.json'

export interface Hymn {
  title: string
  author: string
  year: number
  verses: string[][]
}

export const HYMNS: readonly Hymn[] = (
  BANK as { hymns: Hymn[] }
).hymns

const DAY_MS = 86_400_000

function daysSinceEpochUTC(date: Date): number {
  return Math.floor(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()) /
      DAY_MS,
  )
}

/** The day's hymn — a full month-plus cycle before any repeat. */
export function pickHymnForDay(date: Date): Hymn {
  return HYMNS[daysSinceEpochUTC(date) % HYMNS.length]
}
