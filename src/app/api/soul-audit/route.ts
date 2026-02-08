import { NextRequest, NextResponse } from 'next/server'
import { SERIES_DATA, SERIES_ORDER } from '@/data/series'

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

// Keyword-based fallback matching
const SERIES_KEYWORDS: Record<string, string[]> = {
  identity: [
    'identity',
    'who am i',
    'lost',
    'shaken',
    'labels',
    'defined',
    'purpose',
    'meaning',
    'self',
    'belong',
  ],
  peace: [
    'peace',
    'anxious',
    'anxiety',
    'control',
    'worry',
    'stressed',
    'overwhelmed',
    'restless',
    'fear',
    'panic',
  ],
  community: [
    'lonely',
    'alone',
    'isolated',
    'friends',
    'community',
    'church',
    'people',
    'relationships',
    'trust',
    'betrayed',
  ],
  kingdom: [
    'politics',
    'government',
    'system',
    'searching',
    'looking',
    'refuge',
    'power',
    'kingdom',
    'world',
    'broken',
  ],
  provision: [
    'money',
    'finances',
    'job',
    'work',
    'provide',
    'enough',
    'scarcity',
    'poor',
    'rich',
    'economy',
    'inflation',
  ],
  truth: [
    'truth',
    'lies',
    'misinformation',
    'confused',
    'real',
    'fake',
    'trust',
    'media',
    'believe',
    'discern',
  ],
  hope: [
    'hope',
    'hopeless',
    'dark',
    'despair',
    'pessimistic',
    'depressed',
    'grief',
    'loss',
    'tired',
    'exhausted',
    'doubt',
  ],
}

function keywordMatch(text: string): { slug: string; confidence: number }[] {
  const lower = text.toLowerCase()
  const scores: { slug: string; score: number }[] = []

  for (const [slug, keywords] of Object.entries(SERIES_KEYWORDS)) {
    let score = 0
    for (const keyword of keywords) {
      if (lower.includes(keyword)) score++
    }
    if (score > 0) scores.push({ slug, score })
  }

  scores.sort((a, b) => b.score - a.score)

  if (scores.length === 0) {
    // Default to identity (first series) if no matches
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
        // Still provide a gentle match
        match: {
          slug: 'hope',
          title: SERIES_DATA.hope.title,
          question: SERIES_DATA.hope.question,
          confidence: 1.0,
          reasoning:
            "When you're ready, we have words of hope waiting for you.",
        },
        alternatives: [],
      })
    }

    // Build series descriptions for Claude
    const seriesDescriptions = SERIES_ORDER.map((slug) => {
      const s = SERIES_DATA[slug]
      return `- ${slug}: "${s.question}" — ${s.introduction}`
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
              max_tokens: 500,
              messages: [
                {
                  role: 'user',
                  content: `You are matching a user to a devotional series based on their response to "What are you wrestling with today?"

User response: "${userResponse}"

Available series:
${seriesDescriptions}

Return ONLY valid JSON (no markdown, no backticks) with this exact structure:
{
  "primary_match": "series_slug",
  "confidence": 0.0 to 1.0,
  "reasoning": "One sentence explaining why this series fits",
  "alternatives": ["slug1", "slug2"]
}

Rules:
- primary_match must be one of: ${SERIES_ORDER.join(', ')}
- alternatives must be different from primary_match
- confidence reflects how well the user's response maps to the series
- reasoning should be warm and pastoral, not clinical`,
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
            const primarySlug = parsed.primary_match as string

            if (SERIES_DATA[primarySlug]) {
              const primary = SERIES_DATA[primarySlug]
              const alternatives = (parsed.alternatives || [])
                .filter((s: string) => SERIES_DATA[s] && s !== primarySlug)
                .slice(0, 2)
                .map((s: string) => ({
                  slug: s,
                  title: SERIES_DATA[s].title,
                  question: SERIES_DATA[s].question,
                }))

              return NextResponse.json({
                crisis: false,
                match: {
                  slug: primarySlug,
                  title: primary.title,
                  question: primary.question,
                  confidence: parsed.confidence || 0.8,
                  reasoning:
                    parsed.reasoning ||
                    'We think this series speaks to where you are.',
                },
                alternatives,
              })
            }
          }
        }
      } catch {
        // Fall through to keyword matching
      }
    }

    // Fallback: keyword matching
    const matches = keywordMatch(userResponse)
    const primarySlug = matches[0].slug
    const primary = SERIES_DATA[primarySlug]

    const alternatives = matches.slice(1, 3).map((m) => ({
      slug: m.slug,
      title: SERIES_DATA[m.slug].title,
      question: SERIES_DATA[m.slug].question,
    }))

    return NextResponse.json({
      crisis: false,
      match: {
        slug: primarySlug,
        title: primary.title,
        question: primary.question,
        confidence: matches[0].confidence,
        reasoning:
          'Based on what you shared, we think this series will meet you well.',
      },
      alternatives,
    })
  } catch {
    return NextResponse.json(
      { error: "Something broke. It's not you. We're working on it." },
      { status: 500 },
    )
  }
}
