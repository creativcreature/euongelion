import { NextRequest, NextResponse } from 'next/server'

const APP_API_KEY = process.env.ANTHROPIC_API_KEY
const FREE_TIER_DAILY_LIMIT = 10
const ANTHROPIC_API_URL = 'https://api.anthropic.com/v1/messages'

const SYSTEM_PROMPT = `You are a biblical research assistant for Euangelion, a Christian devotional app. Your purpose is to help users explore Scripture deeply — cross-references, word studies, historical context, theology, and commentary insights.

Guidelines:
- Be warm, thoughtful, and scholarly without being academic or preachy.
- When discussing Scripture, cite specific references (book, chapter, verse).
- Offer cross-references and connections between passages when relevant.
- For word studies, reference the original Hebrew or Greek when helpful.
- Acknowledge different theological perspectives with grace.
- If a question goes beyond your knowledge, say so honestly and suggest resources.
- For questions unrelated to faith, Scripture, or spiritual formation, gently redirect: "That's a great question, but it's outside my area. I'm best at exploring Scripture and theology — want to dig into something there?"
- Keep responses concise but substantive. Aim for 2-4 paragraphs unless the question demands more.
- Use proper typographic punctuation (curly quotes, em-dashes).`

function buildContextPrompt(
  devotionalSlug?: string,
  highlightedText?: string,
): string {
  const parts: string[] = []

  if (devotionalSlug) {
    parts.push(
      `The user is currently reading the devotional "${devotionalSlug}".`,
    )
  }

  if (highlightedText) {
    parts.push(
      `The user highlighted this text and is asking about it: "${highlightedText}"`,
    )
  }

  return parts.length > 0 ? `\n\nContext: ${parts.join(' ')}` : ''
}

interface ChatRequestBody {
  messages: Array<{ role: 'user' | 'assistant'; content: string }>
  devotionalSlug?: string
  highlightedText?: string
  userApiKey?: string
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as ChatRequestBody
    const { messages, devotionalSlug, highlightedText, userApiKey } = body

    if (!messages || messages.length === 0) {
      return NextResponse.json(
        { error: 'Messages are required' },
        { status: 400 },
      )
    }

    // Determine which API key to use
    const apiKey = userApiKey || APP_API_KEY

    if (!apiKey) {
      return NextResponse.json(
        {
          error:
            'No API key available. Add your own key in Settings for unlimited access.',
        },
        { status: 503 },
      )
    }

    // Check free-tier rate limit (only when using app key)
    if (!userApiKey) {
      const dailyCount = parseInt(
        request.headers.get('x-daily-count') || '0',
        10,
      )
      if (dailyCount >= FREE_TIER_DAILY_LIMIT) {
        return NextResponse.json(
          {
            error: `You\u2019ve used your ${FREE_TIER_DAILY_LIMIT} daily questions. Add your own API key in Settings for unlimited access.`,
            limitReached: true,
          },
          { status: 429 },
        )
      }
    }

    const contextPrompt = buildContextPrompt(devotionalSlug, highlightedText)
    const systemContent = SYSTEM_PROMPT + contextPrompt

    // Call Anthropic API
    const response = await fetch(ANTHROPIC_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-5-20250929',
        max_tokens: userApiKey ? 2048 : 1024,
        system: systemContent,
        messages: messages.slice(-10).map((m) => ({
          role: m.role,
          content: m.content,
        })),
      }),
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      const errorMessage =
        (errorData as { error?: { message?: string } })?.error?.message ||
        'API request failed'

      if (response.status === 401) {
        return NextResponse.json(
          { error: 'Invalid API key. Please check your key in Settings.' },
          { status: 401 },
        )
      }

      return NextResponse.json(
        { error: errorMessage },
        { status: response.status },
      )
    }

    const data = (await response.json()) as {
      content: Array<{ type: string; text: string }>
    }
    const assistantMessage =
      data.content?.[0]?.text || 'I wasn\u2019t able to generate a response.'

    return NextResponse.json({
      message: assistantMessage,
      usingUserKey: !!userApiKey,
    })
  } catch (error) {
    console.error('Chat API error:', error)
    return NextResponse.json(
      { error: 'Something went wrong. Please try again.' },
      { status: 500 },
    )
  }
}
