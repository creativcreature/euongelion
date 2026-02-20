import { SERIES_DATA } from '@/data/series'
import {
  scriptureLeadPartsFromFramework,
  clampScriptureSnippet,
} from '@/lib/scripture-reference'
import type { CustomPlanDay } from '@/types/soul-audit'

const CHIASTIC_POSITIONS: Array<'A' | 'B' | 'C' | "B'" | "A'"> = [
  'A',
  'B',
  'C',
  "B'",
  "A'",
]

function normalizeInputSnippet(input: string): string {
  const normalized = input.replace(/\s+/g, ' ').trim()
  if (!normalized) return ''
  if (normalized.length <= 180) return normalized
  return `${normalized.slice(0, 177).trimEnd()}...`
}

function clamp(value: string, maxLength: number): string {
  if (value.length <= maxLength) return value
  return `${value.slice(0, maxLength - 3).trimEnd()}...`
}

function ensureMinLength(value: string, minLength: number): string {
  if (value.length >= minLength) return value
  return `${value}\n\nStay with this slowly. Name one concrete act of obedience before the day ends, and set a time to do it.`
}

function buildFallbackDay(params: {
  day: number
  dayTitle: string
  scriptureReference: string
  scriptureText: string
  userResponse: string
  seriesTitle: string
  seriesQuestion: string
  introduction: string
  context: string
  keywords: string[]
}): CustomPlanDay {
  const userSnippet = normalizeInputSnippet(params.userResponse)
  const userLine = userSnippet
    ? `You named this burden: "${userSnippet}".`
    : 'Bring your current burden honestly before God.'

  const keywordFocus = params.keywords.slice(0, 3).join(', ')
  const focusLine = keywordFocus
    ? `This day focuses your attention around: ${keywordFocus}.`
    : 'This day focuses your attention on faithful obedience in ordinary life.'

  const reflection = ensureMinLength(
    [
      userLine,
      `Scripture anchor (${params.scriptureReference}): ${clamp(params.scriptureText, 360)}`,
      `Series tension: ${params.seriesQuestion}`,
      `Day focus: "${params.dayTitle}" inside "${params.seriesTitle}".`,
      `Context: ${clamp(params.context || params.introduction, 360)}`,
      focusLine,
      `Read ${params.scriptureReference} slowly. Ask what this passage reveals about God, what it exposes in your heart, and what faithful response is required today.`,
    ].join('\n\n'),
    640,
  )

  const prayer = ensureMinLength(
    [
      `Lord Jesus, meet me in ${params.dayTitle} and steady me in Your truth.`,
      `You know my burden${userSnippet ? ` ("${userSnippet}")` : ''}. Replace hurry and fear with trust and obedience.`,
      `Use ${params.scriptureReference} to shape my words, my decisions, and my attention today.`,
    ].join('\n\n'),
    280,
  )

  return {
    day: params.day,
    chiasticPosition: CHIASTIC_POSITIONS[params.day - 1] ?? undefined,
    title: params.dayTitle,
    scriptureReference: params.scriptureReference,
    scriptureText: params.scriptureText,
    reflection,
    prayer,
    nextStep:
      'Choose one concrete act of obedience from today’s reading, schedule it before the day ends, and complete it before your evening wind-down.',
    journalPrompt: `Where did ${params.scriptureReference} confront or comfort me today, and what one faithful action will I take before I sleep?`,
    endnotes: [
      {
        id: 1,
        source: 'Scripture',
        note: params.scriptureReference,
      },
      {
        id: 2,
        source: 'Series metadata fallback',
        note: `Generated from ${params.seriesTitle} day ${params.day} because curated modules were unavailable.`,
      },
      {
        id: 3,
        source: 'Composition Policy',
        note: 'Metadata-based fallback devotional to preserve routing continuity.',
      },
    ],
  }
}

export function buildMetadataFallbackPlan(params: {
  seriesSlug: string
  userResponse: string
}): CustomPlanDay[] {
  const series = SERIES_DATA[params.seriesSlug]
  if (!series) return []

  const framework = scriptureLeadPartsFromFramework(series.framework, {
    maxSnippetLength: 260,
  })
  const scriptureReference = framework.reference || 'Scripture'
  const scriptureText =
    clampScriptureSnippet(framework.snippet, 320) ||
    `Read ${scriptureReference} with honesty and faithful attention.`

  const orderedDays = [...series.days]
    .sort((a, b) => a.day - b.day)
    .slice(0, 5)
    .map((day, index) => ({
      day: index + 1,
      title: day.title || `Day ${index + 1}`,
    }))

  if (orderedDays.length === 0) {
    orderedDays.push(
      { day: 1, title: 'Day 1' },
      { day: 2, title: 'Day 2' },
      { day: 3, title: 'Day 3' },
      { day: 4, title: 'Day 4' },
      { day: 5, title: 'Day 5' },
    )
  }

  return orderedDays.map((day) =>
    buildFallbackDay({
      day: day.day,
      dayTitle: day.title,
      scriptureReference,
      scriptureText,
      userResponse: params.userResponse,
      seriesTitle: series.title,
      seriesQuestion: series.question,
      introduction: series.introduction,
      context: series.context,
      keywords: series.keywords,
    }),
  )
}
