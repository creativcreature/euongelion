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
  focusTerms: string[]
  pardes: 'peshat' | 'remez' | 'derash' | 'integrated'
  chiastic: 'A' | 'B' | 'C'
}

const DIRECTION_COUNT = 3
const MAX_PREVIEW_WORDS = 65
const WEAK_TERMS = new Set([
  'want',
  'need',
  'feel',
  'feels',
  'felt',
  'learn',
  'about',
  'today',
  'lately',
  'just',
  'really',
  'very',
  'with',
  'from',
  'into',
  'that',
  'this',
  'these',
  'those',
  'what',
  'when',
  'where',
  'which',
  'who',
  'whom',
  'your',
  'mine',
  'our',
  'their',
  'keep',
  'keeps',
  'been',
  'have',
  'dont',
  "don't",
  'please',
  'help',
  'teach',
])

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
        .filter((token) => token.length >= 4 && !WEAK_TERMS.has(token)),
    ),
  ).slice(0, 12)
}

function takeWords(text: string, maxWords: number): string {
  const words = collapseWhitespace(text).split(' ').filter(Boolean)
  if (words.length <= maxWords) return words.join(' ')
  return `${words.slice(0, maxWords).join(' ')}...`
}

function removeTrailingPunctuation(value: string): string {
  return value.replace(/[.!?]+$/g, '').trim()
}

function pickScripture(intent: ParsedAuditIntent, index: number): string {
  if (intent.scriptureAnchors.length > 0) {
    return intent.scriptureAnchors[index % intent.scriptureAnchors.length]
  }

  const fallbacks = ['Psalm 119:105', 'Philippians 4:6-7', 'Romans 8:1']
  return fallbacks[index % fallbacks.length]
}

function uniqueTerms(values: string[]): string[] {
  return Array.from(
    new Set(
      values
        .map((value) => collapseWhitespace(value).toLowerCase())
        .filter((value) => value.length > 2 && !WEAK_TERMS.has(value)),
    ),
  )
}

function buildLenses(
  intent: ParsedAuditIntent,
  keywords: string[],
): DirectionLens[] {
  const termPool = uniqueTerms([
    ...intent.themes,
    ...keywords,
    'faithful attention',
    'wisdom',
    'hope',
    'restoration',
  ])
  const slots: Array<{
    pardes: DirectionLens['pardes']
    chiastic: DirectionLens['chiastic']
  }> = [
    { pardes: 'peshat', chiastic: 'A' },
    { pardes: 'remez', chiastic: 'B' },
    { pardes: 'derash', chiastic: 'C' },
  ]

  return slots.map((slot, index) => {
    const terms = [
      termPool[index] ?? termPool[0] ?? 'faithful attention',
      termPool[index + 1] ?? termPool[1] ?? 'wisdom',
      termPool[index + 2] ?? termPool[2] ?? 'hope',
      termPool[index + 3] ?? termPool[3] ?? 'restoration',
    ]
    return {
      slug: slugify(`${terms[0]} ${terms[1]}`) || `direction-${index + 1}`,
      focusTerms: uniqueTerms(terms).slice(0, 4),
      pardes: slot.pardes,
      chiastic: slot.chiastic,
    }
  })
}

export function selectIngredients(
  responseText: string,
): IngredientSelectionResult {
  const intent = parseAuditIntent(responseText)
  const keywords = extractKeywords(responseText)
  const lenses = buildLenses(intent, keywords)

  const directions: IngredientDirection[] = lenses.map((lens, index) => {
    const rank = index + 1
    const scripture = pickScripture(intent, index)
    const focusTerms = uniqueTerms([
      ...lens.focusTerms,
      ...intent.themes,
      ...keywords,
    ]).slice(0, 6)
    const focusPhrase = focusTerms.slice(0, 2).join(' and ')
    const retrieval = retrieveForDay({
      themes: focusTerms,
      scriptureAnchors: [scripture],
      topic: `${responseText} ${focusTerms.join(' ')}`,
      limit: 20,
      chiasticPosition: lens.chiastic,
      pardesLevel: lens.pardes,
    })

    const topChunk = retrieval.chunks[0]
    const sourceHints = Array.from(
      new Set(retrieval.chunks.map((chunk) => chunk.title)),
    ).slice(0, 4)

    const teachingExcerpt = topChunk
      ? takeWords(topChunk.content, MAX_PREVIEW_WORDS)
      : takeWords(
          `A reference-grounded reading on ${focusPhrase || 'this reflection'}.`,
          MAX_PREVIEW_WORDS,
        )
    const sourceLead = removeTrailingPunctuation(
      topChunk ? takeWords(topChunk.content, 14) : focusPhrase,
    )

    const scriptureText = topChunk
      ? takeWords(topChunk.content, 40)
      : `Read ${scripture} slowly and mark the phrase that resists you and the phrase that restores you.`

    const confidenceRaw =
      retrieval.totalScore / Math.max(1, retrieval.chunks.length * 8)
    const confidence = Number(
      Math.max(0.45, Math.min(0.99, confidenceRaw)).toFixed(3),
    )

    return {
      id: `ai_primary:${lens.slug}:${rank}`,
      rank,
      title: `${toHeadline(focusPhrase || 'Focused Reading')} in ${scripture}`,
      question: `${toHeadline(focusPhrase || 'This Reflection')}: ${sourceLead || scripture}`,
      reasoning:
        sourceHints.length > 0
          ? `Matched themes (${focusTerms.slice(0, 3).join(', ')}) against reference witnesses including ${sourceHints.slice(0, 2).join(' and ')}.`
          : `Matched themes (${focusTerms.slice(0, 3).join(', ')}) and built a reference-first direction.`,
      scriptureAnchor: scripture,
      directionSlug: lens.slug,
      confidence,
      day1Preview: {
        title: `${toHeadline(focusPhrase || 'Focused Reading')} — Day 1`,
        scriptureReference: scripture,
        scriptureText,
        teachingExcerpt,
        reflectionPrompt: `Where does ${scripture} confront or clarify ${focusPhrase || 'this reflection'}?`,
      },
      matchedKeywords: focusTerms,
      referenceSourceHints: sourceHints,
    }
  })

  return {
    directions,
    intent,
    strategy: 'ingredient_selection',
  }
}
