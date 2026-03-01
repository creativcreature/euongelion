/**
 * ingredient-selector.ts
 *
 * Replaces the 30-60 second LLM outline generation with deterministic
 * ingredient scoring. Produces 3 thematic directions from existing curated
 * modules and reference chunks in < 1 second. Zero LLM calls.
 *
 * Each direction includes real content previews (scripture, teaching excerpt)
 * so the user sees substance before committing.
 */

import { SERIES_DATA } from '@/data/series'
import {
  parseAuditIntent,
  type ParsedAuditIntent,
} from '@/lib/brain/intent-parser'
import {
  getCuratedDayCandidates,
  rankCandidatesForInput,
  type CuratedDayCandidate,
  type CurationSeed,
} from './curation-engine'

// ─── Types ──────────────────────────────────────────────────────────

export interface IngredientDirection {
  /** Stable identifier for this direction. */
  id: string
  /** Rank among directions (1 = recommended). */
  rank: number
  /** Display title for this direction. */
  title: string
  /** Opening question connecting user's words to this direction. */
  question: string
  /** Why this direction was selected, referencing matched keywords. */
  reasoning: string
  /** Primary scripture anchor for this direction. */
  scriptureAnchor: string
  /** Series slug that anchors this direction. */
  seriesSlug: string
  /** Confidence score (0-1). */
  confidence: number
  /** Real Day 1 preview with actual content. */
  day1Preview: {
    title: string
    scriptureReference: string
    scriptureText: string
    teachingExcerpt: string
    reflectionPrompt: string
  }
  /** Pre-selected candidates for Days 1-5 (used at select time). */
  candidates: CuratedDayCandidate[]
  /** Curation seed for the anchor candidate. */
  curationSeed: CurationSeed
  /** Keywords that matched from user's input. */
  matchedKeywords: string[]
}

export interface IngredientSelectionResult {
  /** The 3 thematic directions, rank-ordered. */
  directions: IngredientDirection[]
  /** Parsed intent from user's reflection. */
  intent: ParsedAuditIntent
  /** Strategy used for selection. */
  strategy: 'ingredient_selection'
}

// ─── Constants ──────────────────────────────────────────────────────

const DIRECTION_COUNT = 3
const CANDIDATES_PER_DIRECTION = 5
const MIN_SERIES_DAYS_FOR_DIRECTION = 3

// ─── Helpers ────────────────────────────────────────────────────────

function collapseWhitespace(value: string): string {
  return value.replace(/\s+/g, ' ').trim()
}

function extractCoreBurden(input: string, maxLength = 64): string {
  const normalized = collapseWhitespace(input)
  if (!normalized) return ''

  const clause =
    normalized
      .split(/[.!?;]/)
      .map((part) => collapseWhitespace(part))
      .find(Boolean) ?? normalized

  const stripped = collapseWhitespace(
    clause.replace(
      /\b(i|im|i'm|ive|i've|just|really|maybe|kind|sort|that|this|feel)\b/gi,
      ' ',
    ),
  )

  const source = stripped.length >= 12 ? stripped : clause
  if (source.length <= maxLength) return source

  const words = source.split(' ')
  let output = ''
  for (const word of words) {
    const next = `${output} ${word}`.trim()
    if (next.length > maxLength) break
    output = next
  }
  return output || source.slice(0, maxLength).trimEnd()
}

function buildDirectionTitle(
  candidate: CuratedDayCandidate,
  input: string,
): string {
  const burden = extractCoreBurden(input, 40)
  const seriesTitle =
    SERIES_DATA[candidate.seriesSlug]?.title ?? candidate.seriesTitle

  if (burden.length >= 12) {
    return `${seriesTitle}: ${candidate.dayTitle}`
  }

  return `${seriesTitle}: ${candidate.dayTitle}`
}

function buildDirectionQuestion(
  candidate: CuratedDayCandidate,
  input: string,
): string {
  const focus = extractCoreBurden(input, 84)
  if (!focus) return candidate.reflectionPrompt
  return `As you reflect on "${focus}", ${candidate.reflectionPrompt}`
}

function buildDirectionReasoning(
  candidate: CuratedDayCandidate,
  matched: string[],
): string {
  const seriesTitle =
    SERIES_DATA[candidate.seriesSlug]?.title ?? candidate.seriesTitle

  if (matched.length >= 2) {
    return `Your words connect to themes of ${matched.slice(0, 3).join(', ')} — this path through ${seriesTitle} addresses those directly with ${candidate.scriptureReference}.`
  }

  if (matched.length === 1) {
    return `Your reflection touches on ${matched[0]} — ${seriesTitle} grounds this in ${candidate.scriptureReference} and walks through it over 5 days.`
  }

  return `${seriesTitle} offers a focused 5-day path grounded in ${candidate.scriptureReference}, moving from honest questions to faithful next steps.`
}

// ─── Core Selection ─────────────────────────────────────────────────

/**
 * Select 3 thematic directions from curated candidates.
 * Each direction is anchored in a different series to provide genuine variety.
 * Returns candidates pre-selected for each direction so select-time
 * can compose immediately without re-scoring.
 */
function selectDirections(
  input: string,
  intent: ParsedAuditIntent,
): IngredientDirection[] {
  const allCandidates = getCuratedDayCandidates()

  // Count days per series to filter for series with enough content
  const dayCountBySeries = new Map<string, number>()
  for (const candidate of allCandidates) {
    dayCountBySeries.set(
      candidate.seriesSlug,
      (dayCountBySeries.get(candidate.seriesSlug) ?? 0) + 1,
    )
  }

  const eligibleSeries = new Set<string>()
  for (const [slug, count] of dayCountBySeries) {
    if (count >= MIN_SERIES_DAYS_FOR_DIRECTION) {
      eligibleSeries.add(slug)
    }
  }

  // Rank all candidates using the existing scoring engine
  const ranked = rankCandidatesForInput({
    input,
    aiThemes: intent.themes,
  }).filter(
    (entry) =>
      eligibleSeries.size === 0 ||
      eligibleSeries.has(entry.candidate.seriesSlug),
  )

  if (ranked.length === 0) return []

  const topScore = Math.max(1, ranked[0]?.score ?? 1)
  const directions: IngredientDirection[] = []
  const usedSeries = new Set<string>()

  for (const entry of ranked) {
    if (directions.length >= DIRECTION_COUNT) break
    if (usedSeries.has(entry.candidate.seriesSlug)) continue

    const anchor = entry.candidate
    usedSeries.add(anchor.seriesSlug)

    // Gather up to 5 candidates from the same series for this direction
    const seriesCandidates = ranked
      .filter((r) => r.candidate.seriesSlug === anchor.seriesSlug)
      .sort((a, b) => a.candidate.dayNumber - b.candidate.dayNumber)
      .slice(0, CANDIDATES_PER_DIRECTION)
      .map((r) => r.candidate)

    // If the series doesn't have enough curated days, supplement from
    // top-ranked candidates in other series (excluding already-used)
    if (seriesCandidates.length < CANDIDATES_PER_DIRECTION) {
      const supplemented = new Set(seriesCandidates.map((c) => c.key))
      for (const r of ranked) {
        if (seriesCandidates.length >= CANDIDATES_PER_DIRECTION) break
        if (supplemented.has(r.candidate.key)) continue
        seriesCandidates.push(r.candidate)
        supplemented.add(r.candidate.key)
      }
    }

    const confidence = Math.min(entry.score / topScore, 1)
    const matched = entry.matches.slice(0, 5)
    const rank = directions.length + 1

    directions.push({
      id: `ai_primary:${anchor.seriesSlug}:${anchor.dayNumber}:${rank}`,
      rank,
      title: buildDirectionTitle(anchor, input),
      question: buildDirectionQuestion(anchor, input),
      reasoning: buildDirectionReasoning(anchor, matched),
      scriptureAnchor: anchor.scriptureReference,
      seriesSlug: anchor.seriesSlug,
      confidence,
      day1Preview: {
        title: seriesCandidates[0]?.dayTitle ?? anchor.dayTitle,
        scriptureReference:
          seriesCandidates[0]?.scriptureReference ?? anchor.scriptureReference,
        scriptureText: (
          seriesCandidates[0]?.scriptureText ?? anchor.scriptureText
        ).slice(0, 400),
        teachingExcerpt: (
          seriesCandidates[0]?.teachingText ?? anchor.teachingText
        ).slice(0, 320),
        reflectionPrompt:
          seriesCandidates[0]?.reflectionPrompt ?? anchor.reflectionPrompt,
      },
      candidates: seriesCandidates,
      curationSeed: {
        seriesSlug: anchor.seriesSlug,
        dayNumber: anchor.dayNumber,
        candidateKey: anchor.key,
      },
      matchedKeywords: matched,
    })
  }

  return directions
}

// ─── Public API ─────────────────────────────────────────────────────

/**
 * Select ingredients for a Soul Audit submission.
 *
 * Replaces `generatePlanOutlines()` (30-60 seconds, LLM) with
 * deterministic keyword scoring (< 1 second, zero LLM calls).
 *
 * Returns 3 thematic directions, each with:
 * - Real Day 1 preview (scripture, teaching, reflection)
 * - Pre-selected candidates for Days 1-5
 * - Reasoning explaining why this direction was chosen
 */
export function selectIngredients(
  responseText: string,
): IngredientSelectionResult {
  const intent = parseAuditIntent(responseText)

  const directions = selectDirections(responseText, intent)

  return {
    directions,
    intent,
    strategy: 'ingredient_selection',
  }
}
