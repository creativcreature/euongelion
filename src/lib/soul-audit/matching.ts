import { ALL_SERIES_ORDER, SERIES_DATA } from '@/data/series'
import type { AuditOptionKind, AuditOptionPreview } from '@/types/soul-audit'
import { PREFAB_FALLBACK_SLUGS, SOUL_AUDIT_OPTION_SPLIT } from './constants'
import {
  getCuratedDayCandidates,
  rankCandidatesForInput,
  type CuratedDayCandidate,
} from './curation-engine'

export function sanitizeAuditInput(input: unknown): string {
  if (typeof input !== 'string') return ''
  return input
    .trim()
    .slice(0, 2500)
    .replace(/<[^>]*>/g, '')
    .replace(/[<>"']/g, '')
}

function choosePrimaryMatches(input: string): Array<{
  candidate: CuratedDayCandidate
  confidence: number
  matched: string[]
}> {
  const ranked = rankCandidatesForInput({ input })
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
  matched?: string[]
}): AuditOptionPreview {
  const matched = params.matched ?? []

  return {
    id: `${params.kind}:${params.candidate.seriesSlug}:${params.candidate.dayNumber}:${params.rank}`,
    slug: params.candidate.seriesSlug,
    kind: params.kind,
    rank: params.rank,
    title: params.candidate.seriesTitle,
    question: params.candidate.reflectionPrompt,
    confidence: params.confidence,
    reasoning:
      params.kind === 'ai_primary'
        ? matched.length > 0
          ? `Matched themes from your response: ${matched.join(', ')}.`
          : 'Curated directly from repository modules for your current season.'
        : 'A stable prefab series if you want a proven guided path.',
    preview: {
      verse: params.candidate.scriptureReference,
      paragraph: params.candidate.teachingText.slice(0, 320),
      curationSeed: {
        seriesSlug: params.candidate.seriesSlug,
        dayNumber: params.candidate.dayNumber,
        candidateKey: params.candidate.key,
      },
    },
  }
}

function getPrefabSlugs(primarySlugs: string[]): string[] {
  const curatedSeries = new Set(
    getCuratedDayCandidates().map((candidate) => candidate.seriesSlug),
  )

  const preferred = PREFAB_FALLBACK_SLUGS.filter(
    (slug) =>
      slug in SERIES_DATA &&
      curatedSeries.has(slug) &&
      !primarySlugs.includes(slug),
  )
  if (preferred.length >= SOUL_AUDIT_OPTION_SPLIT.curatedPrefab) {
    return preferred.slice(0, SOUL_AUDIT_OPTION_SPLIT.curatedPrefab)
  }

  const fill = ALL_SERIES_ORDER.filter(
    (slug) =>
      curatedSeries.has(slug) &&
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
      matched: match.matched,
    }),
  )

  if (aiOptions.length < SOUL_AUDIT_OPTION_SPLIT.aiPrimary) {
    const usedSeries = new Set(aiOptions.map((option) => option.slug))
    const fillers = getCuratedDayCandidates()
      .filter((candidate) => !usedSeries.has(candidate.seriesSlug))
      .slice(0, SOUL_AUDIT_OPTION_SPLIT.aiPrimary - aiOptions.length)
      .map((candidate, idx) =>
        makeOption({
          candidate,
          kind: 'ai_primary',
          rank: aiOptions.length + idx + 1,
          confidence: 0.55,
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
      })
    })
    .filter((option): option is AuditOptionPreview => Boolean(option))

  return [...aiOptions, ...prefabOptions].slice(
    0,
    SOUL_AUDIT_OPTION_SPLIT.total,
  )
}
