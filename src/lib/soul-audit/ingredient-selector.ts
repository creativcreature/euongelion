/**
 * ingredient-selector.ts
 *
 * RAG-first direction selection for Soul Audit.
 *
 * This selector does NOT rely on pre-authored devotional modules.
 * It builds three thematic directions from:
 * - user reflection intent
 * - scripture anchors
 * - reference library retrieval (RAG)
 */

import {
  parseAuditIntent,
  type ParsedAuditIntent,
} from '@/lib/brain/intent-parser'
import {
  rankCandidatesForInput,
  type CuratedDayCandidate,
} from './curation-engine'
import { retrieveForDay } from './reference-retriever'

export interface IngredientDirection {
  id: string
  rank: number
  title: string
  question: string
  reasoning: string
  scriptureAnchor: string
  directionSlug: string
  confidence: number
  day1Preview: {
    title: string
    scriptureReference: string
    scriptureText: string
    teachingExcerpt: string
    reflectionPrompt: string
  }
  matchedKeywords: string[]
  referenceSourceHints: string[]
}

export interface IngredientSelectionResult {
  directions: IngredientDirection[]
  intent: ParsedAuditIntent
  strategy: 'ingredient_selection'
}

type DirectionLens = {
  slug: string
  label: string
  focusTerms: string[]
  pardes: 'peshat' | 'remez' | 'derash' | 'integrated'
  chiastic: 'A' | 'B' | 'C'
}

const DIRECTION_COUNT = 3
const MAX_PREVIEW_WORDS = 65

function collapseWhitespace(value: string): string {
  return value.replace(/\s+/g, ' ').trim()
}

function toHeadline(value: string): string {
  const cleaned = collapseWhitespace(value).toLowerCase()
  if (!cleaned) return 'Focused Direction'
  return cleaned
    .split(' ')
    .map((token) => token.charAt(0).toUpperCase() + token.slice(1))
    .join(' ')
}

function slugify(value: string): string {
  return collapseWhitespace(value)
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 48)
}

function extractKeywords(input: string): string[] {
  return Array.from(
    new Set(
      input
        .toLowerCase()
        .replace(/[^a-z0-9\s-]/g, ' ')
        .split(/\s+/)
        .map((token) => token.trim())
        .filter((token) => token.length >= 4),
    ),
  ).slice(0, 12)
}

function takeWords(text: string, maxWords: number): string {
  const words = collapseWhitespace(text).split(' ').filter(Boolean)
  if (words.length <= maxWords) return words.join(' ')
  return `${words.slice(0, maxWords).join(' ')}...`
}

function pickScripture(intent: ParsedAuditIntent, index: number): string {
  if (intent.scriptureAnchors.length > 0) {
    return intent.scriptureAnchors[index % intent.scriptureAnchors.length]
  }

  const fallbacks = ['Psalm 119:105', 'Philippians 4:6-7', 'Romans 8:1']
  return fallbacks[index % fallbacks.length]
}

function pickModuleAnchor(params: {
  ranked: Array<{ candidate: CuratedDayCandidate; score: number }>
  usedSeries: Set<string>
  fallbackIndex: number
}): CuratedDayCandidate | null {
  for (const entry of params.ranked) {
    if (params.usedSeries.has(entry.candidate.seriesSlug)) continue
    params.usedSeries.add(entry.candidate.seriesSlug)
    return entry.candidate
  }

  const fallback = params.ranked[params.fallbackIndex]?.candidate ?? null
  if (fallback) params.usedSeries.add(fallback.seriesSlug)
  return fallback
}

function buildLenses(
  intent: ParsedAuditIntent,
  keywords: string[],
): DirectionLens[] {
  const primary = intent.themes[0] || keywords[0] || 'faithful endurance'
  const secondary = intent.themes[1] || keywords[1] || 'clarity in uncertainty'
  const tertiary = intent.themes[2] || keywords[2] || 'renewed hope'

  return [
    {
      slug: slugify(`grounded-${primary}`) || 'grounded-direction',
      label: 'Grounded Reading',
      focusTerms: [primary, ...intent.themes].slice(0, 4),
      pardes: 'peshat' as const,
      chiastic: 'A' as const,
    },
    {
      slug: slugify(`historical-${secondary}`) || 'historical-direction',
      label: 'Historical Witness',
      focusTerms: [secondary, primary, ...keywords].slice(0, 4),
      pardes: 'remez' as const,
      chiastic: 'B' as const,
    },
    {
      slug: slugify(`integrated-${tertiary}`) || 'integrated-direction',
      label: 'Integrated Practice',
      focusTerms: [tertiary, secondary, ...intent.themes].slice(0, 4),
      pardes: 'derash' as const,
      chiastic: 'C' as const,
    },
  ].slice(0, DIRECTION_COUNT)
}

export function selectIngredients(
  responseText: string,
): IngredientSelectionResult {
  const intent = parseAuditIntent(responseText)
  const keywords = extractKeywords(responseText)
  const lenses = buildLenses(intent, keywords)
  const rankedCandidates = rankCandidatesForInput({
    input: responseText,
    aiThemes: intent.themes,
  })
  const usedSeries = new Set<string>()

  const directions: IngredientDirection[] = lenses.map((lens, index) => {
    const rank = index + 1
    const moduleAnchor = pickModuleAnchor({
      ranked: rankedCandidates,
      usedSeries,
      fallbackIndex: index,
    })
    const scripture =
      moduleAnchor?.scriptureReference || pickScripture(intent, index)
    const retrieval = retrieveForDay({
      themes: Array.from(new Set([...intent.themes, ...lens.focusTerms])),
      scriptureAnchors: [scripture],
      topic: `${responseText} ${lens.focusTerms.join(' ')}`,
      limit: 15,
      chiasticPosition: lens.chiastic,
      pardesLevel: lens.pardes,
    })

    const topChunk = retrieval.chunks[0]
    const sourceHints = Array.from(
      new Set(retrieval.chunks.map((chunk) => chunk.title)),
    ).slice(0, 4)

    const focusPhrase = lens.focusTerms.slice(0, 2).join(' and ')
    const teachingExcerpt = topChunk
      ? takeWords(topChunk.content, MAX_PREVIEW_WORDS)
      : takeWords(
          moduleAnchor?.teachingText ||
            `A reference-grounded reading on ${focusPhrase}.`,
          MAX_PREVIEW_WORDS,
        )

    const scriptureText =
      moduleAnchor?.scriptureText ||
      (topChunk
        ? takeWords(topChunk.content, 40)
        : `Read ${scripture} slowly and mark the phrase that resists you and the phrase that restores you.`)

    const confidenceRaw =
      retrieval.totalScore / Math.max(1, retrieval.chunks.length * 8)
    const confidence = Number(
      Math.max(0.45, Math.min(0.99, confidenceRaw)).toFixed(3),
    )

    return {
      id: `ai_primary:${lens.slug}:${rank}`,
      rank,
      title: `${lens.label}: ${toHeadline(focusPhrase || lens.label)}`,
      question:
        moduleAnchor?.reflectionPrompt ||
        `What if this week focused on ${focusPhrase || 'faithful attention'} through ${scripture}?`,
      reasoning:
        sourceHints.length > 0
          ? `Matched themes (${lens.focusTerms.slice(0, 3).join(', ')}) against reference witnesses including ${sourceHints.slice(0, 2).join(' and ')} with curated module anchors.`
          : `Matched themes (${lens.focusTerms.slice(0, 3).join(', ')}) and built a reference-first direction with curated anchors.`,
      scriptureAnchor: scripture,
      directionSlug: lens.slug,
      confidence,
      day1Preview: {
        title: `${toHeadline(focusPhrase || lens.label)} — Day 1`,
        scriptureReference: scripture,
        scriptureText,
        teachingExcerpt,
        reflectionPrompt: `Where does ${scripture} confront or clarify ${focusPhrase || 'your current burden'}?`,
      },
      matchedKeywords: lens.focusTerms,
      referenceSourceHints: sourceHints,
    }
  })

  return {
    directions,
    intent,
    strategy: 'ingredient_selection',
  }
}
