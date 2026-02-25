/**
 * outline-generator.ts
 *
 * Generates 3 unique 7-day plan outlines for the Soul Audit submit flow.
 * Each outline approaches the user's topic from a different angle.
 *
 * Replaces curated series matching (buildAuditOptions) for AI options.
 * Curated_prefab options continue to use the existing matching.ts path.
 *
 * Fallback: if outline generation fails, the submit route falls back to
 * the existing buildAuditOptions() curated matching path.
 */

import {
  generateWithBrain,
  providerAvailabilityForUser,
} from '@/lib/brain/router'
import { retrieveForDay, getCorpusStats } from './reference-retriever'
import type {
  AuditOptionPreview,
  ChiasticPosition7,
  DevotionalModuleType,
  PlanDayOutline,
  PlanDayType,
  PlanOutline,
  PlanOutlinePreview,
} from '@/types/soul-audit'

// ─── Types ──────────────────────────────────────────────────────────

export interface OutlineGeneratorParams {
  responseText: string
  intent: {
    reflectionFocus: string
    themes: string[]
    scriptureAnchors: string[]
    tone: string
    intentTags: string[]
  }
  devotionalLengthMinutes?: number
}

export interface OutlineGeneratorResult {
  outlines: PlanOutline[]
  options: AuditOptionPreview[]
  strategy: 'generative_outlines'
}

// ─── Constants ──────────────────────────────────────────────────────

// Compressed prompt: ~40% fewer tokens while preserving all constraints.
const OUTLINE_SYSTEM_PROMPT = `You are a theological curriculum designer for Euangelion (Christian devotional app).

Design 3 distinct 7-day devotional plan blueprints approaching the SAME topic from DIFFERENT angles.

STRUCTURE per plan:
- Days 1-5: Devotional (chiastic arc A→B→C→B'→A'), PaRDeS levels: peshat, remez, derash, sod, integrated
- Day 6: Sabbath rest/review (no new teaching)
- Day 7: Week review + next-week discernment

PERSONALIZATION (non-negotiable):
- Each plan angle MUST directly address the user's specific situation — not generic spiritual growth
- topicFocus for each day must connect to the user's specific words/situation
- Generic spiritual growth plans are rejected

REQUIREMENTS:
- Each plan: unique angle, title (max 72 chars, natural language), question (18-42 words), reasoning (18-40 words), scriptureAnchor
- REAL Scripture references only (e.g. "Isaiah 6:1-8")
- 7 dayOutlines with: dayType, chiasticPosition, title, scriptureReference, topicFocus, pardesLevel, suggestedModules (3-8 from palette)
- Modules: scripture,teaching,vocab,story,insight,bridge,reflection,comprehension,takeaway,prayer,profile,resource
- Always include 'scripture' + 'reflection' or 'prayer' per day

STRICT JSON array only:
[{"angle":string,"title":string,"question":string,"reasoning":string,"scriptureAnchor":string,"dayOutlines":[{"day":1-7,"dayType":"devotional"|"sabbath"|"review","chiasticPosition":"A"|"B"|"C"|"B'"|"A'"|"Sabbath"|"Review","title":string,"scriptureReference":string,"topicFocus":string,"pardesLevel":"peshat"|"remez"|"derash"|"sod"|"integrated"|"sabbath"|"review","suggestedModules":string[]}]}]`

// ─── Helpers ────────────────────────────────────────────────────────

function generateOutlineId(): string {
  const timestamp = Date.now().toString(36)
  const random = Math.random().toString(36).slice(2, 8)
  return `outline-${timestamp}-${random}`
}

function parseOutlineResponse(raw: string): PlanOutline[] | null {
  const trimmed = raw.trim()
  if (!trimmed) return null

  const cleaned = trimmed
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/```$/i, '')
    .trim()

  try {
    const parsed = JSON.parse(cleaned) as unknown
    if (!Array.isArray(parsed) || parsed.length === 0) return null

    const outlines: PlanOutline[] = []

    for (const item of parsed.slice(0, 3)) {
      if (typeof item !== 'object' || !item) continue
      const obj = item as Record<string, unknown>
      if (!obj.angle || !obj.title || !obj.dayOutlines) continue
      if (!Array.isArray(obj.dayOutlines) || obj.dayOutlines.length < 7)
        continue

      const dayOutlines: PlanDayOutline[] = (
        obj.dayOutlines as Array<Record<string, unknown>>
      )
        .slice(0, 7)
        .map((day, index) => ({
          day: index + 1,
          dayType: validateDayType(day.dayType as string, index),
          chiasticPosition: validateChiasticPosition(
            day.chiasticPosition as string,
            index,
          ),
          title: String(day.title || `Day ${index + 1}`).slice(0, 120),
          scriptureReference: String(
            day.scriptureReference || 'Scripture',
          ).slice(0, 120),
          topicFocus: String(day.topicFocus || '').slice(0, 200),
          pardesLevel: validatePardesLevel(day.pardesLevel as string, index),
          suggestedModules: validateModules(day.suggestedModules),
        }))

      outlines.push({
        id: generateOutlineId(),
        angle: String(obj.angle).slice(0, 200),
        title: String(obj.title).slice(0, 90),
        question: String(obj.question || '').slice(0, 300),
        reasoning: String(obj.reasoning || '').slice(0, 300),
        scriptureAnchor: String(obj.scriptureAnchor || 'Scripture').slice(
          0,
          120,
        ),
        dayOutlines,
        referenceSeeds: [],
      })
    }

    return outlines.length > 0 ? outlines : null
  } catch {
    return null
  }
}

function validateDayType(value: string, dayIndex: number): PlanDayType {
  if (dayIndex === 5) return 'sabbath'
  if (dayIndex === 6) return 'review'
  if (value === 'sabbath' || value === 'review') return value
  return 'devotional'
}

const VALID_CHIASTIC = new Set<string>([
  'A',
  'B',
  'C',
  "B'",
  "A'",
  'Sabbath',
  'Review',
])
const DEFAULT_CHIASTIC_BY_DAY: ChiasticPosition7[] = [
  'A',
  'B',
  'C',
  "B'",
  "A'",
  'Sabbath',
  'Review',
]

function validateChiasticPosition(
  value: string,
  dayIndex: number,
): ChiasticPosition7 {
  if (VALID_CHIASTIC.has(value)) return value as ChiasticPosition7
  return DEFAULT_CHIASTIC_BY_DAY[dayIndex] || 'A'
}

const VALID_PARDES = new Set([
  'peshat',
  'remez',
  'derash',
  'sod',
  'integrated',
  'sabbath',
  'review',
])
const DEFAULT_PARDES_BY_DAY = [
  'peshat',
  'remez',
  'derash',
  'sod',
  'integrated',
  'sabbath',
  'review',
]

function validatePardesLevel(
  value: string,
  dayIndex: number,
): PlanDayOutline['pardesLevel'] {
  if (VALID_PARDES.has(value)) return value as PlanDayOutline['pardesLevel']
  return (DEFAULT_PARDES_BY_DAY[dayIndex] ||
    'integrated') as PlanDayOutline['pardesLevel']
}

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

function validateModules(raw: unknown): DevotionalModuleType[] {
  if (!Array.isArray(raw)) return ['scripture', 'reflection', 'prayer']

  const modules = raw
    .map((m) => String(m).toLowerCase())
    .filter((m): m is DevotionalModuleType =>
      VALID_MODULES.has(m as DevotionalModuleType),
    )

  // Ensure scripture + reflection/prayer always present
  if (!modules.includes('scripture')) modules.unshift('scripture')
  if (!modules.includes('reflection') && !modules.includes('prayer')) {
    modules.push('reflection')
  }

  return modules.slice(0, 10)
}

/**
 * Reconstruct a full PlanOutline from a stored PlanOutlinePreview + option metadata.
 * Used by both select/route.ts and generate-next/route.ts.
 */
export function reconstructPlanOutline(params: {
  id: string
  title: string
  question: string
  reasoning: string
  preview: PlanOutlinePreview
}): PlanOutline {
  return {
    id: params.id,
    angle: params.preview.angle,
    title: params.title,
    question: params.question,
    reasoning: params.reasoning,
    scriptureAnchor:
      params.preview.dayOutlines[0]?.scriptureReference || 'Scripture',
    dayOutlines: params.preview.dayOutlines.map((d, i) => ({
      day: d.day,
      dayType: validateDayType(d.dayType, i),
      chiasticPosition: validateChiasticPosition(
        DEFAULT_CHIASTIC_BY_DAY[i] || 'A',
        i,
      ),
      title: d.title,
      scriptureReference: d.scriptureReference,
      topicFocus: d.topicFocus,
      pardesLevel: validatePardesLevel(
        DEFAULT_PARDES_BY_DAY[i] || 'integrated',
        i,
      ),
    })),
    referenceSeeds: [],
  }
}

function outlineToPreview(outline: PlanOutline): PlanOutlinePreview {
  return {
    angle: outline.angle,
    dayOutlines: outline.dayOutlines.map((day) => ({
      day: day.day,
      dayType: day.dayType,
      title: day.title,
      scriptureReference: day.scriptureReference,
      topicFocus: day.topicFocus,
    })),
  }
}

function outlineToOption(
  outline: PlanOutline,
  rank: number,
): AuditOptionPreview {
  const day1 = outline.dayOutlines[0]

  return {
    id: `ai_generative:${outline.id}:${rank}`,
    slug: outline.id,
    kind: 'ai_generative',
    rank,
    title: outline.title,
    question: outline.question,
    confidence: Math.max(0.7, 1 - (rank - 1) * 0.08),
    reasoning: outline.reasoning,
    preview: {
      verse: day1?.scriptureReference || outline.scriptureAnchor,
      verseText: '',
      paragraph: [
        outline.angle,
        `. Beginning with "${day1?.title || 'Day 1'}" — `,
        day1?.topicFocus || outline.question,
      ].join(''),
    },
    planOutline: outlineToPreview(outline),
  }
}

// ─── Main Generator ─────────────────────────────────────────────────

/**
 * Generate 3 unique 7-day plan outlines based on user's audit response.
 *
 * Uses the reference library for initial topic seeding, then asks the LLM
 * to create 3 plan blueprints from different angles.
 *
 * Returns null if LLM is unavailable or response is unparseable.
 * The submit route should fall back to buildAuditOptions() in that case.
 */
export async function generatePlanOutlines(
  params: OutlineGeneratorParams,
): Promise<OutlineGeneratorResult | null> {
  // Check provider availability
  const availability = providerAvailabilityForUser({ userKeys: undefined })
  const hasProvider = availability.some((entry) => entry.available)
  if (!hasProvider) {
    console.warn(
      `[outline-generator] No LLM provider available — skipping generative outlines. Providers: ${availability.map((p) => `${p.provider}=${p.available ? 'ok' : (p as { reason?: string }).reason || 'no key'}`).join(', ')}`,
    )
    return null
  }

  // Retrieve reference seeds for grounding the outline
  let referenceSeedText = ''
  try {
    const stats = getCorpusStats()
    if (stats.totalChunks > 0) {
      const retrieved = retrieveForDay({
        themes: params.intent.themes,
        scriptureAnchors: params.intent.scriptureAnchors,
        topic: params.responseText,
        limit: 6,
      })

      if (retrieved.chunks.length > 0) {
        // Token optimization: 200 chars per seed is enough for outline grounding
        referenceSeedText = retrieved.chunks
          .map(
            (chunk) =>
              `[${chunk.sourceType}] ${chunk.title}: ${chunk.content.slice(0, 200)}`,
          )
          .join('\n\n')
      }
    }
  } catch {
    // Reference library may not be available (e.g., Vercel)
  }

  const lengthMinutes = params.devotionalLengthMinutes || 10

  const userMessage = [
    `User's reflection: "${params.responseText}"`,
    `Parsed intent: ${params.intent.reflectionFocus}`,
    `Themes: ${params.intent.themes.join(', ') || 'general spiritual growth'}`,
    `Tone: ${params.intent.tone}`,
    `Scripture anchors: ${params.intent.scriptureAnchors.join(', ') || 'none specified'}`,
    `Intent tags: ${params.intent.intentTags.join(', ') || 'none'}`,
    `Target length per day: ${lengthMinutes} minutes (~${lengthMinutes * 150} words)`,
    referenceSeedText
      ? `\nReference library seeds (use these to ground your plan in real sources):\n${referenceSeedText}`
      : '',
  ]
    .filter(Boolean)
    .join('\n')

  try {
    const generation = await generateWithBrain({
      system: OUTLINE_SYSTEM_PROMPT,
      messages: [{ role: 'user', content: userMessage }],
      context: {
        task: 'audit_outline_generate',
        mode: 'auto',
        // 4500 tokens: 3 outlines × (~1200 tokens each including 7 days
        // + metadata fields + JSON structural overhead).
        // Previous 2400 budget caused truncation → parser rejection.
        maxOutputTokens: 4500,
      },
    })

    const outlines = parseOutlineResponse(generation.output)
    if (!outlines || outlines.length === 0) return null

    // Attach reference seeds from user intent
    const seededOutlines = outlines.map((outline) => ({
      ...outline,
      referenceSeeds: params.intent.themes.slice(0, 6),
    }))

    const options = seededOutlines.map((outline, index) =>
      outlineToOption(outline, index + 1),
    )

    return {
      outlines: seededOutlines,
      options,
      strategy: 'generative_outlines',
    }
  } catch {
    return null
  }
}
