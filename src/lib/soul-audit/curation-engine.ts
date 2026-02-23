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

function moduleFieldValue(
  moduleEntry: Record<string, unknown>,
  key: string,
): string {
  const direct = toLine(moduleEntry[key])
  if (direct) return direct

  const data =
    moduleEntry.data && typeof moduleEntry.data === 'object'
      ? (moduleEntry.data as Record<string, unknown>)
      : null
  if (data) {
    const dataValue = toLine(data[key])
    if (dataValue) return dataValue
  }

  const content =
    moduleEntry.content && typeof moduleEntry.content === 'object'
      ? (moduleEntry.content as Record<string, unknown>)
      : null
  if (content) {
    const contentValue = toLine(content[key])
    if (contentValue) return contentValue
  }

  return ''
}

function moduleTextFirst(
  modules: Record<string, unknown>[] | undefined,
  keys: string[],
): string {
  if (!modules || modules.length === 0) return ''

  for (const moduleEntry of modules) {
    for (const key of keys) {
      const value = moduleFieldValue(moduleEntry, key)
      if (value) return value
    }
  }

  return ''
}

function moduleTextJoined(
  modules: Record<string, unknown>[] | undefined,
  keys: string[],
  maxParts: number,
): string {
  if (!modules || modules.length === 0) return ''

  const parts: string[] = []
  const seen = new Set<string>()

  for (const moduleEntry of modules) {
    for (const key of keys) {
      const value = moduleFieldValue(moduleEntry, key)
      if (!value) continue
      const normalized = value.toLowerCase()
      if (seen.has(normalized)) continue
      seen.add(normalized)
      parts.push(value)
      break
    }

    if (parts.length >= maxParts) break
  }

  if (parts.length === 0) return ''
  return parts.join('\n\n')
}

function moduleText(
  modules: Record<string, unknown>[] | undefined,
  keys: string[],
  maxParts = 1,
): string {
  if (maxParts <= 1) return moduleTextFirst(modules, keys)
  return moduleTextJoined(modules, keys, maxParts)
}

function capText(value: string, maxLength: number): string {
  const normalized = value.trim()
  if (normalized.length <= maxLength) return normalized
  return `${normalized.slice(0, maxLength - 3).trimEnd()}...`
}

function addModuleByType(
  byType: Map<string, Record<string, unknown>[]>,
  type: string,
  module: Record<string, unknown>,
): void {
  const existing = byType.get(type)
  if (existing) {
    existing.push(module)
    return
  }
  byType.set(type, [module])
}

function normalizeSearchText(parts: string[]): string {
  const combined = parts
    .filter((part) => part.trim().length > 0)
    .join(' ')
    .toLowerCase()

  if (combined.length <= 6000) return combined
  return combined.slice(0, 6000)
}

const DOMAIN_STOP_WORDS = new Set([
  'the',
  'and',
  'for',
  'that',
  'this',
  'with',
  'from',
  'into',
  'your',
  'about',
  'just',
  'really',
  'very',
  'have',
  'been',
  'being',
  'want',
  'need',
  'feel',
  'like',
  'today',
  'right',
  'now',
  'then',
  'there',
  'when',
  'where',
  'what',
  'will',
  'would',
  'could',
  'should',
])

function extractKeywords(input: string): string[] {
  return Array.from(
    new Set(
      input
        .toLowerCase()
        .replace(/[^a-z0-9\s-]/g, ' ')
        .split(/\s+/)
        .map((word) => word.trim())
        .filter(
          (word) =>
            word.length >= 3 &&
            !DOMAIN_STOP_WORDS.has(word) &&
            /^[a-z0-9-]+$/.test(word),
        ),
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
    {
      trigger: /\bpray|prayer|learn to pray\b/,
      inject: 'prayer communion ask seek',
    },
    { trigger: /\bjoy|rejoice|celebrate\b/, inject: 'joy gratitude praise' },
    { trigger: /\bhope|hopeless\b/, inject: 'hope endurance promise' },
    { trigger: /\blove|loving|unloved\b/, inject: 'love belonging identity' },
    {
      trigger: /\bangry|anger|resentment\b/,
      inject: 'forgiveness gentleness patience',
    },
    {
      trigger: /\bforgive|forgiveness\b/,
      inject: 'mercy reconciliation release',
    },
    {
      trigger: /\btemptation|addiction|habit\b/,
      inject: 'self-control repentance freedom',
    },
    {
      trigger: /\bidentity|worth|value\b/,
      inject: 'identity belonging son daughter',
    },
    {
      trigger: /\bmarriage|spouse\b/,
      inject: 'covenant patience communication',
    },
    {
      trigger: /\bparent|kids|children\b/,
      inject: 'parenting wisdom gentleness',
    },
    {
      trigger: /\bmoney|debt|finances|work\b/,
      inject: 'provision stewardship trust',
    },
    {
      trigger: /\bdecision|discern|discernment\b/,
      inject: 'wisdom counsel discernment',
    },
    {
      trigger: /\brest|sabbath|tired|fatigue\b/,
      inject: 'rest sabbath renewal',
    },
    { trigger: /\bfear|afraid\b/, inject: 'courage trust presence' },
    {
      trigger: /\bhealing|sick|illness\b/,
      inject: 'healing comfort perseverance',
    },
    {
      trigger: /\bwaiting|delay|patient\b/,
      inject: 'patience endurance timing',
    },
    { trigger: /\bchurch|community\b/, inject: 'community fellowship unity' },
    {
      trigger: /\bmission|evangelism|witness\b/,
      inject: 'mission witness courage',
    },
    { trigger: /\bgrief|mourning|loss\b/, inject: 'comfort lament hope' },
    { trigger: /\bpeace|calm\b/, inject: 'peace stillness trust' },
    // Biblical topic triggers
    {
      trigger: /\bprophet(s|ic|ess)?\b/,
      inject: 'prophecy calling obedience old-testament isaiah jeremiah',
    },
    { trigger: /\bpsalm(s|ist)?\b/, inject: 'worship praise lament david' },
    { trigger: /\bgospel(s)?\b/, inject: 'jesus good-news salvation' },
    {
      trigger: /\bpaul\b|epistles?\b/,
      inject: 'letters church doctrine theology',
    },
    {
      trigger: /\bgenesis\b|creation\b/,
      inject: 'beginning creation fall covenant abraham',
    },
    {
      trigger: /\bexodus\b|passover\b/,
      inject: 'freedom deliverance moses',
    },
    {
      trigger: /\bwisdom\b|\bproverbs?\b/,
      inject: 'wisdom discernment solomon',
    },
    {
      trigger: /\bsuffering|trial(s)?\b/,
      inject: 'endurance perseverance testing job',
    },
    {
      trigger: /\bresurrection|easter|risen\b/,
      inject: 'hope victory death life',
    },
    {
      trigger: /\bjesus|christ|messiah\b/,
      inject: 'gospel salvation kingdom lord',
    },
  ]

  let expanded = lower
  for (const hint of hints) {
    if (hint.trigger.test(lower)) {
      expanded += ` ${hint.inject}`
    }
  }
  return expanded
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

      const byType = new Map<string, Record<string, unknown>[]>()
      for (const entry of modules) {
        const type = toLine(entry.type).toLowerCase()
        if (!type) continue
        addModuleByType(byType, type, entry)
      }

      const scripture = byType.get('scripture')
      const teaching = byType.get('teaching')
      const reflection = byType.get('reflection')
      const prayer = byType.get('prayer')
      const takeaway = byType.get('takeaway')
      const bridge = byType.get('bridge')

      const scriptureReference =
        moduleText(scripture, ['reference']) || toLine(day.scriptureReference)
      const scriptureText = capText(
        moduleText(scripture, ['text', 'passage'], 2),
        1600,
      )
      const teachingText = capText(
        moduleText(teaching, ['body', 'content', 'text'], 4),
        2600,
      )
      const reflectionPrompt = capText(
        moduleText(
          reflection,
          ['prompt', 'prompt_text', 'question', 'content'],
          2,
        ),
        900,
      )
      const prayerText = capText(
        moduleText(prayer, ['text', 'prayerText', 'content'], 2),
        1200,
      )
      const takeawayText =
        moduleText(takeaway, ['commitment', 'action', 'text']) ||
        moduleText(bridge, ['modernApplication', 'connectionPoint', 'question'])

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
      const searchText = normalizeSearchText([
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
      ])

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

  cachedCandidates = candidates
  return candidates
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
  aiThemes?: string[]
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

      // AI theme boost — high weight so AI-extracted themes dominate.
      if (params.aiThemes?.length) {
        const themeMatches = params.aiThemes.filter((theme) =>
          candidate.searchText.includes(theme.toLowerCase()),
        )
        score += themeMatches.length * 4
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
