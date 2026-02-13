import type { CustomPlanDay, DevotionalDayEndnote } from '@/types/soul-audit'
import {
  findCandidateBySeed,
  rankCandidatesForInput,
  type CurationSeed,
  type CuratedDayCandidate,
} from './curation-engine'
import { retrieveReferenceHits } from './reference-volumes'
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

function toLine(value: unknown): string {
  return typeof value === 'string' && value.trim().length > 0
    ? value.trim()
    : ''
}

function personalizedBridge(
  userResponse: string,
  day: CuratedDayCandidate,
): string {
  const snippet = userResponse.trim().slice(0, 180)
  const base = `Today in "${day.dayTitle}", take one concrete step with what you just read: ${day.takeawayText}`
  if (!snippet) return base
  return `${base}\n\nFrom what you shared ("${snippet}"), bring that exact tension honestly before God today.`
}

function expandedReflection(
  userResponse: string,
  day: CuratedDayCandidate,
  referenceHit?: { source: string; excerpt: string },
): string {
  const bridge = personalizedBridge(userResponse, day)
  const contextualNote = referenceHit
    ? `Reference grounding (${referenceHit.source}): ${referenceHit.excerpt}`
    : 'Stay with the text slowly. Let the Scripture name what you are carrying before you try to fix it.'

  return `${day.teachingText}\n\n${bridge}\n\n${contextualNote}`
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
  return [
    day.prayerText,
    personalizedPrayerLine(userResponse),
    `Anchor this in me today through ${day.scriptureReference}, and give me courage to live what I read.`,
  ].join('\n\n')
}

function expandedNextStep(day: CuratedDayCandidate): string {
  const base = toLine(day.takeawayText)
  if (!base) return ''
  return `${base} Then choose one concrete action you can complete before the day ends.`
}

function expandedJournalPrompt(day: CuratedDayCandidate): string {
  const base = toLine(day.reflectionPrompt)
  if (!base) return ''
  return `${base}\nWhat resistance do you notice in yourself, and what would faithful obedience look like in one sentence?`
}

function buildEndnotes(params: {
  candidate: CuratedDayCandidate
  userResponse: string
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
  ]

  const referenceHits = retrieveReferenceHits({
    userResponse: params.userResponse,
    scriptureReference: params.candidate.scriptureReference,
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

function selectPlanCandidates(params: {
  seriesSlug: string
  userResponse: string
  anchorSeed?: CurationSeed | null
}): CuratedDayCandidate[] {
  const ranked = rankCandidatesForInput({
    input: `${params.userResponse} ${params.seriesSlug}`,
    anchorSeriesSlug: params.seriesSlug,
    anchorSeed: params.anchorSeed,
  })

  const selected: CuratedDayCandidate[] = []
  const usedKeys = new Set<string>()

  if (params.anchorSeed) {
    const anchor = findCandidateBySeed(params.anchorSeed)
    if (anchor) {
      selected.push(anchor)
      usedKeys.add(anchor.key)
    }
  }

  for (const entry of ranked) {
    if (selected.length >= 5) break
    if (usedKeys.has(entry.candidate.key)) continue
    selected.push(entry.candidate)
    usedKeys.add(entry.candidate.key)
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
      limit: 1,
    })
    const reflection = expandedReflection(
      params.userResponse,
      candidate,
      referenceHits[0],
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
        userResponse: params.userResponse,
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
    title: 'Onboarding: Prepare for Your 5-Day Path',
    scriptureReference: params.firstDay.scriptureReference,
    scriptureText: params.firstDay.scriptureText,
    reflection: snippet
      ? `You shared: "${snippet}". ${intro}\n\nYour full 5-day curated path is already prepared. Start with this orientation and move into Day 1 with honesty.\n\nYour first day is "${firstDayTitle}".`
      : `${intro}\n\nYour full 5-day curated path is already prepared. Start with this orientation and move into Day 1 with honesty.\n\nYour first day is "${firstDayTitle}".`,
    prayer:
      'Lord Jesus, steady my pace as I begin this path. Give me courage to be honest and faithful in each next step.',
    nextStep,
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
