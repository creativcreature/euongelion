import { NextRequest, NextResponse } from 'next/server'
import * as fs from 'fs'
import * as path from 'path'
import { ALL_SERIES_ORDER, SERIES_DATA } from '@/data/series'
import type {
  AuditMatch,
  ChiasticPosition,
  CustomDevotional,
  CustomPlan,
  CustomPlanDay,
  SoulAuditResponse,
} from '@/types/soul-audit'

const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY

const CRISIS_KEYWORDS = [
  'suicide',
  'suicidal',
  'kill myself',
  'end my life',
  "don't want to live",
  "don't want to be here",
  'want to die',
  'better off dead',
  'no reason to live',
  'self harm',
  'self-harm',
  'cutting myself',
  'hurt myself',
  'abuse',
  'hits me',
  'beats me',
  'domestic violence',
]

const CHIASTIC_BY_DAY: Record<number, ChiasticPosition> = {
  1: 'A',
  2: 'B',
  3: 'C',
  4: "B'",
  5: "A'",
}

const GENERIC_DAY_FALLBACKS = [
  {
    title: 'Come as you are',
    scriptureReference: 'Psalm 34:18',
    scriptureText:
      'The Lord is near to the brokenhearted and saves the crushed in spirit.',
  },
  {
    title: 'Name what is true',
    scriptureReference: 'John 8:32',
    scriptureText: 'You will know the truth, and the truth will set you free.',
  },
  {
    title: 'Receive mercy at the center',
    scriptureReference: 'Hebrews 4:16',
    scriptureText:
      'Let us then with confidence draw near to the throne of grace.',
  },
  {
    title: 'Practice one faithful step',
    scriptureReference: 'James 1:22',
    scriptureText: 'Be doers of the word, and not hearers only.',
  },
  {
    title: 'Carry hope into tomorrow',
    scriptureReference: 'Lamentations 3:22-23',
    scriptureText:
      'His mercies never come to an end; they are new every morning.',
  },
] as const

type DevotionalContext = {
  title: string
  scriptureReference: string
  scriptureText: string
  openingParagraph: string
}

function sanitizeInput(input: unknown): string {
  if (typeof input !== 'string') return ''
  return input
    .trim()
    .slice(0, 2000)
    .replace(/<[^>]*>/g, '')
    .replace(/[<>"']/g, '')
}

function detectCrisis(text: string): boolean {
  const lower = text.toLowerCase()
  return CRISIS_KEYWORDS.some((keyword) => lower.includes(keyword))
}

function getDayContextBySlug(daySlug: string): DevotionalContext | null {
  try {
    const filePath = path.join(
      process.cwd(),
      'public',
      'devotionals',
      `${daySlug}.json`,
    )
    if (!fs.existsSync(filePath)) return null

    const data = JSON.parse(fs.readFileSync(filePath, 'utf8')) as Record<
      string,
      unknown
    >
    const title = String(data.title || '').trim()
    const scriptureReference = String(data.scriptureReference || '').trim()

    let scriptureText = ''
    let openingParagraph = ''

    const modules = Array.isArray(data.modules)
      ? (data.modules as Array<Record<string, unknown>>)
      : []
    const panels = Array.isArray(data.panels)
      ? (data.panels as Array<Record<string, unknown>>)
      : []

    const scriptureModule = modules.find((m) => m.type === 'scripture')
    if (scriptureModule) {
      scriptureText = String(
        scriptureModule.passage || scriptureModule.reference || '',
      ).trim()
    }

    const teachingModule = modules.find((m) => {
      const type = String(m.type || '')
      return (
        type === 'teaching' ||
        type === 'story' ||
        type === 'insight' ||
        type === 'reflection'
      )
    })

    if (teachingModule && teachingModule.content) {
      openingParagraph = String(teachingModule.content).split('\n\n')[0].trim()
    }

    if (!openingParagraph) {
      const textPanel = panels.find((p) => {
        const type = String(p.type || '')
        return type === 'text' || type === 'text-with-image'
      })
      if (textPanel?.content) {
        openingParagraph = String(textPanel.content).split('\n\n')[0].trim()
      }
    }

    return {
      title: title.slice(0, 120),
      scriptureReference: scriptureReference.slice(0, 120),
      scriptureText: scriptureText.slice(0, 360),
      openingParagraph: openingParagraph.slice(0, 360),
    }
  } catch {
    return null
  }
}

function getSeriesDayContext(
  slug: string,
  dayIndex: number,
): DevotionalContext | null {
  const series = SERIES_DATA[slug]
  if (!series || !series.days[dayIndex]) return null
  return getDayContextBySlug(series.days[dayIndex].slug)
}

function getDay1Preview(
  slug: string,
): { verse: string; paragraph: string } | null {
  const context = getSeriesDayContext(slug, 0)
  if (!context) return null

  const verse = context.scriptureText || context.scriptureReference
  const paragraph = context.openingParagraph

  if (!verse && !paragraph) return null
  return {
    verse: verse.slice(0, 200),
    paragraph: paragraph.slice(0, 200),
  }
}

function keywordMatch(text: string): { slug: string; confidence: number }[] {
  const lower = text.toLowerCase()
  const scores: { slug: string; score: number }[] = []

  for (const slug of ALL_SERIES_ORDER) {
    const series = SERIES_DATA[slug]
    if (!series) continue

    let score = 0
    for (const keyword of series.keywords) {
      if (lower.includes(keyword.toLowerCase())) score++
    }
    if (score > 0) scores.push({ slug, score })
  }

  scores.sort((a, b) => b.score - a.score)

  if (scores.length === 0) {
    return [{ slug: 'identity', confidence: 0.3 }]
  }

  const maxScore = scores[0].score
  return scores.slice(0, 3).map((item) => ({
    slug: item.slug,
    confidence: Math.min(item.score / Math.max(maxScore, 3), 1),
  }))
}

function enrichMatches(matches: Array<Record<string, unknown>>): AuditMatch[] {
  const seen = new Set<string>()
  const enriched: AuditMatch[] = []

  for (const item of matches) {
    const slug = String(item.slug || '')
    if (!slug || seen.has(slug) || !SERIES_DATA[slug]) continue
    seen.add(slug)

    enriched.push({
      slug,
      title: SERIES_DATA[slug].title,
      question: SERIES_DATA[slug].question,
      confidence:
        typeof item.confidence === 'number'
          ? Math.max(0, Math.min(item.confidence, 1))
          : 0.75,
      reasoning:
        typeof item.reasoning === 'string' && item.reasoning.trim().length > 0
          ? item.reasoning.trim()
          : 'This path seems to fit what you shared right now.',
      preview: getDay1Preview(slug),
    })
  }

  if (enriched.length > 0) return enriched.slice(0, 3)

  return [
    {
      slug: 'identity',
      title: SERIES_DATA.identity.title,
      question: SERIES_DATA.identity.question,
      confidence: 0.5,
      reasoning: 'A grounded place to start when everything feels uncertain.',
      preview: getDay1Preview('identity'),
    },
  ]
}

function parseJsonPayload(rawText: string): Record<string, unknown> | null {
  try {
    return JSON.parse(rawText) as Record<string, unknown>
  } catch {
    const candidate = rawText.match(/\{[\s\S]*\}/)?.[0]
    if (!candidate) return null

    try {
      return JSON.parse(candidate) as Record<string, unknown>
    } catch {
      return null
    }
  }
}

function normalizeChiasticPosition(
  value: unknown,
  day: number,
): ChiasticPosition {
  if (typeof value !== 'string') return CHIASTIC_BY_DAY[day]

  const trimmed = value.trim().replace(/[\u2018\u2019]/g, "'")
  if (
    trimmed === 'A' ||
    trimmed === 'B' ||
    trimmed === 'C' ||
    trimmed === "B'" ||
    trimmed === "A'"
  ) {
    return trimmed
  }

  return CHIASTIC_BY_DAY[day]
}

function getFallbackDaySource(
  slug: string,
  dayIndex: number,
): DevotionalContext {
  const fromSeries = getSeriesDayContext(slug, dayIndex)
  const generic = GENERIC_DAY_FALLBACKS[dayIndex]

  return {
    title:
      (fromSeries?.title || generic.title || `Day ${dayIndex + 1}`)
        .replace(/^day\s*\d+\s*[-:|]?\s*/i, '')
        .trim() || `Day ${dayIndex + 1}`,
    scriptureReference:
      fromSeries?.scriptureReference || generic.scriptureReference,
    scriptureText: fromSeries?.scriptureText || generic.scriptureText,
    openingParagraph: fromSeries?.openingParagraph || '',
  }
}

function buildFallbackCustomPlan(
  userResponse: string,
  primarySlug: string,
): CustomPlan {
  const safeSlug = SERIES_DATA[primarySlug] ? primarySlug : 'identity'
  const series = SERIES_DATA[safeSlug]
  const userSnippet = userResponse.slice(0, 130)

  const days: CustomPlanDay[] = Array.from({ length: 5 }, (_, index) => {
    const dayNumber = index + 1
    const source = getFallbackDaySource(safeSlug, index)
    const themeFrame =
      dayNumber === 1
        ? 'start with honest naming and gentle grounding.'
        : dayNumber === 3
          ? 'move to the center where grace reshapes perspective.'
          : dayNumber === 5
            ? 'close with hope and a concrete way forward.'
            : 'keep building steady practice through this week.'

    const openingLine =
      dayNumber === 1
        ? `You named this struggle clearly: "${userSnippet}${userResponse.length > 130 ? '...' : ''}".`
        : `Stay with this process. Day ${dayNumber} is not about performance, but faithful attention.`

    return {
      day: dayNumber,
      chiasticPosition: CHIASTIC_BY_DAY[dayNumber],
      title: source.title || `Day ${dayNumber}`,
      scriptureReference: source.scriptureReference,
      scriptureText: source.scriptureText,
      reflection: [
        openingLine,
        source.openingParagraph
          ? source.openingParagraph
          : `In this moment, ${series.title.toLowerCase()} helps you ${themeFrame}`,
        'Take one small, sincere step today. God meets people in real time, not ideal conditions.',
      ]
        .filter(Boolean)
        .join('\n\n')
        .slice(0, 2400),
      prayer:
        'Jesus, meet me in what I am carrying today. Give me honesty, steadiness, and courage for the next faithful step. Amen.',
      nextStep:
        dayNumber === 1
          ? 'Set a 7-minute timer. Read the scripture slowly twice, then write one honest sentence to God.'
          : dayNumber === 5
            ? 'Review your notes from this week and choose one practice to continue for seven more days.'
            : 'Read the scripture once in the morning and once at night. Keep one sentence of response in your journal.',
      journalPrompt:
        dayNumber === 3
          ? 'Where do you most need grace instead of self-management right now?'
          : dayNumber === 5
            ? 'What changed in you this week, and what needs to continue next week?'
            : 'What truth from today do you need to carry into your next decision?',
    }
  })

  return {
    title: 'A 5-Day Plan For This Season',
    summary: `This plan is tailored to what you shared and draws from the ${series.title} pathway as supporting context.`,
    generatedAt: new Date().toISOString(),
    days,
  }
}

function normalizeCustomPlanDay(
  payload: Record<string, unknown> | null,
  fallback: CustomPlanDay,
  day: number,
): CustomPlanDay {
  if (!payload) {
    return { ...fallback, day, chiasticPosition: CHIASTIC_BY_DAY[day] }
  }

  return {
    day,
    chiasticPosition: normalizeChiasticPosition(payload.chiastic_position, day),
    title:
      typeof payload.title === 'string' && payload.title.trim().length > 0
        ? payload.title.trim().slice(0, 120)
        : fallback.title,
    scriptureReference:
      typeof payload.scripture_reference === 'string' &&
      payload.scripture_reference.trim().length > 0
        ? payload.scripture_reference.trim().slice(0, 120)
        : fallback.scriptureReference,
    scriptureText:
      typeof payload.scripture_text === 'string' &&
      payload.scripture_text.trim().length > 0
        ? payload.scripture_text.trim().slice(0, 700)
        : fallback.scriptureText,
    reflection:
      typeof payload.reflection === 'string' &&
      payload.reflection.trim().length > 0
        ? payload.reflection.trim().slice(0, 2400)
        : fallback.reflection,
    prayer:
      typeof payload.prayer === 'string' && payload.prayer.trim().length > 0
        ? payload.prayer.trim().slice(0, 700)
        : fallback.prayer,
    nextStep:
      typeof payload.next_step === 'string' &&
      payload.next_step.trim().length > 0
        ? payload.next_step.trim().slice(0, 320)
        : fallback.nextStep,
    journalPrompt:
      typeof payload.journal_prompt === 'string' &&
      payload.journal_prompt.trim().length > 0
        ? payload.journal_prompt.trim().slice(0, 320)
        : fallback.journalPrompt,
  }
}

function normalizeCustomPlan(
  payload: Record<string, unknown> | null,
  fallback: CustomPlan,
): CustomPlan {
  if (!payload) return fallback

  const rawDays = Array.isArray(payload.days)
    ? (payload.days as Array<Record<string, unknown>>)
    : []

  const days: CustomPlanDay[] = Array.from({ length: 5 }, (_, index) => {
    const day = index + 1
    const fallbackDay = fallback.days[index] || fallback.days[0]
    const rawDay = rawDays[index] || null

    return normalizeCustomPlanDay(rawDay, fallbackDay, day)
  })

  return {
    title:
      typeof payload.title === 'string' && payload.title.trim().length > 0
        ? payload.title.trim().slice(0, 120)
        : fallback.title,
    summary:
      typeof payload.summary === 'string' && payload.summary.trim().length > 0
        ? payload.summary.trim().slice(0, 360)
        : fallback.summary,
    generatedAt: new Date().toISOString(),
    days,
  }
}

function dayToLegacyDevotional(
  day: CustomPlanDay,
  generatedAt: string,
): CustomDevotional {
  return {
    title: day.title,
    scriptureReference: day.scriptureReference,
    scriptureText: day.scriptureText,
    reflection: day.reflection,
    prayer: day.prayer,
    nextStep: day.nextStep,
    journalPrompt: day.journalPrompt,
    generatedAt,
  }
}

async function generateWithClaude(
  userResponse: string,
  seriesDescriptions: string,
  fallbackSlug: string,
): Promise<{ matches: AuditMatch[]; customPlan: CustomPlan } | null> {
  if (!ANTHROPIC_API_KEY) return null

  const fallbackPlan = buildFallbackCustomPlan(userResponse, fallbackSlug)

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 2600,
      messages: [
        {
          role: 'user',
          content: `You are a pastoral Christian editor.

A user answered the Soul Audit prompt "What are you wrestling with today?"
User response: "${userResponse}"

Available series:
${seriesDescriptions}

Return ONLY valid JSON (no markdown) with this exact shape:
{
  "custom_plan": {
    "title": "short title for the full plan (max 12 words)",
    "summary": "1-2 sentence overview of this 5-day journey",
    "days": [
      {
        "day": 1,
        "chiastic_position": "A",
        "title": "day title",
        "scripture_reference": "Book Chapter:Verse(s)",
        "scripture_text": "quoted or paraphrased scripture (max 70 words)",
        "reflection": "2-3 short paragraphs separated by blank lines",
        "prayer": "short prayer (2-4 sentences)",
        "next_step": "one specific actionable step for today",
        "journal_prompt": "one reflective question"
      },
      {
        "day": 2,
        "chiastic_position": "B",
        "title": "day title",
        "scripture_reference": "Book Chapter:Verse(s)",
        "scripture_text": "quoted or paraphrased scripture (max 70 words)",
        "reflection": "2-3 short paragraphs separated by blank lines",
        "prayer": "short prayer (2-4 sentences)",
        "next_step": "one specific actionable step for today",
        "journal_prompt": "one reflective question"
      },
      {
        "day": 3,
        "chiastic_position": "C",
        "title": "day title",
        "scripture_reference": "Book Chapter:Verse(s)",
        "scripture_text": "quoted or paraphrased scripture (max 70 words)",
        "reflection": "2-3 short paragraphs separated by blank lines",
        "prayer": "short prayer (2-4 sentences)",
        "next_step": "one specific actionable step for today",
        "journal_prompt": "one reflective question"
      },
      {
        "day": 4,
        "chiastic_position": "B'",
        "title": "day title",
        "scripture_reference": "Book Chapter:Verse(s)",
        "scripture_text": "quoted or paraphrased scripture (max 70 words)",
        "reflection": "2-3 short paragraphs separated by blank lines",
        "prayer": "short prayer (2-4 sentences)",
        "next_step": "one specific actionable step for today",
        "journal_prompt": "one reflective question"
      },
      {
        "day": 5,
        "chiastic_position": "A'",
        "title": "day title",
        "scripture_reference": "Book Chapter:Verse(s)",
        "scripture_text": "quoted or paraphrased scripture (max 70 words)",
        "reflection": "2-3 short paragraphs separated by blank lines",
        "prayer": "short prayer (2-4 sentences)",
        "next_step": "one specific actionable step for today",
        "journal_prompt": "one reflective question"
      }
    ]
  },
  "matches": [
    { "slug": "series_slug", "confidence": 0.0, "reasoning": "one warm sentence" },
    { "slug": "series_slug_2", "confidence": 0.0, "reasoning": "one warm sentence" },
    { "slug": "series_slug_3", "confidence": 0.0, "reasoning": "one warm sentence" }
  ]
}

Rules:
- Return exactly 5 days in the custom plan with chiastic progression A, B, C, B', A'.
- Return exactly 3 unique match slugs from the list.
- Keep tone pastoral, clear, non-judgmental.
- Be biblically grounded and concrete.
- Do not claim certainty about the user.
- No mention of being an AI.
- Keep all writing naturally human and not generic platitudes.`,
        },
      ],
    }),
  })

  if (!response.ok) return null
  const data = (await response.json()) as { content?: Array<{ text?: string }> }
  const text = data.content?.[0]?.text
  if (!text) return null

  const parsed = parseJsonPayload(text)
  if (!parsed) return null

  const rawMatches = Array.isArray(parsed.matches)
    ? (parsed.matches as Array<Record<string, unknown>>)
    : []
  const matches = enrichMatches(rawMatches)
  const customPlan = normalizeCustomPlan(
    (parsed.custom_plan as Record<string, unknown>) || null,
    fallbackPlan,
  )

  return { matches, customPlan }
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as { response?: string }
    const userResponse = sanitizeInput(body.response)

    if (!userResponse) {
      return NextResponse.json(
        { error: "Take your time. When you're ready, just write what comes." },
        { status: 400 },
      )
    }

    if (detectCrisis(userResponse)) {
      const matches = enrichMatches([
        {
          slug: 'hope',
          confidence: 1,
          reasoning:
            "When you're ready, we have words of hope waiting for you.",
        },
      ])
      const customPlan = buildFallbackCustomPlan(userResponse, 'hope')

      const payload: SoulAuditResponse = {
        crisis: true,
        message: "We hear you. What you're carrying sounds incredibly heavy.",
        resources: [
          { name: 'National Suicide Prevention Lifeline', contact: '988' },
          { name: 'Crisis Text Line', contact: 'Text HOME to 741741' },
        ],
        customPlan,
        customDevotional: dayToLegacyDevotional(
          customPlan.days[0],
          customPlan.generatedAt,
        ),
        matches,
      }

      return NextResponse.json(payload)
    }

    const seriesDescriptions = ALL_SERIES_ORDER.map((slug) => {
      const series = SERIES_DATA[slug]
      return `- ${slug}: "${series.question}" - ${series.introduction} [Keywords: ${series.keywords.join(', ')}]`
    }).join('\n')

    const fallbackMatches = keywordMatch(userResponse)
    const fallbackSlug = fallbackMatches[0]?.slug || 'identity'

    if (ANTHROPIC_API_KEY) {
      try {
        const generated = await generateWithClaude(
          userResponse,
          seriesDescriptions,
          fallbackSlug,
        )
        if (generated) {
          const payload: SoulAuditResponse = {
            crisis: false,
            customPlan: generated.customPlan,
            customDevotional: dayToLegacyDevotional(
              generated.customPlan.days[0],
              generated.customPlan.generatedAt,
            ),
            matches: generated.matches,
          }
          return NextResponse.json(payload)
        }
      } catch {
        // Fallback below.
      }
    }

    const matches = enrichMatches(
      fallbackMatches.map((item) => ({
        slug: item.slug,
        confidence: item.confidence,
        reasoning:
          'Based on what you shared, this path seems especially aligned for right now.',
      })),
    )

    const customPlan = buildFallbackCustomPlan(userResponse, fallbackSlug)

    const payload: SoulAuditResponse = {
      crisis: false,
      customPlan,
      customDevotional: dayToLegacyDevotional(
        customPlan.days[0],
        customPlan.generatedAt,
      ),
      matches,
    }

    return NextResponse.json(payload)
  } catch {
    return NextResponse.json(
      { error: "Something broke. It's not you. We're working on it." },
      { status: 500 },
    )
  }
}
