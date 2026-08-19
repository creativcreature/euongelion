/**
 * The Daily Bread — The Gallery (SA-090 / F-136, Phase 4).
 *
 * An arts column, not decoration: a reproduction with its frame — artist,
 * title, and one paragraph on what to look at. The frame is the point. A paper
 * runs an editorial cartoon and a masterwork on facing pages and nobody calls
 * it incoherent; register shifting by section is what a paper does.
 *
 * THE POOL IS THE AUDIT. `docs/print-audit-2026-08-18.json` is the curation
 * surface (written and merged by `scripts/edition/audit-prints.mjs`, then
 * hand-edited), and only entries with verdict 'clean' are eligible. Several of
 * the prints carry garbled AI lettering baked into the image, so an unaudited
 * pool would publish visible gibberish.
 *
 * If the clean pool is empty the generator THROWS (Development Rule 1). A
 * Gallery with nothing audited must fail loudly at build time, not quietly
 * reach past the audit for something to print.
 */
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import type { EditionItem, GalleryPayload } from '../kinds'

/** Where the audit lives, relative to the repo root. */
const AUDIT_PATH = 'docs/print-audit-2026-08-18.json'

/** Public path prefix for the tracked prints the audit walks. */
const PRINT_DIR = '/images/devotional-prints'

/** One row of the audit file. */
interface AuditPrint {
  file: string
  artist: string
  verdict: string
}

/**
 * Twelve ways of looking. Every one has to be honest in front of ANY entry in
 * the pool, and the pool is not all paintings: it holds architecture, mosaics,
 * sculpture, and artifacts alongside the canvases. So none of these may mention
 * paint, brushwork, colour, drapery, faces, hands, figures or crowds — a
 * paragraph about hands printed under a photograph of an olive press is an
 * invention, and inventions are exactly what this section is not allowed.
 *
 * What is left is safe for all of them: light, tone, distance, edges,
 * composition, emptiness, stillness, and where the viewer has been placed.
 *
 * This is our own voice, which is inside the invention line. What it never
 * does is state a fact about the work — that comes from the filename family
 * and the audit, never from here.
 */
/**
 * Vasari entries (SA-092): per-print title/shown/quality, every one written by
 * an agent LOOKING at the print (src/data/gallery-vasari.json). Founder:
 * captions "written like visari- talk about the art quality, and what is
 * literally being shown." When a clean print has an entry, its title comes
 * from the entry (derived from the image, not the filename) and the lightbox
 * carries shown+quality. A clean print without an entry still publishes with
 * the filename title and the looking paragraph — but the 145-entry bank
 * covers the whole clean pool at ship time.
 */
interface VasariEntry {
  file: string
  title: string
  shown: string
  quality: string
}

let vasariCache: Map<string, VasariEntry> | null = null

function vasariFor(file: string): VasariEntry | undefined {
  if (vasariCache === null) {
    const raw = JSON.parse(
      readFileSync(join(process.cwd(), 'src/data/gallery-vasari.json'), 'utf8'),
    ) as { entries: VasariEntry[] }
    vasariCache = new Map(raw.entries.map((e) => [e.file, e]))
  }
  return vasariCache.get(file)
}

const LOOKING_BANK: readonly string[] = [
  'Notice where the light enters and what it refuses to touch. Whatever is lit is what you are being asked to attend to, and the dark is not leftover space — it is the part of the image that was told to stay quiet.',
  'Ask how far away you have been made to stand. Every image gives its viewer a distance — close enough to touch, or far enough that the whole thing reads as one shape — and that distance is the first thing it says to you.',
  'Let your eyes go soft until the detail drops away and only the large masses remain. Two or three of them are holding the whole thing in balance, and that arrangement was settled before any detail was worked.',
  'Find the place your eye keeps returning to, and then the place it keeps sliding past. Both were built on purpose. The second one is usually doing the quieter half of the work.',
  'Look at the four edges. What has been allowed to run off them and what has been kept whole tells you where the maker decided the subject stopped and the world began.',
  'Count the empty parts. Emptiness is never what was left over: it is space someone chose not to fill, and it sets the pace at which everything else can be read.',
  'Travel from the lightest passage to the darkest and back again. The entire range lives between those two points, and how far apart they sit is how loudly this one is speaking.',
  'Notice which way things lean. Where the lines agree, the image moves; where one of them cuts across the rest, that crossing is the interruption the whole arrangement was built to hold.',
  'Consider what is not here. Anything this old arrives with a long list of things it could have shown, and what was left out is as deliberate as what was kept in.',
  'Ask what moment you have been handed — before something, during it, or long after. Stillness is a decision about time, and an image that refuses to move is usually holding its breath at a chosen point.',
  'Find the darkest passage and stay with it until it opens. What looks at first like a flat black usually holds an edge, a depth, a second thing — the part of the image you are trusted to earn.',
  'Ask where you have been placed. Above what you are looking at, level with it, or below it: noticing whether you look down, across, or up is noticing what posture you were assumed to take.',
]

/* ── Deterministic selection ──────────────────────────────────────────── */

/** FNV-1a-flavoured 32-bit string hash. Stable across runs and platforms. */
function hashSeed(input: string): number {
  let h = 2166136261
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return h >>> 0
}

/** mulberry32 — small, fast, seeded. No Math.random anywhere in the paper. */
function mulberry32(seed: number): () => number {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/** Day of the year, 1-based, in UTC. */
function dayOfYear(date: Date): number {
  const startOfYear = Date.UTC(date.getUTCFullYear(), 0, 1)
  const today = Date.UTC(
    date.getUTCFullYear(),
    date.getUTCMonth(),
    date.getUTCDate(),
  )
  return Math.floor((today - startOfYear) / 86_400_000) + 1
}

/* ── Title ────────────────────────────────────────────────────────────── */

const LOWERCASE_WORDS = new Set([
  'a',
  'an',
  'and',
  'at',
  'by',
  'for',
  'from',
  'in',
  'of',
  'on',
  'or',
  'the',
  'to',
  'with',
])

/**
 * Devotional-theme tokens that trail these filenames.
 *
 * Most prints were generated for a devotional, and the theme slug got appended
 * to the artwork's own name: `millet-the-angelus.webp` and
 * `millet-angelus-rooted.webp` are the same picture, and only the first title
 * is real. Left in, the caption reads "Elijah Desert Present" or "Angelus
 * Rooted" — a title the work has never had, printed under a byline. That is a
 * fabrication, so the trailing theme tokens come off.
 *
 * Every token below was derived from a filename in
 * `docs/print-audit-2026-08-18.json` that has a base twin (`…-rooted` beside
 * the bare name, `…-anointed` beside `chardin-grace-at-table`) or belongs to a
 * theme family on one work (`angelico-annunciation-{believe,logos,present,…}`).
 * They are stripped ONLY from the end of a title, and nothing is ever added:
 * a title can lose filename words, never gain words the filename does not have.
 */
export const THEME_SUFFIX_TOKENS: ReadonlySet<string> = new Set([
  'anointed',
  'belief',
  'believe',
  'chaos',
  'creation',
  'cross',
  'draw',
  'end',
  'endure',
  'expansion',
  'faith',
  'grace',
  'hunger',
  'logos',
  'near',
  'ourselves',
  'patience',
  'present',
  'rhythm',
  'rooted',
  'roots',
  'shared',
  'sin',
  'spirit',
  'standing',
  'stillness',
  'tongue',
  'truth',
  'valued',
  'work',
  'worth',
])

/**
 * A title may not be left ending on a connective. `ge-what-is-truth` is Ge's
 * actual "What Is Truth?" — stripping the theme token would leave "What Is",
 * which is not a title of anything.
 */
function isConnective(word: string): boolean {
  return LOWERCASE_WORDS.has(word) || word === 'is'
}

/**
 * Humanize the filename into a title: drop the leading artist/family token,
 * strip any trailing devotional-theme tokens, hyphens to spaces, title case
 * with the usual small words kept down.
 */
export function titleFromFile(file: string): string {
  const base = file.replace(/\.webp$/, '')
  const words = base.split('-').slice(1).filter(Boolean)
  if (words.length === 0) {
    throw new Error(`cannot build a Gallery title from filename: ${file}`)
  }

  // Never strip the last word standing — a nameless print is worse than a
  // short one — and never leave the title dangling on a connective.
  while (
    words.length > 1 &&
    THEME_SUFFIX_TOKENS.has(words[words.length - 1]) &&
    !isConnective(words[words.length - 2])
  ) {
    words.pop()
  }

  return words
    .map((word, i) =>
      i > 0 && LOWERCASE_WORDS.has(word)
        ? word
        : word.charAt(0).toUpperCase() + word.slice(1),
    )
    .join(' ')
}

/* ── The audit pool ───────────────────────────────────────────────────── */

function readCleanPool(auditPath: string): AuditPrint[] {
  const raw = readFileSync(auditPath, 'utf8')
  const parsed = JSON.parse(raw) as { prints?: unknown }
  if (!Array.isArray(parsed.prints)) {
    throw new Error(`malformed print audit (no prints array): ${auditPath}`)
  }
  const pool = (parsed.prints as AuditPrint[])
    .filter((p) => p && p.verdict === 'clean')
    .sort((a, b) => a.file.localeCompare(b.file))

  if (pool.length === 0) {
    throw new Error(
      `print audit has no entries with verdict "clean" (${auditPath}) — ` +
        'the Gallery cannot publish until prints are audited. Run ' +
        'scripts/edition/audit-prints.mjs and mark the reviewed prints clean.',
    )
  }
  return pool
}

/**
 * The Gallery for one UTC date. Always exactly one item, slot 0, approved —
 * the pick is a modulo over an audited pool, and the looking paragraph is
 * committed copy, so there is nothing here to review.
 *
 * @param auditPath Optional override for the audit file. Defaults to the
 *   committed audit, resolved from the process working directory. Exposed so
 *   the empty-pool failure is testable without moving the real file.
 */
export async function generateGallery(
  date: Date,
  auditPath: string = join(process.cwd(), AUDIT_PATH),
): Promise<EditionItem<'gallery'>[]> {
  const pool = readCleanPool(auditPath)
  const publishDate = new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()),
  )
    .toISOString()
    .slice(0, 10)

  // SEVEN plates a day (founder: "a full gallery with 7 images (lightbox)").
  // Seven arms spaced a seventh of the pool apart, stepped by day — the same
  // stride family the quiz uses, so a day's seven are always distinct and the
  // full pool cycles in ~pool/7 days.
  const SLOTS = 7
  const day = dayOfYear(date)
  const spacing = Math.max(1, Math.floor(pool.length / SLOTS))
  const rand = mulberry32(hashSeed(`${publishDate}:gallery`))

  const items: EditionItem<'gallery'>[] = []
  const used = new Set<number>()
  for (let slot = 0; slot < SLOTS; slot += 1) {
    let idx = (day + slot * spacing) % pool.length
    // Small pools could collide arms; walk forward to the next unused print.
    while (used.has(idx)) idx = (idx + 1) % pool.length
    used.add(idx)
    const print = pool[idx]
    const vasari = vasariFor(print.file)
    const looking =
      vasari?.shown ?? LOOKING_BANK[Math.floor(rand() * LOOKING_BANK.length)]

    const payload: GalleryPayload = {
      image: `${PRINT_DIR}/${print.file}`,
      artist: print.artist,
      title: vasari?.title ?? titleFromFile(print.file),
      looking,
      auditVerdict: 'clean',
      ...(vasari ? { shown: vasari.shown, quality: vasari.quality } : {}),
    }

    items.push({
      kind: 'gallery',
      publishDate,
      slot,
      status: 'approved',
      payload,
    })
  }

  return items
}
