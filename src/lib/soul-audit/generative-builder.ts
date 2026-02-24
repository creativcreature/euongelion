/**
 * generative-builder.ts
 *
 * 80/20 RAG composition engine for fully generative devotionals.
 * 80% content from reference library (commentaries, lexicons, theology)
 * 20% LLM-generated bridging, personalization, transitions.
 *
 * Produces CustomPlanDay objects for each day of a 7-day plan:
 *   Days 1-5: Devotional days with chiastic arc + PaRDeS interpretation
 *   Day 6: Sabbath rest and review
 *   Day 7: Next-week discernment
 *
 * Module selection is contextual — the LLM picks 3-10 modules from the
 * 12-type palette based on the day's topic, chiastic position, and length.
 */

import {
  generateWithBrain,
  providerAvailabilityForUser,
} from '@/lib/brain/router'
import { brainFlags } from '@/lib/brain/flags'
import { retrieveForDay } from './reference-retriever'
import type {
  ChiasticPosition7,
  CompositionReport,
  CustomPlanDay,
  DevotionalDayEndnote,
  DevotionalModule,
  DevotionalModuleType,
  PlanDayOutline,
  PlanOutline,
} from '@/types/soul-audit'

// ─── Types ──────────────────────────────────────────────────────────

export interface GenerativeDayParams {
  dayOutline: PlanDayOutline
  planOutline: PlanOutline
  userResponse: string
  devotionalLengthMinutes: number
  previousDaysModules?: DevotionalModuleType[][]
  excludeChunkIds?: string[]
}

export interface GenerativeDayResult {
  day: CustomPlanDay
  usedChunkIds: string[]
}

// ─── Constants ──────────────────────────────────────────────────────

const READING_WPM = 150
const MIN_MODULES = 3
const MAX_MODULES = 10

const VALID_MODULES = new Set<DevotionalModuleType>([
  'scripture',
  'teaching',
  'vocab',
  'story',
  'insight',
  'bridge',
  'reflection',
  'comprehension',
  'takeaway',
  'prayer',
  'profile',
  'resource',
])

// ─── Length Calculations ─────────────────────────────────────────────

function calculateWordTarget(minutes: number): number {
  const clamped = Math.max(5, Math.min(60, minutes))
  return clamped * READING_WPM
}

function calculateModuleBudget(wordTarget: number): number {
  return Math.min(
    MAX_MODULES,
    Math.max(MIN_MODULES, Math.floor(wordTarget / 750)),
  )
}

function calculateChunkCount(minutes: number): number {
  // Token optimization: fewer chunks = less input cost.
  // Diminishing returns past 4-5 chunks — the top-scored chunks
  // carry 80%+ of relevant reference material.
  if (minutes <= 7) return 3
  if (minutes <= 15) return 4
  if (minutes <= 30) return 5
  return 6
}

function estimateMaxOutputTokens(wordTarget: number): number {
  // ~1.3 tokens per word for English, plus JSON overhead
  return Math.min(8000, Math.max(1500, Math.round(wordTarget * 1.5)))
}

// ─── System Prompts ─────────────────────────────────────────────────

function buildDevotionalSystemPrompt(params: {
  wordTarget: number
  moduleBudget: number
  pardesLevel: string
  chiasticPosition: ChiasticPosition7
  previousModuleSets: DevotionalModuleType[][]
}): string {
  const previousModulesNote =
    params.previousModuleSets.length > 0
      ? `\nPrevious days' modules (vary yours): ${params.previousModuleSets.map((set, i) => `D${i + 1}:[${set.join(',')}]`).join(' ')}`
      : ''

  // Compressed prompt: ~40% fewer tokens than original while preserving all constraints.
  return `You are a devotional writer for Euangelion (Christian devotional app, ancient wisdom).

VOICE: 60% warm, 40% authoritative. No exclamation marks. No clichés. Honest about difficulty. Thoughtful pastor who reads widely.

COMPOSITION: 80% from provided reference material (quote, paraphrase, build upon). 20% generated bridges/personalization. Every claim grounded in Scripture or references.

THEOLOGY: Nicene orthodoxy baseline. All traditions represented. Scripture primary. Acknowledge uncertainty.

PaRDeS: ${params.pardesLevel} (peshat=literal, remez=allegory, derash=application, sod=contemplative, integrated=all four)

CHIASTIC: ${params.chiasticPosition} (A=tension, B=complexity, C=pivot/revelation, B'=application, A'=resolution)

LENGTH: ~${params.wordTarget} words. MODULES: Pick ${params.moduleBudget} from: scripture,teaching,vocab,story,insight,bridge,reflection,comprehension,takeaway,prayer,profile,resource
Must include 'scripture' + 'reflection' or 'prayer'. Vary across week.${previousModulesNote}

RULES: Real Scripture refs only. Accurate quotes/attribution. Correct Hebrew/Greek. Verifiable history.

STRICT JSON only:
{"title":string,"scriptureReference":string,"scriptureText":"1-3 verses","reflection":"multi-paragraph","prayer":string,"nextStep":string,"journalPrompt":string,"modules":[{"type":string,"heading":string,"content":{}}],"totalWords":number,"sourcesUsed":[string]}`
}

function buildSabbathSystemPrompt(wordTarget: number): string {
  return `You are a devotional writer for Euangelion. Write a Sabbath rest and review day.

This is Day 6 of a 7-day plan. NO new teaching. Instead:
- Summarize key insights from Days 1-5
- Guided review questions tied to the user's original reflection
- Rest practices and contemplative exercises
- Lighter modules: scripture callback, reflection, prayer

VOICE: Gentle, restful, inviting stillness. No urgency.
TARGET LENGTH: ~${wordTarget} words

OUTPUT FORMAT:
Return STRICT JSON only:
{
  "title": "<sabbath day title>",
  "scriptureReference": "<callback to a key passage from the week>",
  "scriptureText": "<key verse text>",
  "reflection": "<sabbath reflection summarizing the week>",
  "prayer": "<sabbath prayer>",
  "nextStep": "<rest practice suggestion>",
  "journalPrompt": "<weekly review journal prompt>",
  "modules": [
    { "type": "<module_type>", "heading": "<heading>", "content": { <fields> } }
  ],
  "totalWords": <word count>
}`
}

function buildReviewSystemPrompt(wordTarget: number): string {
  return `You are a devotional writer for Euangelion. Write a Week Review and Discernment day.

This is Day 7 of a 7-day plan. Purpose:
- Brief week summary and integration
- 2-3 suggestions for next week (new audit, prefab series, or continue theme)
- Forward-looking discernment prompt

VOICE: Encouraging, forward-looking, empowering.
TARGET LENGTH: ~${wordTarget} words

OUTPUT FORMAT:
Return STRICT JSON only:
{
  "title": "<review day title>",
  "scriptureReference": "<integrating Scripture>",
  "scriptureText": "<verse text>",
  "reflection": "<week integration reflection>",
  "prayer": "<closing prayer for the week>",
  "nextStep": "<next week suggestion>",
  "journalPrompt": "<discernment prompt for what's next>",
  "modules": [
    { "type": "<module_type>", "heading": "<heading>", "content": { <fields> } }
  ],
  "totalWords": <word count>
}`
}

// ─── Response Parsing ───────────────────────────────────────────────

interface ParsedDayResponse {
  title: string
  scriptureReference: string
  scriptureText: string
  reflection: string
  prayer: string
  nextStep: string
  journalPrompt: string
  modules: DevotionalModule[]
  totalWords: number
  sourcesUsed: string[]
}

function parseGeneratedDay(raw: string): ParsedDayResponse | null {
  const trimmed = raw.trim()
  if (!trimmed) return null

  const cleaned = trimmed
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/```$/i, '')
    .trim()

  try {
    const parsed = JSON.parse(cleaned) as Record<string, unknown>
    if (typeof parsed !== 'object' || !parsed) return null

    const modules: DevotionalModule[] = []
    if (Array.isArray(parsed.modules)) {
      for (const mod of parsed.modules) {
        if (typeof mod !== 'object' || !mod) continue
        const m = mod as Record<string, unknown>
        const type = String(m.type || '').toLowerCase()
        if (!VALID_MODULES.has(type as DevotionalModuleType)) continue
        modules.push({
          type: type as DevotionalModuleType,
          heading: String(m.heading || type).slice(0, 120),
          content: (typeof m.content === 'object' && m.content
            ? m.content
            : { text: String(m.content || '') }) as Record<string, unknown>,
        })
      }
    }

    // Ensure scripture + reflection/prayer present
    if (!modules.some((m) => m.type === 'scripture')) {
      modules.unshift({
        type: 'scripture',
        heading: "TODAY'S READING",
        content: {
          passage: String(parsed.scriptureText || ''),
          reference: String(parsed.scriptureReference || ''),
        },
      })
    }
    if (!modules.some((m) => m.type === 'reflection' || m.type === 'prayer')) {
      modules.push({
        type: 'reflection',
        heading: 'REFLECT',
        content: { prompt: String(parsed.journalPrompt || '') },
      })
    }

    return {
      title: String(parsed.title || 'Devotional').slice(0, 120),
      scriptureReference: String(
        parsed.scriptureReference || 'Scripture',
      ).slice(0, 120),
      scriptureText: String(parsed.scriptureText || '').slice(0, 2000),
      reflection: String(parsed.reflection || '').slice(0, 20000),
      prayer: String(parsed.prayer || '').slice(0, 3000),
      nextStep: String(parsed.nextStep || '').slice(0, 1000),
      journalPrompt: String(parsed.journalPrompt || '').slice(0, 1000),
      modules: modules.slice(0, MAX_MODULES),
      totalWords:
        typeof parsed.totalWords === 'number'
          ? parsed.totalWords
          : estimateWordCount(String(parsed.reflection || '')),
      sourcesUsed: Array.isArray(parsed.sourcesUsed)
        ? (parsed.sourcesUsed as unknown[]).map((s) => String(s)).slice(0, 20)
        : [],
    }
  } catch {
    return null
  }
}

function estimateWordCount(text: string): number {
  return text.split(/\s+/).filter((w) => w.length > 0).length
}

// ─── Endnote + Composition Report Builders ──────────────────────────

function buildEndnotes(params: {
  dayOutline: PlanDayOutline
  sourcesUsed: string[]
  chunkSources: string[]
}): DevotionalDayEndnote[] {
  const notes: DevotionalDayEndnote[] = [
    {
      id: 1,
      source: 'Scripture',
      note: params.dayOutline.scriptureReference,
    },
    {
      id: 2,
      source: 'Composition Policy',
      note: 'Reference library 80% / generative bridging 20%.',
    },
  ]

  const seen = new Set<string>()
  for (const source of [...params.chunkSources, ...params.sourcesUsed]) {
    if (seen.has(source)) continue
    seen.add(source)
    notes.push({
      id: notes.length + 1,
      source: 'Reference',
      note: source.slice(0, 200),
    })
  }

  return notes
}

function buildCompositionReport(params: {
  referenceChunkWords: number
  totalWords: number
  sources: string[]
}): CompositionReport {
  const refPct =
    params.totalWords > 0
      ? Math.round((params.referenceChunkWords / params.totalWords) * 100)
      : 0
  const clampedRefPct = Math.min(100, Math.max(0, refPct))

  return {
    referencePercentage: clampedRefPct,
    generatedPercentage: 100 - clampedRefPct,
    sources: params.sources.slice(0, 20),
  }
}

// ─── Core Generation Functions ──────────────────────────────────────

/**
 * Generate a single devotional day (Days 1-5) using 80/20 RAG composition.
 *
 * 1. Retrieve reference chunks for this day's topic/scripture
 * 2. Call LLM with reference chunks as grounding context
 * 3. Parse output into CustomPlanDay with modules + endnotes
 * 4. Calculate composition report
 */
export async function generateDevotionalDay(
  params: GenerativeDayParams,
): Promise<GenerativeDayResult> {
  const wordTarget = calculateWordTarget(params.devotionalLengthMinutes)
  const moduleBudget = calculateModuleBudget(wordTarget)
  const chunkCount = calculateChunkCount(params.devotionalLengthMinutes)
  const maxTokens = estimateMaxOutputTokens(wordTarget)

  // Retrieve reference chunks
  const retrieved = retrieveForDay({
    themes: [
      params.dayOutline.topicFocus,
      ...params.planOutline.referenceSeeds,
    ].filter(Boolean),
    scriptureAnchors: [params.dayOutline.scriptureReference],
    topic: `${params.dayOutline.title} ${params.dayOutline.topicFocus}`,
    excludeChunkIds: params.excludeChunkIds,
    limit: chunkCount,
  })

  // Token optimization: truncate chunks to maxChunkCharsInContext (default 1200).
  // Top-scored chunks already carry the most relevant content in their opening.
  const chunkCharLimit = brainFlags.maxChunkCharsInContext
  const referenceContext =
    retrieved.chunks.length > 0
      ? retrieved.chunks
          .map(
            (chunk) =>
              `[${chunk.sourceType}: ${chunk.source}]\n${chunk.content.slice(0, chunkCharLimit)}`,
          )
          .join('\n\n---\n\n')
      : 'No reference library material available. Generate from theological knowledge while maintaining accuracy.'

  const referenceChunkWords = retrieved.chunks.reduce(
    (sum, c) => sum + c.wordCount,
    0,
  )

  const systemPrompt = buildDevotionalSystemPrompt({
    wordTarget,
    moduleBudget,
    pardesLevel: params.dayOutline.pardesLevel,
    chiasticPosition: params.dayOutline.chiasticPosition,
    previousModuleSets: params.previousDaysModules || [],
  })

  const userMessage = [
    `Day ${params.dayOutline.day}: "${params.dayOutline.title}"`,
    `Scripture: ${params.dayOutline.scriptureReference}`,
    `Topic focus: ${params.dayOutline.topicFocus}`,
    `Plan angle: ${params.planOutline.angle}`,
    `Plan title: ${params.planOutline.title}`,
    `User's reflection: "${params.userResponse}"`,
    '',
    `REFERENCE MATERIAL (use as primary source — quote, paraphrase, build upon):`,
    referenceContext,
  ].join('\n')

  const generation = await generateWithBrain({
    system: systemPrompt,
    messages: [{ role: 'user', content: userMessage }],
    context: {
      task: 'devotional_day_generate',
      mode: 'auto',
      maxOutputTokens: maxTokens,
    },
  })

  const parsed = parseGeneratedDay(generation.output)
  if (!parsed) {
    throw new Error(
      `Failed to parse generated devotional for day ${params.dayOutline.day}`,
    )
  }

  const chunkSources = retrieved.chunks.map((c) => c.source)
  const usedChunkIds = retrieved.chunks.map((c) => c.id)

  const day: CustomPlanDay = {
    day: params.dayOutline.day,
    dayType: 'devotional',
    title: parsed.title,
    scriptureReference: parsed.scriptureReference,
    scriptureText: parsed.scriptureText,
    reflection: parsed.reflection,
    prayer: parsed.prayer,
    nextStep: parsed.nextStep,
    journalPrompt: parsed.journalPrompt,
    chiasticPosition: params.dayOutline.chiasticPosition,
    endnotes: buildEndnotes({
      dayOutline: params.dayOutline,
      sourcesUsed: parsed.sourcesUsed,
      chunkSources,
    }),
    modules: parsed.modules,
    totalWords: parsed.totalWords,
    targetLengthMinutes: params.devotionalLengthMinutes,
    generationStatus: 'ready',
    compositionReport: buildCompositionReport({
      referenceChunkWords,
      totalWords: parsed.totalWords,
      sources: [...new Set([...chunkSources, ...parsed.sourcesUsed])],
    }),
  }

  return { day, usedChunkIds }
}

/**
 * Generate sabbath day (Day 6) — rest and review, no new teaching.
 */
export async function generateSabbathDay(params: {
  planOutline: PlanOutline
  previousDays: CustomPlanDay[]
  userResponse: string
  devotionalLengthMinutes: number
}): Promise<CustomPlanDay> {
  // Sabbath is lighter — roughly half the normal length
  const sabbathMinutes = Math.max(
    5,
    Math.round(params.devotionalLengthMinutes * 0.6),
  )
  const wordTarget = calculateWordTarget(sabbathMinutes)
  const maxTokens = estimateMaxOutputTokens(wordTarget)

  const daySummaries = params.previousDays
    .map(
      (d) =>
        `Day ${d.day} "${d.title}": ${d.scriptureReference} — ${(d.reflection || '').slice(0, 200)}`,
    )
    .join('\n')

  const systemPrompt = buildSabbathSystemPrompt(wordTarget)

  const userMessage = [
    `Plan: "${params.planOutline.title}"`,
    `Angle: ${params.planOutline.angle}`,
    `User's original reflection: "${params.userResponse}"`,
    '',
    'Days 1-5 summary:',
    daySummaries,
  ].join('\n')

  const generation = await generateWithBrain({
    system: systemPrompt,
    messages: [{ role: 'user', content: userMessage }],
    context: {
      task: 'devotional_day_generate',
      mode: 'auto',
      maxOutputTokens: maxTokens,
    },
  })

  const parsed = parseGeneratedDay(generation.output)
  if (!parsed) {
    // Fallback sabbath
    return buildFallbackSabbath(params)
  }

  return {
    day: 6,
    dayType: 'sabbath',
    title: parsed.title || 'Sabbath Rest',
    scriptureReference: parsed.scriptureReference,
    scriptureText: parsed.scriptureText,
    reflection: parsed.reflection,
    prayer: parsed.prayer,
    nextStep: parsed.nextStep || 'Rest today. No action required.',
    journalPrompt: parsed.journalPrompt,
    chiasticPosition: 'Sabbath',
    endnotes: [
      { id: 1, source: 'Scripture', note: parsed.scriptureReference },
      {
        id: 2,
        source: 'Day Type',
        note: 'Sabbath rest and review — no new teaching.',
      },
    ],
    modules: parsed.modules,
    totalWords: parsed.totalWords,
    targetLengthMinutes: sabbathMinutes,
    generationStatus: 'ready',
  }
}

/**
 * Generate review day (Day 7) — week integration + next-week discernment.
 */
export async function generateReviewDay(params: {
  planOutline: PlanOutline
  previousDays: CustomPlanDay[]
  userResponse: string
  devotionalLengthMinutes: number
}): Promise<CustomPlanDay> {
  // Review is even lighter
  const reviewMinutes = Math.max(
    5,
    Math.round(params.devotionalLengthMinutes * 0.4),
  )
  const wordTarget = calculateWordTarget(reviewMinutes)
  const maxTokens = estimateMaxOutputTokens(wordTarget)

  const daySummaries = params.previousDays
    .map((d) => `Day ${d.day} "${d.title}": ${d.scriptureReference}`)
    .join('\n')

  const systemPrompt = buildReviewSystemPrompt(wordTarget)

  const userMessage = [
    `Plan: "${params.planOutline.title}"`,
    `Angle: ${params.planOutline.angle}`,
    `User's original reflection: "${params.userResponse}"`,
    '',
    'Week summary:',
    daySummaries,
  ].join('\n')

  const generation = await generateWithBrain({
    system: systemPrompt,
    messages: [{ role: 'user', content: userMessage }],
    context: {
      task: 'devotional_day_generate',
      mode: 'auto',
      maxOutputTokens: maxTokens,
    },
  })

  const parsed = parseGeneratedDay(generation.output)
  if (!parsed) {
    return buildFallbackReview(params)
  }

  return {
    day: 7,
    dayType: 'review',
    title: parsed.title || 'Week in Review',
    scriptureReference: parsed.scriptureReference,
    scriptureText: parsed.scriptureText,
    reflection: parsed.reflection,
    prayer: parsed.prayer,
    nextStep:
      parsed.nextStep ||
      'Consider your next step: a new audit, a prefab series, or continue this theme.',
    journalPrompt: parsed.journalPrompt,
    chiasticPosition: 'Review',
    endnotes: [
      { id: 1, source: 'Scripture', note: parsed.scriptureReference },
      {
        id: 2,
        source: 'Day Type',
        note: 'Week review and next-week discernment.',
      },
    ],
    modules: parsed.modules,
    totalWords: parsed.totalWords,
    targetLengthMinutes: reviewMinutes,
    generationStatus: 'ready',
  }
}

// ─── Fallbacks ──────────────────────────────────────────────────────

/**
 * Deterministic sabbath day builder — no LLM call needed.
 * Used by default when brainFlags.generativeSabbathReview is false.
 * Produces quality rest-and-review content from prior day summaries.
 */
export function buildFallbackSabbath(params: {
  planOutline: PlanOutline
  previousDays: CustomPlanDay[]
  userResponse: string
}): CustomPlanDay {
  const keyPassage =
    params.previousDays[2]?.scriptureReference ||
    params.previousDays[0]?.scriptureReference ||
    'Psalm 46:10'

  return {
    day: 6,
    dayType: 'sabbath',
    title: 'Sabbath Rest',
    scriptureReference: keyPassage,
    scriptureText: 'Be still, and know that I am God.',
    reflection: [
      `This week in "${params.planOutline.title}", you engaged with ${params.previousDays.length} devotional days.`,
      '',
      'Today is sabbath — a day of rest, not productivity.',
      '',
      'Review the passages from this week. Which one spoke most directly to what you shared at the start?',
      '',
      'Sit with that passage for 5 minutes without trying to analyze it. Let it read you.',
    ].join('\n'),
    prayer:
      'Lord, still my mind and heart today. Thank you for meeting me this week. I release the pressure to perform and simply rest in your presence.',
    nextStep: 'Rest today. No action required — just be present.',
    journalPrompt:
      'Which day this week challenged you most? What would you tell your Monday self about it?',
    chiasticPosition: 'Sabbath',
    endnotes: [
      { id: 1, source: 'Scripture', note: keyPassage },
      { id: 2, source: 'Day Type', note: 'Sabbath rest and review.' },
    ],
    generationStatus: 'ready',
  }
}

/**
 * Deterministic review day builder — no LLM call needed.
 * Used by default when brainFlags.generativeSabbathReview is false.
 * Produces quality week-summary and next-step discernment content.
 */
export function buildFallbackReview(params: {
  planOutline: PlanOutline
  previousDays: CustomPlanDay[]
  userResponse: string
}): CustomPlanDay {
  return {
    day: 7,
    dayType: 'review',
    title: 'Week in Review',
    scriptureReference: 'Philippians 1:6',
    scriptureText:
      'He who began a good work in you will carry it on to completion until the day of Christ Jesus.',
    reflection: [
      `You completed "${params.planOutline.title}" this week.`,
      '',
      'Take a moment to reflect on how you have grown.',
      '',
      'What is one thing you learned that you want to carry into next week?',
    ].join('\n'),
    prayer:
      'Father, thank you for this week of formation. Carry forward what you started in me. Give me wisdom to know what comes next.',
    nextStep:
      'Choose your next step: start a new Soul Audit for a fresh topic, explore a prefab series, or deepen this theme for another week.',
    journalPrompt:
      'If you could tell someone one thing you learned this week, what would it be?',
    chiasticPosition: 'Review',
    endnotes: [
      { id: 1, source: 'Scripture', note: 'Philippians 1:6' },
      {
        id: 2,
        source: 'Day Type',
        note: 'Week review and next-week discernment.',
      },
    ],
    generationStatus: 'ready',
  }
}

// ─── Utility: Check LLM Availability ────────────────────────────────

/**
 * Quick check if any LLM provider is available for generation.
 */
export function isGenerativeAvailable(): boolean {
  return providerAvailabilityForUser({ userKeys: undefined }).some(
    (entry) => entry.available,
  )
}
