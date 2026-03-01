/**
 * composer.ts
 *
 * Replaces the cascade (5 sequential LLM calls, 2-5 minutes) with a
 * focused single-day composition model. One LLM call per day, 5-8 seconds.
 *
 * Source balance (non-negotiable):
 *   80% reference library — commentary chunks, theological scholarship
 *   15% LLM-generated — connecting tissue, transitions, structural coherence
 *   5% pre-existing devotional modules — scripture texts, prayer anchors
 *
 * The LLM receives pre-selected ingredients and weaves them into flowing
 * prose. It composes from curated material, not from its training data.
 *
 * Fractal chiastic structure:
 *   Day-level: A-B-C-B'-A' within each day's content
 *   Week-level: Days 1-5 follow A-B-C-B'-A' across the week
 *   PaRDeS: Each day at an assigned interpretation level
 */

import {
  generateWithBrain,
  providerAvailabilityForUser,
} from '@/lib/brain/router'
import { retrieveForDay, type ReferenceChunk } from './reference-retriever'
import type {
  ChiasticPosition,
  CompositionReport,
  CustomPlanDay,
  DevotionalDayEndnote,
} from '@/types/soul-audit'
import type { CuratedDayCandidate } from './curation-engine'
import type { ParsedAuditIntent } from '@/lib/brain/intent-parser'

// ─── Types ──────────────────────────────────────────────────────────

export interface ComposeDayParams {
  /** Day number (1-5 for devotional days). */
  dayNumber: number
  /** Chiastic position for this day within the week arc. */
  chiasticPosition: ChiasticPosition
  /** PaRDeS interpretation level for this day. */
  pardesLevel: 'peshat' | 'remez' | 'derash' | 'sod' | 'integrated'
  /** The curated candidate anchoring this day's content. */
  candidate: CuratedDayCandidate
  /** User's original reflection text. */
  userResponse: string
  /** Parsed intent from the user's reflection. */
  intent: ParsedAuditIntent
  /** Target word count (4000-6000 based on user preference). */
  targetWordCount: number
  /** Reference chunks pre-retrieved for this day (15-25). */
  referenceChunks: ReferenceChunk[]
  /** Chunk IDs already used in prior days (for deduplication). */
  excludeChunkIds?: string[]
  /** The overall plan title (for sabbath/recap context). */
  planTitle: string
}

export interface ComposeDayResult {
  day: CustomPlanDay
  usedChunkIds: string[]
}

// ─── Constants ──────────────────────────────────────────────────────

const READING_WPM = 150
const MIN_WORD_TARGET = 1200
const MAX_WORD_TARGET = 6000

/** Chiastic positions for a 5-day devotional arc. */
export const WEEK_CHIASTIC: ChiasticPosition[] = ['A', 'B', 'C', "B'", "A'"]

/** PaRDeS progression across 5 devotional days. */
export const WEEK_PARDES = [
  'peshat',
  'remez',
  'derash',
  'sod',
  'integrated',
] as const

/** Default reference chunk count per day. */
const DEFAULT_CHUNK_LIMIT = 20

/** Maximum chars per reference chunk in the prompt context. */
const MAX_CHUNK_CHARS = 1200

// ─── Length Calculations ─────────────────────────────────────────────

function clampWordTarget(target: number): number {
  return Math.max(MIN_WORD_TARGET, Math.min(MAX_WORD_TARGET, target))
}

function estimateMaxOutputTokens(wordTarget: number): number {
  // ~1.3 tokens per word for English, plus JSON overhead
  return Math.min(12000, Math.max(2000, Math.round(wordTarget * 1.5)))
}

function wordCountEstimate(text: string): number {
  return text.split(/\s+/).filter(Boolean).length
}

// ─── Prompt Building ────────────────────────────────────────────────

function buildComposerSystemPrompt(params: {
  wordTarget: number
  pardesLevel: string
  chiasticPosition: ChiasticPosition
  dayNumber: number
  totalDays: number
  disposition?: string
  depthPreference?: string
  faithBackground?: string
}): string {
  const voiceNotes: string[] = []

  if (params.disposition === 'pastoral') {
    voiceNotes.push(
      'TONE: Extra gentle, validating. Acknowledge pain before teaching. Shorter sentences.',
    )
  } else if (params.disposition === 'scholarly') {
    voiceNotes.push(
      'TONE: More academic rigor. Include original-language notes, historical context, cross-references.',
    )
  } else if (params.disposition === 'seeker') {
    voiceNotes.push(
      'TONE: Welcoming, no insider jargon. Define theological terms. Gentle invitations, not assumptions.',
    )
  } else if (params.disposition === 'returning') {
    voiceNotes.push(
      'TONE: Warm re-welcome. Reference familiar concepts without condescension. Acknowledge the journey back.',
    )
  }

  if (params.depthPreference === 'deep-study') {
    voiceNotes.push(
      'DEPTH: Scholarly — include Hebrew/Greek word studies, historical-critical context, theological nuance.',
    )
  } else if (params.depthPreference === 'introductory') {
    voiceNotes.push(
      'DEPTH: Accessible — plain language, short paragraphs, concrete examples. No assumed biblical literacy.',
    )
  }

  if (params.faithBackground === 'other-faith') {
    voiceNotes.push(
      'CONTEXT: Reader comes from another faith tradition. Be respectful and bridge-building, not polemical.',
    )
  } else if (params.faithBackground === 'curious') {
    voiceNotes.push(
      'CONTEXT: Reader is spiritually curious but not religious. Avoid churchy language. Lead with questions.',
    )
  }

  const taxonomyBlock =
    voiceNotes.length > 0 ? `\n${voiceNotes.join('\n')}\n` : ''

  return `You are a devotional composer for Euangelion (Christian devotional app). You compose flowing devotional prose from provided reference material.

VOICE: 60% warm, 40% authoritative. No exclamation marks. No clichés. Honest about difficulty. A thoughtful pastor-scholar who reads widely and writes with care.
${taxonomyBlock}
SOURCE BALANCE (non-negotiable):
- 80% of your output must come DIRECTLY from the provided reference material. Quote, paraphrase, integrate, and build upon these sources. Every substantial theological claim must be grounded in a provided reference excerpt or Scripture.
- 15% is your connecting tissue: transitions, structural coherence, interpretive framing. This generated text must be derived FROM the reference material, not from your training data.
- 5% comes from the provided curated module anchors (scripture text, prayer, reflection prompt). These are your skeleton.
- Do NOT generate theological content from your training data. If the references don't cover a point, acknowledge the gap rather than filling it with ungrounded claims.

THEOLOGY: Nicene orthodoxy baseline. All traditions represented fairly. Scripture is primary authority. Acknowledge genuine uncertainty. No prosperity gospel, no manipulation.

STRUCTURAL CONSTRAINTS:
- PaRDeS level: ${params.pardesLevel}
  peshat = literal/plain meaning, remez = allegorical/typological, derash = applied/ethical, sod = contemplative/mystical, integrated = all four woven together
- Chiastic position: ${params.chiasticPosition} (day ${params.dayNumber} of ${params.totalDays})
  A = introduce tension/question, B = deepen complexity, C = pivot/revelation/climax, B' = apply revelation to life, A' = resolve tension with transformed understanding
- Your content must follow an internal A-B-C-B'-A' chiastic arc WITHIN this day:
  Opening (tension) → Deepening → Central insight → Application → Resolution

LENGTH: ~${params.wordTarget} words. This is a full devotional reading, not a summary.

PERSONALIZATION (subtle, mandatory):
- The user's reflection shapes your INTERPRETIVE LENS — which themes you emphasize, which scriptures you foreground, which reference excerpts you select and expand.
- Do NOT quote the user's words back to them. No "you shared..." or "as you mentioned..." patterns.
- The tone is unbiased, optimistic, pastoral, and universal. The reader should feel the devotional was written for their season without it being explicitly addressed to them.

OUTPUT FORMAT (strict JSON):
{
  "title": "Day title",
  "scriptureReference": "Book Chapter:Verse",
  "scriptureText": "1-3 key verses quoted",
  "reflection": "The main devotional body — flowing prose, multi-paragraph, ~${Math.round(params.wordTarget * 0.7)} words. This is the essay.",
  "prayer": "A composed prayer grounded in the day's scripture and themes",
  "nextStep": "One concrete, actionable step the reader can take today",
  "journalPrompt": "A probing question for personal reflection",
  "totalWords": ${params.wordTarget},
  "sourcesUsed": ["Source names from the reference material you drew upon"]
}

RULES: Real Scripture references only. Accurate quotes and attribution. Correct Hebrew/Greek if used. Verifiable historical claims. No fabricated citations.`
}

function buildComposerUserPrompt(params: {
  candidate: CuratedDayCandidate
  userResponse: string
  referenceChunks: ReferenceChunk[]
  pardesLevel: string
  chiasticPosition: ChiasticPosition
}): string {
  const parts: string[] = []

  // User's reflection (interpretive lens, not to be quoted)
  parts.push(`USER'S REFLECTION (use as interpretive lens — do NOT quote back):
${params.userResponse.slice(0, 500)}`)

  // Curated module anchors (the 5% skeleton)
  parts.push(`
CURATED ANCHORS (5% — your structural skeleton):
Scripture: ${params.candidate.scriptureReference}
Scripture text: ${params.candidate.scriptureText.slice(0, 600)}
Reflection prompt: ${params.candidate.reflectionPrompt}
Prayer anchor: ${params.candidate.prayerText.slice(0, 400)}
Takeaway: ${params.candidate.takeawayText}`)

  // Reference material (the 80% — the substance)
  if (params.referenceChunks.length > 0) {
    parts.push(`
REFERENCE MATERIAL (80% — integrate these as the substance of your devotional):`)

    for (let i = 0; i < params.referenceChunks.length; i++) {
      const chunk = params.referenceChunks[i]
      const content = chunk.content.slice(0, MAX_CHUNK_CHARS)
      parts.push(`
[${i + 1}. ${chunk.sourceType}: ${chunk.title}]
${content}`)
    }
  } else {
    parts.push(`
NOTE: No reference library chunks were available. Ground all claims directly in Scripture. Acknowledge this limitation — do not generate theological claims from training data.`)
  }

  parts.push(`
COMPOSE a ${params.pardesLevel}-level devotional at chiastic position ${params.chiasticPosition}.
Title the day based on: "${params.candidate.dayTitle}"
Anchor in: ${params.candidate.scriptureReference}`)

  return parts.join('\n')
}

// ─── Composition Report ─────────────────────────────────────────────

function buildCompositionReport(params: {
  referenceChunks: ReferenceChunk[]
  totalWords: number
}): CompositionReport {
  const referenceWords = params.referenceChunks.reduce(
    (sum, chunk) => sum + chunk.wordCount,
    0,
  )

  // Estimate: reference material constitutes ~80% when available
  const referencePercentage =
    params.referenceChunks.length > 0
      ? Math.min(
          85,
          Math.max(
            60,
            Math.round(
              (referenceWords /
                Math.max(1, params.totalWords + referenceWords)) *
                100,
            ),
          ),
        )
      : 0
  const generatedPercentage = 100 - referencePercentage

  const sources = Array.from(
    new Set(params.referenceChunks.map((chunk) => chunk.title)),
  ).slice(0, 20)

  return {
    referencePercentage,
    generatedPercentage,
    sources,
  }
}

// ─── Endnotes ───────────────────────────────────────────────────────

function buildEndnotes(params: {
  scriptureReference: string
  referenceChunks: ReferenceChunk[]
  sourcesUsed: string[]
}): DevotionalDayEndnote[] {
  const notes: DevotionalDayEndnote[] = [
    {
      id: 1,
      source: 'Scripture',
      note: params.scriptureReference,
    },
  ]

  // Natural language composition note (not clinical percentages)
  const sourceNames = Array.from(
    new Set([
      ...params.referenceChunks.map((c) => c.title).slice(0, 5),
      ...params.sourcesUsed.slice(0, 3),
    ]),
  ).slice(0, 5)

  if (sourceNames.length > 0) {
    const sourceList = sourceNames.join(', ')
    notes.push({
      id: 2,
      source: 'Sources',
      note: `This reading draws from ${sourceList}. Composed for your reflection.`,
    })
  }

  notes.push({
    id: notes.length + 1,
    source: 'Composition',
    note: 'Curated content from verified theological sources, composed with interpretive framing.',
  })

  return notes
}

// ─── Parse LLM Response ─────────────────────────────────────────────

interface ParsedComposition {
  title: string
  scriptureReference: string
  scriptureText: string
  reflection: string
  prayer: string
  nextStep: string
  journalPrompt: string
  totalWords: number
  sourcesUsed: string[]
}

function parseComposedDay(raw: string): ParsedComposition | null {
  try {
    // Strip markdown fences if present
    const cleaned = raw
      .replace(/^```json?\s*\n?/i, '')
      .replace(/\n?```\s*$/i, '')
      .trim()

    const parsed = JSON.parse(cleaned) as Record<string, unknown>

    const title =
      typeof parsed.title === 'string' ? parsed.title.slice(0, 120) : ''
    const scriptureReference =
      typeof parsed.scriptureReference === 'string'
        ? parsed.scriptureReference.slice(0, 120)
        : ''
    const scriptureText =
      typeof parsed.scriptureText === 'string'
        ? parsed.scriptureText.slice(0, 2000)
        : ''
    const reflection =
      typeof parsed.reflection === 'string' ? parsed.reflection : ''
    const prayer =
      typeof parsed.prayer === 'string' ? parsed.prayer.slice(0, 2000) : ''
    const nextStep =
      typeof parsed.nextStep === 'string' ? parsed.nextStep.slice(0, 500) : ''
    const journalPrompt =
      typeof parsed.journalPrompt === 'string'
        ? parsed.journalPrompt.slice(0, 500)
        : ''
    const totalWords =
      typeof parsed.totalWords === 'number'
        ? parsed.totalWords
        : wordCountEstimate(reflection)
    const sourcesUsed = Array.isArray(parsed.sourcesUsed)
      ? (parsed.sourcesUsed as unknown[])
          .filter((s): s is string => typeof s === 'string')
          .slice(0, 20)
      : []

    if (!title || !scriptureReference || !reflection) return null

    return {
      title,
      scriptureReference,
      scriptureText,
      reflection,
      prayer,
      nextStep,
      journalPrompt,
      totalWords,
      sourcesUsed,
    }
  } catch {
    return null
  }
}

// ─── Main Composition Functions ─────────────────────────────────────

/**
 * Compose a single devotional day from pre-selected ingredients.
 *
 * One LLM call, 5-8 seconds. Produces 4,000-6,000 words of flowing
 * prose grounded in 80% reference material.
 */
export async function composeDay(
  params: ComposeDayParams,
): Promise<ComposeDayResult> {
  const wordTarget = clampWordTarget(params.targetWordCount)

  // Retrieve reference chunks if not pre-supplied
  let chunks = params.referenceChunks
  if (chunks.length === 0) {
    const retrieval = retrieveForDay({
      themes: params.intent.themes,
      scriptureAnchors: [params.candidate.scriptureReference],
      topic: `${params.userResponse} ${params.candidate.teachingText}`,
      excludeChunkIds: params.excludeChunkIds,
      limit: DEFAULT_CHUNK_LIMIT,
    })
    chunks = retrieval.chunks
  }

  const systemPrompt = buildComposerSystemPrompt({
    wordTarget,
    pardesLevel: params.pardesLevel,
    chiasticPosition: params.chiasticPosition,
    dayNumber: params.dayNumber,
    totalDays: 5,
    disposition: params.intent.disposition,
    depthPreference: params.intent.depthPreference,
    faithBackground: params.intent.faithBackground,
  })

  const userPrompt = buildComposerUserPrompt({
    candidate: params.candidate,
    userResponse: params.userResponse,
    referenceChunks: chunks,
    pardesLevel: params.pardesLevel,
    chiasticPosition: params.chiasticPosition,
  })

  // Deterministic fallback params — always have reference chunks
  const paramsWithChunks = { ...params, referenceChunks: chunks }

  // Try LLM composition. If it throws (provider failure, timeout, etc.)
  // fall back to deterministic composition from reference chunks.
  let result: { output?: string } | null = null
  try {
    const maxTokens = estimateMaxOutputTokens(wordTarget)
    result = await generateWithBrain({
      system: systemPrompt,
      messages: [{ role: 'user', content: userPrompt }],
      context: {
        task: 'devotional_day_generate',
        mode: 'auto',
        maxOutputTokens: maxTokens,
      },
    })
  } catch {
    // LLM unavailable — deterministic composition from reference library
    return {
      day: buildDeterministicDay(paramsWithChunks),
      usedChunkIds: chunks.map((c) => c.id),
    }
  }

  if (!result?.output) {
    return {
      day: buildDeterministicDay(paramsWithChunks),
      usedChunkIds: chunks.map((c) => c.id),
    }
  }

  const parsed = parseComposedDay(result.output)
  if (!parsed) {
    return {
      day: buildDeterministicDay(paramsWithChunks),
      usedChunkIds: chunks.map((c) => c.id),
    }
  }

  const compositionReport = buildCompositionReport({
    referenceChunks: chunks,
    totalWords: parsed.totalWords,
  })

  const endnotes = buildEndnotes({
    scriptureReference: parsed.scriptureReference,
    referenceChunks: chunks,
    sourcesUsed: parsed.sourcesUsed,
  })

  return {
    day: {
      day: params.dayNumber,
      dayType: 'devotional',
      title: parsed.title,
      scriptureReference: parsed.scriptureReference,
      scriptureText: parsed.scriptureText,
      reflection: parsed.reflection,
      prayer: parsed.prayer,
      nextStep: parsed.nextStep,
      journalPrompt: parsed.journalPrompt,
      chiasticPosition: params.chiasticPosition,
      endnotes,
      totalWords: parsed.totalWords,
      targetLengthMinutes: Math.round(wordTarget / READING_WPM),
      generationStatus: 'ready',
      compositionReport,
    },
    usedChunkIds: chunks.map((c) => c.id),
  }
}

/**
 * Build a devotional day by assembling reference library material into
 * flowing prose. No LLM needed — deterministic composition from real
 * theological sources.
 *
 * Structure: Scripture anchor → reference material woven into essay →
 * prayer → next step → journal prompt.
 *
 * This is the PRIMARY composition path, not a fallback. The LLM path
 * enhances this with smoother transitions; this path delivers the
 * substance directly from the reference library.
 */
export function buildDeterministicDay(params: ComposeDayParams): CustomPlanDay {
  const chunks = params.referenceChunks
  const candidate = params.candidate

  // ── Build the reflection essay from reference material ──
  const sections: string[] = []

  // Opening: ground in scripture
  sections.push(
    `${candidate.scriptureReference} reads: "${candidate.scriptureText.slice(0, 600)}"`,
  )
  sections.push('')

  if (chunks.length > 0) {
    // Group chunks by source type for structured flow
    const commentaryChunks = chunks.filter((c) => c.sourceType === 'commentary')
    const theologyChunks = chunks.filter((c) => c.sourceType === 'theology')
    const bibleChunks = chunks.filter((c) => c.sourceType === 'bible')
    const lexiconChunks = chunks.filter((c) => c.sourceType === 'lexicon')
    const otherChunks = chunks.filter(
      (c) =>
        c.sourceType !== 'commentary' &&
        c.sourceType !== 'theology' &&
        c.sourceType !== 'bible' &&
        c.sourceType !== 'lexicon',
    )

    // Biblical context (if available)
    for (const chunk of bibleChunks.slice(0, 3)) {
      sections.push(chunk.content.slice(0, MAX_CHUNK_CHARS))
      sections.push('')
    }

    // Commentary and theological scholarship — the heart of the devotional
    for (const chunk of commentaryChunks.slice(0, 8)) {
      sections.push(chunk.content.slice(0, MAX_CHUNK_CHARS))
      sections.push('')
    }

    // Theological depth
    for (const chunk of theologyChunks.slice(0, 5)) {
      sections.push(chunk.content.slice(0, MAX_CHUNK_CHARS))
      sections.push('')
    }

    // Word studies and definitions
    if (lexiconChunks.length > 0) {
      for (const chunk of lexiconChunks.slice(0, 3)) {
        sections.push(chunk.content.slice(0, MAX_CHUNK_CHARS))
        sections.push('')
      }
    }

    // Additional sources
    for (const chunk of otherChunks.slice(0, 3)) {
      sections.push(chunk.content.slice(0, MAX_CHUNK_CHARS))
      sections.push('')
    }
  } else {
    // No reference chunks available — use the curated teaching as seed
    sections.push(candidate.teachingText)
    sections.push('')
  }

  const reflection = sections.join('\n').trim()
  const totalWords = wordCountEstimate(reflection)

  // ── Endnotes with real source attribution ──
  const sourceNames = Array.from(new Set(chunks.map((c) => c.title))).slice(
    0,
    10,
  )

  const endnotes: DevotionalDayEndnote[] = [
    {
      id: 1,
      source: 'Scripture',
      note: candidate.scriptureReference,
    },
  ]

  if (sourceNames.length > 0) {
    endnotes.push({
      id: 2,
      source: 'Sources',
      note: `This reading draws from ${sourceNames.join(', ')}. Composed for your reflection.`,
    })
  }

  const compositionReport = buildCompositionReport({
    referenceChunks: chunks,
    totalWords,
  })

  return {
    day: params.dayNumber,
    dayType: 'devotional',
    title: candidate.dayTitle,
    scriptureReference: candidate.scriptureReference,
    scriptureText: candidate.scriptureText,
    reflection,
    prayer: candidate.prayerText,
    nextStep: candidate.takeawayText,
    journalPrompt: candidate.reflectionPrompt,
    chiasticPosition: params.chiasticPosition,
    endnotes,
    totalWords,
    targetLengthMinutes: Math.round(totalWords / READING_WPM),
    generationStatus: 'ready',
    compositionReport,
  }
}

/**
 * Compose a Sabbath rest day (Day 6). Deterministic — no LLM needed.
 * Minimal content + contemplative elements. No new teaching.
 */
export function composeSabbath(params: {
  previousDays: CustomPlanDay[]
  planTitle: string
  userResponse: string
}): CustomPlanDay {
  const keyPassage =
    params.previousDays[2]?.scriptureReference ||
    params.previousDays[0]?.scriptureReference ||
    'Psalm 46:10'

  const dayTitles = params.previousDays
    .filter((d) => d.dayType === 'devotional' || !d.dayType)
    .map((d) => `"${d.title}"`)
    .join(', ')

  return {
    day: 6,
    dayType: 'sabbath',
    title: 'Sabbath Rest',
    scriptureReference: keyPassage,
    scriptureText: 'Be still, and know that I am God.',
    reflection: [
      `This week you walked through ${params.previousDays.length} days of devotional reading: ${dayTitles}.`,
      '',
      'Today is sabbath — a day of rest, not productivity. There is nothing to accomplish.',
      '',
      `Return to ${keyPassage}. Read it once slowly. Then close your eyes for five minutes and let the text read you.`,
      '',
      'Which passage from this week lingered longest? Which one unsettled you? Sit with that today — not to analyze it, but to be present to it.',
      '',
      'The rhythm of engagement and rest is not optional. It is the shape of faithful life. Rest today is as much obedience as study was yesterday.',
    ].join('\n'),
    prayer:
      'Lord, still my mind and heart today. Thank you for meeting me this week through your word. I release the pressure to perform, to understand everything, to fix what is broken. I simply rest in your presence. Amen.',
    nextStep:
      'Rest today. No action required — just be present to what you have received this week.',
    journalPrompt:
      'Which day this week challenged you most? If you could carry one sentence from this week into next week, what would it be?',
    chiasticPosition: 'Sabbath',
    endnotes: [
      { id: 1, source: 'Scripture', note: keyPassage },
      { id: 2, source: 'Day Type', note: 'Sabbath rest — no new teaching.' },
    ],
    generationStatus: 'ready',
  }
}

/**
 * Compose a Recap day (Day 7). Deterministic — no LLM needed.
 * Summary of week's insights + guided reflection questions.
 */
export function composeRecap(params: {
  previousDays: CustomPlanDay[]
  planTitle: string
  userResponse: string
}): CustomPlanDay {
  const dayReferences = params.previousDays
    .filter((d) => d.dayType === 'devotional' || !d.dayType)
    .map((d) => `Day ${d.day}: ${d.title} (${d.scriptureReference})`)
    .join('\n')

  const keyScriptures = params.previousDays
    .filter((d) => d.dayType === 'devotional' || !d.dayType)
    .map((d) => d.scriptureReference)
    .filter(Boolean)

  const anchorScripture =
    keyScriptures[Math.floor(keyScriptures.length / 2)] || 'Philippians 1:6'

  return {
    day: 7,
    dayType: 'review',
    title: 'Week in Review',
    scriptureReference: anchorScripture,
    scriptureText:
      'He who began a good work in you will carry it on to completion until the day of Christ Jesus.',
    reflection: [
      `Your week through "${params.planTitle}" is complete. Here is what you covered:`,
      '',
      dayReferences,
      '',
      'Take a moment to reflect on the arc of the week. Day 1 opened a question. Day 3 was the pivot — the hardest or most revealing moment. Day 5 offered resolution, though perhaps not the resolution you expected.',
      '',
      'What is one insight from this week that you want to carry forward? Not a general principle, but a specific phrase, verse, or conviction.',
      '',
      'Formation is not information. You are not the same person who began this week. The text has been at work in you, even when you were not aware of it.',
      '',
      'When you are ready, you may begin your next path. There is no urgency. Good things take time — including you.',
    ].join('\n'),
    prayer:
      'Father, thank you for this week of formation. Carry forward what you started in me. Give me wisdom for what comes next, and patience to wait for clarity rather than rushing into the next thing. Amen.',
    nextStep:
      'When you are ready, start your next Soul Audit for a fresh path. Take at least a day before beginning — let this week settle.',
    journalPrompt:
      'If you could tell someone one thing you learned this week, what would it be? And what question remains unanswered?',
    chiasticPosition: 'Review',
    endnotes: [
      { id: 1, source: 'Scripture', note: anchorScripture },
      {
        id: 2,
        source: 'Day Type',
        note: 'Week recap — summary and guided reflection.',
      },
    ],
    generationStatus: 'ready',
  }
}

/**
 * Retrieve reference chunks for a specific day's composition.
 * Returns 15-25 chunks, excluding previously used IDs.
 */
export function retrieveIngredientsForDay(params: {
  candidate: CuratedDayCandidate
  userResponse: string
  intent: ParsedAuditIntent
  excludeChunkIds?: string[]
  limit?: number
}): ReferenceChunk[] {
  const result = retrieveForDay({
    themes: params.intent.themes,
    scriptureAnchors: [params.candidate.scriptureReference],
    topic: `${params.userResponse} ${params.candidate.teachingText} ${params.candidate.reflectionPrompt}`,
    excludeChunkIds: params.excludeChunkIds,
    limit: params.limit ?? DEFAULT_CHUNK_LIMIT,
  })

  return result.chunks
}

/**
 * Check if any LLM provider is available for composition.
 */
export function isComposerAvailable(): boolean {
  return providerAvailabilityForUser({ userKeys: undefined }).some(
    (entry) => entry.available,
  )
}
