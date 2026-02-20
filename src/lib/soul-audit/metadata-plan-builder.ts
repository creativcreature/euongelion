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
  if (normalized.length <= 140) return normalized
  return `${normalized.slice(0, 137).trimEnd()}...`
}

function buildFallbackDay(params: {
  day: number
  dayTitle: string
  scriptureReference: string
  scriptureText: string
  userResponse: string
  seriesTitle: string
}): CustomPlanDay {
  const userSnippet = normalizeInputSnippet(params.userResponse)
  const userLine = userSnippet
    ? `You named this burden: "${userSnippet}".`
    : 'Bring your current burden honestly before God.'

  return {
    day: params.day,
    chiasticPosition: CHIASTIC_POSITIONS[params.day - 1] ?? undefined,
    title: params.dayTitle,
    scriptureReference: params.scriptureReference,
    scriptureText: params.scriptureText,
    reflection: [
      userLine,
      `Read ${params.scriptureReference} slowly and notice what it reveals about ${params.seriesTitle}.`,
      `In "${params.dayTitle}", ask what one faithful response looks like today.`,
    ].join('\n\n'),
    prayer: [
      'Lord Jesus, meet me in this moment and reorder my heart in truth.',
      `Use ${params.scriptureReference} to anchor me in faithful obedience today.`,
    ].join('\n\n'),
    nextStep:
      'Choose one concrete act of obedience from today’s reading and schedule it before the day ends.',
    journalPrompt:
      'What specific phrase from Scripture is confronting or comforting me, and what faithful action follows from it?',
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
    maxSnippetLength: 220,
  })
  const scriptureReference = framework.reference || 'Scripture'
  const scriptureText =
    clampScriptureSnippet(framework.snippet, 260) ||
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
    }),
  )
}
