import type { CustomPlanDay, DevotionalDayEndnote } from '@/types/soul-audit'
import { getCuratedCatalog } from './curated-catalog'
import { retrieveReferenceHits } from './reference-volumes'

const REQUIRED_CORE_MODULES = ['scripture', 'teaching', 'reflection', 'prayer']
const CHIASTIC_POSITIONS: Array<'A' | 'B' | 'C' | "B'" | "A'"> = [
  'A',
  'B',
  'C',
  "B'",
  "A'",
]
const DAY_BIASES = [
  'honest',
  'trust',
  'practice',
  'community',
  'endure',
] as const

interface ModuleCandidate {
  key: string
  seriesSlug: string
  seriesTitle: string
  sourcePath: string
  day: number
  dayTitle: string
  scriptureReference: string
  type: string
  payload: Record<string, unknown>
  searchText: string
}

export class MissingCuratedModuleError extends Error {
  constructor(slug: string, day: number, moduleType: string) {
    super(
      `Missing curated core module "${moduleType}" for ${slug} day ${day}. Rendering is blocked.`,
    )
    this.name = 'MissingCuratedModuleError'
  }
}

function toLine(value: unknown, fallback = ''): string {
  return typeof value === 'string' && value.trim().length > 0
    ? value.trim()
    : fallback
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
  ).slice(0, 16)
}

function generatedBridge(userResponse: string, dayTitle: string): string {
  const snippet = userResponse.trim().slice(0, 180)
  if (!snippet) return `Carry this truth from ${dayTitle} into your next step.`
  return `From what you shared ("${snippet}"), this day invites one faithful step: bring that exact tension to God and stay honest in His presence.`
}

function normalizeType(value: unknown): string {
  return toLine(value).toLowerCase()
}

function buildSearchText(parts: unknown[]): string {
  return parts
    .map((part) => toLine(part))
    .filter(Boolean)
    .join(' ')
    .toLowerCase()
}

function buildModuleCandidates(): ModuleCandidate[] {
  const candidates: ModuleCandidate[] = []

  for (const series of getCuratedCatalog().values()) {
    for (const day of series.days) {
      day.modules.forEach((module, index) => {
        const payload = module as Record<string, unknown>
        const type = normalizeType(payload.type)
        if (!type) return

        const searchText = buildSearchText([
          series.slug,
          series.title,
          day.title,
          day.scriptureReference,
          payload.title,
          payload.reference,
          payload.text,
          payload.passage,
          payload.body,
          payload.content,
          payload.prompt,
          payload.commitment,
          payload.modernApplication,
          payload.keyInsight,
        ])

        candidates.push({
          key: `${series.slug}:${day.day}:${type}:${index}`,
          seriesSlug: series.slug,
          seriesTitle: series.title,
          sourcePath: series.sourcePath,
          day: day.day,
          dayTitle: day.title,
          scriptureReference: day.scriptureReference,
          type,
          payload,
          searchText,
        })
      })
    }
  }

  return candidates
}

function scoreCandidate(params: {
  candidate: ModuleCandidate
  anchorSlug: string
  keywords: string[]
  dayBias: string
  context?: { seriesSlug: string; day: number } | null
}): number {
  const { candidate, anchorSlug, keywords, dayBias, context } = params
  let score = 0

  if (candidate.seriesSlug === anchorSlug) score += 6
  if (context && candidate.seriesSlug === context.seriesSlug) score += 2
  if (context && candidate.day === context.day) score += 1
  if (dayBias && candidate.searchText.includes(dayBias)) score += 1.5

  for (const keyword of keywords) {
    if (candidate.searchText.includes(keyword)) score += 1
  }

  // Deterministic tie-breaker to keep rankings stable.
  const tieBreaker =
    (candidate.key
      .split('')
      .reduce((sum, char) => sum + char.charCodeAt(0), 0) %
      97) /
    1000

  return score + tieBreaker
}

function pickBestModule(params: {
  type: string
  candidates: ModuleCandidate[]
  usedModuleKeys: Set<string>
  usedAnchorDays?: Set<string>
  anchorSlug: string
  keywords: string[]
  dayBias: string
  context?: { seriesSlug: string; day: number } | null
  uniqueAnchorDay?: boolean
}): ModuleCandidate | null {
  const scoped = params.candidates.filter(
    (candidate) =>
      candidate.type === params.type &&
      !params.usedModuleKeys.has(candidate.key),
  )
  if (scoped.length === 0) return null

  const withDayFilter =
    params.uniqueAnchorDay && params.usedAnchorDays
      ? scoped.filter(
          (candidate) =>
            !params.usedAnchorDays?.has(
              `${candidate.seriesSlug}:${candidate.day}`,
            ),
        )
      : scoped

  const pool = withDayFilter.length > 0 ? withDayFilter : scoped
  return pool
    .map((candidate) => ({
      candidate,
      score: scoreCandidate({
        candidate,
        anchorSlug: params.anchorSlug,
        keywords: params.keywords,
        dayBias: params.dayBias,
        context: params.context,
      }),
    }))
    .sort((a, b) => b.score - a.score)[0]?.candidate
}

function selectModule(params: {
  type: string
  candidates: ModuleCandidate[]
  usedModuleKeys: Set<string>
  usedAnchorDays?: Set<string>
  anchorSlug: string
  keywords: string[]
  dayBias: string
  context?: { seriesSlug: string; day: number } | null
  uniqueAnchorDay?: boolean
}): ModuleCandidate | null {
  const match = pickBestModule(params)
  if (!match) return null

  params.usedModuleKeys.add(match.key)
  if (params.uniqueAnchorDay && params.usedAnchorDays) {
    params.usedAnchorDays.add(`${match.seriesSlug}:${match.day}`)
  }
  return match
}

function buildEndnotes(params: {
  scriptureReference: string
  moduleSources: string[]
  userResponse: string
}): DevotionalDayEndnote[] {
  const notes: DevotionalDayEndnote[] = [
    {
      id: 1,
      source: 'Scripture',
      note:
        params.scriptureReference || 'Scripture reference in curated modules',
    },
  ]

  params.moduleSources.slice(0, 3).forEach((source) => {
    notes.push({
      id: notes.length + 1,
      source,
      note: 'Curated module source',
    })
  })

  const referenceHits = retrieveReferenceHits({
    userResponse: params.userResponse,
    scriptureReference: params.scriptureReference,
    limit: 2,
  })

  referenceHits.forEach((hit) => {
    notes.push({
      id: notes.length + 1,
      source: hit.source,
      note: `Reference volume excerpt: ${hit.excerpt}`,
    })
  })

  return notes
}

export function buildCuratedFirstPlan(params: {
  seriesSlug: string
  userResponse: string
}): CustomPlanDay[] {
  const candidates = buildModuleCandidates()
  if (candidates.length === 0) {
    throw new MissingCuratedModuleError(params.seriesSlug, 1, 'module-catalog')
  }

  const keywords = extractKeywords(
    `${params.userResponse} ${params.seriesSlug}`,
  )
  const usedModuleKeys = new Set<string>()
  const usedAnchorDays = new Set<string>()
  const planDays: CustomPlanDay[] = []

  for (let index = 0; index < 5; index += 1) {
    const dayNumber = index + 1
    const dayBias = DAY_BIASES[index] ?? ''

    const scripture = selectModule({
      type: 'scripture',
      candidates,
      usedModuleKeys,
      usedAnchorDays,
      anchorSlug: params.seriesSlug,
      keywords,
      dayBias,
      uniqueAnchorDay: true,
    })
    if (!scripture) {
      throw new MissingCuratedModuleError(
        params.seriesSlug,
        dayNumber,
        'scripture',
      )
    }

    const context = { seriesSlug: scripture.seriesSlug, day: scripture.day }
    const teaching = selectModule({
      type: 'teaching',
      candidates,
      usedModuleKeys,
      anchorSlug: params.seriesSlug,
      keywords,
      dayBias,
      context,
    })
    const reflection = selectModule({
      type: 'reflection',
      candidates,
      usedModuleKeys,
      anchorSlug: params.seriesSlug,
      keywords,
      dayBias,
      context,
    })
    const prayer = selectModule({
      type: 'prayer',
      candidates,
      usedModuleKeys,
      anchorSlug: params.seriesSlug,
      keywords,
      dayBias,
      context,
    })

    for (const required of REQUIRED_CORE_MODULES) {
      if (
        (required === 'teaching' && !teaching) ||
        (required === 'reflection' && !reflection) ||
        (required === 'prayer' && !prayer)
      ) {
        throw new MissingCuratedModuleError(
          params.seriesSlug,
          dayNumber,
          required,
        )
      }
    }

    const takeaway = selectModule({
      type: 'takeaway',
      candidates,
      usedModuleKeys,
      anchorSlug: params.seriesSlug,
      keywords,
      dayBias,
      context,
    })
    const bridge = selectModule({
      type: 'bridge',
      candidates,
      usedModuleKeys,
      anchorSlug: params.seriesSlug,
      keywords,
      dayBias,
      context,
    })

    const scriptureReference = toLine(
      scripture.payload.reference ?? scripture.scriptureReference,
      scripture.scriptureReference,
    )
    const scriptureText = toLine(
      scripture.payload.text ?? scripture.payload.passage,
      'See scripture reference above.',
    )

    const dayTitle = toLine(
      teaching?.payload.title ?? scripture.dayTitle,
      `Day ${dayNumber}`,
    )
    const curatedReflection = toLine(
      teaching?.payload.body ??
        teaching?.payload.content ??
        reflection?.payload.prompt,
      'Read slowly and receive what is true.',
    )
    const reflectionText = `${curatedReflection}\n\n${generatedBridge(params.userResponse, dayTitle)}`

    const curatedPrayer = toLine(
      prayer?.payload.text ??
        prayer?.payload.prayerText ??
        prayer?.payload.content,
      'Lord Jesus, hold me steady in your presence today.',
    )
    const polishedPrayer = `${curatedPrayer} Help me walk this faithfully, one step at a time.`

    const reflectionQuestions = Array.isArray(
      reflection?.payload.additionalQuestions,
    )
      ? (reflection?.payload.additionalQuestions as unknown[])
          .map((question) => String(question))
          .join(' ')
      : ''

    const nextStep = toLine(
      takeaway?.payload.commitment ??
        bridge?.payload.modernApplication ??
        reflectionQuestions,
      'Write one concrete act of obedience for today and practice it before sunset.',
    )

    const journalPrompt = toLine(
      reflection?.payload.prompt ?? reflection?.payload.content,
      'What is one thing God is inviting me to trust today?',
    )

    const moduleSources = Array.from(
      new Set(
        [scripture, teaching, reflection, prayer, takeaway, bridge]
          .filter((module): module is ModuleCandidate => Boolean(module))
          .map(
            (module) =>
              `${module.sourcePath} (${module.seriesSlug} day ${module.day}, ${module.type})`,
          ),
      ),
    )

    planDays.push({
      day: dayNumber,
      chiasticPosition: CHIASTIC_POSITIONS[index],
      title: dayTitle,
      scriptureReference,
      scriptureText,
      reflection: reflectionText,
      prayer: polishedPrayer,
      nextStep,
      journalPrompt,
      endnotes: buildEndnotes({
        scriptureReference,
        moduleSources,
        userResponse: params.userResponse,
      }),
    })
  }

  return planDays
}
