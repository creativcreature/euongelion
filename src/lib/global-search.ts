/**
 * Global search — F-071 (site audit P1 #14).
 *
 * One client-side index over the three things a reader can look for:
 *   1. SERIES        — SERIES_DATA titles / questions / keywords.
 *   2. DEVOTIONALS   — per-day titles + teasers from the build-time
 *                      devotional-teasers index (client-importable).
 *   3. YOUR NOTES    — reader marginalia: annotations (notes, highlights,
 *                      stickies), bookmarks, and local clippings. The
 *                      component fetches those; this module only ranks them.
 *
 * Matching is deliberately simple and dependency-free: normalized
 * substring matching with AND semantics across query tokens, ranked by
 * field weight with a word-start bonus. No fuzzy library, no index build
 * step — the whole corpus is ~1,100 short strings.
 */

import { ALL_SERIES_ORDER, SERIES_DATA } from '@/data/series'
import {
  DEVOTIONAL_TEASERS,
  DEVOTIONAL_TITLES,
} from '@/data/devotional-teasers'
import type { Clipping } from '@/lib/clippings'

// ---------------------------------------------------------------------------
// Normalization + scoring
// ---------------------------------------------------------------------------

/** Lowercase, strip diacritics, unify curly quotes, collapse whitespace. */
export function normalizeSearchText(value: string): string {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201C\u201D]/g, '"')
    .replace(/\s+/g, ' ')
    .trim()
}

const MAX_QUERY_TOKENS = 8

/** Split a raw query into normalized tokens (capped so scoring stays O(small)). */
export function tokenizeQuery(query: string): string[] {
  return normalizeSearchText(query)
    .split(' ')
    .filter((token) => token.length > 0)
    .slice(0, MAX_QUERY_TOKENS)
}

interface WeightedField {
  /** Pre-normalized haystack text. */
  text: string
  weight: number
}

/**
 * Score one token against one pre-normalized field. A match at a word
 * boundary counts double — "grace" should rank "Grace Notes" over
 * "disgraceful" without a fuzzy dependency.
 */
function fieldTokenScore(
  fieldText: string,
  token: string,
  weight: number,
): number {
  const index = fieldText.indexOf(token)
  if (index === -1) return 0
  const previous = index === 0 ? '' : fieldText.charAt(index - 1)
  const atWordStart = index === 0 || !/[a-z0-9]/.test(previous)
  return weight * (atWordStart ? 2 : 1)
}

/**
 * AND-semantics scorer: every token must hit at least one field or the
 * entry is out; the total is the sum of per-token, per-field scores.
 */
function scoreEntry(fields: WeightedField[], tokens: string[]): number {
  if (tokens.length === 0) return 0
  let total = 0
  for (const token of tokens) {
    let tokenScore = 0
    for (const field of fields) {
      tokenScore += fieldTokenScore(field.text, token, field.weight)
    }
    if (tokenScore === 0) return 0
    total += tokenScore
  }
  return total
}

// ---------------------------------------------------------------------------
// Series search
// ---------------------------------------------------------------------------

export interface SeriesSearchResult {
  kind: 'series'
  slug: string
  title: string
  question: string
  dayCount: number
  href: string
  score: number
}

interface SeriesIndexEntry {
  slug: string
  title: string
  question: string
  dayCount: number
  fields: WeightedField[]
}

// Field weights: a title hit should always beat a keyword hit, which
// beats a question hit, which beats a hit buried in the introduction.
const SERIES_WEIGHTS = {
  title: 4,
  keywords: 3,
  question: 2,
  introduction: 1,
} as const

let seriesIndexCache: SeriesIndexEntry[] | null = null

function getSeriesIndex(): SeriesIndexEntry[] {
  if (seriesIndexCache) return seriesIndexCache
  seriesIndexCache = ALL_SERIES_ORDER.flatMap((slug) => {
    const series = SERIES_DATA[slug]
    if (!series) return []
    return [
      {
        slug,
        title: series.title,
        question: series.question,
        dayCount: series.days.length,
        fields: [
          {
            text: normalizeSearchText(series.title),
            weight: SERIES_WEIGHTS.title,
          },
          {
            text: normalizeSearchText(series.keywords.join(' ')),
            weight: SERIES_WEIGHTS.keywords,
          },
          {
            text: normalizeSearchText(series.question),
            weight: SERIES_WEIGHTS.question,
          },
          {
            text: normalizeSearchText(series.introduction),
            weight: SERIES_WEIGHTS.introduction,
          },
        ],
      },
    ]
  })
  return seriesIndexCache
}

export function searchSeries(query: string): SeriesSearchResult[] {
  const tokens = tokenizeQuery(query)
  if (tokens.length === 0) return []
  const results: SeriesSearchResult[] = []
  for (const entry of getSeriesIndex()) {
    const score = scoreEntry(entry.fields, tokens)
    if (score <= 0) continue
    results.push({
      kind: 'series',
      slug: entry.slug,
      title: entry.title,
      question: entry.question,
      dayCount: entry.dayCount,
      href: `/series/${entry.slug}`,
      score,
    })
  }
  return results.sort(
    (a, b) => b.score - a.score || a.title.localeCompare(b.title),
  )
}

// ---------------------------------------------------------------------------
// Devotional search
// ---------------------------------------------------------------------------

export interface DevotionalSearchResult {
  kind: 'devotional'
  slug: string
  title: string
  teaser: string | null
  seriesTitle: string | null
  href: string
  score: number
}

interface DevotionalIndexEntry {
  slug: string
  title: string
  teaser: string | null
  seriesTitle: string | null
  fields: WeightedField[]
}

const DEVOTIONAL_WEIGHTS = {
  title: 4,
  series: 2,
  teaser: 1,
} as const

interface SlugMeta {
  seriesTitle: string
  dayTitle: string
}

let slugMetaCache: Map<string, SlugMeta> | null = null

/** slug → owning series title + the day title recorded in SERIES_DATA. */
function getSlugMeta(): Map<string, SlugMeta> {
  if (slugMetaCache) return slugMetaCache
  slugMetaCache = new Map()
  for (const seriesSlug of ALL_SERIES_ORDER) {
    const series = SERIES_DATA[seriesSlug]
    if (!series) continue
    for (const day of series.days) {
      slugMetaCache.set(day.slug, {
        seriesTitle: series.title,
        dayTitle: day.title,
      })
    }
  }
  return slugMetaCache
}

/** Deterministic readable label from a slug — last-resort display only. */
function humanizeSlug(slug: string): string {
  const dayMatch = slug.match(/^(.*)-day-(\d+)$/)
  const base = (dayMatch ? dayMatch[1] : slug)
    .split('-')
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')
  return dayMatch ? `${base} — Day ${dayMatch[2]}` : base
}

/** Best available reader-facing title for a devotional slug. */
export function devotionalTitleForSlug(slug: string): string {
  const indexed = DEVOTIONAL_TITLES[slug]
  if (indexed && indexed.length > 0) return indexed
  const meta = getSlugMeta().get(slug)
  if (meta && meta.dayTitle.length > 0) return meta.dayTitle
  return humanizeSlug(slug)
}

let devotionalIndexCache: DevotionalIndexEntry[] | null = null

function getDevotionalIndex(): DevotionalIndexEntry[] {
  if (devotionalIndexCache) return devotionalIndexCache
  const slugs = new Set<string>([
    ...Object.keys(DEVOTIONAL_TITLES),
    ...Object.keys(DEVOTIONAL_TEASERS),
  ])
  const meta = getSlugMeta()
  devotionalIndexCache = Array.from(slugs, (slug) => {
    const title = devotionalTitleForSlug(slug)
    const teaser = DEVOTIONAL_TEASERS[slug] ?? null
    const seriesTitle = meta.get(slug)?.seriesTitle ?? null
    return {
      slug,
      title,
      teaser,
      seriesTitle,
      fields: [
        { text: normalizeSearchText(title), weight: DEVOTIONAL_WEIGHTS.title },
        {
          text: seriesTitle ? normalizeSearchText(seriesTitle) : '',
          weight: DEVOTIONAL_WEIGHTS.series,
        },
        {
          text: teaser ? normalizeSearchText(teaser) : '',
          weight: DEVOTIONAL_WEIGHTS.teaser,
        },
      ],
    }
  })
  return devotionalIndexCache
}

export function searchDevotionals(query: string): DevotionalSearchResult[] {
  const tokens = tokenizeQuery(query)
  if (tokens.length === 0) return []
  const results: DevotionalSearchResult[] = []
  for (const entry of getDevotionalIndex()) {
    const score = scoreEntry(entry.fields, tokens)
    if (score <= 0) continue
    results.push({
      kind: 'devotional',
      slug: entry.slug,
      title: entry.title,
      teaser: entry.teaser,
      seriesTitle: entry.seriesTitle,
      href: `/devotional/${entry.slug}`,
      score,
    })
  }
  return results.sort(
    (a, b) => b.score - a.score || a.title.localeCompare(b.title),
  )
}

// ---------------------------------------------------------------------------
// Phrase search — "search by phrasing", not by keyword
// ---------------------------------------------------------------------------

/**
 * Founder, 2026-08-14: "I want the user to be able to search by phrasing etc so
 * they can find the most relevant devotionals — this is NOT the soul audit."
 *
 * `searchSeries` / `searchDevotionals` above use AND semantics: every token must
 * hit or the entry is dropped. That is right for a command-palette lookup where
 * the reader is typing a title they already know, and useless for the way people
 * describe a need. "I feel anxious about money" returns exactly nothing, because
 * no teaser contains the literal token "i".
 *
 * This scorer is built for the second case:
 *
 *  - STOPWORDS are dropped before matching, so the sentence reduces to the words
 *    that carry meaning ("anxious", "money").
 *  - OR semantics with a COVERAGE multiplier. A missing token no longer
 *    disqualifies an entry, but matching 3 of 3 content words still ranks well
 *    above matching 1 of 3 — coverage is squared so partial matches sink fast
 *    rather than flooding the results.
 *  - An EXACT PHRASE hit is worth more than the sum of its words, so someone
 *    typing a remembered line lands on it.
 *  - Series carry their `keywords`, which are already written as natural phrases
 *    ("who am i", "lost", "shaken"), so intent language matches them directly.
 *
 * It is deliberately NOT the Soul Audit: no consent gate, no plan, no
 * curation — it ranks the existing catalog and links straight into it.
 */
const SEARCH_STOPWORDS: ReadonlySet<string> = new Set([
  'a', 'about', 'am', 'an', 'and', 'any', 'are', 'as', 'at', 'be', 'been',
  'but', 'by', 'can', 'do', 'does', 'for', 'from', 'get', 'go', 'had', 'has',
  'have', 'he', 'her', 'him', 'his', 'how', 'i', 'if', 'in', 'is', 'it', 'its',
  'me', 'my', 'of', 'on', 'or', 'our', 'out', 'she', 'so', 'some', 'that',
  'the', 'their', 'them', 'then', 'there', 'they', 'this', 'to', 'up', 'us',
  'was', 'we', 'were', 'what', 'when', 'where', 'which', 'who', 'why', 'will',
  'with', 'you', 'your',
])

/**
 * Content tokens for phrase matching.
 *
 * If a query is ENTIRELY stopwords ("who am i", "what is it") the stopword list
 * would leave nothing to match, so the original tokens are kept instead — those
 * short existential questions are real queries here, and series keywords
 * contain them verbatim.
 */
export function contentTokens(query: string): string[] {
  const tokens = tokenizeQuery(query)
  const content = tokens.filter((token) => !SEARCH_STOPWORDS.has(token))
  return content.length > 0 ? content : tokens
}

/** Squared so that half-matching an intent sentence ranks far below fully matching it. */
function coverageMultiplier(matched: number, total: number): number {
  if (total === 0) return 0
  const ratio = matched / total
  return ratio * ratio
}

const EXACT_PHRASE_WEIGHT = 12

function scoreEntryLoose(
  fields: WeightedField[],
  tokens: string[],
  normalizedPhrase: string,
): number {
  if (tokens.length === 0) return 0
  let total = 0
  let matched = 0
  for (const token of tokens) {
    let tokenScore = 0
    for (const field of fields) {
      tokenScore += fieldTokenScore(field.text, token, field.weight)
    }
    if (tokenScore > 0) matched += 1
    total += tokenScore
  }
  if (matched === 0) return 0

  // A multi-word query found verbatim is a much stronger signal than the same
  // words scattered across a paragraph.
  if (normalizedPhrase.includes(' ')) {
    for (const field of fields) {
      if (field.text.includes(normalizedPhrase)) {
        total += EXACT_PHRASE_WEIGHT * field.weight
        break
      }
    }
  }

  return total * coverageMultiplier(matched, tokens.length)
}

export interface PhraseSearchResults {
  series: SeriesSearchResult[]
  devotionals: DevotionalSearchResult[]
  /** Content words actually used for matching, for "showing results for…" copy. */
  tokens: string[]
}

/**
 * Rank the whole catalog against a natural-language query.
 *
 * Returns series and devotionals separately because the browse UI shows them in
 * different shelves; both are sorted best-first and already filtered to real
 * matches.
 */
export function searchLibraryByPhrase(
  query: string,
  limits: { series?: number; devotionals?: number } = {},
): PhraseSearchResults {
  const tokens = contentTokens(query)
  const phrase = normalizeSearchText(query)
  if (tokens.length === 0) return { series: [], devotionals: [], tokens: [] }

  const seriesResults: SeriesSearchResult[] = []
  for (const entry of getSeriesIndex()) {
    const score = scoreEntryLoose(entry.fields, tokens, phrase)
    if (score <= 0) continue
    seriesResults.push({
      kind: 'series',
      slug: entry.slug,
      title: entry.title,
      question: entry.question,
      dayCount: entry.dayCount,
      href: `/series/${entry.slug}`,
      score,
    })
  }

  const devotionalResults: DevotionalSearchResult[] = []
  for (const entry of getDevotionalIndex()) {
    const score = scoreEntryLoose(entry.fields, tokens, phrase)
    if (score <= 0) continue
    devotionalResults.push({
      kind: 'devotional',
      slug: entry.slug,
      title: entry.title,
      teaser: entry.teaser,
      seriesTitle: entry.seriesTitle,
      href: `/devotional/${entry.slug}`,
      score,
    })
  }

  const bySc = <T extends { score: number; title: string }>(a: T, b: T) =>
    b.score - a.score || a.title.localeCompare(b.title)

  return {
    series: seriesResults.sort(bySc).slice(0, limits.series ?? 12),
    devotionals: devotionalResults.sort(bySc).slice(0, limits.devotionals ?? 24),
    tokens,
  }
}

// ---------------------------------------------------------------------------
// Notes / bookmarks / clippings search
// ---------------------------------------------------------------------------

/** Shape returned by GET /api/annotations (AnnotationRecord subset we use). */
export interface AnnotationApiRecord {
  id: string
  devotional_slug: string
  annotation_type: 'note' | 'highlight' | 'sticky' | 'sticker'
  anchor_text: string | null
  body: string | null
}

/** Shape returned by GET /api/bookmarks (BookmarkRecord subset we use). */
export interface BookmarkApiRecord {
  id: string
  devotional_slug: string
  note: string | null
}

export type NoteResultKind =
  | 'note'
  | 'highlight'
  | 'sticky'
  | 'sticker'
  | 'bookmark'
  | 'clipping'

export interface NoteSearchItem {
  id: string
  kind: NoteResultKind
  /** The reader's own words (note body, highlight anchor, clip text…). */
  text: string
  /** Where it lives — devotional/day title or clipping source title. */
  label: string
  href: string
}

export interface NoteSearchResult extends NoteSearchItem {
  score: number
}

function parsePlanSlug(
  devotionalSlug: string,
): { token: string; day: number } | null {
  const planMatch = devotionalSlug.match(/^plan-([a-f0-9-]+)-day-(\d+)$/i)
  if (!planMatch) return null
  return { token: planMatch[1], day: Number.parseInt(planMatch[2], 10) }
}

/**
 * Same routing contract as the library rail (SA-023): generated-plan day
 * slugs read at /daily-bread; catalog slugs read at /devotional/[slug].
 */
export function resolveDevotionalHref(devotionalSlug: string): string {
  if (parsePlanSlug(devotionalSlug)) return '/daily-bread'
  return `/devotional/${devotionalSlug}`
}

function noteLabelForSlug(devotionalSlug: string): string {
  const plan = parsePlanSlug(devotionalSlug)
  if (plan) return `Soul Audit Plan — Day ${plan.day}`
  return devotionalTitleForSlug(devotionalSlug)
}

export function buildNoteItems(input: {
  annotations: AnnotationApiRecord[]
  bookmarks: BookmarkApiRecord[]
  clippings: Clipping[]
}): NoteSearchItem[] {
  const items: NoteSearchItem[] = []
  for (const annotation of input.annotations) {
    items.push({
      id: `annotation-${annotation.id}`,
      kind: annotation.annotation_type,
      text: annotation.body?.trim() || annotation.anchor_text?.trim() || '',
      label: noteLabelForSlug(annotation.devotional_slug),
      href: resolveDevotionalHref(annotation.devotional_slug),
    })
  }
  for (const bookmark of input.bookmarks) {
    items.push({
      id: `bookmark-${bookmark.id}`,
      kind: 'bookmark',
      text: bookmark.note?.trim() || '',
      label: noteLabelForSlug(bookmark.devotional_slug),
      href: resolveDevotionalHref(bookmark.devotional_slug),
    })
  }
  for (const clipping of input.clippings) {
    items.push({
      id: `clipping-${clipping.id}`,
      kind: 'clipping',
      text: clipping.text,
      label: clipping.sourceTitle,
      href:
        clipping.sourceHref ||
        (clipping.sourceSlug
          ? `/devotional/${clipping.sourceSlug}`
          : clipping.planToken
            ? '/daily-bread'
            : '/clippings'),
    })
  }
  return items
}

const NOTE_WEIGHTS = {
  text: 3,
  label: 2,
} as const

export function searchNotes(
  query: string,
  items: NoteSearchItem[],
): NoteSearchResult[] {
  const tokens = tokenizeQuery(query)
  if (tokens.length === 0) return []
  const results: NoteSearchResult[] = []
  for (const item of items) {
    const score = scoreEntry(
      [
        { text: normalizeSearchText(item.text), weight: NOTE_WEIGHTS.text },
        { text: normalizeSearchText(item.label), weight: NOTE_WEIGHTS.label },
      ],
      tokens,
    )
    if (score <= 0) continue
    results.push({ ...item, score })
  }
  return results.sort(
    (a, b) => b.score - a.score || a.label.localeCompare(b.label),
  )
}
