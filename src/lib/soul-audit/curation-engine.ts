import { SERIES_DATA } from '@/data/series'
import { getCuratedCatalog } from './curated-catalog'

export interface CurationSeed {
  seriesSlug: string
  dayNumber: number
  candidateKey: string
}

export interface CuratedDayCandidate {
  key: string
  seriesSlug: string
  seriesTitle: string
  sourcePath: string
  dayNumber: number
  dayTitle: string
  scriptureReference: string
  scriptureText: string
  teachingText: string
  reflectionPrompt: string
  prayerText: string
  takeawayText: string
  searchText: string
}

function toLine(value: unknown): string {
  return typeof value === 'string' && value.trim().length > 0
    ? value.trim()
    : ''
}

function clampText(value: string, maxLength: number): string {
  const normalized = value.replace(/\s+/g, ' ').trim()
  if (!normalized) return ''
  if (normalized.length <= maxLength) return normalized
  return `${normalized.slice(0, maxLength - 3).trimEnd()}...`
}

function moduleText(
  module: Record<string, unknown> | undefined,
  keys: string[],
): string {
  if (!module) return ''
  for (const key of keys) {
    const value = toLine(module[key])
    if (value) return value
  }
  return ''
}

function extractKeywords(input: string): string[] {
  return Array.from(
    new Set(
      input
        .toLowerCase()
        .replace(/[^a-z0-9\s-]/g, ' ')
        .split(/\s+/)
        .map((word) => word.trim())
        .filter((word) => word.length >= 4),
    ),
  ).slice(0, 20)
}

export function expandSemanticHints(input: string): string {
  const lower = input.toLowerCase()
  const hints: Array<{ trigger: RegExp; inject: string }> = [
    {
      trigger: /\btoo much on my plate\b/,
      inject: 'busy overwhelmed exhausted',
    },
    {
      trigger: /\boverloaded\b|\boverwhelm(ed|ing)?\b/,
      inject: 'busy anxiety',
    },
    { trigger: /\bburn(ed|out)?\b/, inject: 'exhausted rest peace' },
    {
      trigger: /\banxious|anxiety|panic|stress(ed)?\b/,
      inject: 'peace control worry',
    },
    { trigger: /\blonely|alone|isolated\b/, inject: 'community relationships' },
    {
      trigger: /\bconfused|uncertain|misinformation|truth\b/,
      inject: 'truth discern',
    },
    { trigger: /\bguilty|shame|sin\b/, inject: 'grace mercy forgiveness' },
    { trigger: /\bdoubt|skeptic|skeptical\b/, inject: 'belief trust gospel' },
  ]

  let expanded = lower
  for (const hint of hints) {
    if (hint.trigger.test(lower)) {
      expanded += ` ${hint.inject}`
    }
  }
  return expanded
}

function deriveFrameworkReference(value: string): string {
  if (!value) return ''
  const [reference] = value.split(' - ')
  return reference?.trim() || value.trim()
}

function buildSeriesMetadataFallbackCandidates(): CuratedDayCandidate[] {
  const fallbackCandidates: CuratedDayCandidate[] = []
  const sourcePath = 'src/data/series.ts (metadata fallback)'

  for (const [slug, series] of Object.entries(SERIES_DATA)) {
    const frameworkReference = deriveFrameworkReference(series.framework)
    const teachingBase = clampText(
      `${series.introduction} ${series.context}`,
      320,
    )

    for (const day of series.days) {
      const dayKey = `${slug}:${day.day}:metadata`
      const dayTitle = day.title.trim() || `Day ${day.day}`
      const reflectionPrompt =
        series.question.trim() ||
        `What is one honest response you have to "${dayTitle}" today?`
      const prayerText = `Jesus, meet me in "${dayTitle}" today. Teach me to walk in truth, humility, and faithful action.`
      const takeawayText = `Practice "${dayTitle}" in one concrete action before the day ends.`
      const scriptureText = clampText(
        `${series.framework}. ${series.introduction}`,
        280,
      )

      fallbackCandidates.push({
        key: dayKey,
        seriesSlug: slug,
        seriesTitle: series.title,
        sourcePath,
        dayNumber: day.day,
        dayTitle,
        scriptureReference: frameworkReference || series.framework,
        scriptureText,
        teachingText: teachingBase || scriptureText,
        reflectionPrompt,
        prayerText,
        takeawayText,
        searchText: [
          slug,
          series.title,
          dayTitle,
          series.question,
          series.framework,
          series.introduction,
          series.context,
          ...series.keywords,
        ]
          .join(' ')
          .toLowerCase(),
      })
    }
  }

  return fallbackCandidates
}

let cachedCandidates: CuratedDayCandidate[] | null = null

export function getCuratedDayCandidates(): CuratedDayCandidate[] {
  if (cachedCandidates) return cachedCandidates

  const candidates: CuratedDayCandidate[] = []
  for (const series of getCuratedCatalog().values()) {
    for (const day of series.days) {
      const modules = day.modules
        .map((entry) => entry as Record<string, unknown>)
        .sort((a, b) => Number(a.order ?? 0) - Number(b.order ?? 0))

      const byType = new Map<string, Record<string, unknown>>()
      for (const entry of modules) {
        const type = toLine(entry.type).toLowerCase()
        if (!type || byType.has(type)) continue
        byType.set(type, entry)
      }

      const scripture = byType.get('scripture')
      const teaching = byType.get('teaching')
      const reflection = byType.get('reflection')
      const prayer = byType.get('prayer')
      const takeaway = byType.get('takeaway')
      const bridge = byType.get('bridge')

      const scriptureReference =
        moduleText(scripture, ['reference']) || toLine(day.scriptureReference)
      const scriptureText = moduleText(scripture, ['text', 'passage'])
      const teachingText = moduleText(teaching, ['body', 'content'])
      const reflectionPrompt = moduleText(reflection, ['prompt', 'content'])
      const prayerText = moduleText(prayer, ['text', 'prayerText', 'content'])
      const takeawayText =
        moduleText(takeaway, ['commitment']) ||
        moduleText(bridge, ['modernApplication', 'connectionPoint'])

      // Fail closed at candidate level: no placeholders.
      if (
        !scriptureReference ||
        !scriptureText ||
        !teachingText ||
        !reflectionPrompt ||
        !prayerText ||
        !takeawayText
      ) {
        continue
      }

      const seriesMeta = SERIES_DATA[series.slug]
      const searchText = [
        series.slug,
        series.title,
        day.title,
        scriptureReference,
        scriptureText,
        teachingText,
        reflectionPrompt,
        prayerText,
        takeawayText,
        ...(seriesMeta?.keywords ?? []),
      ]
        .join(' ')
        .toLowerCase()

      candidates.push({
        key: `${series.slug}:${day.day}`,
        seriesSlug: series.slug,
        seriesTitle: series.title,
        sourcePath: series.sourcePath,
        dayNumber: day.day,
        dayTitle: day.title,
        scriptureReference,
        scriptureText,
        teachingText,
        reflectionPrompt,
        prayerText,
        takeawayText,
        searchText,
      })
    }
  }

  if (candidates.length === 0) {
    candidates.push(...buildSeriesMetadataFallbackCandidates())
  }

  cachedCandidates = candidates
  return cachedCandidates
}

export function findCandidateBySeed(
  seed: CurationSeed,
): CuratedDayCandidate | null {
  return (
    getCuratedDayCandidates().find(
      (candidate) =>
        candidate.key === seed.candidateKey ||
        (candidate.seriesSlug === seed.seriesSlug &&
          candidate.dayNumber === seed.dayNumber),
    ) ?? null
  )
}

function candidateMatches(
  candidate: CuratedDayCandidate,
  keywords: string[],
): string[] {
  return keywords.filter((keyword) => candidate.searchText.includes(keyword))
}

export function rankCandidatesForInput(params: {
  input: string
  anchorSeriesSlug?: string
  anchorSeed?: CurationSeed | null
}): Array<{
  candidate: CuratedDayCandidate
  score: number
  matches: string[]
}> {
  const expanded = expandSemanticHints(params.input)
  const keywords = extractKeywords(expanded)

  return getCuratedDayCandidates()
    .map((candidate) => {
      const matches = candidateMatches(candidate, keywords)
      let score = matches.length * 2

      if (
        params.anchorSeriesSlug &&
        candidate.seriesSlug === params.anchorSeriesSlug
      ) {
        score += 3
      }

      if (params.anchorSeed) {
        if (candidate.seriesSlug === params.anchorSeed.seriesSlug) score += 2
        if (candidate.dayNumber === params.anchorSeed.dayNumber) score += 4
        if (candidate.key === params.anchorSeed.candidateKey) score += 6
      }

      // Slight bias toward the top-ranked canonical series metadata.
      if (SERIES_DATA[candidate.seriesSlug]) score += 0.5

      // Deterministic tie-breaker.
      score +=
        (candidate.key
          .split('')
          .reduce((sum, char) => sum + char.charCodeAt(0), 0) %
          83) /
        1000

      return { candidate, score, matches }
    })
    .sort((a, b) => b.score - a.score)
}
