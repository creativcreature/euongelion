import { ALL_SERIES_ORDER, SERIES_DATA } from '@/data/series'
import type { AuditOptionKind, AuditOptionPreview } from '@/types/soul-audit'
import { PREFAB_FALLBACK_SLUGS, SOUL_AUDIT_OPTION_SPLIT } from './constants'

export function sanitizeAuditInput(input: unknown): string {
  if (typeof input !== 'string') return ''
  return input
    .trim()
    .slice(0, 2500)
    .replace(/<[^>]*>/g, '')
    .replace(/[<>"']/g, '')
}

function keywordMatch(
  text: string,
): Array<{ slug: string; confidence: number }> {
  const lower = text.toLowerCase()
  const scores: Array<{ slug: string; score: number }> = []

  for (const slug of ALL_SERIES_ORDER) {
    const series = SERIES_DATA[slug]
    if (!series) continue

    let score = 0
    for (const keyword of series.keywords) {
      if (lower.includes(keyword.toLowerCase())) score++
    }
    if (score > 0) scores.push({ slug, score })
  }

  if (scores.length === 0) {
    return ALL_SERIES_ORDER.slice(0, SOUL_AUDIT_OPTION_SPLIT.aiPrimary).map(
      (slug, index) => ({
        slug,
        confidence: Math.max(0.45, 0.6 - index * 0.05),
      }),
    )
  }

  scores.sort((a, b) => b.score - a.score)
  const maxScore = Math.max(1, scores[0]?.score ?? 1)

  return scores.slice(0, SOUL_AUDIT_OPTION_SPLIT.aiPrimary).map((item) => ({
    slug: item.slug,
    confidence: Math.min(item.score / maxScore, 1),
  }))
}

function makeOption(
  slug: string,
  kind: AuditOptionKind,
  rank: number,
  confidence: number,
): AuditOptionPreview | null {
  const series = SERIES_DATA[slug]
  if (!series) return null

  return {
    id: `${kind}:${slug}:${rank}`,
    slug,
    kind,
    rank,
    title: series.title,
    question: series.question,
    confidence,
    reasoning:
      kind === 'ai_primary'
        ? 'Real-time curated modules that align with what you shared.'
        : 'A stable prefab series if you want a proven guided path.',
  }
}

function getPrefabSlugs(primarySlugs: string[]): string[] {
  const preferred = PREFAB_FALLBACK_SLUGS.filter(
    (slug) => slug in SERIES_DATA && !primarySlugs.includes(slug),
  )
  if (preferred.length >= SOUL_AUDIT_OPTION_SPLIT.curatedPrefab) {
    return preferred.slice(0, SOUL_AUDIT_OPTION_SPLIT.curatedPrefab)
  }

  const fill = ALL_SERIES_ORDER.filter(
    (slug) => !primarySlugs.includes(slug) && !preferred.includes(slug),
  )

  return [...preferred, ...fill].slice(0, SOUL_AUDIT_OPTION_SPLIT.curatedPrefab)
}

export function buildAuditOptions(input: string): AuditOptionPreview[] {
  const aiMatches = keywordMatch(input)
  let aiOptions = aiMatches
    .map((m, index) =>
      makeOption(m.slug, 'ai_primary', index + 1, m.confidence),
    )
    .filter((opt): opt is AuditOptionPreview => Boolean(opt))

  if (aiOptions.length < SOUL_AUDIT_OPTION_SPLIT.aiPrimary) {
    const used = new Set(aiOptions.map((opt) => opt.slug))
    const fallbackSeries = ALL_SERIES_ORDER.filter((slug) => !used.has(slug))
    const needed = SOUL_AUDIT_OPTION_SPLIT.aiPrimary - aiOptions.length
    const fillers = fallbackSeries
      .slice(0, needed)
      .map((slug, idx) =>
        makeOption(slug, 'ai_primary', aiOptions.length + idx + 1, 0.55),
      )
      .filter((opt): opt is AuditOptionPreview => Boolean(opt))
    aiOptions = [...aiOptions, ...fillers]
  }

  aiOptions = aiOptions.slice(0, SOUL_AUDIT_OPTION_SPLIT.aiPrimary)

  const aiSlugs = aiOptions.map((opt) => opt.slug)
  const prefabSlugs = getPrefabSlugs(aiSlugs)

  const prefabOptions = prefabSlugs
    .map((slug, index) =>
      makeOption(
        slug,
        'curated_prefab',
        aiOptions.length + index + 1,
        Math.max(0.35, 0.75 - index * 0.1),
      ),
    )
    .filter((opt): opt is AuditOptionPreview => Boolean(opt))

  return [...aiOptions, ...prefabOptions].slice(
    0,
    SOUL_AUDIT_OPTION_SPLIT.total,
  )
}
