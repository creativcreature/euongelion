/**
 * The Daily Bread — Voices (SA-092).
 *
 * A historic voice a day: one whole paragraph from the committed reference
 * index, attributed to a named person and a named work. THIS IS REAL TEXT —
 * the paragraph is reproduced exactly as the index carries it. The only
 * transformation is whitespace: the source files are hard-wrapped plain
 * text, so runs of whitespace collapse to single spaces and the edges are
 * trimmed. No word inside the quote is ever added, dropped or reordered.
 *
 * THE SOURCE is `public/reference-index.json` — the full committed index
 * (5,114 chunks). The task brief named `reference-index-slim.json`, but no
 * slim index exists in this repo (the loader's own header says "NO SLIM
 * INDEX"); the full index is the committed reference surface.
 *
 * THE ATTRIBUTION RULE: a chunk enters the pool ONLY through the
 * ATTRIBUTIONS map below — an explicit, hand-curated table from source path
 * to the person and work that path actually is. Nothing is inferred from a
 * filename at runtime and nothing without a named source can print. The map
 * deliberately covers the library's devotional and theological PROSE and
 * leaves out its narrative volumes (Bunyan's two narratives, Douglass's
 * three autobiographies): an arbitrary mid-story paragraph is a scene, not
 * a voice, and this section prints paragraphs that stand alone.
 *
 * THE CONTAMINATION AUDIT (2026-08-19, this file's build session): every
 * candidate source was verified BY CONTENT before entering the map, and
 * FOURTEEN of the index's commentary files turned out to be entirely the
 * wrong book under a theological filename — mislabeled Gutenberg downloads:
 *
 *   spurgeon/all-of-grace.txt          → Willa Cather, "Youth and the Bright Medusa"
 *   spurgeon/around-the-wicket-gate.txt→ a tropical-climate medical handbook
 *   murray/abide-in-christ.txt         → Peacock's novel "Gryll Grange"
 *   murray/absolute-surrender.txt      → an unrelated historical narrative
 *   murray/be-perfect.txt              → a history of American Indian tribes
 *   luther/large-catechism.txt         → Wilkie Collins, "The Fallen Leaves"
 *   edwards/a-careful-and-strict-enquiry-into-freedom-of-will.txt
 *                                      → "Different Girls", a story anthology
 *   edwards/religious-affections.txt   → travel writing (zouaves, cafés)
 *   edwards/the-nature-of-true-virtue.txt → a narrative of Captain Cook's death
 *   wesley/…-vol1.txt, …-vol2.txt      → literal gutenberg.org 404 pages
 *   wesley/…-vol3.txt, …-vol4.txt      → romance / naval-adventure fiction
 *   whitefield/sermons.txt             → the western "Langford of the Three Bars"
 *
 * NONE of those may EVER be added to this map while the underlying files
 * are what they are — a paragraph of Wilkie Collins over Luther's name is a
 * fabricated attribution, the exact thing this section exists to never do.
 * (The contamination also poisons the BM25 commentary retrieval that reads
 * this same index; that is a product-wide defect reported upstream, not
 * fixable here.) Relatedly, the file named `sinners-in-the-hands-of-an-
 * angry-god.txt` is really the "Selected Sermons of Jonathan Edwards"
 * collection (five sermons), so its work attribution says that — a line
 * from the Farewell Sermon must not be cited to Sinners.
 *
 * THE PARAGRAPH FILTER is structural, not editorial: 40-120 words, shaped
 * like prose (starts like a sentence, ends like one), free of markup,
 * boilerplate and reference-number litter, and not shouting (all-caps
 * headings). One paragraph per chunk — the first that qualifies — keeps the
 * pool spread across the whole library instead of strip-mining one book.
 * A small register screen also skips paragraphs built on period polemic
 * labels for other peoples and faiths; those sentences are the authors',
 * but a quote-of-the-day slot strips the context that makes them readable.
 *
 * DETERMINISM: days-since-epoch modulo the pool (~970 paragraphs) —
 * consecutive days walk consecutive indexes, so no repeat within
 * `pool.length` days. Floor 100, enforced with a throw (Rule 1). The pool
 * is ORDERED BY A STABLE HASH of the quote, not by index order: index order
 * groups a book's chunks together, which would print the same author for
 * months on end (155 consecutive Whitall Smith mornings). Hashing scatters
 * the authors while staying a pure function of the data.
 */
import { readFileSync } from 'node:fs'
import path from 'node:path'
import type { EditionItem, VoicesPayload } from '../kinds'

/** Named person + named work for a source path. */
export interface VoiceAttribution {
  author: string
  work: string
}

const REF = 'content/reference/commentaries'

/**
 * The curated attribution table. Every entry names the real person and the
 * real work the file WAS VERIFIED BY CONTENT to be (see the contamination
 * audit in the file comment). A path absent from this table CANNOT print.
 */
export const ATTRIBUTIONS: Record<string, VoiceAttribution> = {
  [`${REF}/augustine/city-of-god.txt`]: {
    author: 'Augustine of Hippo',
    work: 'The City of God',
  },
  [`${REF}/bounds/power-through-prayer.txt`]: {
    author: 'E. M. Bounds',
    work: 'Power Through Prayer',
  },
  [`${REF}/brother-lawrence/practice-of-presence-of-god.txt`]: {
    author: 'Brother Lawrence',
    work: 'The Practice of the Presence of God',
  },
  [`${REF}/calvin/institutes-of-the-christian-religion-vol1.txt`]: {
    author: 'John Calvin',
    work: 'Institutes of the Christian Religion',
  },
  [`${REF}/chesterton/everlasting-man.txt`]: {
    author: 'G. K. Chesterton',
    work: 'The Everlasting Man',
  },
  [`${REF}/chesterton/heretics.txt`]: {
    author: 'G. K. Chesterton',
    work: 'Heretics',
  },
  [`${REF}/chesterton/orthodoxy.txt`]: {
    author: 'G. K. Chesterton',
    work: 'Orthodoxy',
  },
  // The filename says Sinners; the content is the five-sermon collection.
  [`${REF}/edwards/sinners-in-the-hands-of-an-angry-god.txt`]: {
    author: 'Jonathan Edwards',
    work: 'Selected Sermons',
  },
  [`${REF}/hannah-whitall-smith/christians-secret.txt`]: {
    author: 'Hannah Whitall Smith',
    work: "The Christian's Secret of a Happy Life",
  },
  [`${REF}/luther/commentary-on-galatians.txt`]: {
    author: 'Martin Luther',
    work: 'Commentary on Galatians',
  },
  [`${REF}/owen/mortification-of-sin.txt`]: {
    author: 'John Owen',
    work: 'The Mortification of Sin',
  },
  [`${REF}/pascal/pensees.txt`]: {
    author: 'Blaise Pascal',
    work: 'Pensées',
  },
  [`${REF}/thomas-a-kempis/imitation-of-christ.txt`]: {
    author: 'Thomas à Kempis',
    work: 'The Imitation of Christ',
  },
  [`${REF}/tozer/pursuit-of-god.txt`]: {
    author: 'A. W. Tozer',
    work: 'The Pursuit of God',
  },
}

/** Minimum printable pool. Below this the section fails, loudly. */
export const VOICES_POOL_FLOOR = 100

const MIN_WORDS = 40
const MAX_WORDS = 120

/** Markup, boilerplate and litter that disqualify a paragraph outright.
 * Case-insensitive — the license blocks shout their names in caps. */
const DISQUALIFIERS =
  /https?:|www\.|project gutenberg|transcriber|copyright|[*#[\]|_]/i

/** Period polemic labels — see the register screen in the file comment. */
const REGISTER_SCREEN =
  /\b(Turks?|infidels?|heretics?|savages?|Mahomet(?:ans?)?|papists?|negro(?:es)?)\b/i

/**
 * Dialogue-attribution cues. Several of these books carry illustrative
 * anecdotes ("the doctor said to his friend…"), and a paragraph narrating a
 * conversation is a scene, not a voice. Scripture quotation in the sermons
 * uses "saith" and direct citation, which these patterns deliberately miss.
 */
const DIALOGUE_SCREEN =
  /\b(?:said|replied|asked|answered|exclaimed|cried)\s+(?:he|she|the|his|her|Mr|Mrs)\b|\b(?:he|she)\s+(?:said|replied|asked|exclaimed)\b/i

/**
 * Normalize a raw hard-wrapped paragraph and decide whether it can stand
 * alone. Returns the normalized text, or null. Exported for the tests.
 */
export function printableParagraph(raw: string): string | null {
  const text = raw.replace(/\s+/g, ' ').trim()
  if (text.length === 0) return null

  const words = text.split(' ')
  if (words.length < MIN_WORDS || words.length > MAX_WORDS) return null

  if (!/^[A-Z“"]/.test(text)) return null
  if (!/[.!?”’")]$/.test(text)) return null
  if (DISQUALIFIERS.test(text)) return null
  if (REGISTER_SCREEN.test(text)) return null
  if (DIALOGUE_SCREEN.test(text)) return null

  // Verse-number and footnote litter reads as broken typesetting in a quote.
  const digits = (text.match(/[0-9]/g) ?? []).length
  if (digits > 5) return null

  // All-caps headings and tables of contents are not prose.
  const letters = (text.match(/[A-Za-z]/g) ?? []).length
  const uppers = (text.match(/[A-Z]/g) ?? []).length
  if (letters === 0 || uppers / letters > 0.3) return null

  return text
}

interface VoiceEntry extends VoiceAttribution {
  quote: string
}

interface ReferenceChunk {
  source: string
  content: string
}

let cachedPool: VoiceEntry[] | null = null

/** FNV-1a, 32-bit — the same stable hash the puzzle page uses. Orders the
 * pool so consecutive days cross authors instead of reading one book. */
function fnv1a(input: string): number {
  let h = 0x811c9dc5
  for (let i = 0; i < input.length; i += 1) {
    h ^= input.charCodeAt(i)
    h = Math.imul(h, 0x01000193)
  }
  return h >>> 0
}

/**
 * The printable pool — one paragraph per chunk, deduplicated, ordered by
 * quote hash (see DETERMINISM in the file comment). Exported so the tests
 * can assert the floor and the attribution rule.
 */
export function voicesPool(
  indexPath: string = path.join(
    process.cwd(),
    'public',
    'reference-index.json',
  ),
): VoiceEntry[] {
  if (cachedPool) return cachedPool

  let raw: string
  try {
    raw = readFileSync(indexPath, 'utf8')
  } catch (cause) {
    throw new Error(
      `voices: reference index missing at ${indexPath}: ${(cause as Error).message}`,
    )
  }
  const chunks = JSON.parse(raw) as ReferenceChunk[]
  if (!Array.isArray(chunks)) {
    throw new Error(`voices: reference index is not an array: ${indexPath}`)
  }

  const seen = new Set<string>()
  const pool: VoiceEntry[] = []
  for (const chunk of chunks) {
    const attribution = ATTRIBUTIONS[chunk.source]
    if (!attribution) continue
    for (const para of String(chunk.content).split(/\n\s*\n/)) {
      const quote = printableParagraph(para)
      if (quote && !seen.has(quote)) {
        seen.add(quote)
        pool.push({ quote, ...attribution })
        break // one paragraph per chunk — see the file comment
      }
    }
  }

  if (pool.length < VOICES_POOL_FLOOR) {
    throw new Error(
      `voices: printable pool has ${pool.length} paragraphs — the floor is ` +
        `${VOICES_POOL_FLOOR}. The index or the filter changed; fix the ` +
        'cause, do not lower the floor.',
    )
  }

  pool.sort(
    (a, b) => fnv1a(a.quote) - fnv1a(b.quote) || a.quote.localeCompare(b.quote),
  )

  cachedPool = pool
  return cachedPool
}

/** Days since 1970-01-01 UTC. The rotation index. */
function daysSinceEpoch(date: Date): number {
  const ms = Date.UTC(
    date.getUTCFullYear(),
    date.getUTCMonth(),
    date.getUTCDate(),
  )
  if (Number.isNaN(ms)) throw new Error('voices: invalid Date')
  if (ms < 0) {
    throw new Error(
      'voices: the rotation is only defined from 1970-01-01 forward',
    )
  }
  return Math.floor(ms / 86_400_000)
}

/** One attributed voice for the UTC date. Slot 0, published — real text
 * reproduced whole from an owned index with a named source. */
export async function generateVoices(
  date: Date,
): Promise<EditionItem<'voices'>[]> {
  const pool = voicesPool()
  const entry = pool[daysSinceEpoch(date) % pool.length]

  const payload: VoicesPayload = {
    quote: entry.quote,
    author: entry.author,
    work: entry.work,
  }

  return [
    {
      kind: 'voices',
      publishDate: date.toISOString().slice(0, 10),
      slot: 0,
      status: 'published',
      payload,
    },
  ]
}
