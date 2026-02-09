import { NextRequest, NextResponse } from 'next/server'
import { SERIES_DATA, ALL_SERIES_ORDER } from '@/data/series'
import * as fs from 'fs'
import * as path from 'path'

const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY

// Crisis keywords that trigger the safety protocol
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

function detectCrisis(text: string): boolean {
  const lower = text.toLowerCase()
  return CRISIS_KEYWORDS.some((keyword) => lower.includes(keyword))
}

// Load Day 1 preview for a series
function getDay1Preview(
  slug: string,
): { verse: string; paragraph: string } | null {
  try {
    const series = SERIES_DATA[slug]
    if (!series || series.days.length === 0) return null

    const day1Slug = series.days[0].slug
    const filePath = path.join(
      process.cwd(),
      'public',
      'devotionals',
      `${day1Slug}.json`,
    )

    if (!fs.existsSync(filePath)) return null

    const data = JSON.parse(fs.readFileSync(filePath, 'utf8'))
    const modules = data.modules || []

    // Find first scripture module for verse
    const scripture = modules.find(
      (m: Record<string, unknown>) => m.type === 'scripture',
    )
    const verse = scripture?.passage || scripture?.reference || ''

    // Find first teaching module for paragraph
    const teaching = modules.find(
      (m: Record<string, unknown>) => m.type === 'teaching',
    )
    const paragraph = teaching?.content
      ? String(teaching.content).split('\n\n')[0]?.slice(0, 200)
      : ''

    if (!verse && !paragraph) return null
    return { verse: verse.slice(0, 200), paragraph }
  } catch {
    return null
  }
}

// Keyword-based fallback matching (all 26 series)
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
  return scores.slice(0, 3).map((s) => ({
    slug: s.slug,
    confidence: Math.min(s.score / Math.max(maxScore, 3), 1),
  }))
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const userResponse = body.response as string

    if (!userResponse || userResponse.trim().length === 0) {
      return NextResponse.json(
        { error: "Take your time. When you're ready, just write what comes." },
        { status: 400 },
      )
    }

    // Crisis detection
    if (detectCrisis(userResponse)) {
      return NextResponse.json({
        crisis: true,
        message: "We hear you. What you're carrying sounds incredibly heavy.",
        resources: [
          { name: 'National Suicide Prevention Lifeline', contact: '988' },
          { name: 'Crisis Text Line', contact: 'Text HOME to 741741' },
        ],
        matches: [
          {
            slug: 'hope',
            title: SERIES_DATA.hope.title,
            question: SERIES_DATA.hope.question,
            confidence: 1.0,
            reasoning:
              "When you're ready, we have words of hope waiting for you.",
            preview: getDay1Preview('hope'),
          },
        ],
      })
    }

    // Build series descriptions for Claude (all 26)
    const seriesDescriptions = ALL_SERIES_ORDER.map((slug) => {
      const s = SERIES_DATA[slug]
      return `- ${slug}: "${s.question}" — ${s.introduction} [Keywords: ${s.keywords.join(', ')}]`
    }).join('\n')

    // Try Claude API first
    if (ANTHROPIC_API_KEY) {
      try {
        const claudeResponse = await fetch(
          'https://api.anthropic.com/v1/messages',
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'x-api-key': ANTHROPIC_API_KEY,
              'anthropic-version': '2023-06-01',
            },
            body: JSON.stringify({
              model: 'claude-haiku-4-5-20251001',
              max_tokens: 800,
              messages: [
                {
                  role: 'user',
                  content: `You are matching a user to devotional series based on their response to "What are you wrestling with today?"

User response: "${userResponse}"

Available series (26 total):
${seriesDescriptions}

Return ONLY valid JSON (no markdown, no backticks) with this exact structure:
{
  "matches": [
    {
      "slug": "series_slug",
      "confidence": 0.0 to 1.0,
      "reasoning": "One warm sentence explaining why this series fits"
    },
    {
      "slug": "second_best_slug",
      "confidence": 0.0 to 1.0,
      "reasoning": "One warm sentence"
    },
    {
      "slug": "third_best_slug",
      "confidence": 0.0 to 1.0,
      "reasoning": "One warm sentence"
    }
  ]
}

Rules:
- Return exactly 3 matches, each a different series
- slugs must match exactly from the list above
- confidence reflects how well the user's response maps to each series
- reasoning should be warm and pastoral, not clinical
- The first match should be the strongest fit`,
                },
              ],
            }),
          },
        )

        if (claudeResponse.ok) {
          const claudeData = await claudeResponse.json()
          const content = claudeData.content?.[0]?.text

          if (content) {
            const parsed = JSON.parse(content)

            if (parsed.matches && Array.isArray(parsed.matches)) {
              const enrichedMatches = parsed.matches
                .filter(
                  (m: { slug: string }) =>
                    SERIES_DATA[m.slug as keyof typeof SERIES_DATA],
                )
                .slice(0, 3)
                .map(
                  (m: {
                    slug: string
                    confidence: number
                    reasoning: string
                  }) => ({
                    slug: m.slug,
                    title: SERIES_DATA[m.slug].title,
                    question: SERIES_DATA[m.slug].question,
                    confidence: m.confidence || 0.8,
                    reasoning:
                      m.reasoning ||
                      'We think this series speaks to where you are.',
                    preview: getDay1Preview(m.slug),
                  }),
                )

              if (enrichedMatches.length > 0) {
                return NextResponse.json({
                  crisis: false,
                  matches: enrichedMatches,
                })
              }
            }
          }
        }
      } catch {
        // Fall through to keyword matching
      }
    }

    // Fallback: keyword matching
    const matches = keywordMatch(userResponse)
    const enrichedMatches = matches.slice(0, 3).map((m) => ({
      slug: m.slug,
      title: SERIES_DATA[m.slug].title,
      question: SERIES_DATA[m.slug].question,
      confidence: m.confidence,
      reasoning:
        'Based on what you shared, we think this series will meet you well.',
      preview: getDay1Preview(m.slug),
    }))

    return NextResponse.json({
      crisis: false,
      matches: enrichedMatches,
    })
  } catch {
    return NextResponse.json(
      { error: "Something broke. It's not you. We're working on it." },
      { status: 500 },
    )
  }
}
