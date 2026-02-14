import { ALL_SERIES_ORDER, SERIES_DATA } from '@/data/series'
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
])

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
        /^[a-z0-9-]+$/.test(word),
    )
  return Array.from(new Set(words))
}

function pickThemeTerms(input: string, matched: string[]): string[] {
  const fromMatches = matched
    .map((value) =>
      value
        .toLowerCase()
        .replace(/[^a-z0-9\s-]/g, ' ')
        .trim(),
    )
    .flatMap((value) => value.split(/\s+/))
    .filter((word) => word.length >= 4 && !TITLE_STOP_WORDS.has(word))

  const merged = [...fromMatches, ...extractInputThemeTerms(input)]
  return Array.from(new Set(merged)).slice(0, 2)
}

function buildAiGeneratedTitle(params: {
  candidate: CuratedDayCandidate
  input: string
  matched: string[]
}): string {
  const themeTerms = pickThemeTerms(params.input, params.matched)
  const dayTitle = collapseWhitespace(params.candidate.dayTitle)

  if (themeTerms.length === 2) {
    return `${titleCase(themeTerms[0])} + ${titleCase(themeTerms[1])}: ${dayTitle}`
  }

  if (themeTerms.length === 1) {
    return `${titleCase(themeTerms[0])}: ${dayTitle}`
  }

  const snippet = toInputSnippet(params.input, 52)
  if (snippet.length >= 12) return snippet
  return dayTitle
}

function buildAiQuestion(params: {
  candidate: CuratedDayCandidate
  input: string
}): string {
  const snippet = toInputSnippet(params.input, 84)
  if (!snippet) return params.candidate.reflectionPrompt
  return `You wrote "${snippet}". ${params.candidate.reflectionPrompt}`
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
  const snippet = toInputSnippet(params.input, 74)
  const teaching = params.candidate.teachingText.slice(0, 230).trim()
  if (!snippet) return teaching
  return `From what you shared ("${snippet}"), begin here: ${teaching}`
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

function makeOption(params: {
  candidate: CuratedDayCandidate
  kind: AuditOptionKind
  rank: number
  confidence: number
  input: string
  matched?: string[]
}): AuditOptionPreview {
  const matched = params.matched ?? []
  const aiPrimary = params.kind === 'ai_primary'

  return {
    id: `${params.kind}:${params.candidate.seriesSlug}:${params.candidate.dayNumber}:${params.rank}`,
    slug: params.candidate.seriesSlug,
    kind: params.kind,
    rank: params.rank,
    title: aiPrimary
      ? buildAiGeneratedTitle({
          candidate: params.candidate,
          input: params.input,
          matched,
        })
      : params.candidate.seriesTitle,
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

  return [...preferred, ...fill].slice(0, SOUL_AUDIT_OPTION_SPLIT.curatedPrefab)
}

export function buildAuditOptions(input: string): AuditOptionPreview[] {
  const primary = choosePrimaryMatches(input)
  let aiOptions = primary.map((match, index) =>
    makeOption({
      candidate: match.candidate,
      kind: 'ai_primary',
      rank: index + 1,
      confidence: match.confidence,
      input,
      matched: match.matched,
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
        }),
      )
    aiOptions = [...aiOptions, ...fillers]
  }

  aiOptions = aiOptions.slice(0, SOUL_AUDIT_OPTION_SPLIT.aiPrimary)

  const aiSlugs = aiOptions.map((option) => option.slug)
  const prefabOptions = getPrefabSlugs(aiSlugs)
    .map((slug, index) => {
      const candidate = getCuratedDayCandidates().find(
        (item) => item.seriesSlug === slug,
      )
      if (!candidate) return null

      return makeOption({
        candidate,
        kind: 'curated_prefab',
        rank: aiOptions.length + index + 1,
        confidence: Math.max(0.35, 0.75 - index * 0.1),
        input,
      })
    })
    .filter((option): option is AuditOptionPreview => Boolean(option))

  return [...aiOptions, ...prefabOptions].slice(
    0,
    SOUL_AUDIT_OPTION_SPLIT.total,
  )
}
