import type { CustomPlanDay, DevotionalDayEndnote } from '@/types/soul-audit'
import { getCuratedSeries } from './curated-catalog'
import { retrieveReferenceHits } from './reference-volumes'

const REQUIRED_CORE_MODULES = ['scripture', 'teaching', 'reflection', 'prayer']

export class MissingCuratedModuleError extends Error {
  constructor(slug: string, day: number, moduleType: string) {
    super(
      `Missing curated core module "${moduleType}" for ${slug} day ${day}. Rendering is blocked.`,
    )
    this.name = 'MissingCuratedModuleError'
  }
}

function pickModule(modules: Array<Record<string, unknown>>, type: string) {
  return modules.find((module) => String(module.type || '') === type) ?? null
}

function toLine(value: unknown, fallback = ''): string {
  return typeof value === 'string' && value.trim().length > 0
    ? value.trim()
    : fallback
}

function generatedBridge(userResponse: string, dayTitle: string): string {
  const snippet = userResponse.trim().slice(0, 180)
  if (!snippet) return `Carry this truth from ${dayTitle} into your next step.`
  return `From what you shared ("${snippet}"), this day invites one faithful step: bring that exact tension to God and stay honest in His presence.`
}

function buildEndnotes(params: {
  scriptureReference: string
  sourcePath: string
  day: number
  userResponse: string
}): DevotionalDayEndnote[] {
  const notes: DevotionalDayEndnote[] = [
    {
      id: 1,
      source: 'Scripture',
      note:
        params.scriptureReference || 'Scripture reference in curated module',
    },
    {
      id: 2,
      source: params.sourcePath,
      note: `Curated series source (day ${params.day})`,
    },
  ]

  const referenceHits = retrieveReferenceHits({
    userResponse: params.userResponse,
    scriptureReference: params.scriptureReference,
    limit: 2,
  })

  referenceHits.forEach((hit, index) => {
    notes.push({
      id: notes.length + 1,
      source: hit.source,
      note: `Reference volume excerpt: ${hit.excerpt}`,
    })
    if (index >= 1) return
  })

  return notes
}

export function buildCuratedFirstPlan(params: {
  seriesSlug: string
  userResponse: string
}): CustomPlanDay[] {
  const series = getCuratedSeries(params.seriesSlug)
  if (!series) {
    throw new MissingCuratedModuleError(params.seriesSlug, 1, 'series')
  }

  const selectedDays = series.days.slice(0, 5)
  if (selectedDays.length < 5) {
    throw new MissingCuratedModuleError(
      params.seriesSlug,
      selectedDays.length,
      'day',
    )
  }

  return selectedDays.map((day, index) => {
    const modules = day.modules
      .map((module) => module as Record<string, unknown>)
      .sort((a, b) => Number(a.order ?? 0) - Number(b.order ?? 0))

    for (const required of REQUIRED_CORE_MODULES) {
      if (!pickModule(modules, required)) {
        throw new MissingCuratedModuleError(
          params.seriesSlug,
          day.day,
          required,
        )
      }
    }

    const scripture =
      pickModule(modules, 'scripture') ?? ({} as Record<string, unknown>)
    const teaching =
      pickModule(modules, 'teaching') ?? ({} as Record<string, unknown>)
    const reflection =
      pickModule(modules, 'reflection') ?? ({} as Record<string, unknown>)
    const prayer =
      pickModule(modules, 'prayer') ?? ({} as Record<string, unknown>)
    const takeaway =
      pickModule(modules, 'takeaway') ?? ({} as Record<string, unknown>)
    const bridge =
      pickModule(modules, 'bridge') ?? ({} as Record<string, unknown>)

    const scriptureReference = toLine(
      scripture.reference ?? day.scriptureReference,
      day.scriptureReference,
    )
    const scriptureText = toLine(
      scripture.text ?? scripture.passage,
      'See scripture reference above.',
    )

    const curatedReflection = toLine(
      teaching.body ?? teaching.content,
      toLine(reflection.prompt, 'Read slowly and receive what is true.'),
    )
    const assistiveReflection = generatedBridge(params.userResponse, day.title)
    const reflectionText = `${curatedReflection}\n\n${assistiveReflection}`

    const curatedPrayer = toLine(
      prayer.text ?? prayer.prayerText ?? prayer.content,
      'Lord Jesus, hold me steady in your presence today.',
    )
    const polishedPrayer = `${curatedPrayer} Help me walk this faithfully, one step at a time.`

    const extraQuestions = Array.isArray(reflection.additionalQuestions)
      ? reflection.additionalQuestions
          .map((question) => String(question))
          .join(' ')
      : ''

    const nextStep = toLine(
      takeaway.commitment ?? bridge.modernApplication ?? extraQuestions,
      'Write one concrete act of obedience for today and practice it before sunset.',
    )

    const journalPrompt = toLine(
      reflection.prompt ?? reflection.content,
      'What is one thing God is inviting me to trust today?',
    )

    return {
      day: index + 1,
      chiasticPosition: ['A', 'B', 'C', "B'", "A'"][index] as
        | 'A'
        | 'B'
        | 'C'
        | "B'"
        | "A'",
      title: toLine(day.title, `Day ${index + 1}`),
      scriptureReference,
      scriptureText,
      reflection: reflectionText,
      prayer: polishedPrayer,
      nextStep,
      journalPrompt,
      endnotes: buildEndnotes({
        scriptureReference,
        sourcePath: series.sourcePath,
        day: index + 1,
        userResponse: params.userResponse,
      }),
    }
  })
}
