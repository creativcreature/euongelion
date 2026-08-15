import RED_LETTER_BSB from '@/data/red-letter-bsb.json'
import WHOLE_VERSES from '@/data/red-letter-whole-verses.json'
import TRAILING_VERSES from '@/data/red-letter-trailing-verses.json'

/**
 * Resolve the words of Christ for a scripture module — SERVER / BUILD ONLY.
 *
 * Founder, 2026-08-15: "i want to produce a rule for the devo-go skill to
 * render christ words in red letter when it creates, and same with the soul
 * audit… so it can be tagged real time and live vs doing it all at once."
 *
 * So attribution is resolved AT THE MOMENT A MODULE IS BUILT, not by a
 * migration over the catalog. Anything that emits a scripture module — a
 * /devo-go build, a Soul Audit plan, the onboarding day, the chat card — calls
 * this and gets red letter for free. Nothing has to be remembered by an author
 * and nothing has to be backfilled when a new reading ships.
 *
 * WHY THIS FILE MUST NOT REACH THE CLIENT. The dataset is 239 KB raw / 77 KB
 * gzipped. Shipping it to every reader to colour a handful of verses would be a
 * poor trade, so resolution happens where the module is constructed and only
 * the resulting spans — a few hundred bytes — travel with the devotional.
 *
 * WHERE THE ATTRIBUTION COMES FROM. `src/data/red-letter-bsb.json` is built by
 * `scripts/red-letter/` from the KJV OSIS `<q who="Jesus">` milestones, which
 * are verse-addressed and exclude other speakers correctly, mapped onto BSB
 * wording verse by verse. 2,027 verses; 1,419 whole-verse (exact) and 608
 * position-aligned; 27 ambiguous verses are deliberately left unmarked. See
 * SA-051 and docs/run/HANDOFF-2026-08-15-library-and-red-letter.md.
 */

type RedLetterMap = Record<string, string[]>
const MAP = RED_LETTER_BSB as RedLetterMap

/**
 * Verses the KJV marks as ENTIRELY Christ speaking.
 *
 * This set is translation-independent, and that is what makes it valuable.
 * Matthew 16:24 reads "Whoever wants to be my disciple…" in NIV and "If anyone
 * wants to come after Me…" in BSB — different words, same speaker, same verse.
 * Verbatim matching fails across translations; the fact that the whole verse is
 * His does not. So when every verse in a reference is a whole-verse span, the
 * whole passage is red and no text matching is needed at all.
 *
 * That single rule is what brings NIV, ESV and NKJV passages into red letter.
 */
const WHOLE = new Set(WHOLE_VERSES as string[])

/**
 * Verses whose single Christ-span runs to the END of the verse — a saying that
 * closes its verse after a reporting clause ("Then Jesus said to his
 * disciples, …").
 *
 * These matter because devotional authors quote the SAYING, not the verse:
 * Matthew 16:24 is stored as "Whoever wants to be my disciple must deny
 * themselves…" with the KJV's "Then said Jesus unto his disciples," already
 * stripped. The verse is partial; the excerpt is entirely His.
 *
 * Used only under the guard in `isBareSaying` below — a passage that still
 * carries its own quotation marks or a reporting verb is NOT treated this way,
 * because then the narration is present and reddening all of it would be the
 * mistake this whole module exists to avoid.
 */
const TRAILING = new Set(TRAILING_VERSES as string[])

/** Reporting clauses that mean narration is present in the excerpt. */
const REPORTING =
  /\b(said|says|answered|replied|asked|told|declared|responded|cried out|exclaimed)\b/i

/**
 * True when the passage is a bare quotation with no narration of its own —
 * no quote marks, no reporting verb. Such an excerpt is the saying itself.
 */
function isBareSaying(passage: string): boolean {
  if (/[“”"]/.test(passage)) return false
  return !REPORTING.test(passage)
}

/** Books the attribution covers. Anything else resolves to nothing. */
const BOOK_CODES: Record<string, string> = {
  Matthew: 'Matt',
  Mark: 'Mark',
  Luke: 'Luke',
  John: 'John',
  Acts: 'Acts',
  Revelation: 'Rev',
}

/** `"Luke 10:33-37"` -> `['Luke.10.33', … 'Luke.10.37']`. */
export function versesInReference(reference: string | undefined): string[] {
  const match = /^([1-3]?\s?[A-Za-z]+)\s+(\d+):(\d+)(?:[-–](\d+))?/.exec(
    (reference ?? '').trim(),
  )
  if (!match) return []
  const book = BOOK_CODES[match[1].trim()]
  if (!book) return []

  const chapter = Number(match[2])
  const from = Number(match[3])
  const to = match[4] ? Number(match[4]) : from
  if (!Number.isFinite(chapter) || !Number.isFinite(from)) return []

  const out: string[] = []
  for (let verse = from; verse <= to && verse - from < 200; verse += 1) {
    out.push(`${book}.${chapter}.${verse}`)
  }
  return out
}

/**
 * The spans of `passage` that are Christ's direct speech.
 *
 * Safe by construction: a span is returned ONLY if it appears verbatim in this
 * passage. A passage in a translation we have no attribution for (NIV, ESV,
 * NKJV) therefore matches nothing and is left black rather than mis-marked —
 * the same reason the pipeline skips ambiguous verses. Under-marking is a
 * typographic omission; over-marking is a false attribution.
 */
export function resolveRedLetter(
  reference: string | undefined,
  passage: string | undefined,
): string[] {
  if (!passage || passage.length < 8) return []
  const verses = versesInReference(reference)
  if (verses.length === 0) return []

  // Whole-verse path: every verse in the reference is entirely Christ's, so
  // the passage is His in whatever translation it is quoted from. This is what
  // brings NIV/ESV/NKJV passages into red letter at all.
  if (verses.every((verse) => WHOLE.has(verse))) {
    const bare = passage.trim().replace(/^[“"]/, '').replace(/[”"]$/, '').trim()
    if (bare.length >= 8) return [bare]
  }

  // Bare-saying path: a single verse whose saying closes it, quoted here
  // WITHOUT its reporting clause or quote marks — so the excerpt is the saying.
  if (
    verses.length === 1 &&
    TRAILING.has(verses[0]) &&
    isBareSaying(passage)
  ) {
    const bare = passage.trim()
    if (bare.length >= 8) return [bare]
  }

  const found: string[] = []
  for (const verse of verses) {
    for (const span of MAP[verse] ?? []) {
      // Short fragments risk matching incidental text; a real utterance is longer.
      if (span.length < 8) continue
      if (passage.includes(span)) found.push(span)
    }
  }
  if (found.length === 0) return []

  // Longest first, then drop any span wholly contained in a longer one, so a
  // verse-level span and the sentence inside it do not both render.
  const unique = [...new Set(found)].sort((a, b) => b.length - a.length)
  return unique.filter(
    (span, i) => !unique.slice(0, i).some((longer) => longer.includes(span)),
  )
}

/**
 * Attach red letter to a scripture module as it is built.
 *
 * Idempotent, and never overwrites an author's explicit attribution — a
 * hand-marked `redLetter` always wins, which is the escape hatch for the 27
 * verses the pipeline refuses to guess at and for any translation we cannot
 * map.
 */
export function withRedLetter<
  T extends { reference?: string; passage?: string; redLetter?: string[] },
>(module: T): T {
  if (module.redLetter && module.redLetter.length > 0) return module
  const spans = resolveRedLetter(module.reference, module.passage)
  return spans.length > 0 ? { ...module, redLetter: spans } : module
}
