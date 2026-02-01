import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'

interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
}

interface ChatRequest {
  messages: ChatMessage[]
  context?: {
    seriesSlug?: string
    dayNumber?: number
    devotionalTitle?: string
  }
}

// Rate limiting (in-memory, resets on cold start)
const rateLimitMap = new Map<string, { count: number; resetTime: number }>()
const RATE_LIMIT = 20 // requests per minute
const RATE_WINDOW = 60 * 1000

function isRateLimited(ip: string): boolean {
  const now = Date.now()
  const record = rateLimitMap.get(ip)

  if (!record || now > record.resetTime) {
    rateLimitMap.set(ip, { count: 1, resetTime: now + RATE_WINDOW })
    return false
  }

  if (record.count >= RATE_LIMIT) {
    return true
  }

  record.count++
  return false
}

// System prompt for spiritual guidance
const SYSTEM_PROMPT = `You are a gentle, wise spiritual guide for EUONGELION — a devotional platform helping people find clarity, rest, and truth in a noisy world.

Your role:
- Listen with compassion and without judgment
- Offer biblical wisdom gently, not forcefully
- Ask thoughtful questions that help people reflect
- Never lecture or preach — walk alongside
- Keep responses concise (2-4 sentences unless more is needed)
- Reference relevant scripture when appropriate, but sparingly
- Acknowledge the struggle before offering perspective
- Point toward hope without toxic positivity

Tone: Warm but not saccharine. Honest but not harsh. Like a trusted friend who happens to know the Bible deeply.

If the user shares context about what devotional they're reading, weave that into your response when relevant.

Remember: People come here cluttered and hungry. Meet them with bread, not bricks.`

export async function POST(request: NextRequest) {
  // Get client IP for rate limiting
  const forwarded = request.headers.get('x-forwarded-for')
  const ip = forwarded?.split(',')[0]?.trim() || 'unknown'

  if (isRateLimited(ip)) {
    return NextResponse.json(
      { error: 'Too many requests. Please wait a moment.' },
      { status: 429 }
    )
  }

  try {
    const body: ChatRequest = await request.json()
    const { messages, context } = body

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return NextResponse.json(
        { error: 'Messages array is required' },
        { status: 400 }
      )
    }

    const apiKey = process.env.ANTHROPIC_API_KEY
    if (!apiKey) {
      console.error('ANTHROPIC_API_KEY not configured')
      return NextResponse.json(
        { error: 'Chat service not configured' },
        { status: 500 }
      )
    }

    // Build system prompt with optional context
    let systemPrompt = SYSTEM_PROMPT
    if (context?.devotionalTitle) {
      systemPrompt += `\n\nThe user is currently reading: "${context.devotionalTitle}" (Day ${context.dayNumber || '?'} of the ${context.seriesSlug || 'unknown'} series).`
    }

    const anthropic = new Anthropic({ apiKey })

    const response = await anthropic.messages.create({
      model: 'claude-3-5-sonnet-20241022',
      max_tokens: 512,
      system: systemPrompt,
      messages: messages.map((m) => ({
        role: m.role,
        content: m.content,
      })),
    })

    const content =
      response.content[0].type === 'text' ? response.content[0].text : ''

    return NextResponse.json({ content })
  } catch (error) {
    console.error('Chat API error:', error)
    const message = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

// Handle CORS preflight
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  })
}
