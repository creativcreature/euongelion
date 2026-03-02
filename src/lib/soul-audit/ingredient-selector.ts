/**
 * ingredient-selector.ts
 *
 * Strict RAG-first direction selection for Soul Audit.
 *
 * Production behavior:
 * - Uses user input + retrieved reference chunks as the only source context
 * - Uses LLM composition to generate 3 unique pathway cards
 * - No deterministic fallback path in production
 *
 * Test behavior:
 * - Deterministic builder allowed for offline test execution
 */

import {
  parseAuditIntent,
  type ParsedAuditIntent,
} from '@/lib/brain/intent-parser'
import {
  generateWithBrain,
  providerAvailabilityForUser,
} from '@/lib/brain/router'
import { retrieveForDay, type ReferenceChunk } from './reference-retriever'
import { extractScriptureRefs } from './reference-utils'

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
  excludeDirectionTitles?: string[]
  excludeScriptureAnchors?: string[]
}

type GeneratedPath = {
  title: string
  question: string
  reasoning: string
  scriptureReference: string
  scriptureText: string
  teachingExcerpt: string
  focusTerms?: string[]
  sourceHints?: string[]
  slug?: string
}

const DIRECTION_COUNT = 3
const MAX_CONTEXT_CHUNKS = 18
const MAX_CHUNK_CHARS = 900
const MAX_PREVIEW_WORDS = 70
const TEST_SCRIPTURE_POOL = [
  'Psalm 34:18',
  'Philippians 4:6-7',
  'James 1:5',
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
  'how',
  'i',
  'in',
  'into',
  'is',
  'it',
  'its',
  'me',
  'my',
  'of',
  'on',
  'or',
  'our',
  'so',
  'that',
  'the',
  'their',
  'them',
  'these',
  'they',
  'this',
  'those',
  'to',
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

const NOISY_TERMS = new Set([
  'thou',
  'thee',
  'thy',
  'thine',
  'unto',
  'hath',
  'doth',
  'saith',
  'wouldest',
  'whosoever',
  'thereof',
  'herein',
  'wherein',
  'whereof',
  'nay',
  'ye',
  'shall',
])

function collapseWhitespace(value: string): string {
  return value.replace(/\s+/g, ' ').trim()
}

function tokenize(input: string): string[] {
  return input
    .toLowerCase()
    .replace(/[^a-z0-9'\s-]/g, ' ')
    .split(/\s+/)
    .map((token) => token.replace(/^'+|'+$/g, ''))
    .filter(Boolean)
}

function isUsableTerm(term: string): boolean {
  if (!term) return false
  if (term.length < 3 || term.length > 28) return false
  if (!/^[a-z][a-z0-9-]*$/.test(term)) return false
  if (STOPWORDS.has(term) || NOISY_TERMS.has(term)) return false
  return true
}

function extractUserKeywords(input: string): string[] {
  const tokens = tokenize(input).filter(isUsableTerm)
  return Array.from(new Set(tokens)).slice(0, 12)
}

function uniqueTerms(values: string[]): string[] {
  return Array.from(
    new Set(
      values
        .map((value) => collapseWhitespace(value).toLowerCase())
        .filter(isUsableTerm),
    ),
  )
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

function normalizeTitle(value: string): string {
  return collapseWhitespace(value).toLowerCase()
}

function normalizeScriptureRef(value: string): string {
  return collapseWhitespace(value)
    .replace(/\s+/g, ' ')
    .replace(/\s*:\s*/g, ':')
    .trim()
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
  return takeWords(sentence, maxWords)
}

function isProductionStrictMode(): boolean {
  if (process.env.NODE_ENV === 'test') return false
  return process.env.SOUL_AUDIT_STRICT_OPTIONS !== 'off'
}

function rankScriptureCandidates(params: {
  responseText: string
  intent: ParsedAuditIntent
  chunks: ReferenceChunk[]
}): string[] {
  const scores = new Map<string, number>()

  const bump = (reference: string, points: number) => {
    const normalized = normalizeScriptureRef(reference)
    if (!normalized) return
    scores.set(normalized, (scores.get(normalized) ?? 0) + points)
  }

  for (const reference of extractScriptureRefs(params.responseText)) {
    bump(reference, 16)
  }

  for (const reference of params.intent.scriptureAnchors) {
    bump(reference, 10)
  }

  params.chunks.forEach((chunk, index) => {
    const depthWeight = Math.max(1, 8 - Math.floor(index / 3))
    for (const reference of chunk.scriptureRefs ?? []) {
      bump(reference, depthWeight)
    }
  })

  return Array.from(scores.entries())
    .sort((a, b) => b[1] - a[1])
    .map(([reference]) => reference)
    .slice(0, 24)
}

function buildGenerationContext(chunks: ReferenceChunk[]): string {
  return chunks
    .slice(0, MAX_CONTEXT_CHUNKS)
    .map((chunk, index) => {
      const refs = (chunk.scriptureRefs ?? []).slice(0, 4).join('; ')
      const content = chunk.content.slice(0, MAX_CHUNK_CHARS)
      return [
        `[${index + 1}] ${chunk.sourceType.toUpperCase()} | ${chunk.title}`,
        refs ? `Scripture refs: ${refs}` : 'Scripture refs: none listed',
        `Excerpt: ${content}`,
      ].join('\n')
    })
    .join('\n\n')
}

function buildSystemPrompt(): string {
  return `You generate Soul Audit pathway cards.

NON-NEGOTIABLE RULES:
- Build all copy from USER INPUT + PROVIDED RAG REFERENCES only.
- Do not use canned themes, canned titles, canned scripture defaults, or fallback devotional templates.
- Do not frame everything as burden/suffering unless the user input explicitly indicates it.
- Return exactly 3 pathways, each meaningfully distinct.
- Each title must be a full sentence (9-18 words) and must end with a period.
- Each pathway must include a real scripture focus with the scripture text written out.
- Scripture references must come from the provided ALLOWED SCRIPTURE REFERENCES list.
- Pathways must directly answer the user's ask (teaching ask, emotional ask, discipleship ask, etc.).
- Do not echo raw user input as the title.

OUTPUT JSON ONLY:
{
  "paths": [
    {
      "title": "Full sentence title.",
      "question": "One question that engages the user's ask.",
      "reasoning": "One concise reason this path fits, citing source titles.",
      "scriptureReference": "Book Chapter:Verse[-Verse]",
      "scriptureText": "Write the scripture text explicitly.",
      "teachingExcerpt": "2-4 sentence preview written from references.",
      "focusTerms": ["term1", "term2", "term3"],
      "sourceHints": ["Source title 1", "Source title 2"],
      "slug": "optional-slug"
    }
  ]
}`
}

function buildUserPrompt(params: {
  responseText: string
  userKeywords: string[]
  chunks: ReferenceChunk[]
  scriptureCandidates: string[]
  excludeDirectionSlugs: string[]
  excludeDirectionTitles: string[]
  excludeScriptureAnchors: string[]
}): string {
  const allowedRefs = params.scriptureCandidates
    .slice(0, 16)
    .map((reference) => `- ${reference}`)
    .join('\n')

  const excludedSlugs = params.excludeDirectionSlugs
    .slice(0, 40)
    .map((value) => `- ${value}`)
    .join('\n')

  const excludedTitles = params.excludeDirectionTitles
    .slice(0, 40)
    .map((value) => `- ${value}`)
    .join('\n')

  const excludedScriptures = params.excludeScriptureAnchors
    .slice(0, 40)
    .map((value) => `- ${value}`)
    .join('\n')

  return [
    `USER INPUT:\n${params.responseText.slice(0, 1000)}`,
    `USER KEYWORDS:\n${params.userKeywords.join(', ') || '(none extracted)'}`,
    `ALLOWED SCRIPTURE REFERENCES (must choose from this list):\n${allowedRefs || '(none provided)'}`,
    `DO NOT REUSE THESE DIRECTION SLUGS:\n${excludedSlugs || '(none)'}`,
    `DO NOT REUSE THESE TITLES:\n${excludedTitles || '(none)'}`,
    `DO NOT REUSE THESE SCRIPTURE REFERENCES:\n${excludedScriptures || '(none)'}`,
    `REFERENCE LIBRARY CONTEXT:\n${buildGenerationContext(params.chunks)}`,
  ].join('\n\n')
}

function parseGeneratedPaths(raw: string): GeneratedPath[] | null {
  try {
    const cleaned = raw
      .replace(/^```json?\s*\n?/i, '')
      .replace(/\n?```\s*$/i, '')
      .trim()
    const parsed = JSON.parse(cleaned) as { paths?: unknown }
    if (!Array.isArray(parsed.paths)) return null

    const result: GeneratedPath[] = []
    for (const item of parsed.paths) {
      if (!item || typeof item !== 'object') continue
      const record = item as Record<string, unknown>
      const title = typeof record.title === 'string' ? record.title : ''
      const question = typeof record.question === 'string' ? record.question : ''
      const reasoning =
        typeof record.reasoning === 'string' ? record.reasoning : ''
      const scriptureReference =
        typeof record.scriptureReference === 'string'
          ? record.scriptureReference
          : ''
      const scriptureText =
        typeof record.scriptureText === 'string' ? record.scriptureText : ''
      const teachingExcerpt =
        typeof record.teachingExcerpt === 'string'
          ? record.teachingExcerpt
          : ''
      const focusTerms = Array.isArray(record.focusTerms)
        ? (record.focusTerms as unknown[])
            .filter((value): value is string => typeof value === 'string')
            .slice(0, 8)
        : []
      const sourceHints = Array.isArray(record.sourceHints)
        ? (record.sourceHints as unknown[])
            .filter((value): value is string => typeof value === 'string')
            .slice(0, 6)
        : []
      const slug = typeof record.slug === 'string' ? record.slug : undefined

      result.push({
        title,
        question,
        reasoning,
        scriptureReference,
        scriptureText,
        teachingExcerpt,
        focusTerms,
        sourceHints,
        slug,
      })
    }

    return result
  } catch {
    return null
  }
}

function enforceSentenceTitle(title: string): string {
  const normalized = collapseWhitespace(title)
  if (!normalized) return ''
  return /[.!?]$/.test(normalized) ? normalized : `${normalized}.`
}

function confidenceFromCoverage(params: {
  baseRetrievalScore: number
  chunkCount: number
}): number {
  const raw =
    params.baseRetrievalScore / Math.max(1, params.chunkCount * 7.5)
  return Number(Math.max(0.5, Math.min(0.99, raw)).toFixed(3))
}

async function generatePathsFromRag(params: {
  responseText: string
  intent: ParsedAuditIntent
  userKeywords: string[]
  baseChunks: ReferenceChunk[]
  scriptureCandidates: string[]
  excludeDirectionSlugs: string[]
  excludeDirectionTitles: string[]
  excludeScriptureAnchors: string[]
}): Promise<GeneratedPath[]> {
  const availability = providerAvailabilityForUser({
    platformKeysEnabled: true,
  })
  const hasProvider = availability.some((entry) => entry.available)
  if (!hasProvider) {
    throw new Error('OPTION_COMPOSER_UNAVAILABLE')
  }

  const system = buildSystemPrompt()
  const user = buildUserPrompt({
    responseText: params.responseText,
    userKeywords: params.userKeywords,
    chunks: params.baseChunks,
    scriptureCandidates: params.scriptureCandidates,
    excludeDirectionSlugs: params.excludeDirectionSlugs,
    excludeDirectionTitles: params.excludeDirectionTitles,
    excludeScriptureAnchors: params.excludeScriptureAnchors,
  })

  const generated = await generateWithBrain({
    system,
    messages: [{ role: 'user', content: user }],
    context: {
      task: 'audit_option_polish',
      mode: 'auto',
      maxOutputTokens: 1800,
      qualityFloor: 0.35,
    },
  })

  if (!generated.output || generated.output.trim().length === 0) {
    throw new Error('OPTION_COMPOSER_EMPTY_OUTPUT')
  }

  const paths = parseGeneratedPaths(generated.output)
  if (!paths || paths.length < DIRECTION_COUNT) {
    throw new Error('OPTION_COMPOSER_PARSE_FAILED')
  }

  return paths.slice(0, DIRECTION_COUNT)
}

function deterministicPathsForTests(params: {
  responseText: string
  userKeywords: string[]
  baseChunks: ReferenceChunk[]
  scriptureCandidates: string[]
}): GeneratedPath[] {
  const keywords = params.userKeywords
  const focus = keywords.length > 0 ? keywords : ['scripture', 'formation', 'wisdom']
  const scriptures = params.scriptureCandidates
  const sourceHints = Array.from(new Set(params.baseChunks.map((chunk) => chunk.title))).slice(0, 6)

  return Array.from({ length: DIRECTION_COUNT }, (_, index) => {
    const theme = focus[index % focus.length] ?? `focus-${index + 1}`
    const angle = focus[(index + 1) % focus.length] ?? theme
    const scriptureReference = scriptures[index % Math.max(1, scriptures.length)] ?? ''
    return {
      title: `This pathway gives a focused study of ${theme} through ${angle} in Scripture.`,
      question: `What changes when ${scriptureReference || 'this scripture focus'} reframes ${theme} this week?`,
      reasoning: sourceHints[0]
        ? `Built from reference witnesses including ${sourceHints.slice(0, 2).join(' and ')}.`
        : 'Built from retrieved reference witnesses.',
      scriptureReference,
      scriptureText: `Scripture focus for this pathway: ${scriptureReference || 'reference unavailable in test mode'}.`,
      teachingExcerpt: firstSentence(
        params.baseChunks[index]?.content ||
          `This pathway addresses ${theme} with direct theological grounding and practical application.`,
        MAX_PREVIEW_WORDS,
      ),
      focusTerms: uniqueTerms([theme, angle, ...focus.slice(0, 3)]),
      sourceHints,
      slug: `${theme}-${angle}-${index + 1}`,
    }
  })
}

export async function selectIngredients(
  responseText: string,
  options: IngredientSelectionOptions = {},
): Promise<IngredientSelectionResult> {
  const intent = parseAuditIntent(responseText)
  const userKeywords = extractUserKeywords(responseText)

  const baseRetrieval = retrieveForDay({
    themes: uniqueTerms([...intent.themes, ...userKeywords]).slice(0, 10),
    scriptureAnchors: intent.scriptureAnchors,
    topic: responseText,
    limit: 25,
  })

  if (baseRetrieval.chunks.length === 0) {
    throw new Error('REFERENCE_LIBRARY_UNAVAILABLE')
  }

  const strict = isProductionStrictMode()
  const scriptureCandidates = rankScriptureCandidates({
    responseText,
    intent,
    chunks: baseRetrieval.chunks,
  }).filter((reference) => reference.length > 0)

  if (!strict && scriptureCandidates.length < DIRECTION_COUNT) {
    for (const reference of TEST_SCRIPTURE_POOL) {
      if (!scriptureCandidates.includes(reference)) {
        scriptureCandidates.push(reference)
      }
      if (scriptureCandidates.length >= DIRECTION_COUNT) break
    }
  }

  if (strict && scriptureCandidates.length < DIRECTION_COUNT) {
    throw new Error('SCRIPTURE_CANDIDATES_INSUFFICIENT')
  }

  const excludeDirectionSlugs = (options.excludeDirectionSlugs ?? []).map((value) => slugify(value))
  const excludeDirectionTitles = (options.excludeDirectionTitles ?? []).map((value) => normalizeTitle(value))
  const excludeScriptureAnchors = (options.excludeScriptureAnchors ?? []).map((value) => normalizeScriptureRef(value))

  const rawPaths = strict
    ? await generatePathsFromRag({
        responseText,
        intent,
        userKeywords,
        baseChunks: baseRetrieval.chunks,
        scriptureCandidates,
        excludeDirectionSlugs,
        excludeDirectionTitles,
        excludeScriptureAnchors,
      })
    : deterministicPathsForTests({
        responseText,
        userKeywords,
        baseChunks: baseRetrieval.chunks,
        scriptureCandidates,
      })

  const usedTitles = new Set(excludeDirectionTitles)
  const usedSlugs = new Set(excludeDirectionSlugs)
  const usedScriptures = new Set(excludeScriptureAnchors)

  const directions: IngredientDirection[] = []

  for (const raw of rawPaths) {
    let title = enforceSentenceTitle(raw.title)
    const question = collapseWhitespace(raw.question)
    const reasoning = collapseWhitespace(raw.reasoning)
    const scriptureAnchor = normalizeScriptureRef(raw.scriptureReference)
    const scriptureText = collapseWhitespace(raw.scriptureText)
    const teachingExcerpt = takeWords(collapseWhitespace(raw.teachingExcerpt), MAX_PREVIEW_WORDS)

    if (!title || !question || !reasoning || !scriptureAnchor || !scriptureText || !teachingExcerpt) {
      if (strict) throw new Error('OPTION_COMPOSER_MISSING_FIELDS')
      continue
    }

    let normalizedTitle = normalizeTitle(title)
    if (usedTitles.has(normalizedTitle)) {
      if (strict) throw new Error('OPTION_COMPOSER_DUPLICATE_TITLE')
      let variantCounter = 1
      const baseTitle = title.replace(/[.!?]+$/g, '')
      do {
        title = `${baseTitle} Path ${variantCounter}.`
        normalizedTitle = normalizeTitle(title)
        variantCounter += 1
      } while (usedTitles.has(normalizedTitle) && variantCounter < 20)
    }

    if (strict && usedScriptures.has(scriptureAnchor)) {
      throw new Error('OPTION_COMPOSER_DUPLICATE_SCRIPTURE')
    }

    if (strict && !scriptureCandidates.includes(scriptureAnchor)) {
      throw new Error('OPTION_COMPOSER_INVALID_SCRIPTURE')
    }

    let directionSlug = slugify(raw.slug || title || scriptureAnchor)
    if (!directionSlug) directionSlug = `path-${directions.length + 1}`
    let slugAttempt = 1
    while (usedSlugs.has(directionSlug)) {
      directionSlug = `${directionSlug}-${slugAttempt}`
      slugAttempt += 1
    }

    const sourceHints = Array.from(
      new Set((raw.sourceHints ?? []).map((value) => collapseWhitespace(value)).filter(Boolean)),
    ).slice(0, 5)
    if (strict && sourceHints.length === 0) {
      throw new Error('OPTION_COMPOSER_MISSING_SOURCES')
    }

    const matchedKeywords = uniqueTerms([
      ...userKeywords,
      ...(raw.focusTerms ?? []),
      ...intent.themes,
      ...extractUserKeywords(title),
      ...extractUserKeywords(question),
    ]).slice(0, 8)

    directions.push({
      id: `ai_primary:${directionSlug}:${directions.length + 1}`,
      rank: directions.length + 1,
      title,
      question,
      reasoning,
      scriptureAnchor,
      directionSlug,
      confidence: confidenceFromCoverage({
        baseRetrievalScore: baseRetrieval.totalScore,
        chunkCount: baseRetrieval.chunks.length,
      }),
      day1Preview: {
        title: `Day 1 studies ${toHeadline(matchedKeywords.slice(0, 2).join(' ') || 'this pathway')} in context.`,
        scriptureReference: scriptureAnchor,
        scriptureText,
        teachingExcerpt,
        reflectionPrompt: `What does ${scriptureAnchor} illuminate about ${matchedKeywords.slice(0, 3).join(', ')} today?`,
      },
      matchedKeywords,
      referenceSourceHints: sourceHints,
    })

    usedTitles.add(normalizedTitle)
    usedSlugs.add(directionSlug)
    usedScriptures.add(scriptureAnchor)

    if (directions.length >= DIRECTION_COUNT) break
  }

  if (strict && directions.length < DIRECTION_COUNT) {
    throw new Error('OPTION_COMPOSER_INSUFFICIENT_VALID_PATHS')
  }

  return {
    directions: directions.slice(0, DIRECTION_COUNT),
    intent,
    strategy: 'ingredient_selection',
  }
}
