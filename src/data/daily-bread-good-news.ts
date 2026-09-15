/**
 * Good News — the Daily Bread V2 sourced module (SA-142 / F-184).
 *
 * HUMAN-CURATED ONLY. Every entry is a real, published report a person has
 * read, with its source link. No model writes, summarizes, selects or
 * "finds" good news: fabricated or unverifiable good news is worse than none.
 * An edition prints this module only on a date with scheduled entries; on
 * every other date the module is simply absent (the archetype closes the gap).
 *
 * To add an item: append an entry with `runOn` set to the editorial date it
 * should print, a headline and one-to-two-sentence summary in our own words,
 * the outlet name, the https link, the report's own publication date
 * (within 30 days before runOn), and `verifiedAt`: the moment a person last
 * opened the link and confirmed the report says what the summary says (plan
 * §73). The builder validates every field and drops an entry that fails.
 */

export interface GoodNewsEntry {
  runOn: string
  headline: string
  summary: string
  sourceName: string
  sourceUrl: string
  publishedOn: string
  /** ISO timestamp of the human check of the source; not after runOn, not before publishedOn. */
  verifiedAt: string
}

export const GOOD_NEWS_ENTRIES: readonly GoodNewsEntry[] = []
