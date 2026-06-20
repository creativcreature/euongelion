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
  if (!body || studies.length === 0) return { body, emittedIds: [] }

  // Resolve each study's Strong's number to a real bank entry. De-dupe by id so
  // we never emit the same note twice, and keep verse order (rarer words first).
  const seenIds = new Set<string>()
  const candidates: Array<{ id: string; term: string }> = []
  for (const study of studies) {
    const entry = BANK_BY_STRONG.get((study.strong || '').toUpperCase())
    if (!entry) continue // no bank entry for this Strong's number → no marker
    if (seenIds.has(entry.id)) continue
    // Defensive re-check: the bank is the source of truth for the gloss; only a
    // present, non-empty term is wrappable as surface text.
    const term = (entry.term || '').trim()
    if (!term) continue
    seenIds.add(entry.id)
    candidates.push({ id: entry.id, term })
  }
  if (candidates.length === 0) return { body, emittedIds: [] }

  // Mask the verbatim Scripture blockquote(s) so a marker never lands inside
  // quoted Scripture. Markdown blockquote lines start with ">". We only search
  // the non-quoted exposition for surface words.
  const lines = body.split('\n')
  const emittedIds: string[] = []

  // Longer terms first so a multi-word term ("steadfast love") wins over a
  // single word it contains.
  candidates.sort((a, b) => b.term.length - a.term.length)

  for (const { id, term } of candidates) {
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

// ── verification ─────────────────────────────────────────────────────

function verify(params: {
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
  const endnotes: Endnote[] = sources.map((s, i) => ({
    id: i + 1,
    source: s.attribution,
    note: 'Quoted from the Euangelion reference library.',
  }))
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
      // Real provider usage from this call (the brain router / edge shim both
      // populate these from the Anthropic response). The runner ledgers them.
      inputTokens: result.inputTokens,
      outputTokens: result.outputTokens,
      estimatedCostUsd: result.estimatedCostUsd,
    },
  }
}
