/**
 * The Daily Edition's editorial sections (F-097).
 *
 * Founder 2026-08-16: "/today … I want it to be like a literally daily edition
 * of a newspaper, and to be structured the same way- include more information
 * here- not just a devotional, but like this is a place where people can come
 * for daily content- this can pull in stories of christ around the globe,
 * showcase community efforts, prayer lists etc."
 *
 * WHY THIS FILE IS EMPTY AND STAYS EMPTY UNTIL SOMEONE FILLS IT.
 *
 * The devotional, the scripture, the liturgical day and the archive all come
 * from real data already in the repo. These three sections do not: there is no
 * feed of global reports, no community submissions table, and no prayer
 * database. Inventing a plausible dispatch from Nigeria or a fictional prayer
 * request would be the worst thing this product could do — it publishes as
 * fact, under a masthead, in a devotional context.
 *
 * So the sections are declared, typed, and rendered ONLY when they carry real
 * entries. An empty section does not render at all — no placeholder card, no
 * "coming soon", no ghost. The page is complete without them and grows when
 * they are filled.
 *
 * Each entry carries a `source` because a dispatch without attribution is a
 * rumour. `date` is ISO so the edition can show what is current.
 */

export interface Dispatch {
  /** Headline, sentence case, no trailing period. */
  title: string
  /** Where it happened — "Kano, Nigeria". */
  place: string
  /** Two or three sentences. Reported, not editorialised. */
  body: string
  /** Publication or organisation this is reported from. Required. */
  source: string
  /** Link to the source report, if there is a public one. */
  href?: string
  /** ISO date of the report. */
  date: string
}

export interface CommunityEffort {
  title: string
  place: string
  body: string
  /** Who is doing it — a church, a mission, a named group. */
  by: string
  href?: string
  date: string
}

export interface PrayerRequest {
  /** What is being asked for, in the asker's own framing where possible. */
  request: string
  /** "A reader in Leeds", "The church in Aleppo" — never a full private name. */
  from: string
  date: string
}

/** Reported stories of Christ at work beyond this masthead. */
export const DISPATCHES: Dispatch[] = []

/** Efforts readers can join, give to, or pray for. */
export const COMMUNITY: CommunityEffort[] = []

/** The standing prayer list. */
export const PRAYERS: PrayerRequest[] = []

/** True when the edition has any editorial section to show. */
export function hasEditorialSections(): boolean {
  return DISPATCHES.length > 0 || COMMUNITY.length > 0 || PRAYERS.length > 0
}
