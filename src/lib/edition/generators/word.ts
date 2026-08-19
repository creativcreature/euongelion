/**
 * The Daily Bread — the Word of the day generator (SA-090 / F-136).
 *
 * The gloss, the script, the transliteration and the attribution all come out
 * of `public/lexicon-strongs.json` — the build-time index over Brown-Driver-
 * Briggs (Hebrew) and Abbott-Smith / Strong's (Greek). Nothing here is written
 * by us, which is why the item is written straight in as `approved`: there is
 * nothing editorial to review in a lexicon lookup.
 *
 * `note` (WordPayload's "what the English flattens" field) is deliberately
 * OMITTED. That field is our own voice; this generator has no voice. A day's
 * word is the standard lexical meaning and its reference, or it is nothing.
 *
 * DETERMINISM: selection is `UTC day-of-year % list length`. The TRUE
 * invariant: no word repeats within any 125-day stretch inside a year — each
 * curated word prints two or three times a year. The 30-day no-repeat also
 * holds across the 1 January index reset (the jump lands at index 1; the
 * preceding 29 days sit at indexes ≥ (365 % 125) − 28 = 87 — no overlap).
 * SAFETY FLOOR: the boundary proof holds for any canon of at least 103
 * entries (the same floor the prayer canon documents). Curation may remove
 * entries; it may not take the list below 103. The tests assert it.
 *
 * WHY fs AND NOT THE ASSETS BINDING: generators run in Node — under the
 * nightly GitHub Action and under `scripts/edition/build.mjs` — never inside a
 * Worker request. A missing index throws, and that throw is not caught.
 */
import { readFileSync } from 'node:fs'
import path from 'node:path'
import type { PrecomputedStrongsIndex } from '@/lib/soul-audit/lexicon'
import type { EditionItem, WordPayload } from '../kinds'

/** One curated entry: the Strong's number, and a place it carries weight. */
export interface CuratedWord {
  /** Canonical Strong's number — `H####` or `G####`, no leading zeros. */
  strong: string
  /** A reference where the word is load-bearing, printed with the entry. */
  reference: string
}

/**
 * The vocabulary worth printing. Every entry is verified present in the
 * precomputed index, and every gloss was read before inclusion — words whose
 * BDB extraction is misleading out of context (H7462 rāʿâh, H1984 hālal,
 * H7356 raḥam) are deliberately absent rather than printed with a gloss that
 * does not match the reference beside it.
 *
 * DROPPED FOR DEFECTIVE EXTRACTIONS (15 entries, canon 140 → 125; see below for 3 more). The index
 *
 * ALSO DROPPED (parent ruling, 2026-08-19, canon 125 → 122): G652 apostolos
 * ("a fleet; an expedition"), G1391 doxa ("expectation, judgment, opinion"),
 * G1108 gnosis ("a seeking to know, inquiry") — Abbott-Smith's
 * classical-sense-FIRST entries. Lexically true historically, misleading as a
 * word-of-the-day gloss, and the same failure mode G2098 was dropped for.
 * Consistency demands all four go together.
 * builder flattens a lexicon article into a semicolon run, and for these words
 * it swept up *example clauses and dangling fragments* instead of glosses.
 * They read as nonsense beside the day's reference, so they are out. Grouped
 * by what the extraction did wrong:
 *
 *   Narrative example clauses left in the run —
 *     H3034 yādâ    "throw; cast; shoot; at; and they cast; on me; ..."
 *     H5650 ʻebed   "...; Servant; thy servant; I"
 *     H7355 raḥam   "love; have compassion; I love thee; ..."
 *     H7812 shāḥâh  "bow down; depresses it; prostrate oneself"
 *     H8085 shāmaʻ  "...; hearing was granted to their voice; he caused; ..."
 *     H3335 yātsar  "...; before me a god was not formed; days; were
 *                    pre-ordained; any weapon that is formed against thee..."
 *     H3820 lēb     "...; heart; in the midst of the sea; the inner man; ..."
 *     H3519 kābôd   "...; dignity; reputation; my honour"
 *
 *   Split mid-phrase, leaving a bare particle as its own "gloss" —
 *     H2142 zākar   "...; think of; on; mention of; ..."
 *     H6960 qāvâh   "wait for; those waiting for; wait; look eagerly; for; ..."
 *
 *   Truncated mid-phrase or mid-punctuation —
 *     G1343 dikaiosynē "righteousness; teaching of; justice"
 *     G3466 mystērion  "that which is known to the; a mystery; ..."
 *     G5287 hypostasis "...; assurance, confidence; title-deed,"
 *
 *   Usage examples standing in for the sense, so the gloss never reaches the
 *   meaning the reference beside it carries —
 *     H539 ʼāman     "...; nurse; pillars; supporters of the door" — the whole
 *                    run for Genesis 15:6 and never says "believe" or "trust"
 *     G2098 euangelion "a reward for good tidings; to make a thank-offering
 *                    for good tidings; ..." — leads with the classical sense,
 *                    which is the wrong word beside Mark 1:1
 *
 * The fix is the index builder, not this list; until it is fixed these words
 * are simply not printed. `edition-prayer-word.test.ts` gates re-curation so
 * they cannot come back silently.
 */
export const WORD_CANON: readonly CuratedWord[] = [
  // ── Hebrew ───────────────────────────────────────────────────────────
  { strong: 'H2617', reference: 'Lamentations 3:22' }, // chesed
  { strong: 'H7965', reference: 'Isaiah 26:3' }, // shalom
  { strong: 'H1288', reference: 'Numbers 6:24' }, // barak
  { strong: 'H5162', reference: 'Isaiah 40:1' }, // nacham
  { strong: 'H7307', reference: 'Genesis 1:2' }, // ruach
  { strong: 'H8104', reference: 'Numbers 6:24' }, // shamar
  { strong: 'H3068', reference: 'Exodus 3:15' }, // YHWH
  { strong: 'H430', reference: 'Genesis 1:1' }, // elohim
  { strong: 'H5315', reference: 'Psalm 42:1' }, // nephesh
  { strong: 'H6918', reference: 'Isaiah 6:3' }, // qadosh
  { strong: 'H3722', reference: 'Leviticus 16:30' }, // kaphar
  { strong: 'H5771', reference: 'Isaiah 53:6' }, // avon
  { strong: 'H6588', reference: 'Psalm 51:1' }, // pesha
  { strong: 'H6666', reference: 'Genesis 15:6' }, // tsedaqah
  { strong: 'H4941', reference: 'Micah 6:8' }, // mishpat
  { strong: 'H571', reference: 'Exodus 34:6' }, // emet
  { strong: 'H3444', reference: 'Exodus 15:2' }, // yeshuah
  { strong: 'H1350', reference: 'Isaiah 43:1' }, // gaal
  { strong: 'H3372', reference: 'Deuteronomy 6:13' }, // yare
  { strong: 'H2451', reference: 'Proverbs 9:10' }, // chokmah
  { strong: 'H1847', reference: 'Proverbs 1:7' }, // daath
  { strong: 'H8451', reference: 'Psalm 1:2' }, // torah
  { strong: 'H1697', reference: 'Psalm 119:105' }, // dabar
  { strong: 'H7121', reference: 'Jeremiah 33:3' }, // qara
  { strong: 'H2416', reference: 'Psalm 42:2' }, // chay
  { strong: 'H1254', reference: 'Genesis 1:1' }, // bara
  { strong: 'H5397', reference: 'Genesis 2:7' }, // neshamah
  { strong: 'H6754', reference: 'Genesis 1:27' }, // tselem
  { strong: 'H5375', reference: 'Exodus 34:7' }, // nasa
  { strong: 'H7495', reference: 'Exodus 15:26' }, // rapha
  { strong: 'H3467', reference: 'Psalm 118:25' }, // yasha
  { strong: 'H2620', reference: 'Psalm 2:12' }, // chasah
  { strong: 'H982', reference: 'Proverbs 3:5' }, // batach
  { strong: 'H3176', reference: 'Lamentations 3:24' }, // yachal
  { strong: 'H8034', reference: 'Psalm 8:1' }, // shem
  { strong: 'H5769', reference: 'Psalm 90:2' }, // olam
  { strong: 'H7676', reference: 'Exodus 20:8' }, // shabbat
  { strong: 'H5117', reference: 'Exodus 33:14' }, // nuach
  { strong: 'H7725', reference: 'Joel 2:12' }, // shuv
  { strong: 'H2896', reference: 'Genesis 1:31' }, // tov
  { strong: 'H216', reference: 'Genesis 1:3' }, // or
  { strong: 'H1961', reference: 'Exodus 3:14' }, // hayah
  { strong: 'H4899', reference: 'Psalm 2:2' }, // mashiach
  { strong: 'H4428', reference: 'Psalm 24:8' }, // melek
  { strong: 'H1285', reference: 'Genesis 17:7' }, // berith
  { strong: 'H2580', reference: 'Genesis 6:8' }, // chen
  { strong: 'H8426', reference: 'Psalm 100:4' }, // todah
  { strong: 'H8605', reference: 'Psalm 102:1' }, // tephillah

  // ── Greek ────────────────────────────────────────────────────────────
  { strong: 'G26', reference: '1 Corinthians 13:13' }, // agape
  { strong: 'G25', reference: 'John 3:16' }, // agapao
  { strong: 'G5368', reference: 'John 21:17' }, // phileo
  { strong: 'G1411', reference: 'Acts 1:8' }, // dynamis
  { strong: 'G1515', reference: 'Philippians 4:7' }, // eirene
  { strong: 'G2222', reference: 'John 10:10' }, // zoe
  { strong: 'G2842', reference: 'Acts 2:42' }, // koinonia
  { strong: 'G3056', reference: 'John 1:1' }, // logos
  { strong: 'G3340', reference: 'Mark 1:15' }, // metanoeo
  { strong: 'G3341', reference: '2 Corinthians 7:10' }, // metanoia
  { strong: 'G4102', reference: 'Hebrews 11:1' }, // pistis
  { strong: 'G5485', reference: 'Ephesians 2:8' }, // charis
  { strong: 'G1680', reference: 'Romans 5:5' }, // elpis
  { strong: 'G3107', reference: 'Matthew 5:3' }, // makarios
  { strong: 'G40', reference: '1 Peter 1:16' }, // hagios
  { strong: 'G38', reference: '1 Thessalonians 4:3' }, // hagiasmos
  { strong: 'G4151', reference: 'John 3:8' }, // pneuma
  { strong: 'G5590', reference: 'Matthew 16:26' }, // psyche
  { strong: 'G4561', reference: 'John 1:14' }, // sarx
  { strong: 'G2588', reference: 'Matthew 5:8' }, // kardia
  { strong: 'G3563', reference: 'Romans 12:2' }, // nous
  { strong: 'G4678', reference: 'James 1:5' }, // sophia
  { strong: 'G1922', reference: 'Colossians 1:9' }, // epignosis
  { strong: 'G225', reference: 'John 8:32' }, // aletheia
  { strong: 'G1344', reference: 'Romans 5:1' }, // dikaioo
  { strong: 'G629', reference: 'Ephesians 1:7' }, // apolytrosis
  { strong: 'G2643', reference: '2 Corinthians 5:18' }, // katallage
  { strong: 'G2434', reference: '1 John 2:2' }, // hilasmos
  { strong: 'G4991', reference: 'Romans 1:16' }, // soteria
  { strong: 'G4982', reference: 'Ephesians 2:8' }, // sozo
  { strong: 'G2168', reference: '1 Thessalonians 5:18' }, // eucharisteo
  { strong: 'G4335', reference: 'Philippians 4:6' }, // proseuche
  { strong: 'G1162', reference: 'Philippians 4:6' }, // deesis
  { strong: 'G3875', reference: 'John 14:16' }, // parakletos
  { strong: 'G3874', reference: '2 Corinthians 1:3' }, // paraklesis
  { strong: 'G5281', reference: 'Romans 5:3' }, // hypomone
  { strong: 'G3115', reference: 'Galatians 5:22' }, // makrothymia
  { strong: 'G4236', reference: 'Galatians 5:23' }, // prautes
  { strong: 'G1466', reference: 'Galatians 5:23' }, // egkrateia
  { strong: 'G5479', reference: 'John 15:11' }, // chara
  { strong: 'G5544', reference: 'Galatians 5:22' }, // chrestotes
  { strong: 'G19', reference: 'Galatians 5:22' }, // agathosyne
  { strong: 'G3439', reference: 'John 3:16' }, // monogenes
  { strong: 'G4637', reference: 'John 1:14' }, // skenoo
  { strong: 'G5547', reference: 'Matthew 16:16' }, // Christos
  { strong: 'G2962', reference: 'Romans 10:9' }, // kyrios
  { strong: 'G2316', reference: 'John 1:1' }, // theos
  { strong: 'G3962', reference: 'Matthew 6:9' }, // pater
  { strong: 'G932', reference: 'Matthew 6:33' }, // basileia
  { strong: 'G1577', reference: 'Matthew 16:18' }, // ekklesia
  { strong: 'G1249', reference: 'Mark 10:43' }, // diakonos
  { strong: 'G4396', reference: 'Ephesians 4:11' }, // prophetes
  { strong: 'G4166', reference: 'Ephesians 4:11' }, // poimen
  { strong: 'G3101', reference: 'John 13:35' }, // mathetes
  { strong: 'G907', reference: 'Matthew 28:19' }, // baptizo
  { strong: 'G2889', reference: 'John 3:16' }, // kosmos
  { strong: 'G165', reference: 'Matthew 28:20' }, // aion
  { strong: 'G266', reference: 'Romans 6:23' }, // hamartia
  { strong: 'G859', reference: 'Ephesians 1:7' }, // aphesis
  { strong: 'G863', reference: '1 John 1:9' }, // aphiemi
  { strong: 'G3670', reference: '1 John 1:9' }, // homologeo
  { strong: 'G5218', reference: 'Romans 1:5' }, // hypakoe
  { strong: 'G4487', reference: 'Romans 10:17' }, // rhema
  { strong: 'G1124', reference: '2 Timothy 3:16' }, // graphe
  { strong: 'G2315', reference: '2 Timothy 3:16' }, // theopneustos
  { strong: 'G3306', reference: 'John 15:4' }, // meno
  { strong: 'G2564', reference: 'Romans 8:30' }, // kaleo
  { strong: 'G5046', reference: 'Matthew 5:48' }, // teleios
  { strong: 'G2041', reference: 'Ephesians 2:10' }, // ergon
  { strong: 'G4161', reference: 'Ephesians 2:10' }, // poiema
  { strong: 'G5206', reference: 'Romans 8:15' }, // huiothesia
  { strong: 'G281', reference: '2 Corinthians 1:20' }, // amen
  { strong: 'G3954', reference: 'Hebrews 4:16' }, // parrhesia
  { strong: 'G1656', reference: 'Hebrews 4:16' }, // eleos
]

/**
 * UTC day of year, 1-based. Duplicated rather than shared with the prayer
 * generator on purpose: a generator module is meant to be readable and
 * runnable on its own, and this is four lines of pure arithmetic.
 */
function utcDayOfYear(date: Date): number {
  const startOfYear = Date.UTC(date.getUTCFullYear(), 0, 1)
  const today = Date.UTC(
    date.getUTCFullYear(),
    date.getUTCMonth(),
    date.getUTCDate(),
  )
  return Math.floor((today - startOfYear) / 86_400_000) + 1
}

function utcDateKey(date: Date): string {
  return date.toISOString().slice(0, 10)
}

let cachedIndex: PrecomputedStrongsIndex | null = null

/**
 * Load the precomputed Strong's index off disk. Throws if it is absent — the
 * fix is `npm run build:lexicon-index`, not a fallback.
 */
export function loadStrongsIndex(): PrecomputedStrongsIndex {
  if (cachedIndex) return cachedIndex
  const filePath = path.join(process.cwd(), 'public', 'lexicon-strongs.json')
  const raw = readFileSync(filePath, 'utf8')
  cachedIndex = JSON.parse(raw) as PrecomputedStrongsIndex
  return cachedIndex
}

/** Test seam: forget the cached index so a fresh read is exercised. */
export function clearStrongsIndexCache(): void {
  cachedIndex = null
}

/** Which word runs on this date. */
export function wordForDate(date: Date): CuratedWord {
  return WORD_CANON[utcDayOfYear(date) % WORD_CANON.length]
}

/**
 * Today's word, built entirely from the lexicon entry.
 *
 * A curated Strong's number that is not in the index is a bug in this file, so
 * it throws with the number rather than skipping to the next one.
 */
export async function generateWord(date: Date): Promise<EditionItem<'word'>[]> {
  const curated = wordForDate(date)
  const index = loadStrongsIndex()
  const entry = index[curated.strong]

  if (!entry) {
    throw new Error(
      `Strong's ${curated.strong} is missing from public/lexicon-strongs.json — ` +
        'fix WORD_CANON in src/lib/edition/generators/word.ts',
    )
  }

  const payload: WordPayload = {
    word: entry.word,
    translit: entry.xlit,
    language: curated.strong.startsWith('H') ? 'Hebrew' : 'Greek',
    strong: curated.strong,
    // U+00AD soft hyphens ride in from the lexicon's column breaks (G1162
    // "supplica\u00ADtion"); they defeat search and copy. Display-safe strip.
    gloss: entry.gloss.replace(/\u00AD/g, ''),
    source: entry.source,
    reference: curated.reference,
  }

  return [
    {
      kind: 'word',
      publishDate: utcDateKey(date),
      slot: 0,
      status: 'approved',
      payload,
    },
  ]
}
