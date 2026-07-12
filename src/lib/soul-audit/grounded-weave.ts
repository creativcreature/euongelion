// Closed, grounded devotional weave.
//
// The model is an ASSEMBLER, not an author: it weaves ONLY materials we
// retrieve — verbatim Scripture (getVerse), real attributed commentary quotes
// (BM25 over the library), and lexicon-grounded word studies (BDB/Strong's/
// Abbott-Smith) — and a verification pass rejects any day that smuggles in an
// ungrounded quote, author, or invented etymology. This is the anti-hallucination
// guarantee the product is built on.
//
// Server-only (reads corpus from disk + calls the brain router).
import { getVerse } from '@/lib/bible/getVerse'
import {
  DEFAULT_BIBLE_TRANSLATION,
  type BibleTranslationCode,
} from '@/lib/bible/translations'
import { loadReferenceIndex } from './reference-index-loader'
import { selectTopChunks, attributionFromChunk } from './chunk-retrieval'
import { getWordStudiesForVerse, type WordStudy } from './lexicon'
import { WORDNOTE_BANK } from '@/data/wordnote-bank'
import { generateWithBrain } from '@/lib/brain/router'
import type {
  DayContent,
  HebrewGreekStudy,
  Endnote,
  Tier3Extended,
} from '@/types/soul-audit-plan'

const SONNET = 'claude-sonnet-4-6'

// Historic authors in the library — used by the verification pass to catch a
// citation the model invented (an author it names that wasn't in the retrieved
// sources for THIS day).
const KNOWN_AUTHORS = [
  'augustine',
  'calvin',
  'pascal',
  'luther',
  'kempis',
  'spurgeon',
  'edwards',
  'bunyan',
  'wesley',
  'chesterton',
  'owen',
  'murray',
  'tozer',
  'bounds',
  'whitefield',
  'whitall smith',
  'douglass',
  'aquinas',
  'lewis',
  'bonhoeffer',
  'nouwen',
  'merton',
  'wright',
  'piper',
  'keller',
  'stott',
]

export type WeaveMode = 'reading' | 'deepdive'

export interface GroundedDayInput {
  struggle: string
  scriptureReference: string
  theme: string
  dayNumber: number
  totalDays: number
  previousDaysSummary?: string
  usedChunkIds?: string[]
  translation?: BibleTranslationCode
  mode?: WeaveMode
  modelOverride?: string
  signal?: AbortSignal
}

export interface GroundedVerification {
  ok: boolean
  issues: string[]
}

export interface GroundedDayResult {
  content: DayContent
  usedChunkIds: string[]
  verification: GroundedVerification
  meta: {
    mode: WeaveMode
    model: string
    words: number
    scriptureTranslation: BibleTranslationCode
    wordStudyCount: number
    /** How many inline `{{wn:id|surface}}` markers were emitted into the body. */
    wordNoteCount: number
    sourceCount: number
    /** How many structured endnotes were recorded (scripture + woven voices +
     *  lexicon studies). Used for observability — every entry is grounded. */
    endnoteCount: number
    /**
     * Real provider-reported token usage for THIS weave call, surfaced so the
     * generation runner can write the cost ledger. These come from the actual
     * Anthropic response (usage.input_tokens / output_tokens) via the brain
     * router; the runner is the single place that persists them.
     */
    inputTokens: number
    outputTokens: number
    estimatedCostUsd: number
  }
}

// ── helpers ──────────────────────────────────────────────────────────

function stripCodeFence(raw: string): string {
  let s = raw.trim()
  if (s.startsWith('```')) {
    s = s.replace(/^```json?\s*/i, '').replace(/\s*```$/, '')
  }
  return s.trim()
}

function derivePreview(body: string): string {
  const plain = body
    .replace(/[#*_>`]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
  const words = plain.split(' ')
  if (words.length <= 120) return plain
  return (
    words
      .slice(0, 110)
      .join(' ')
      .replace(/[,;:]$/, '') + '…'
  )
}

function wordStudyToHebrewGreek(w: WordStudy): HebrewGreekStudy {
  return {
    word: w.word,
    transliteration: w.xlit,
    language: w.strong.startsWith('G') ? 'greek' : 'hebrew',
    meaning: w.gloss,
    etymology: w.source,
  }
}

async function safeWordStudies(
  reference: string,
  max: number,
): Promise<WordStudy[]> {
  try {
    return await getWordStudiesForVerse(reference, max)
  } catch {
    // Some references have no tagged original-language words (or aren't
    // parseable for word-study); the reading still grounds on Scripture +
    // sources. Surface nothing rather than invent.
    return []
  }
}

function formatWordStudies(studies: WordStudy[]): string {
  if (studies.length === 0)
    return '(none available for this verse — do NOT introduce any Hebrew/Greek word claims)'
  return studies
    .map(
      (w) =>
        `- ${w.word} (${w.xlit}, ${w.strong})${w.englishWord ? ` — the word behind "${w.englishWord}"` : ''}: ${w.gloss} [${w.source}]`,
    )
    .join('\n')
}

function formatSources(
  chunks: { source: string; content: string; attribution: string }[],
): string {
  return chunks
    .map(
      (c, i) =>
        `[${i + 1}] ${c.attribution}:\n"${c.content.replace(/\s+/g, ' ').trim().slice(0, 700)}"`,
    )
    .join('\n\n')
}

// ── inline WordNote markers ──────────────────────────────────────────
//
// The reader's inline word-study primitive (WordNote) is opted into by content
// emitting `{{wn:bankId|surface}}` markers (see src/lib/wordnote-markup.tsx).
// The grounded weave must EMIT those markers so generated days carry the same
// crimson-underlined lexicon notes the curated content does — but with the same
// closed-system, zero-fabrication guarantee the rest of this file enforces.
//
// How fabrication is made impossible:
//   1. We never ask the model to write a marker (it could invent a bank id).
//      Markers are injected by THIS deterministic post-pass, after generation.
//   2. A marker is emitted ONLY for a Strong's number that BOTH the verse's real
//      lexicon studies (getWordStudiesForVerse) AND the shipped WORDNOTE_BANK
//      contain. So every id we emit is a real bank entry whose gloss is verbatim
//      lexicon text — verified again here against the bank before emission.
//   3. We only wrap a surface word that actually appears in the prose (the
//      bank entry's English `term`, e.g. "peace" / "grace"). If the word is not
//      present, no marker is emitted (plain text stands).
//   4. The verbatim Scripture blockquote is left untouched, so we never alter
//      quoted Scripture; markers land only in the woven exposition.

// strong (e.g. "H7965"/"G3056") -> bank entry, built once from the shipped bank.
const BANK_BY_STRONG: Map<string, (typeof WORDNOTE_BANK)[number]> = new Map(
  WORDNOTE_BANK.map((e) => [e.strong.toUpperCase(), e]),
)

// Bank ids eligible for the PROSE-anchored fallback: distinctly-theological
// terms whose English→lexicon mapping is reliably meaningful wherever the word
// appears in devotional prose. Generic homographs (word, light, know, hear,
// wait, fear, create, return, truth, soul, spirit…) are deliberately excluded
// from the fallback — they are too common/ambiguous in plain English to mark
// confidently — but remain fully eligible via the precise verse-anchored path.
const FALLBACK_ELIGIBLE_IDS = new Set<string>([
  'shalom',
  'eirene',
  'chesed',
  'agape',
  'charis',
  'pistis',
  'elpis',
  'berit',
  'metanoia',
  'soteria',
  'chara',
  'dikaiosyne',
  'tsedeq',
  'kavod',
  'emunah',
  'nacham',
  'hamartia',
])

/** Escape a literal string for safe use inside a RegExp. */
function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

/**
 * Inject `{{wn:id|surface}}` WordNote markers into the woven body for the
 * verse's grounded word studies — but only for terms that resolve to a REAL
 * bank entry (by Strong's number) and whose English term actually appears in
 * the prose. Returns { body, emitted } where `emitted` lists the bank ids
 * actually marked (for meta/observability). Never invents an id or a surface.
 */
export function injectWordNoteMarkers(
  body: string,
  studies: WordStudy[],
): { body: string; emittedIds: string[] } {
  if (!body) return { body, emittedIds: [] }

  // At most a few notes per reading — enough to enrich, never enough to clutter.
  const MAX_MARKERS = 3

  // PRIMARY: words of the anchor verse whose Strong's number is in the bank —
  // the most precise word-studies (the gloss is the verse's own word). De-dupe
  // by id so the same note never appears twice.
  const seenIds = new Set<string>()
  const primary: Array<{ id: string; term: string }> = []
  for (const study of studies) {
    const entry = BANK_BY_STRONG.get((study.strong || '').toUpperCase())
    if (!entry) continue // no bank entry for this Strong's number
    if (seenIds.has(entry.id)) continue
    const term = (entry.term || '').trim()
    if (!term) continue
    seenIds.add(entry.id)
    primary.push({ id: entry.id, term })
  }

  // FALLBACK: standard term→lexicon word-studies (faith→pistis, peace→shalom)
  // for any bank entry whose English term actually appears in the exposition.
  // These are well-known mappings whose glosses are verbatim public-domain
  // lexicon (BDB / Strong's / Abbott-Smith); they surface a few studies when the
  // anchor verse's own words don't overlap the small bank. Verse-anchored
  // studies are always preferred; the fallback only fills up to MAX_MARKERS, and
  // (like the primary path) it never touches the verbatim Scripture blockquote.
  const fallback: Array<{ id: string; term: string }> = []
  const bodyLower = body.toLowerCase()
  for (const entry of WORDNOTE_BANK) {
    if (seenIds.has(entry.id)) continue
    if (!FALLBACK_ELIGIBLE_IDS.has(entry.id)) continue // homograph-safe terms only
    const term = (entry.term || '').trim()
    if (!term || !bodyLower.includes(term.toLowerCase())) continue
    seenIds.add(entry.id)
    fallback.push({ id: entry.id, term })
  }

  if (primary.length === 0 && fallback.length === 0) {
    return { body, emittedIds: [] }
  }

  // Mask the verbatim Scripture blockquote(s) so a marker never lands inside
  // quoted Scripture. Markdown blockquote lines start with ">". We only search
  // the non-quoted exposition for surface words.
  const lines = body.split('\n')
  const emittedIds: string[] = []

  // Longer terms first within each group ("steadfast love" beats "love").
  primary.sort((a, b) => b.term.length - a.term.length)
  fallback.sort((a, b) => b.term.length - a.term.length)
  const candidates = [...primary, ...fallback]

  for (const { id, term } of candidates) {
    if (emittedIds.length >= MAX_MARKERS) break
    // Whole-word, case-insensitive, first occurrence in a NON-blockquote line
    // that is not already inside a marker.
    const re = new RegExp(`\\b(${escapeRegExp(term)})\\b`, 'i')
    let marked = false
    for (let i = 0; i < lines.length && !marked; i++) {
      const line = lines[i]
      if (line.trimStart().startsWith('>')) continue // verbatim Scripture
      if (line.includes('{{wn:')) {
        // Skip lines already carrying a marker to avoid nesting.
        if (re.test(line.replace(/\{\{wn:[^}]*\}\}/g, ''))) {
          // term also appears outside the existing marker on this line
        } else {
          continue
        }
      }
      const m = line.match(re)
      if (!m || m.index === undefined) continue
      // Don't wrap if the match sits inside an existing marker on this line.
      const before = line.slice(0, m.index)
      const openMarkers = (before.match(/\{\{wn:/g) || []).length
      const closeMarkers = (before.match(/\}\}/g) || []).length
      if (openMarkers > closeMarkers) continue // inside a marker
      const surface = m[1]
      lines[i] =
        before +
        `{{wn:${id}|${surface}}}` +
        line.slice(m.index + surface.length)
      emittedIds.push(id)
      marked = true
    }
  }

  return { body: lines.join('\n'), emittedIds }
}

// ── depth / length / coherence gate (F-028) ─────────────────────────
//
// A generation that comes back thin (truncated, a near-empty body, or one that
// silently dropped a required woven element) must NOT ship. The product's
// promise is a substantial, fully-woven grounded reading — so depth shortfalls
// FAIL the verification gate (the runner re-rolls), exactly like an ungrounded
// citation. There is no canned/padded fallback: depth comes only from a real,
// complete weave of the grounded corpus.

/** Per-mode minimum bar. The reading prompt asks for ~950–1,150 words and the
 *  deep dive for ~3,000–3,800; we floor well under the ask so only a genuinely
 *  thin/truncated result trips, never a slightly-short-but-complete one. */
const DEPTH_FLOOR = {
  reading: {
    minWords: 600,
    // A complete reading must quote the anchor Scripture as a blockquote and
    // close with a prayer (both are required elements of the woven format).
    requireScriptureQuote: true,
    requirePrayer: true,
    minHeadings: 0,
  },
  deepdive: {
    minWords: 1800,
    requireScriptureQuote: false, // deep dive may reference more than it quotes
    requirePrayer: false,
    minHeadings: 3, // the deep-dive prompt asks for ## section headings
  },
} as const

function countWords(s: string): number {
  return s.split(/\s+/).filter(Boolean).length
}

/** Does the body carry a verbatim Scripture blockquote whose text overlaps the
 *  provided verse? We check for a markdown blockquote AND that it shares a real
 *  run of the anchor text — so an empty/decorative `>` line doesn't satisfy it. */
function hasScriptureBlockquote(body: string, scriptureText: string): boolean {
  const quoteLines = body
    .split('\n')
    .filter((l) => l.trimStart().startsWith('>'))
    .map((l) => l.replace(/^\s*>+\s?/, '').trim())
    .filter(Boolean)
  if (quoteLines.length === 0) return false
  // The anchor's first several significant words should appear in some quote
  // line (verbatim Scripture is injected, so this is an overlap check, not a
  // similarity guess).
  const anchorWords = scriptureText
    .toLowerCase()
    .replace(/[^a-z\s]/g, ' ')
    .split(/\s+/)
    .filter((w) => w.length > 2)
  if (anchorWords.length === 0) return quoteLines.length > 0
  // Require the anchor's first three significant words to appear, in order, in
  // some quote line. We compare significant-word sequences (dropping ≤2-char
  // filler the same way on both sides) so intervening short words don't break a
  // genuine match. Three words is strict enough to reject an empty/decorative
  // `>` line or an unrelated quote, while tolerating a quote that stops short of
  // the verse's tail clause (the model may quote only the relevant portion).
  const probe = anchorWords.slice(0, 3).join(' ')
  const quoteWords = quoteLines
    .join(' ')
    .toLowerCase()
    .replace(/[^a-z\s]/g, ' ')
    .split(/\s+/)
    .filter((w) => w.length > 2)
    .join(' ')
  return quoteWords.includes(probe)
}

/**
 * Length/depth + basic narrative-coherence checks. Returns the issues found
 * (empty array = passes). Coherence here is structural, not semantic: a real
 * woven day has multiple paragraphs and the required elements present — a
 * single-block stub or one missing its Scripture/prayer is incoherent for our
 * format and is rejected rather than shipped thin.
 */
export function checkDepth(params: {
  body: string
  prayer: string
  mode: WeaveMode
  scriptureText: string
}): string[] {
  const issues: string[] = []
  const floor = DEPTH_FLOOR[params.mode]
  const words = countWords(params.body)

  if (words < floor.minWords) {
    issues.push(
      `thin generation: body has ${words} words, below the ${floor.minWords}-word ${params.mode} floor`,
    )
  }

  // Narrative coherence (structural): a complete reading is multi-paragraph
  // prose, not a one-line stub. Count blank-line-separated blocks of real prose
  // (blockquotes excluded so a lone quote doesn't count as a paragraph).
  const proseParagraphs = params.body
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(
      (p) => p && !p.split('\n').every((l) => l.trimStart().startsWith('>')),
    )
  if (proseParagraphs.length < 2) {
    issues.push(
      `incoherent structure: only ${proseParagraphs.length} prose paragraph(s) — expected multi-paragraph woven prose`,
    )
  }

  if (
    floor.requireScriptureQuote &&
    !hasScriptureBlockquote(params.body, params.scriptureText)
  ) {
    issues.push(
      'missing required element: anchor Scripture is not quoted verbatim as a blockquote',
    )
  }

  if (floor.requirePrayer && countWords(params.prayer) < 8) {
    issues.push(
      'missing required element: closing prayer is absent or too short',
    )
  }

  if (floor.minHeadings > 0) {
    const headingCount = (params.body.match(/^#{1,6}\s+\S/gm) ?? []).length
    if (headingCount < floor.minHeadings) {
      issues.push(
        `thin deep dive: ${headingCount} section heading(s), below the ${floor.minHeadings} expected for long-form structure`,
      )
    }
  }

  return issues
}

// ── verification ─────────────────────────────────────────────────────

export function verify(params: {
  body: string
  scriptureText: string
  allowedAuthors: Set<string>
  studies: WordStudy[]
  /** All text the model was given to weave from (source chunks + attributions
   *  + scripture) — used to confirm a diacritic token is grounded. */
  groundingText: string
}): GroundedVerification {
  const issues: string[] = []
  const low = params.body.toLowerCase()

  // 1. Any KNOWN historic author named in the body must be one of THIS day's
  //    retrieved sources — otherwise it's an invented/ungrounded citation.
  for (const author of KNOWN_AUTHORS) {
    if (low.includes(author) && !params.allowedAuthors.has(author)) {
      issues.push(
        `ungrounded author citation: "${author}" (not in retrieved sources)`,
      )
    }
  }

  // 2. Catch INVENTED scholarly-looking transliterations. A non-ASCII token
  //    (carrying Latin diacritics: shâbar, dakkâ, lógos) is only suspect if it
  //    is NOT one of the provided lexicon transliterations AND does not appear
  //    anywhere in the grounding text. That second clause is what clears
  //    legitimate diacritic words the model is allowed to use — quoted source
  //    work titles (Pensées), author names (à Kempis), Scripture — while still
  //    flagging a fabricated transliteration that exists in none of the inputs.
  //    Pure-ASCII tokens (ordinary English like "beneath") are never candidates.
  const stripDiacritics = (s: string) =>
    s
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .toLowerCase()
      .replace(/[^a-z]/g, '')

  // Ordinary English loanwords that legitimately carry diacritics are
  // NEVER transliteration candidates (founder ruling 2026-07-12: a
  // devotional must not fail because the model wrote "naïveté"). These
  // are dictionary English, not scholarly claims about Hebrew/Greek —
  // flagging them produced real user-visible generation failures.
  // Compared in diacritic-stripped form (hyphenated compounds too).
  const ENGLISH_LOANWORDS = new Set([
    'naive',
    'naivete',
    'cafe',
    'cliche',
    'facade',
    'fiance',
    'fiancee',
    'resume',
    'deja',
    'dejavu',
    'entree',
    'creche',
    'protege',
    'protegee',
    'soiree',
    'touche',
    'tete',
    'teteatete',
    'visavis',
    'decor',
    'seance',
    'attache',
    'celebre',
    'detat',
    'matinee',
    'precis',
    'risque',
    'crepe',
    'creme',
    'elite',
    'blase',
    'canape',
    'chateau',
    'emigre',
    'ingenue',
    'melee',
    'menage',
    'communique',
    'expose',
    'saute',
    'puree',
    'noel',
    'papiermache',
    'mache',
    'fete',
    'flambe',
    'doppelganger',
    'senor',
    'senora',
    'senorita',
    'pinata',
    'jalapeno',
    'manana',
    'uber',
    'role',
    'coup',
    'gruyere',
    'consomme',
    'apercu',
    'denouement',
    'raison',
    'detre',
    'raisondetre',
    'voila',
    'outre',
    'passe',
    'lame',
    'divorcee',
    'nee',
    'coordinate',
    'cooperate',
    'cooperation',
    'reenter',
    'preeminent',
    'preexisting',
  ])
  const allowedXlit = new Set(
    params.studies.flatMap((w) => [
      w.xlit.toLowerCase(),
      stripDiacritics(w.xlit),
    ]),
  )
  const groundedTokens = new Set<string>()
  for (const t of params.groundingText.match(/[\p{L}ʼʹ'’-]{2,}/gu) ?? []) {
    const s = stripDiacritics(t)
    if (s.length >= 3) groundedTokens.add(s)
  }
  const tokens = params.body.match(/[\p{L}ʼʹ'’-]{2,}/gu) ?? []
  for (const tok of tokens) {
    if (![...tok].some((c) => c.charCodeAt(0) > 127)) continue
    const cand = stripDiacritics(tok)
    if (cand.length < 3) continue // original-script / 1-char accents (à Kempis)
    if (ENGLISH_LOANWORDS.has(cand)) continue // dictionary English, never a claim
    const inLexicon = [...allowedXlit].some(
      (x) => x.includes(cand) || cand.includes(x),
    )
    const inGrounding = groundedTokens.has(cand)
    if (!inLexicon && !inGrounding) {
      issues.push(`possibly-ungrounded transliteration: "${tok}"`)
    }
  }

  return { ok: issues.length === 0, issues: [...new Set(issues)] }
}

// ── structured endnotes (F-027) ──────────────────────────────────────
//
// Every grounded day records WHERE its real sources are used as structured
// endnotes. The anti-fabrication guarantee mirrors the rest of the file:
//   - The ONLY endnoted sources are (1) the verbatim anchor Scripture,
//     (2) the historic-voice quotes ACTUALLY woven into the body, and
//     (3) the real lexicon word studies for this verse. Nothing is invented.
//   - A retrieved-but-unused voice is NOT endnoted: we only attribute a source
//     if its author name actually appears in the generated prose. This prevents
//     a "citation" the reader never sees, and is the same closed-system rule
//     the verification pass enforces in the other direction.
//   - The `note` text is descriptive only ("Quoted in this day's reading…");
//     the load-bearing attribution (`source`) and `reference` come from real
//     retrieval/lexicon metadata, never from the model.

interface EndnoteSource {
  source: string // attribution string (author, work) from attributionFromChunk
  content: string // the verbatim retrieved excerpt
}

/**
 * Build the structured endnote list for a generated day. Detects which
 * retrieved voices were genuinely woven into `body` (by author-name presence)
 * so we never attribute an unused source, then records Scripture + used voices
 * + lexicon studies as classified endnotes.
 */
export function buildStructuredEndnotes(params: {
  body: string
  scriptureReference: string
  translation: string
  sources: EndnoteSource[]
  studies: WordStudy[]
}): Endnote[] {
  const endnotes: Endnote[] = []
  let id = 1
  const low = params.body.toLowerCase()

  // [1] The anchor Scripture — always present (injected verbatim from corpus).
  endnotes.push({
    id: id++,
    kind: 'scripture',
    source: `${params.scriptureReference} (${params.translation})`,
    reference: params.scriptureReference,
    note: 'Anchor Scripture, quoted verbatim from the Euangelion corpus.',
  })

  // [2..] Historic voices — ONLY those actually woven into the body. We treat a
  // source as used when its author surname (the first attribution token) appears
  // in the prose. This refuses to attribute a retrieved-but-unquoted source.
  for (const s of params.sources) {
    const attribution = (s.source || '').trim()
    if (!attribution) continue
    // attribution looks like "Thomas à Kempis, Imitation Of Christ" → author
    // segment is everything before the first comma.
    const authorSegment = attribution.split(',')[0]?.trim() ?? ''
    if (!authorSegment) continue
    // Use the most distinctive author token (longest word ≥ 4 chars, e.g.
    // "Kempis", "Pascal", "Augustine") so a common word doesn't false-positive.
    const distinctive = authorSegment
      .split(/\s+/)
      .map((w) => w.replace(/[^\p{L}]/gu, ''))
      .filter((w) => w.length >= 4)
      .sort((a, b) => b.length - a.length)[0]
    if (!distinctive) continue
    if (!low.includes(distinctive.toLowerCase())) continue // not woven in → skip
    // De-dupe: a single source may have multiple chunks; attribute it once.
    if (endnotes.some((e) => e.kind === 'voice' && e.source === attribution)) {
      continue
    }
    const excerpt = s.content.replace(/\s+/g, ' ').trim().slice(0, 240)
    endnotes.push({
      id: id++,
      kind: 'voice',
      source: attribution,
      reference: attribution,
      note: excerpt
        ? `Quoted in this day's reading from the Euangelion reference library: "${excerpt}${s.content.length > 240 ? '…' : ''}"`
        : "Quoted in this day's reading from the Euangelion reference library.",
    })
  }

  // [..] Lexicon word studies — every real study grounding this verse.
  for (const w of params.studies) {
    endnotes.push({
      id: id++,
      kind: 'lexicon',
      source: w.source, // e.g. "Brown-Driver-Briggs (Strong's H7965)"
      reference: w.strong,
      note: `Word study of ${w.word} (${w.xlit}, ${w.strong}): ${w.gloss}.`,
    })
  }

  return endnotes
}

// ── prompts ──────────────────────────────────────────────────────────

function systemPrompt(): string {
  return `You are the assembler-and-polisher for Euangelion, a CLOSED, grounded devotional. Theological frame: historic orthodox Christianity (the Apostles' and Nicene Creeds), Christ-centered, never sectarian or novel.

You write with literary beauty, theological depth, and restraint. But you are an ASSEMBLER, not an inventor.

ABSOLUTE GROUNDING RULES (a closed system to prevent hallucination):
- Quote the provided Scripture verbatim, with its reference. Do not quote any other Scripture passage unless its full text is provided to you.
- Any Hebrew/Greek word claim MUST come from the provided lexicon entries. NEVER invent etymologies, pictographic/letter meanings, or root theories. Use only the glosses given. If no lexicon entries are provided, make no original-language claims at all.
- You may quote ONLY the provided source excerpts, verbatim, attributed to the named author/work. Introduce NO other quotations, authors, or historical claims.
- If you cannot ground a claim in the provided materials, leave it out. Beauty through restraint, never through invention.

OUTPUT FORMAT: return your answer using the exact @@@SECTION@@@ delimiter lines requested — never JSON, never a code fence. Write each section's content freely (quotes, blockquotes, markdown all welcome) between its delimiter and the next.`
}

/** Split a @@@NAME@@@-delimited response into sections (lowercased keys). */
function parseDelimited(raw: string): Record<string, string> {
  const out: Record<string, string> = {}
  const parts = raw.split(/@@@([A-Z]+)@@@/g)
  for (let i = 1; i < parts.length; i += 2) {
    out[parts[i].toLowerCase()] = (parts[i + 1] ?? '').trim()
  }
  return out
}

/** Parse a markdown/​dash bullet list into trimmed items. */
function parseList(block: string | undefined): string[] {
  if (!block) return []
  return block
    .split('\n')
    .map((l) => l.replace(/^\s*[-*•\d.]+\s*/, '').trim())
    .filter(Boolean)
}

function readingUserPrompt(params: {
  struggle: string
  ref: string
  translation: string
  scriptureText: string
  studiesBlock: string
  sourcesBlock: string
  dayNumber: number
  totalDays: number
  previousDaysSummary?: string
}): string {
  return `PERSON'S STRUGGLE:
"${params.struggle}"

THIS IS DAY ${params.dayNumber} OF ${params.totalDays}.${
    params.previousDaysSummary
      ? `\nSO FAR (previous days, for continuity — do not repeat): ${params.previousDaysSummary}`
      : ''
  }

ANCHOR SCRIPTURE (quote verbatim, attribute as ${params.ref}, ${params.translation}):
"${params.scriptureText}"

PROVIDED LEXICON ENTRIES (the ONLY original-language data you may use):
${params.studiesBlock}

PROVIDED SOURCE EXCERPTS (the ONLY quotations/voices you may use; quote verbatim and attribute):
${params.sourcesBlock}

TASK — Write Day ${params.dayNumber} as ONE flowing devotional reading of ~950–1,150 words. Weave (no rigid section labels): meet the person honestly where they are; bring the anchor Scripture close; open ONE grounded word study using only the lexicon entries above; weave in AT LEAST ONE provided source quote verbatim and attributed; turn toward the nearness/work of God in Christ (grace, not performance); end with a short honest prayer. Use ONLY the materials above — invent nothing.

Return EXACTLY this delimited format (these literal lines, nothing before @@@TITLE@@@):
@@@TITLE@@@
an evocative title (no "Day N:" prefix)
@@@BODY@@@
the full reading as markdown prose — quote the verbatim Scripture as a blockquote, attribute the source quote inline
@@@PRAYER@@@
a short first-person prayer
@@@REFLECTION@@@
- 2 to 3 honest, non-leading questions, one per line
@@@SUMMARY@@@
1-2 sentences capturing this day's movement, for the next day's continuity`
}

function deepDiveUserPrompt(params: {
  struggle: string
  ref: string
  translation: string
  scriptureText: string
  studiesBlock: string
  sourcesBlock: string
}): string {
  return `PERSON'S STRUGGLE:
"${params.struggle}"

ANCHOR SCRIPTURE (verbatim, ${params.ref}, ${params.translation}):
"${params.scriptureText}"

PROVIDED LEXICON ENTRIES (the ONLY original-language data you may use):
${params.studiesBlock}

PROVIDED SOURCE EXCERPTS (the ONLY quotations/voices you may use; verbatim + attributed):
${params.sourcesBlock}

TASK — Write a long-form "Deep Dive" (~3,000–3,800 words) in flowing prose with section headings, in the tradition of a rich theological teaching. Include: an opening that frames the passage; grounded word studies drawn ONLY from the lexicon entries above; a reading through PaRDeS (Peshat / Remez / Derash / Sod — the four classical levels); canonical cross-references that you may name by reference (book chapter:verse) but only quote if their text is provided; the historic voices woven verbatim and attributed; a Christ-centered typological reading; and a closing invitation. Use ONLY the provided materials for quotations, original-language claims, and attributions. Invent nothing.

Return EXACTLY this delimited format (these literal lines, nothing before @@@BODY@@@):
@@@BODY@@@
the full deep dive as markdown prose with ## section headings
@@@ETYMOLOGY@@@
a paragraph synthesizing the provided word studies (lexicon-grounded only)
@@@CROSSREFS@@@
one per line as: Book C:V | one sentence on the link
@@@JOURNALING@@@
- 3 to 4 prompts, one per line
@@@COMPREHENSION@@@
- 3 to 4 questions, one per line`
}

// ── main ─────────────────────────────────────────────────────────────

export async function generateGroundedDay(
  input: GroundedDayInput,
): Promise<GroundedDayResult> {
  const mode: WeaveMode = input.mode ?? 'reading'
  const translation = input.translation ?? DEFAULT_BIBLE_TRANSLATION
  const model = input.modelOverride ?? SONNET

  // 1) verbatim Scripture from the corpus (never typed by the model)
  const verse = await getVerse(input.scriptureReference, translation)

  // 2) grounded word studies from the real lexica
  const studies = await safeWordStudies(
    verse.canonical,
    mode === 'deepdive' ? 4 : 2,
  )

  // 3) real commentary quotes via BM25
  const allChunks = await loadReferenceIndex()
  const query = `${input.struggle} ${input.theme} ${verse.canonical}`
  const topK = mode === 'deepdive' ? 10 : 6
  const { selected, selectedIds } = selectTopChunks(
    allChunks,
    query,
    input.usedChunkIds ?? [],
    topK,
    0.1,
    4,
  )
  const sources = selected.map((c) => ({
    source: c.source,
    content: c.content,
    attribution: attributionFromChunk(c),
  }))
  const allowedAuthors = new Set<string>()
  for (const s of sources) {
    const a = s.attribution.toLowerCase()
    for (const known of KNOWN_AUTHORS)
      if (a.includes(known)) allowedAuthors.add(known)
  }

  // 4) weave (Sonnet) over ONLY the provided materials
  const studiesBlock = formatWordStudies(studies)
  const sourcesBlock = formatSources(sources)
  const user =
    mode === 'deepdive'
      ? deepDiveUserPrompt({
          struggle: input.struggle,
          ref: verse.canonical,
          translation,
          scriptureText: verse.text,
          studiesBlock,
          sourcesBlock,
        })
      : readingUserPrompt({
          struggle: input.struggle,
          ref: verse.canonical,
          translation,
          scriptureText: verse.text,
          studiesBlock,
          sourcesBlock,
          dayNumber: input.dayNumber,
          totalDays: input.totalDays,
          previousDaysSummary: input.previousDaysSummary,
        })

  const result = await generateWithBrain({
    system: systemPrompt(),
    messages: [{ role: 'user', content: user }],
    context: {
      task: 'devotional_day_generate',
      mode: 'auto',
      maxOutputTokens: mode === 'deepdive' ? 7000 : 2600,
      modelOverride: model,
      platformKeysEnabled: true,
      signal: input.signal,
    },
  })

  // 5) parse the loosened, delimiter-framed output (robust to quotes in prose)
  const parsed = parseDelimited(stripCodeFence(result.output))
  const body = (parsed.body ?? '').trim()
  if (!body) throw new Error('GROUNDED_WEAVE_EMPTY_BODY')

  // 6) verification (closed-system guarantee). The grounding text is every
  //    input the model was given to weave from — source chunk contents +
  //    their attributions + verbatim Scripture — so a diacritic token that
  //    legitimately came from a quote/title clears, while a fabricated one does not.
  const groundingText = [
    verse.text,
    ...sources.map((s) => `${s.attribution} ${s.content}`),
  ].join(' ')
  const verification = verify({
    body,
    scriptureText: verse.text,
    allowedAuthors,
    studies,
    groundingText,
  })

  // Length / depth / narrative-coherence gate (F-028). A thin or structurally
  // incomplete day FAILS verification so the runner re-rolls it — we never ship
  // truncated content and never pad it with anything ungrounded.
  const depthIssues = checkDepth({
    body,
    prayer: (parsed.prayer ?? '').trim(),
    mode,
    scriptureText: verse.text,
  })
  if (depthIssues.length > 0) {
    verification.issues.push(...depthIssues)
    verification.ok = false
  }

  // 6b) Inject inline WordNote markers AFTER verification ran on the clean
  //     prose. Markers reference ONLY real bank ids (resolved by Strong's
  //     number from this verse's grounded lexicon studies) and only wrap a
  //     surface word that actually appears — so nothing is fabricated and the
  //     transliteration verification (above) was never asked to clear a marker.
  const { body: markedBody, emittedIds: wordNoteIds } = injectWordNoteMarkers(
    body,
    studies,
  )

  // 7) map to DayContent (loosened: woven body + structurally-grounded metadata)
  //
  // Structured endnotes (F-027): every endnote is tied to a REAL grounded source
  // and classified by kind. Voices are attributed only when actually woven into
  // the body — a retrieved-but-unused source is never falsely cited. We endnote
  // the original (clean) body so a WordNote marker can't mask an author name.
  const endnotes: Endnote[] = buildStructuredEndnotes({
    body,
    scriptureReference: verse.canonical,
    translation,
    sources,
    studies,
  })
  const primaryStudy = studies[0] ? wordStudyToHebrewGreek(studies[0]) : null

  let tier3Extended: Tier3Extended | null = null
  if (mode === 'deepdive') {
    const crossRefs = parseList(parsed.crossrefs).map((line) => {
      const [reference, connection] = line.split('|').map((s) => s.trim())
      return { reference: reference ?? '', connection: connection ?? '' }
    })
    tier3Extended = {
      extendedEtymology: parsed.etymology ?? '',
      crossReferences: crossRefs,
      journalingPrompts: parseList(parsed.journaling),
      comprehensionQuestions: parseList(parsed.comprehension),
      characterProfile: null,
      furtherResources: sources.slice(0, 5).map((s) => ({
        type: 'commentary' as const,
        title: s.attribution,
        author: s.attribution.split(',')[0] ?? '',
        note: 'From the Euangelion reference library.',
      })),
    }
  }

  const content: DayContent = {
    title: parsed.title || verse.canonical,
    hookA: '',
    textB: markedBody,
    textBPreview: derivePreview(body),
    centerC: '',
    christConnectionBPrime: '',
    returnAPrime: '',
    scriptureReference: verse.canonical,
    scriptureText: verse.text, // verbatim from corpus
    hebrewGreekStudy: primaryStudy,
    interactiveElement: { type: 'reflection', content: '' },
    metaStoryPlacement: '',
    backwardLink: '',
    forwardLink: '',
    reflectionQuestions: parseList(parsed.reflection),
    prayer: parsed.prayer ?? '',
    endnotes,
    previousDaysSummaryForNext: parsed.summary ?? '',
    tier3Extended,
  }

  const words = body.split(/\s+/).filter(Boolean).length
  return {
    content,
    usedChunkIds: selectedIds,
    verification,
    meta: {
      mode,
      model,
      words,
      scriptureTranslation: translation,
      wordStudyCount: studies.length,
      wordNoteCount: wordNoteIds.length,
      sourceCount: sources.length,
      endnoteCount: endnotes.length,
      // Real provider usage from this call (the brain router / edge shim both
      // populate these from the Anthropic response). The runner ledgers them.
      inputTokens: result.inputTokens,
      outputTokens: result.outputTokens,
      estimatedCostUsd: result.estimatedCostUsd,
    },
  }
}
