/**
 * The Daily Bread — section kinds and their payload shapes (SA-090 / F-136).
 *
 * THIS FILE IS THE CONTRACT. Every generator produces one of these payloads,
 * the runner validates against these guards before any row is written, and the
 * page renders from these types. If a shape needs to change, it changes here
 * first and everything else follows.
 *
 * No zod — the project has no runtime-validation dependency and one narrow,
 * hand-checkable contract does not justify adding one. Each guard is a plain
 * predicate: fast, tree-shakeable, and readable by the next person.
 */

/** Every section of the paper. Must match the CHECK in edition_items. */
export const EDITION_KINDS = [
  'lead',
  'rail',
  'season',
  'word',
  'practice',
  'guide',
  'strip',
  'crossword',
  'unscramble',
  'quiz',
  'gallery',
  'screening',
  'prayer',
  'witness',
  'letter',
  'notice',
  // SA-092: the paper grows to ~30 modules a day.
  'redletter',
  'proverb',
  'verse',
  'archive',
  'b365',
  'voices',
  'question',
] as const

export type EditionKind = (typeof EDITION_KINDS)[number]

export type EditionStatus = 'draft' | 'approved' | 'published' | 'rejected'

/* ── Per-kind payloads ────────────────────────────────────────────────── */

/** The front-page feature. Rotation days carry a devotional slug; a net-new
 * Sunday lead carries full authored content instead. */
export interface LeadPayload {
  mode: 'rotation' | 'authored'
  /** Rotation: which devotional is today's feature. */
  slug?: string
  /** Authored (Sunday): the full feature. */
  title?: string
  standfirst?: string
  /** Markdown body. */
  body?: string
  scriptureReference?: string
  pullQuotes?: string[]
}

/** One "also in this edition" entry. Slot-ordered. */
export interface RailPayload {
  slug: string
  title: string
  image: string
  kicker: string
}

/** The liturgical weather box. */
export interface SeasonPayload {
  seasonLabel: string
  dayLabel?: string
  feast?: string
  /** One line on where we are in the church year. */
  note: string
}

/** A word a day, grounded in the Strong's index. Never invented. */
export interface WordPayload {
  word: string
  translit: string
  language: 'Greek' | 'Hebrew'
  strong: string
  gloss: string
  /** Attribution, e.g. "Brown-Driver-Briggs (Strong's H7665)". */
  source: string
  reference: string
  /** What the English flattens — our own voice, clearly editorial. */
  note?: string
}

/** One doable thing today. Invented voice → review queue. */
export interface PracticePayload {
  instruction: string
  reason: string
  duration: string
}

/** A practical how-to-read guide. Evergreen; the generator SELECTS which run
 * today, it does not write new ones. */
export interface GuidePayload {
  kicker: 'Method' | 'Practice' | 'Tools' | 'Getting started'
  title: string
  standfirst: string
  steps: string[]
  image: string
  alt: string
  minutes: string
  /** SA-114: the full article, as paragraphs — daily-written guides are
   *  real reads at /guides/daily/[date], not just step cards. Bank guides
   *  without a body keep linking to their static /guides/[slug] page. */
  body?: string[]
}

/** One panel of The Ninety-Nine. Caption is invented voice → review queue. */
export interface StripPayload {
  /** Which drawn panel from the bank. */
  image: string
  alt: string
  caption: string
  /** Panel number within the bank, for "no repeat within 30 days" checks. */
  panelId: string
  /** Native pixel dimensions — when present the strip prints at its OWN
   *  aspect ratio, full and uncropped (founder: "the comic is the wrong
   *  format and is being cropped"). Older rows without dims fall back to
   *  the legacy fill rendering. */
  width?: number
  height?: number
}

/** A crossword cell: letter for a fillable cell, null for a block. */
export interface CrosswordPayload {
  /** Square grid, row-major. */
  size: number
  /** grid[r][c] — uppercase letter, or null for a black square. */
  grid: (string | null)[][]
  clues: {
    across: {
      number: number
      row: number
      col: number
      clue: string
      answer: string
    }[]
    down: {
      number: number
      row: number
      col: number
      clue: string
      answer: string
    }[]
  }
  /** Where the answers come from, e.g. "BSB". */
  source: string
}

/** Reorder-the-verse. */
export interface UnscramblePayload {
  reference: string
  translation: string
  /** The verse, correct order. */
  words: string[]
  /** Deterministic shuffle of indexes into words[]. */
  shuffled: number[]
}

/** "Where is this from?" — one question per slot. */
export interface QuizPayload {
  /** The quoted text. */
  text: string
  translation: string
  /** Four references; exactly one correct. */
  options: string[]
  answerIndex: number
}

/** A reproduction with its frame. The frame is what makes it an arts column. */
export interface GalleryPayload {
  image: string
  /** Artist as named in the filename family, e.g. "Rembrandt". */
  artist: string
  title: string
  /** One paragraph on what to look at. Our voice. */
  looking: string
  /** Print-audit verdict id this cleared, e.g. "clean". */
  auditVerdict: 'clean'
  /** Vasari entry (SA-092): what is literally in the frame. Written by an
   * agent LOOKING at this print — never templated. */
  shown?: string
  /** Vasari entry: the connoisseur's line on what the print does well. */
  quality?: string
}

/** Allowlisted third-party item. source_name/source_url ALSO live on the row
 * (NOT NULL by CHECK); duplicated here so the payload is self-describing. */
export interface ScreeningPayload {
  title: string
  kind: 'video' | 'article'
  sourceName: string
  sourceUrl: string
  /** YouTube video id when kind === 'video'. */
  videoId?: string
  thumbnail?: string
  blurb?: string
}

/** A prayer pulled directly from scripture, printed in full. */
export interface PrayerPayload {
  reference: string
  translation: string
  /** The full prayer text (joined; kept for search/fallback rendering). */
  text: string
  /** Who prayed it, from the text itself — "Hannah", "David", "Paul". */
  prayedBy: string
  /** Proper biblical annotation: each verse with its number, in order.
   * Founder 2026-08-19: "the prayer is the full psalm but it doesnt have
   * the proper biblical annotation." */
  verses?: { v: number; text: string }[]
}

/** The commemoration for the date, from a sourced martyrology. */
export interface WitnessPayload {
  name: string
  year: string
  /** One or two reported sentences. */
  body: string
  /** The documented source. Required — this is reported fact. */
  source: string
}

/** A real reader letter, moderated. Dormant until submissions exist. */
export interface LetterPayload {
  body: string
  from: string
}

/** A community notice with a named organiser. Dormant until real entries. */
export interface NoticePayload {
  title: string
  body: string
  by: string
  href?: string
}

/* ── SA-092 payloads — the paper grows to ~30 modules a day ──────────── */

/** A saying of Jesus, quoted verbatim from the red-letter dataset
 * (`src/data/red-letter-bsb.json`). Nothing here is written by us. */
export interface RedLetterPayload {
  reference: string
  text: string
  translation: 'BSB'
}

/** One proverb a day — a two-line saying from Proverbs 10-29, BSB verbatim. */
export interface ProverbPayload {
  reference: string
  text: string
  translation: string
}

/** The WEEK'S memory verse — the same verse all seven days, keyed by ISO
 * week, because memorising takes longer than a morning. */
export interface VersePayload {
  reference: string
  text: string
  translation: string
  /** ISO date ('YYYY-MM-DD') of that week's Monday. */
  weekOf: string
}

/** An older devotional resurfaced from the catalog. Catalog lookup only —
 * every field resolves from data that already shipped. */
export interface ArchivePayload {
  slug: string
  title: string
  teaser: string
  seriesSlug: string
  image: string
}

/** Today in the Bible-365 plan: which day, what it is called, where it
 * reads. The slug links straight into the plan. */
export interface B365Payload {
  slug: string
  /** Plan day, 1-365. */
  day: number
  title: string
  reference: string
}

/** A historic voice from the reference library, attributed to a named
 * person and work. REAL TEXT — the quote is reproduced whole, never
 * trimmed inside. */
export interface VoicesPayload {
  quote: string
  author: string
  work: string
}

/** The day's reflection question. Our own editorial voice, from the
 * committed bank in the generator — shipped pre-reviewed like PRACTICES. */
export interface QuestionPayload {
  question: string
}

export interface EditionPayloadMap {
  lead: LeadPayload
  rail: RailPayload
  season: SeasonPayload
  word: WordPayload
  practice: PracticePayload
  guide: GuidePayload
  strip: StripPayload
  crossword: CrosswordPayload
  unscramble: UnscramblePayload
  quiz: QuizPayload
  gallery: GalleryPayload
  screening: ScreeningPayload
  prayer: PrayerPayload
  witness: WitnessPayload
  letter: LetterPayload
  notice: NoticePayload
  redletter: RedLetterPayload
  proverb: ProverbPayload
  verse: VersePayload
  archive: ArchivePayload
  b365: B365Payload
  voices: VoicesPayload
  question: QuestionPayload
}

/** One row of edition_items, typed by kind. */
export interface EditionItem<K extends EditionKind = EditionKind> {
  id?: string
  kind: K
  publishDate: string // 'YYYY-MM-DD', UTC
  slot: number
  status: EditionStatus
  payload: EditionPayloadMap[K]
  sourceName?: string
  sourceUrl?: string
}

/* ── Validation guards ────────────────────────────────────────────────── */

const isStr = (v: unknown): v is string => typeof v === 'string' && v.length > 0
const isStrArr = (v: unknown): v is string[] =>
  Array.isArray(v) && v.length > 0 && v.every((x) => typeof x === 'string')

type Guard = (p: unknown) => boolean

const rec = (p: unknown): p is Record<string, unknown> =>
  typeof p === 'object' && p !== null

export const PAYLOAD_GUARDS: Record<EditionKind, Guard> = {
  lead: (p) =>
    rec(p) &&
    (p.mode === 'rotation'
      ? isStr(p.slug)
      : p.mode === 'authored'
        ? isStr(p.title) && isStr(p.standfirst) && isStr(p.body)
        : false),
  rail: (p) =>
    rec(p) &&
    isStr(p.slug) &&
    isStr(p.title) &&
    isStr(p.image) &&
    isStr(p.kicker),
  season: (p) => rec(p) && isStr(p.seasonLabel) && isStr(p.note),
  word: (p) =>
    rec(p) &&
    isStr(p.word) &&
    isStr(p.translit) &&
    (p.language === 'Greek' || p.language === 'Hebrew') &&
    isStr(p.strong) &&
    isStr(p.gloss) &&
    isStr(p.source) &&
    isStr(p.reference),
  practice: (p) =>
    rec(p) && isStr(p.instruction) && isStr(p.reason) && isStr(p.duration),
  guide: (p) =>
    rec(p) &&
    isStr(p.title) &&
    isStr(p.standfirst) &&
    isStrArr(p.steps) &&
    isStr(p.image) &&
    isStr(p.alt) &&
    isStr(p.minutes) &&
    (p.body === undefined || isStrArr(p.body)) &&
    ['Method', 'Practice', 'Tools', 'Getting started'].includes(
      p.kicker as string,
    ),
  strip: (p) =>
    rec(p) &&
    isStr(p.image) &&
    isStr(p.alt) &&
    isStr(p.caption) &&
    isStr(p.panelId) &&
    (p.width === undefined || typeof p.width === 'number') &&
    (p.height === undefined || typeof p.height === 'number'),
  crossword: (p) => {
    if (!rec(p) || typeof p.size !== 'number' || !Array.isArray(p.grid))
      return false
    if (p.grid.length !== p.size) return false
    if (
      !p.grid.every(
        (row) => Array.isArray(row) && row.length === (p.size as number),
      )
    )
      return false
    const c = p.clues
    if (!rec(c) || !Array.isArray(c.across) || !Array.isArray(c.down))
      return false
    const clueOk = (x: unknown) =>
      rec(x) &&
      typeof x.number === 'number' &&
      typeof x.row === 'number' &&
      typeof x.col === 'number' &&
      isStr(x.clue) &&
      isStr(x.answer)
    return c.across.every(clueOk) && c.down.every(clueOk) && isStr(p.source)
  },
  unscramble: (p) =>
    rec(p) &&
    isStr(p.reference) &&
    isStr(p.translation) &&
    isStrArr(p.words) &&
    Array.isArray(p.shuffled) &&
    p.shuffled.length === (p.words as string[]).length &&
    // shuffled must be a permutation of 0..n-1
    [...(p.shuffled as unknown[])]
      .sort((a, b) => (a as number) - (b as number))
      .every((v, i) => v === i),
  quiz: (p) =>
    rec(p) &&
    isStr(p.text) &&
    isStr(p.translation) &&
    isStrArr(p.options) &&
    (p.options as string[]).length === 4 &&
    typeof p.answerIndex === 'number' &&
    p.answerIndex >= 0 &&
    p.answerIndex < 4,
  gallery: (p) =>
    rec(p) &&
    isStr(p.image) &&
    isStr(p.artist) &&
    isStr(p.title) &&
    isStr(p.looking) &&
    p.auditVerdict === 'clean' &&
    (p.shown === undefined || isStr(p.shown)) &&
    (p.quality === undefined || isStr(p.quality)),
  screening: (p) =>
    rec(p) &&
    isStr(p.title) &&
    (p.kind === 'video' || p.kind === 'article') &&
    isStr(p.sourceName) &&
    isStr(p.sourceUrl),
  prayer: (p) =>
    rec(p) &&
    isStr(p.reference) &&
    isStr(p.translation) &&
    isStr(p.text) &&
    isStr(p.prayedBy) &&
    (p.verses === undefined ||
      (Array.isArray(p.verses) &&
        p.verses.length > 0 &&
        p.verses.every(
          (x) => rec(x) && typeof x.v === 'number' && x.v > 0 && isStr(x.text),
        ))),
  witness: (p) =>
    rec(p) &&
    isStr(p.name) &&
    isStr(p.year) &&
    isStr(p.body) &&
    isStr(p.source),
  letter: (p) => rec(p) && isStr(p.body) && isStr(p.from),
  notice: (p) => rec(p) && isStr(p.title) && isStr(p.body) && isStr(p.by),
  redletter: (p) =>
    rec(p) && isStr(p.reference) && isStr(p.text) && p.translation === 'BSB',
  proverb: (p) =>
    rec(p) && isStr(p.reference) && isStr(p.text) && isStr(p.translation),
  verse: (p) =>
    rec(p) &&
    isStr(p.reference) &&
    isStr(p.text) &&
    isStr(p.translation) &&
    typeof p.weekOf === 'string' &&
    /^\d{4}-\d{2}-\d{2}$/.test(p.weekOf),
  archive: (p) =>
    rec(p) &&
    isStr(p.slug) &&
    isStr(p.title) &&
    isStr(p.teaser) &&
    isStr(p.seriesSlug) &&
    isStr(p.image),
  b365: (p) =>
    rec(p) &&
    isStr(p.slug) &&
    typeof p.day === 'number' &&
    Number.isInteger(p.day) &&
    p.day >= 1 &&
    p.day <= 365 &&
    isStr(p.title) &&
    isStr(p.reference),
  voices: (p) => rec(p) && isStr(p.quote) && isStr(p.author) && isStr(p.work),
  question: (p) => rec(p) && isStr(p.question),
}

/** Validate one item. Returns an error string, or null when valid. */
export function validateEditionItem(item: EditionItem): string | null {
  if (!EDITION_KINDS.includes(item.kind)) return `unknown kind: ${item.kind}`
  if (!/^\d{4}-\d{2}-\d{2}$/.test(item.publishDate))
    return `publishDate must be YYYY-MM-DD, got: ${item.publishDate}`
  if (!Number.isInteger(item.slot) || item.slot < 0)
    return `bad slot: ${item.slot}`
  if (!['draft', 'approved', 'published', 'rejected'].includes(item.status))
    return `bad status: ${item.status}`
  if (item.kind === 'screening' && (!item.sourceName || !item.sourceUrl))
    return 'screening items require sourceName and sourceUrl'
  if (!PAYLOAD_GUARDS[item.kind](item.payload))
    return `payload failed ${item.kind} guard`
  return null
}

/** Kinds whose content is computed from owned assets — written as approved
 * (or published directly), because there is nothing to review in a computed
 * crossword.
 *
 * 'question' is the honest exception in this list: its content IS invented
 * voice, but the invention happened once, in the committed bank inside
 * `generators/question.ts`, which shipped founder-reviewed exactly like the
 * PRACTICES array. The generator only SELECTS from that bank — re-printing
 * shipped editorial is not a new claim needing new review. A net-new question
 * pipeline (LLM or otherwise) must NOT ride this classification; it would be
 * a reviewed kind landing drafts. */
export const DETERMINISTIC_KINDS: readonly EditionKind[] = [
  'rail',
  'season',
  'word',
  'guide',
  'crossword',
  'unscramble',
  'quiz',
  'gallery',
  'prayer',
  'witness',
  // SA-092 additions:
  'redletter',
  'proverb',
  'verse',
  'archive',
  'b365',
  'voices',
  'question',
] as const

/** Kinds carrying invented voice or third-party content — always drafts. */
export const REVIEWED_KINDS: readonly EditionKind[] = [
  'lead',
  'practice',
  'strip',
  'screening',
  'letter',
  'notice',
] as const
