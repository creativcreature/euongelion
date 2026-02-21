import type { CustomPlanDay, DevotionalDayEndnote } from '@/types/soul-audit'
import {
  findCandidateBySeed,
  getCuratedDayCandidates,
  rankCandidatesForInput,
  type CurationSeed,
  type CuratedDayCandidate,
} from './curation-engine'
import { retrieveReferenceHits, type ReferenceHit } from './reference-volumes'
import type { OnboardingVariant } from './schedule'

const CHIASTIC_POSITIONS: Array<'A' | 'B' | 'C' | "B'" | "A'"> = [
  'A',
  'B',
  'C',
  "B'",
  "A'",
]

export class MissingCuratedModuleError extends Error {
  constructor(slug: string, day: number, moduleType: string) {
    super(
      `Missing curated core module "${moduleType}" for ${slug} day ${day}. Rendering is blocked.`,
    )
    this.name = 'MissingCuratedModuleError'
  }
}

export class MissingReferenceGroundingError extends Error {
  constructor(slug: string, day: number) {
    super(
      `Missing required reference-volume grounding for ${slug} day ${day}. Rendering is blocked.`,
    )
    this.name = 'MissingReferenceGroundingError'
  }
}

function toLine(value: unknown): string {
  return typeof value === 'string' && value.trim().length > 0
    ? value.trim()
    : ''
}

function splitKeywords(value: string): string[] {
  return Array.from(
    new Set(
      value
        .toLowerCase()
        .replace(/[^a-z0-9\s-]/g, ' ')
        .split(/\s+/)
        .map((token) => token.trim())
        .filter((token) => token.length >= 4),
    ),
  ).slice(0, 5)
}

function focusPhrase(value: string): string {
  const tokens = splitKeywords(value)
  if (tokens.length === 0) return ''
  if (tokens.length === 1) return tokens[0]
  if (tokens.length === 2) return `${tokens[0]} and ${tokens[1]}`
  return `${tokens[0]}, ${tokens[1]}, and ${tokens[2]}`
}

function ensureMinimumLength(value: string, minimum: number): string {
  if (value.length >= minimum) return value
  return `${value}\n\nStay with this text for two minutes before moving on. Ask what faithful obedience looks like before the day ends.\n\nWrite one line: "Today I will respond by ___."`
}

function clamp(value: string, limit: number): string {
  if (value.length <= limit) return value
  return `${value.slice(0, limit - 3).trimEnd()}...`
}

function personalizedBridge(
  userResponse: string,
  day: CuratedDayCandidate,
): string {
  const snippet = userResponse.trim().slice(0, 180)
  const themes = focusPhrase(userResponse)
  const base = `Today in "${day.dayTitle}", take one concrete step with what you just read: ${day.takeawayText}`
  if (!snippet && !themes) return base
  if (!snippet) {
    return `${base}\n\nBring your current tension around ${themes} honestly before God today.`
  }
  return `${base}\n\nFrom what you shared ("${snippet}"), bring that exact tension honestly before God today.`
}

function expandedReflection(
  userResponse: string,
  day: CuratedDayCandidate,
  referenceHits: Array<{ source: string; excerpt: string }>,
): string {
  const bridge = personalizedBridge(userResponse, day)
  const themes = focusPhrase(userResponse)
  const scriptureAnchor = `Scripture anchor (${day.scriptureReference}): ${clamp(day.scriptureText, 520)}`
  const reflectionPromptLine = `Reflection prompt: ${day.reflectionPrompt}`
  const contextualNote =
    referenceHits.length > 0
      ? referenceHits
          .map(
            (hit, index) =>
              `Commentary witness ${index + 1} (${hit.source}): ${hit.excerpt}`,
          )
          .join('\n\n')
      : 'Stay with the text slowly. Let the Scripture name what you are carrying before you try to fix it.'
  const thematicLine = themes
    ? `What you shared points to ${themes}. Read for where this passage addresses that directly.`
    : 'Read for the phrase that most clearly speaks to your present season.'
  return ensureMinimumLength(
    `${scriptureAnchor}\n\n${day.teachingText}\n\n${reflectionPromptLine}\n\n${thematicLine}\n\n${bridge}\n\n${contextualNote}`,
    700,
  )
}

function personalizedPrayerLine(userResponse: string): string {
  const snippet = userResponse.trim().slice(0, 120)
  if (!snippet) {
    return 'Help me walk this faithfully, one step at a time.'
  }
  return `You know what I am carrying ("${snippet}"). Meet me in it and lead me in truth.`
}

function expandedPrayer(
  userResponse: string,
  day: CuratedDayCandidate,
): string {
  return ensureMinimumLength(
    [
      `Jesus, as I receive ${day.scriptureReference}, slow me down enough to listen and obey.`,
      day.prayerText,
      personalizedPrayerLine(userResponse),
      `Anchor this in me today through ${day.scriptureReference}, and give me courage to live what I read.`,
    ].join('\n\n'),
    280,
  )
}

function expandedNextStep(day: CuratedDayCandidate): string {
  const base = toLine(day.takeawayText)
  if (!base) return ''
  return `${base} Then choose one concrete action you can complete before the day ends, and set a specific hour to do it.`
}

function expandedJournalPrompt(day: CuratedDayCandidate): string {
  const base = toLine(day.reflectionPrompt)
  if (!base) return ''
  return `${base}\nWhat resistance do you notice in yourself, and what would faithful obedience look like in one sentence?\nWhich exact phrase from Scripture will you carry into today?`
}

function buildEndnotes(params: {
  candidate: CuratedDayCandidate
  referenceHits: ReferenceHit[]
}): DevotionalDayEndnote[] {
  const notes: DevotionalDayEndnote[] = [
    {
      id: 1,
      source: 'Scripture',
      note: params.candidate.scriptureReference,
    },
    {
      id: 2,
      source: params.candidate.sourcePath,
      note: `${params.candidate.seriesSlug} day ${params.candidate.dayNumber}`,
    },
    {
      id: 3,
      source: 'Composition Policy',
      note: 'Curated core modules 80% / generation-assisted bridge and language polish 20%.',
    },
  ]

  params.referenceHits.forEach((hit) => {
    notes.push({
      id: notes.length + 1,
      source: hit.source,
      note: `Reference volume excerpt: ${hit.excerpt}`,
    })
  })

  return notes
}

function selectPlanCandidates(params: {
  seriesSlug: string
  userResponse: string
  anchorSeed?: CurationSeed | null
}): CuratedDayCandidate[] {
  const allCandidates = getCuratedDayCandidates()
  const preferredSeries = allCandidates
    .filter((candidate) => candidate.seriesSlug === params.seriesSlug)
    .sort((a, b) => a.dayNumber - b.dayNumber)

  const selected: CuratedDayCandidate[] = []
  const usedKeys = new Set<string>()

  const pushUnique = (candidate: CuratedDayCandidate | null) => {
    if (!candidate || usedKeys.has(candidate.key)) return
    selected.push(candidate)
    usedKeys.add(candidate.key)
  }

  if (params.anchorSeed) {
    pushUnique(findCandidateBySeed(params.anchorSeed))
  }

  for (const candidate of preferredSeries) {
    if (selected.length >= 5) break
    pushUnique(candidate)
  }

  if (selected.length >= 5) {
    return selected.slice(0, 5)
  }

  const ranked = rankCandidatesForInput({
    input: `${params.userResponse} ${params.seriesSlug}`,
    anchorSeriesSlug: params.seriesSlug,
    anchorSeed: params.anchorSeed,
  })

  for (const entry of ranked) {
    if (selected.length >= 5) break
    pushUnique(entry.candidate)
  }

  if (selected.length < 5) {
    throw new MissingCuratedModuleError(
      params.seriesSlug,
      selected.length + 1,
      'day',
    )
  }

  return selected.slice(0, 5)
}

export function buildCuratedFirstPlan(params: {
  seriesSlug: string
  userResponse: string
  anchorSeed?: CurationSeed | null
}): CustomPlanDay[] {
  const selectedDays = selectPlanCandidates(params)

  return selectedDays.map((candidate, index) => {
    const dayNumber = index + 1
    const referenceHits = retrieveReferenceHits({
      userResponse: params.userResponse,
      scriptureReference: candidate.scriptureReference,
      limit: 3,
    })
    if (referenceHits.length === 0) {
      throw new MissingReferenceGroundingError(params.seriesSlug, dayNumber)
    }
    const reflection = expandedReflection(
      params.userResponse,
      candidate,
      referenceHits,
    )
    const prayer = expandedPrayer(params.userResponse, candidate)

    const nextStep = expandedNextStep(candidate)
    const journalPrompt = expandedJournalPrompt(candidate)
    if (!nextStep) {
      throw new MissingCuratedModuleError(
        params.seriesSlug,
        dayNumber,
        'takeaway',
      )
    }
    if (!journalPrompt) {
      throw new MissingCuratedModuleError(
        params.seriesSlug,
        dayNumber,
        'reflection',
      )
    }

    return {
      day: dayNumber,
      chiasticPosition: CHIASTIC_POSITIONS[index],
      title: candidate.dayTitle,
      scriptureReference: candidate.scriptureReference,
      scriptureText: candidate.scriptureText,
      reflection,
      prayer,
      nextStep,
      journalPrompt,
      endnotes: buildEndnotes({
        candidate,
        referenceHits,
      }),
    }
  })
}

export function buildOnboardingDay(params: {
  userResponse: string
  firstDay: CustomPlanDay
  variant: OnboardingVariant
  onboardingDays: number
}): CustomPlanDay {
  const snippet = params.userResponse.trim().slice(0, 180)
  const firstDayTitle = params.firstDay.title
  const variantLabel =
    params.variant === 'wednesday_3_day'
      ? 'Wednesday 3-Day Primer'
      : params.variant === 'thursday_2_day'
        ? 'Thursday 2-Day Primer'
        : params.variant === 'friday_1_day'
          ? 'Friday 1-Day Primer'
          : 'Weekend Bridge Primer'
  const intro =
    params.variant === 'wednesday_3_day'
      ? 'Wednesday start: a 3-day rhythm primer (Wed-Thu-Fri) to establish momentum before Monday cycle launch.'
      : params.variant === 'thursday_2_day'
        ? 'Thursday start: a 2-day rhythm primer (Thu-Fri) so your Monday cycle begins with pace.'
        : params.variant === 'friday_1_day'
          ? 'Friday start: a focused 1-day primer to orient your heart before the full Monday cycle.'
          : 'Weekend start: a bridge devotional to settle your pace before Monday cycle launch.'
  const nextStep =
    params.onboardingDays >= 2
      ? `Read this onboarding day now, then return daily for your ${params.onboardingDays}-day rhythm primer. Full cycle unlock begins Monday at 7:00 AM local time.`
      : 'Read this onboarding day now. Full cycle unlock begins Monday at 7:00 AM local time.'

  return {
    day: 0,
    title: `Onboarding: ${variantLabel}`,
    scriptureReference: params.firstDay.scriptureReference,
    scriptureText: params.firstDay.scriptureText,
    reflection: snippet
      ? `You shared: "${snippet}". ${intro}\n\nYour full 5-day curated path is already prepared. Start with this orientation and move into Day 1 with honesty.\n\nYour first day is "${firstDayTitle}".`
      : `${intro}\n\nYour full 5-day curated path is already prepared. Start with this orientation and move into Day 1 with honesty.\n\nYour first day is "${firstDayTitle}".`,
    prayer:
      'Lord Jesus, steady my pace as I begin this path. Give me courage to be honest and faithful in each next step.',
    nextStep: `${nextStep} Keep this same daily reading window to build consistency.`,
    journalPrompt:
      'What do I want to bring before God first as this devotional path begins?',
    endnotes: [
      {
        id: 1,
        source: 'Scripture',
        note: params.firstDay.scriptureReference,
      },
      {
        id: 2,
        source: 'Scheduling Policy',
        note: `${params.variant} onboarding before Monday cycle.`,
      },
      {
        id: 3,
        source: 'Curated Plan Anchor',
        note: `Day 1 preview: ${firstDayTitle}.`,
      },
    ],
  }
}
