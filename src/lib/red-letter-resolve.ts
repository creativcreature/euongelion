import RED_LETTER_BSB from '@/data/red-letter-bsb.json'
import WHOLE_VERSES from '@/data/red-letter-whole-verses.json'
import TRAILING_VERSES from '@/data/red-letter-trailing-verses.json'
import SPEECH_STARTS from '@/data/red-letter-speech-starts.json'
import RED_LETTER_KJV from '@/data/red-letter-kjv.json'

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

/**
 * How many of Christ's speeches BEGIN in each verse.
 *
 * This is what makes multi-verse mixed passages work — the common shape, and
 * the reason no red letter appeared at first. John 6:25-29 (NIV) is narration,
 * Jesus, narration, Jesus: not all whole-verse, not a single verse, and NIV
 * wording never matches BSB, so it fell through every other path.
 *
 * But the passage names its own speakers ("Jesus answered,"), and this map says
 * how many of His speeches to expect in the range — 2 for John 6:25-29. When
 * the number of Jesus-attributed quotations in the passage equals the number
 * expected, the attribution is confirmed by two independent sources and can be
 * trusted. When it does not, we skip.
 */
const STARTS = SPEECH_STARTS as Record<string, number>

/**
 * The same attribution in KJV wording.
 *
 * KJV does not punctuate speech at all, so a KJV passage has no quotations to
 * attribute and BSB wording never matches it — Luke 10:38-42 ("Martha, Martha,
 * thou art careful and troubled about many things") was the single passage in
 * the catalog left black for this reason. Matching KJV spans directly closes it.
 */
const MAP_KJV = RED_LETTER_KJV as RedLetterMap

/** Quotation pairs used across our translations, including nested single quotes. */
const QUOTE_PAIRS: ReadonlyArray<[string, string]> = [
  ['\u201c', '\u201d'],
  ['\u2018', '\u2019'],
  ['"', '"'],
  ["'", "'"],
]

/**
 * Reporting clauses, as SUBJECT patterns.
 *
 * Direction matters and nearly bit: "they said to Jesus," names Jesus as the
 * OBJECT — someone speaking TO him — and an earlier draft that matched
 * /Jesus…said/ loosely would have attributed the crowd's words to Christ. The
 * object forms are therefore matched FIRST and rule Jesus out.
 */
const JESUS_AS_OBJECT =
  /\b(said|asked|told|replied|answered|cried|shouted|called)\b[^.?!"'\u2018\u201c]{0,18}?\bto\s+Jesus\b|\b(asked|told)\s+Jesus\b/i

/** Jesus as the SUBJECT of the reporting clause — the strongest signal we have. */
const JESUS_AS_SUBJECT =
  /\bJesus\b[^.?!]{0,24}?\b(said|says|answered|answers|replied|told|declared|asked|responded|continued|went on to say|added)\b/i

/** A named speaker who is not Jesus. */
const OTHER_SPEAKER =
  /\b(they|crowd|disciples|people|expert|lawyer|scribes|Pharisees|priests|teachers|Peter|Philip|Thomas|Andrew|Martha|Mary|Judas|Pilate|John|angel|voice|father|woman|man|servant|officers)\b[^.?!]{0,26}?\b(asked|said|says|replied|answered|told|cried|exclaimed|shouted|declared)\b/i

/**
 * A bare pronoun clause — "Then he said to Thomas,". Only trusted when the
 * verse range has a speech of His starting in it AND no other speaker is named
 * anywhere in the passage, so "he" has exactly one possible referent.
 */
const PRONOUN_SPEAKER =
  /\b(he|He)\b[^.?!]{0,20}?\b(said|answered|replied|told|declared|asked)\b/

/**
 * Formulae that only Christ uses in the Gospels. Used ONLY as corroboration
 * inside a verse range the KJV already says He speaks in — never on its own.
 */
const DOMINICAL_FORMULA =
  /^(very truly|truly,? I (say|tell)|verily|amen, amen|I am the|I tell you the truth)/i

interface Quotation {
  text: string
  start: number
  end: number
}

/** Every quotation in the passage, in order, whatever marks the edition uses. */
function quotationsIn(passage: string): Quotation[] {
  const out: Quotation[] = []
  for (const [open, close] of QUOTE_PAIRS) {
    let i = 0
    while (i < passage.length) {
      const a = passage.indexOf(open, i)
      if (a === -1) break
      const b = passage.indexOf(close, a + 1)
      if (b === -1) break
      const text = passage.slice(a + 1, b).trim()
      if (text.length >= 8) out.push({ text, start: a, end: b + 1 })
      i = b + 1
    }
    if (out.length > 0) break // first pair style that yields anything wins
  }
  return out.sort((x, y) => x.start - y.start)
}

/**
 * Attribute one quotation.
 *
 * Founder, 2026-08-15: "If it literally says 'jesus said' it is safe to make a
 * red letter. Be more diligent and cross reference as much as possible."
 *
 * So an explicit subject attribution is decisive on its own — it no longer has
 * to agree with a count, and one unattributable quotation elsewhere in the
 * passage no longer voids the ones that ARE attributed. Everything else stays
 * conservative: object forms ("said to Jesus") rule Him out, a named other
 * speaker rules Him out, and a bare pronoun is trusted only when nobody else
 * is named in the passage at all.
 */
function attributeQuotation(
  passage: string,
  q: Quotation,
  ctx: {
    hasOtherSpeaker: boolean
    rangeHasChrist: boolean
    previousWasChrist: boolean
    /** End index of the previous quotation, so the look-back cannot run into it. */
    previousEnd: number
    /** Start index of the next quotation, so the look-ahead cannot run into it. */
    nextStart: number
  },
): 'jesus' | 'other' | 'unknown' {
  // The reporting clause is the text between the PREVIOUS quotation and this
  // one — not a fixed window. A fixed 80-character look-back reached back past
  // the previous quote and picked up an unrelated clause: in "The crowd said to
  // Jesus, '…' Jesus answered, '…'" it saw "said to Jesus" while attributing
  // the SECOND quote and ruled Christ out of his own words.
  const gapStart = Math.max(ctx.previousEnd, q.start - 90)
  const before = passage.slice(gapStart, q.start)
  // Same clamp on the other side: the text after a quotation is very often the
  // reporting clause for the NEXT one. Unclamped, "'Who can say?' Jesus
  // answered, '…'" attributed the first quote to Christ on the strength of the
  // second quote's clause.
  const gapAfter = passage.slice(q.end, Math.min(ctx.nextStart, q.end + 90))
  // The clause between two quotations is genuinely ambiguous — "…?' Jesus
  // answered, '…" could trail the first or lead the second. Punctuation
  // settles it: a clause ending in a comma or colon LEADS INTO the next quote
  // and says nothing about this one. Without this, "'Who can say?' Jesus
  // answered, '…'" attributed the first speaker's words to Christ.
  const leadsIntoNext = /[,:]\s*$/.test(gapAfter)
  const after = leadsIntoNext ? '' : gapAfter

  // Direction first: "they said to Jesus" is somebody speaking TO him.
  if (JESUS_AS_OBJECT.test(before)) return 'other'
  if (JESUS_AS_SUBJECT.test(before)) return 'jesus'
  if (OTHER_SPEAKER.test(before)) return 'other'

  // Trailing attribution: "…," replied the expert in the law.
  if (JESUS_AS_OBJECT.test(after)) return 'other'
  if (OTHER_SPEAKER.test(after)) return 'other'
  if (JESUS_AS_SUBJECT.test(after)) return 'jesus'

  if (!ctx.rangeHasChrist) return 'unknown'

  // "Then he said to Thomas," — safe only when He is the sole named speaker.
  if (!ctx.hasOtherSpeaker && PRONOUN_SPEAKER.test(before)) return 'jesus'

  // A continuation of His own speech, with nobody else having spoken between.
  if (ctx.previousWasChrist && !OTHER_SPEAKER.test(before)) return 'jesus'

  // A formula only He uses, inside a range He is known to speak in.
  if (!ctx.hasOtherSpeaker && DOMINICAL_FORMULA.test(q.text.trim())) return 'jesus'

  return 'unknown'
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

/**
 * True when the passage is a bare quotation with no narration of its own —
 * no quote marks, no reporting verb. Such an excerpt is the saying itself.
 */
function isBareSaying(passage: string): boolean {
  if (/[\u201c\u201d\u2018\u2019"]/.test(passage)) return false
  return !/\b(said|says|answered|replied|asked|told|declared|responded|cried out|exclaimed)\b/i.test(passage)
}

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
    // Try BSB wording, then KJV wording. Both are literal matches against this
    // passage, so whichever edition it was quoted from, only text actually
    // present is ever marked.
    for (const span of [...(MAP[verse] ?? []), ...(MAP_KJV[verse] ?? [])]) {
      // Short fragments risk matching incidental text; a real utterance is longer.
      if (span.length < 8) continue
      if (passage.includes(span)) found.push(span)
    }
  }
  // Verbatim found nothing — fall back to attributing the passage's own
  // quotations. Ordering matters: the verbatim path carries parable narration
  // that has no quotation marks at all (Luke 10:30-35), so running this first
  // would return only the quoted lines and silently drop the rest of the
  // parable. Verbatim wins wherever it applies.
  const expectedStarts = verses.reduce((n, v) => n + (STARTS[v] ?? 0), 0)
  const rangeHasChrist = verses.some((v) => STARTS[v] || WHOLE.has(v) || MAP[v])

  if (found.length === 0 && rangeHasChrist) {
    const quotes = quotationsIn(passage)

    if (quotes.length > 0) {
      // Whether anyone other than Christ is named as a speaker anywhere in the
      // passage. This is what makes a bare "he said" safe or unsafe.
      const hasOtherSpeaker = OTHER_SPEAKER.test(passage)

      const marked: string[] = []
      let previousWasChrist = false
      let previousEnd = 0
      for (const q of quotes) {
        const who = attributeQuotation(passage, q, {
          hasOtherSpeaker,
          rangeHasChrist,
          previousWasChrist,
          previousEnd,
          nextStart: quotes[quotes.indexOf(q) + 1]?.start ?? passage.length,
        })
        if (who === 'jesus') marked.push(q.text)
        previousWasChrist = who === 'jesus'
        previousEnd = q.end
      }
      // Explicit attribution stands on its own — an unattributable quotation
      // elsewhere no longer discards the ones we are sure of.
      if (marked.length > 0) return marked
    }

    // No quotation marks at all, but the range is His and the excerpt carries
    // no narration — the whole passage is the saying. Covers John 11:25-26,
    // quoted as bare text across two verses.
    if (quotes.length === 0 && isBareSaying(passage) && expectedStarts > 0) {
      return [passage.trim()]
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
