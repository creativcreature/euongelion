import { ALL_SERIES_ORDER, SERIES_DATA } from '@/data/series'
import { clampScriptureSnippet } from '@/lib/scripture-reference'
import type { AuditOptionKind, AuditOptionPreview } from '@/types/soul-audit'
import { PREFAB_FALLBACK_SLUGS, SOUL_AUDIT_OPTION_SPLIT } from './constants'
import {
  getCuratedDayCandidates,
  rankCandidatesForInput,
  type CuratedDayCandidate,
} from './curation-engine'

const TITLE_STOP_WORDS = new Set([
  'about',
  'after',
  'again',
  'also',
  'always',
  'been',
  'being',
  'carry',
  'could',
  'doing',
  'even',
  'feel',
  'from',
  'have',
  'just',
  'like',
  'more',
  'need',
  'over',
  'really',
  'that',
  'them',
  'then',
  'there',
  'they',
  'this',
  'what',
  'when',
  'where',
  'with',
  'would',
  'your',
  'youre',
  'into',
  'through',
  'still',
  'because',
  'every',
  'about',
])

const GENERIC_INTENT_TERMS = new Set([
  'want',
  'learn',
  'need',
  'help',
  'start',
  'daily',
  'here',
  'more',
  'grow',
  'trying',
  'try',
])

const THEME_TERM_NORMALIZATION: Record<string, string> = {
  pray: 'prayer',
  praying: 'prayer',
  bible: 'scripture',
}

export function sanitizeAuditInput(input: unknown): string {
  if (typeof input !== 'string') return ''
  return input
    .trim()
    .slice(0, 2500)
    .replace(/<[^>]*>/g, '')
    .replace(/[<>"']/g, '')
}

function collapseWhitespace(value: string): string {
  return value.replace(/\s+/g, ' ').trim()
}

function toInputSnippet(input: string, maxLength = 88): string {
  const normalized = collapseWhitespace(input)
  if (!normalized) return ''

  const firstSentence = normalized.split(/[.!?]/).find(Boolean)?.trim() ?? ''
  const snippet = firstSentence || normalized
  if (snippet.length <= maxLength) return snippet
  return `${snippet.slice(0, maxLength - 3).trimEnd()}...`
}

function titleCase(word: string): string {
  if (!word) return ''
  return word[0].toUpperCase() + word.slice(1).toLowerCase()
}

function headlineCase(value: string): string {
  return value
    .split(/\s+/)
    .filter(Boolean)
    .map((word) => {
      const normalized = word.toLowerCase()
      if (TITLE_STOP_WORDS.has(normalized)) return normalized
      return titleCase(normalized)
    })
    .join(' ')
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

function extractInputThemeTerms(input: string): string[] {
  const words = collapseWhitespace(input)
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, ' ')
    .split(/\s+/)
    .map((word) => word.trim())
    .filter(
      (word) =>
        word.length >= 4 &&
        !TITLE_STOP_WORDS.has(word) &&
        !GENERIC_INTENT_TERMS.has(word) &&
        /^[a-z0-9-]+$/.test(word),
    )
    .map((word) => THEME_TERM_NORMALIZATION[word] ?? word)

  return Array.from(new Set(words))
}

function pickThemeTerms(input: string, matched: string[]): string[] {
  const inputTerms = extractInputThemeTerms(input)
  const fromMatches = matched
    .map((value) =>
      value
        .toLowerCase()
        .replace(/[^a-z0-9\s-]/g, ' ')
        .trim(),
    )
    .flatMap((value) => value.split(/\s+/))
    .filter((word) => word.length >= 4 && !TITLE_STOP_WORDS.has(word))

  const merged = [...inputTerms, ...fromMatches]
  return Array.from(new Set(merged)).slice(0, 2)
}

function buildAiGeneratedTitle(params: {
  candidate: CuratedDayCandidate
  input: string
  matched: string[]
}): string {
  const themeTerms = pickThemeTerms(params.input, params.matched)
  const dayTitle = collapseWhitespace(params.candidate.dayTitle)
  const coreBurden = extractCoreBurden(params.input, 40)

  const genericIntentPattern =
    /^(want|need|trying|try|hope|looking)\s+to\s+(learn|grow|understand|know|pray)\b/i

  if (genericIntentPattern.test(coreBurden)) {
    return dayTitle
  }

  if (themeTerms.length === 2) {
    return `${headlineCase(`${themeTerms[0]} ${themeTerms[1]}`)}: ${dayTitle}`
  }

  if (themeTerms.length === 1) {
    return `${headlineCase(themeTerms[0])}: ${dayTitle}`
  }

  if (coreBurden.length >= 12) {
    return `${headlineCase(coreBurden)}: ${dayTitle}`
  }

  return dayTitle
}

function buildAiQuestion(params: {
  candidate: CuratedDayCandidate
  input: string
}): string {
  const focus =
    extractCoreBurden(params.input, 84) || toInputSnippet(params.input, 84)
  if (!focus) return params.candidate.reflectionPrompt
  return `As you reflect on "${focus}", ${params.candidate.reflectionPrompt}`
}

function buildAiReasoning(params: {
  candidate: CuratedDayCandidate
  matched: string[]
  input: string
}): string {
  const snippet = toInputSnippet(params.input, 64)
  if (params.matched.length > 0) {
    return `Matched your language (${params.matched.join(', ')}) against curated modules in ${params.candidate.seriesTitle}, day ${params.candidate.dayNumber}.`
  }

  if (snippet) {
    return `Built from curated modules in ${params.candidate.seriesTitle}, tuned to what you shared ("${snippet}").`
  }

  return `Built from curated modules in ${params.candidate.seriesTitle} for this season.`
}

function buildAiPreviewParagraph(params: {
  candidate: CuratedDayCandidate
  input: string
}): string {
  const focus = extractCoreBurden(params.input, 70)
  const teaching = params.candidate.teachingText.slice(0, 230).trim()
  if (!focus) return teaching
  return `Begin with ${params.candidate.scriptureReference} as you reflect on "${focus}". ${teaching}`
}

function parseFramework(seriesFramework: string): {
  reference: string
  text: string
} {
  const normalized = collapseWhitespace(seriesFramework)
  if (!normalized) {
    return {
      reference: 'Scripture',
      text: 'Continue reading with honesty and faithfulness.',
    }
  }

  const [referencePart, ...rest] = normalized.split(/\s+-\s+/)
  const reference = collapseWhitespace(referencePart)
  const text = collapseWhitespace(rest.join(' - '))

  return {
    reference: reference || 'Scripture',
    text: text || 'Continue reading with honesty and faithfulness.',
  }
}

function fallbackCandidateForSeries(slug: string): CuratedDayCandidate | null {
  const series = SERIES_DATA[slug]
  if (!series) return null
  const dayOne = [...series.days].sort((a, b) => a.day - b.day)[0]
  if (!dayOne) return null

  const framework = parseFramework(series.framework)
  return {
    key: `series-fallback:${slug}:1`,
    seriesSlug: slug,
    seriesTitle: series.title,
    sourcePath: 'series-metadata',
    dayNumber: dayOne.day,
    dayTitle: dayOne.title,
    scriptureReference: framework.reference,
    scriptureText: framework.text,
    teachingText: collapseWhitespace(series.introduction || series.context),
    reflectionPrompt: series.question,
    prayerText: `Lord, meet me in this season and guide my next faithful step in ${series.title}.`,
    takeawayText: `Take one concrete action from ${series.title} before today ends.`,
    searchText: [
      slug,
      series.title,
      series.question,
      series.introduction,
      series.context,
      series.keywords.join(' '),
    ]
      .join(' ')
      .toLowerCase(),
  }
}

function choosePrimaryMatches(input: string): Array<{
  candidate: CuratedDayCandidate
  confidence: number
  matched: string[]
}> {
  const candidates = getCuratedDayCandidates()
  const eligibleSeries = new Set<string>()
  const countsBySeries = new Map<string, Set<number>>()

  for (const candidate of candidates) {
    if (!countsBySeries.has(candidate.seriesSlug)) {
      countsBySeries.set(candidate.seriesSlug, new Set<number>())
    }
    countsBySeries.get(candidate.seriesSlug)?.add(candidate.dayNumber)
  }

  for (const [seriesSlug, daySet] of countsBySeries.entries()) {
    if (daySet.size >= 5) {
      eligibleSeries.add(seriesSlug)
    }
  }

  const ranked = rankCandidatesForInput({ input }).filter((entry) =>
    eligibleSeries.size === 0
      ? true
      : eligibleSeries.has(entry.candidate.seriesSlug),
  )
  if (ranked.length === 0) return []

  const topScore = Math.max(1, ranked[0]?.score ?? 1)
  const selected: Array<{
    candidate: CuratedDayCandidate
    confidence: number
    matched: string[]
  }> = []
  const seenSeries = new Set<string>()

  for (const entry of ranked) {
    if (selected.length >= SOUL_AUDIT_OPTION_SPLIT.aiPrimary) break
    if (seenSeries.has(entry.candidate.seriesSlug)) continue
    seenSeries.add(entry.candidate.seriesSlug)
    selected.push({
      candidate: entry.candidate,
      confidence: Math.min(entry.score / topScore, 1),
      matched: entry.matches.slice(0, 3),
    })
  }

  if (selected.length < SOUL_AUDIT_OPTION_SPLIT.aiPrimary) {
    for (const entry of ranked) {
      if (selected.length >= SOUL_AUDIT_OPTION_SPLIT.aiPrimary) break
      if (selected.some((item) => item.candidate.key === entry.candidate.key)) {
        continue
      }
      selected.push({
        candidate: entry.candidate,
        confidence: Math.min(entry.score / topScore, 1),
        matched: entry.matches.slice(0, 3),
      })
    }
  }

  return selected
}

function chooseSeriesMetadataFallbackPrimary(input: string): Array<{
  candidate: CuratedDayCandidate
  confidence: number
  matched: string[]
}> {
  const terms = extractInputThemeTerms(input)
  const scored = ALL_SERIES_ORDER.map((slug) => {
    const candidate = fallbackCandidateForSeries(slug)
    if (!candidate) return null

    const haystack = candidate.searchText
    const matches = terms.filter((term) => haystack.includes(term)).slice(0, 3)
    const score =
      matches.length * 3 +
      (SERIES_DATA[slug]?.pathway === 'Awake' ? 0.3 : 0) +
      (slug.length % 7) / 100
    return { candidate, score, matches }
  })
    .filter(
      (
        entry,
      ): entry is {
        candidate: CuratedDayCandidate
        score: number
        matches: string[]
      } => Boolean(entry),
    )
    .sort((a, b) => b.score - a.score)

  if (scored.length === 0) return []
  const topScore = Math.max(1, scored[0]?.score ?? 1)
  return scored.slice(0, SOUL_AUDIT_OPTION_SPLIT.aiPrimary).map((entry) => ({
    candidate: entry.candidate,
    confidence: Math.max(0.45, Math.min(1, entry.score / topScore)),
    matched: entry.matches,
  }))
}

function makeOption(params: {
  candidate: CuratedDayCandidate
  kind: AuditOptionKind
  rank: number
  confidence: number
  input: string
  matched?: string[]
  variantSeed?: number
}): AuditOptionPreview {
  const matched = params.matched ?? []
  const aiPrimary = params.kind === 'ai_primary'
  const baseTitle = aiPrimary
    ? buildAiGeneratedTitle({
        candidate: params.candidate,
        input: params.input,
        matched,
      })
    : params.candidate.seriesTitle
  const title = baseTitle

  return {
    id: `${params.kind}:${params.candidate.seriesSlug}:${params.candidate.dayNumber}:${params.rank}`,
    slug: params.candidate.seriesSlug,
    kind: params.kind,
    rank: params.rank,
    title,
    question: aiPrimary
      ? buildAiQuestion({
          candidate: params.candidate,
          input: params.input,
        })
      : params.candidate.reflectionPrompt,
    confidence: params.confidence,
    reasoning: aiPrimary
      ? buildAiReasoning({
          candidate: params.candidate,
          matched,
          input: params.input,
        })
      : 'A stable prefab series if you want a proven guided path.',
    preview: {
      verse: params.candidate.scriptureReference,
      verseText: clampScriptureSnippet(params.candidate.scriptureText),
      paragraph: aiPrimary
        ? buildAiPreviewParagraph({
            candidate: params.candidate,
            input: params.input,
          })
        : params.candidate.teachingText.slice(0, 320),
      curationSeed: {
        seriesSlug: params.candidate.seriesSlug,
        dayNumber: params.candidate.dayNumber,
        candidateKey: params.candidate.key,
      },
    },
  }
}

function getPrefabSlugs(primarySlugs: string[]): string[] {
  const countsBySeries = new Map<string, Set<number>>()
  for (const candidate of getCuratedDayCandidates()) {
    if (!countsBySeries.has(candidate.seriesSlug)) {
      countsBySeries.set(candidate.seriesSlug, new Set<number>())
    }
    countsBySeries.get(candidate.seriesSlug)?.add(candidate.dayNumber)
  }

  const curatedSeries = new Set(
    Array.from(countsBySeries.entries())
      .filter(([, days]) => days.size >= 5)
      .map(([seriesSlug]) => seriesSlug),
  )

  const preferred = PREFAB_FALLBACK_SLUGS.filter(
    (slug) =>
      slug in SERIES_DATA &&
      (curatedSeries.size === 0 || curatedSeries.has(slug)) &&
      !primarySlugs.includes(slug),
  )
  if (preferred.length >= SOUL_AUDIT_OPTION_SPLIT.curatedPrefab) {
    return preferred.slice(0, SOUL_AUDIT_OPTION_SPLIT.curatedPrefab)
  }

  const fill = ALL_SERIES_ORDER.filter(
    (slug) =>
      (curatedSeries.size === 0 || curatedSeries.has(slug)) &&
      !primarySlugs.includes(slug) &&
      !preferred.includes(slug),
  )
  const merged = [...preferred, ...fill]
  if (merged.length < SOUL_AUDIT_OPTION_SPLIT.curatedPrefab) {
    const relaxedFill = ALL_SERIES_ORDER.filter(
      (slug) =>
        slug in SERIES_DATA &&
        !primarySlugs.includes(slug) &&
        !merged.includes(slug),
    )
    merged.push(...relaxedFill)
  }
  return merged.slice(0, SOUL_AUDIT_OPTION_SPLIT.curatedPrefab)
}

function hasExpectedOptionSplit(options: AuditOptionPreview[]): boolean {
  const aiPrimary = options.filter((option) => option.kind === 'ai_primary')
  const curatedPrefab = options.filter(
    (option) => option.kind === 'curated_prefab',
  )
  return (
    options.length === SOUL_AUDIT_OPTION_SPLIT.total &&
    aiPrimary.length === SOUL_AUDIT_OPTION_SPLIT.aiPrimary &&
    curatedPrefab.length === SOUL_AUDIT_OPTION_SPLIT.curatedPrefab
  )
}

export function buildAuditOptions(
  input: string,
  variantSeed?: number,
): AuditOptionPreview[] {
  const primary = choosePrimaryMatches(input)
  let aiOptions = primary.map((match, index) =>
    makeOption({
      candidate: match.candidate,
      kind: 'ai_primary',
      rank: index + 1,
      confidence: match.confidence,
      input,
      matched: match.matched,
      variantSeed,
    }),
  )

  if (aiOptions.length < SOUL_AUDIT_OPTION_SPLIT.aiPrimary) {
    const usedSeries = new Set(aiOptions.map((option) => option.slug))
    const countsBySeries = new Map<string, Set<number>>()
    for (const candidate of getCuratedDayCandidates()) {
      if (!countsBySeries.has(candidate.seriesSlug)) {
        countsBySeries.set(candidate.seriesSlug, new Set<number>())
      }
      countsBySeries.get(candidate.seriesSlug)?.add(candidate.dayNumber)
    }

    const fillers = getCuratedDayCandidates()
      .filter((candidate) => {
        if (usedSeries.has(candidate.seriesSlug)) return false
        const dayCount = countsBySeries.get(candidate.seriesSlug)?.size ?? 0
        return dayCount >= 5
      })
      .slice(0, SOUL_AUDIT_OPTION_SPLIT.aiPrimary - aiOptions.length)
      .map((candidate, idx) =>
        makeOption({
          candidate,
          kind: 'ai_primary',
          rank: aiOptions.length + idx + 1,
          confidence: 0.55,
          input,
          variantSeed,
        }),
      )
    aiOptions = [...aiOptions, ...fillers]
  }

  if (
    aiOptions.length > 0 &&
    aiOptions.length < SOUL_AUDIT_OPTION_SPLIT.aiPrimary
  ) {
    let idx = 0
    const source = [...aiOptions]
    while (aiOptions.length < SOUL_AUDIT_OPTION_SPLIT.aiPrimary) {
      const template = source[idx % source.length]
      const dayNumber =
        template.preview &&
        typeof template.preview === 'object' &&
        template.preview.curationSeed &&
        typeof template.preview.curationSeed === 'object' &&
        typeof template.preview.curationSeed.dayNumber === 'number'
          ? template.preview.curationSeed.dayNumber
          : 1
      aiOptions.push({
        ...template,
        id: `ai_primary:${template.slug}:${dayNumber}:${aiOptions.length + 1}`,
        rank: aiOptions.length + 1,
        confidence: Math.max(0.45, template.confidence - 0.05 * idx),
        title: template.title,
      })
      idx += 1
    }
  }

  if (aiOptions.length === 0) {
    const metadataFallback = chooseSeriesMetadataFallbackPrimary(input)
    aiOptions = metadataFallback.map((match, index) =>
      makeOption({
        candidate: match.candidate,
        kind: 'ai_primary',
        rank: index + 1,
        confidence: match.confidence,
        input,
        matched: match.matched,
        variantSeed,
      }),
    )
  }

  aiOptions = aiOptions.slice(0, SOUL_AUDIT_OPTION_SPLIT.aiPrimary)
  if (aiOptions.length === 0) {
    // Fail closed only when both curated and metadata fallback candidates are unavailable.
    return []
  }

  const aiSlugs = aiOptions.map((option) => option.slug)
  const prefabOptions = getPrefabSlugs(aiSlugs)
    .map((slug, index) => {
      const candidate =
        getCuratedDayCandidates().find((item) => item.seriesSlug === slug) ??
        fallbackCandidateForSeries(slug)
      if (!candidate) return null
      return makeOption({
        candidate,
        kind: 'curated_prefab',
        rank: aiOptions.length + index + 1,
        confidence: Math.max(0.35, 0.75 - index * 0.1),
        input,
        variantSeed,
      })
    })
    .filter((option): option is AuditOptionPreview => Boolean(option))

  let assembled = [...aiOptions, ...prefabOptions].slice(
    0,
    SOUL_AUDIT_OPTION_SPLIT.total,
  )
  if (hasExpectedOptionSplit(assembled)) return assembled

  const fallbackPrefabs = ALL_SERIES_ORDER.filter(
    (slug) =>
      !aiSlugs.includes(slug) &&
      !prefabOptions.some((option) => option.slug === slug),
  )
    .slice(0, SOUL_AUDIT_OPTION_SPLIT.curatedPrefab - prefabOptions.length)
    .map((slug, index) => {
      const candidate = fallbackCandidateForSeries(slug)
      if (!candidate) return null
      return makeOption({
        candidate,
        kind: 'curated_prefab',
        rank: aiOptions.length + prefabOptions.length + index + 1,
        confidence: 0.4,
        input,
        variantSeed,
      })
    })
    .filter((option): option is AuditOptionPreview => Boolean(option))

  assembled = [...aiOptions, ...prefabOptions, ...fallbackPrefabs].slice(
    0,
    SOUL_AUDIT_OPTION_SPLIT.total,
  )
  if (hasExpectedOptionSplit(assembled)) return assembled
  return []
}
