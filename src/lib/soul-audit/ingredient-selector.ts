/**
 * ingredient-selector.ts
 *
 * RAG-first direction selection for Soul Audit.
 *
 * Directions are constructed from:
 * 1) terms extracted from the user's raw input
 * 2) reference chunks retrieved with those exact terms
 *
 * No pre-authored devotional modules are used in this selector.
 */

import {
  parseAuditIntent,
  type ParsedAuditIntent,
} from '@/lib/brain/intent-parser'
import {
  retrieveForDay,
  type ReferenceChunk,
} from './reference-retriever'

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

export interface IngredientSelectionOptions {
  excludeDirectionSlugs?: string[]
}

type DirectionSeed = {
  slug: string
  focusTerms: string[]
  chiastic: 'A' | 'B' | 'C'
  pardes: 'peshat' | 'remez' | 'derash'
  seedChunk: ReferenceChunk | null
}

const DIRECTION_COUNT = 3
const MAX_PREVIEW_WORDS = 65
const CHIASTIC_BY_RANK: Array<'A' | 'B' | 'C'> = ['A', 'B', 'C']
const PARDES_BY_RANK: Array<'peshat' | 'remez' | 'derash'> = [
  'peshat',
  'remez',
  'derash',
]

const STOPWORDS = new Set([
  'a',
  'an',
  'and',
  'are',
  'as',
  'at',
  'be',
  'been',
  'but',
  'for',
  'from',
  'have',
  'help',
  'how',
  'i',
  'in',
  'into',
  'is',
  'it',
  'its',
  'just',
  'learn',
  'lately',
  'me',
  'my',
  'of',
  'on',
  'or',
  'our',
  'please',
  'really',
  'so',
  'teach',
  'that',
  'the',
  'their',
  'them',
  'these',
  'they',
  'this',
  'those',
  'to',
  'today',
  'very',
  'want',
  'was',
  'we',
  'what',
  'when',
  'where',
  'which',
  'who',
  'why',
  'with',
  'you',
  'your',
])

function collapseWhitespace(value: string): string {
  return value.replace(/\s+/g, ' ').trim()
}

function toHeadline(value: string): string {
  const cleaned = collapseWhitespace(value).toLowerCase()
  if (!cleaned) return 'Reading Direction'
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

function tokenize(input: string): string[] {
  return input
    .toLowerCase()
    .replace(/[^a-z0-9'\s-]/g, ' ')
    .split(/\s+/)
    .map((token) => token.replace(/^'+|'+$/g, ''))
    .filter(Boolean)
}

function extractUserKeywords(input: string): string[] {
  const raw = tokenize(input).filter((token) => token.length >= 3)
  const filtered = raw.filter((token) => !STOPWORDS.has(token))
  const chosen = filtered.length > 0 ? filtered : raw
  return Array.from(new Set(chosen)).slice(0, 12)
}

function uniqueTerms(values: string[]): string[] {
  return Array.from(
    new Set(
      values
        .map((value) => collapseWhitespace(value).toLowerCase())
        .filter((value) => value.length >= 3 && !STOPWORDS.has(value)),
    ),
  )
}

function takeWords(text: string, maxWords: number): string {
  const words = collapseWhitespace(text).split(' ').filter(Boolean)
  if (words.length <= maxWords) return words.join(' ')
  return `${words.slice(0, maxWords).join(' ')}...`
}

function firstSentence(text: string, maxWords: number): string {
  const normalized = collapseWhitespace(text)
  if (!normalized) return ''
  const sentence = normalized.split(/(?<=[.!?])\s+/)[0] ?? normalized
  return takeWords(sentence, maxWords).replace(/[.!?]+$/g, '')
}

function pickScripture(
  intent: ParsedAuditIntent,
  index: number,
  seedChunk: ReferenceChunk | null,
): string {
  const chunkScripture = seedChunk?.scriptureRefs?.[0]
  if (chunkScripture) return chunkScripture

  if (intent.scriptureAnchors.length > 0) {
    return intent.scriptureAnchors[index % intent.scriptureAnchors.length]
  }

  const fallbacks = ['Psalm 119:105', 'Philippians 4:6-7', 'Romans 8:1']
  return fallbacks[index % fallbacks.length]
}

function pickDistinctSeedChunks(chunks: ReferenceChunk[]): ReferenceChunk[] {
  const picked: ReferenceChunk[] = []
  const seenTitles = new Set<string>()

  for (const chunk of chunks) {
    if (picked.length >= DIRECTION_COUNT) break
    const titleKey = collapseWhitespace(chunk.title || '').toLowerCase()
    if (titleKey && seenTitles.has(titleKey)) continue
    if (titleKey) seenTitles.add(titleKey)
    picked.push(chunk)
  }

  for (const chunk of chunks) {
    if (picked.length >= DIRECTION_COUNT) break
    if (picked.some((selected) => selected.id === chunk.id)) continue
    picked.push(chunk)
  }

  return picked
}

function buildDirectionSeeds(params: {
  responseText: string
  userKeywords: string[]
  seedChunks: ReferenceChunk[]
  excludeDirectionSlugs?: string[]
}): DirectionSeed[] {
  const { responseText, userKeywords, seedChunks } = params
  const baseKeywords =
    userKeywords.length > 0 ? userKeywords : extractUserKeywords(responseText)
  const expansionPool = uniqueTerms(
    seedChunks.flatMap((chunk) => [
      ...(chunk.keywords ?? []),
      ...extractUserKeywords(chunk.title),
      ...extractUserKeywords(takeWords(chunk.content, 120)),
    ]),
  ).filter((term) => !baseKeywords.includes(term))

  const seeds: DirectionSeed[] = []
  const excludedSlugs = new Set(
    (params.excludeDirectionSlugs ?? []).map((slug) => slugify(slug)),
  )
  const usedSlugs = new Set<string>(excludedSlugs)

  for (let i = 0; i < DIRECTION_COUNT; i++) {
    const seedChunk = seedChunks[i] ?? seedChunks[0] ?? null
    const chunkTerms = seedChunk
      ? uniqueTerms([
          ...(seedChunk.keywords ?? []),
          ...extractUserKeywords(seedChunk.title),
        ])
      : []
    const rotated = [...baseKeywords.slice(i), ...baseKeywords.slice(0, i)]
    const expansionTerms = [
      expansionPool[(i * 2) % Math.max(1, expansionPool.length)],
      expansionPool[(i * 2 + 1) % Math.max(1, expansionPool.length)],
      expansionPool[(i * 2 + 2) % Math.max(1, expansionPool.length)],
    ].filter((term): term is string => Boolean(term))

    let focusTerms = uniqueTerms([
      ...baseKeywords,
      ...rotated.slice(0, 4),
      ...chunkTerms,
      ...expansionTerms,
    ]).slice(0, 8)

    if (focusTerms.length === 0) {
      focusTerms = baseKeywords.slice(0, 3)
    }
    if (baseKeywords[0] && !focusTerms.includes(baseKeywords[0])) {
      focusTerms = uniqueTerms([baseKeywords[0], ...focusTerms]).slice(0, 8)
    }

    let slugBasis = focusTerms.slice(0, 4).join(' ')
    let slug = slugify(slugBasis) || `direction-${i + 1}`
    let uniquenessAttempt = 0
    while (usedSlugs.has(slug) && uniquenessAttempt < 6) {
      const uniquenessTerm =
        expansionPool[(i * 3 + uniquenessAttempt) % Math.max(1, expansionPool.length)] ??
        chunkTerms[uniquenessAttempt] ??
        baseKeywords[(i + uniquenessAttempt) % Math.max(1, baseKeywords.length)] ??
        String(i + 1)
      focusTerms = uniqueTerms([baseKeywords[0] ?? '', uniquenessTerm, ...focusTerms]).slice(0, 8)
      slugBasis = focusTerms.slice(0, 4).join(' ')
      slug = slugify(slugBasis) || `direction-${i + 1}-${uniquenessAttempt + 1}`
      uniquenessAttempt += 1
    }
    if (usedSlugs.has(slug)) {
      slug = `${slug}-${i + 1}`
    }
    usedSlugs.add(slug)

    seeds.push({
      slug,
      focusTerms,
      chiastic: CHIASTIC_BY_RANK[i] ?? 'C',
      pardes: PARDES_BY_RANK[i] ?? 'derash',
      seedChunk,
    })
  }

  return seeds
}

export function selectIngredients(
  responseText: string,
  options: IngredientSelectionOptions = {},
): IngredientSelectionResult {
  const intent = parseAuditIntent(responseText)
  const userKeywords = extractUserKeywords(responseText)
  const topicKeywords = userKeywords.slice(0, 2)
  const topicLabel = topicKeywords.join(' ')

  const baseRetrieval = retrieveForDay({
    themes: userKeywords,
    scriptureAnchors: intent.scriptureAnchors,
    topic: responseText,
    limit: 25,
  })

  const seedChunks = pickDistinctSeedChunks(baseRetrieval.chunks)
  const seeds = buildDirectionSeeds({
    responseText,
    userKeywords,
    seedChunks,
    excludeDirectionSlugs: options.excludeDirectionSlugs,
  })

  const directions: IngredientDirection[] = seeds.map((seed, index) => {
    const rank = index + 1
    const scripture = pickScripture(intent, index, seed.seedChunk)

    const retrieval = retrieveForDay({
      themes: seed.focusTerms,
      scriptureAnchors: [scripture],
      topic: `${responseText} ${seed.focusTerms.join(' ')} ${seed.seedChunk?.title ?? ''}`,
      limit: 20,
      chiasticPosition: seed.chiastic,
      pardesLevel: seed.pardes,
    })

    const topChunk = retrieval.chunks[0] ?? seed.seedChunk
    const sourceHints = Array.from(
      new Set(retrieval.chunks.map((chunk) => chunk.title)),
    ).slice(0, 4)

    const focusPhrase = seed.focusTerms.slice(0, 2).join(' ')
    const sourceLead = topChunk ? firstSentence(topChunk.content, 18) : ''

    const teachingExcerpt = topChunk
      ? takeWords(topChunk.content, MAX_PREVIEW_WORDS)
      : takeWords(responseText, MAX_PREVIEW_WORDS)

    const scriptureText = topChunk
      ? takeWords(topChunk.content, 40)
      : `Read ${scripture} slowly and mark the phrase that names your current question and the phrase that names the promise.`

    const confidenceRaw =
      retrieval.totalScore / Math.max(1, retrieval.chunks.length * 8)
    const confidence = Number(
      Math.max(0.45, Math.min(0.99, confidenceRaw)).toFixed(3),
    )

    const reasoningTerms = seed.focusTerms.slice(0, 3).join(', ')
    const reasoningSources =
      sourceHints.length > 0
        ? sourceHints.slice(0, 2).join(' and ')
        : topChunk?.title || 'retrieved witnesses'
    const pathwayTerms = seed.focusTerms
      .filter((term) => !topicKeywords.includes(term))
      .slice(0, 2)
      .join(' ')
    const titleTopic =
      topicLabel ||
      seed.focusTerms.slice(0, 2).join(' ') ||
      collapseWhitespace(responseText).slice(0, 60)
    const titlePathway =
      pathwayTerms ||
      extractUserKeywords(sourceHints[0] ?? '').slice(0, 2).join(' ') ||
      seed.focusTerms[0] ||
      titleTopic

    return {
      id: `ai_primary:${seed.slug}:${rank}`,
      rank,
      title: `${toHeadline(titleTopic)}: ${toHeadline(titlePathway)}`,
      question: sourceLead
        ? `${toHeadline(titlePathway)} from ${scripture}: ${sourceLead}`
        : `${toHeadline(titlePathway)} through ${scripture}`,
      reasoning: `Matched input terms (${reasoningTerms}) against ${reasoningSources}.`,
      scriptureAnchor: scripture,
      directionSlug: seed.slug,
      confidence,
      day1Preview: {
        title: `${toHeadline(titleTopic)} — ${toHeadline(titlePathway)} (Day 1)`,
        scriptureReference: scripture,
        scriptureText,
        teachingExcerpt,
        reflectionPrompt: `How does ${scripture} speak into ${focusPhrase || collapseWhitespace(responseText).slice(0, 90)}?`,
      },
      matchedKeywords: seed.focusTerms,
      referenceSourceHints: sourceHints,
    }
  })

  return {
    directions,
    intent,
    strategy: 'ingredient_selection',
  }
}
