import { NextRequest, NextResponse } from 'next/server'
import fs from 'fs'
import path from 'path'
import {
  getClientKey,
  readJsonWithLimit,
  sanitizeOptionalText,
  sanitizeSingleLine,
  takeRateLimit,
  withRateLimitHeaders,
} from '@/lib/api-security'
import { getOrCreateAuditSessionToken } from '@/lib/soul-audit/session'

const APP_API_KEY = process.env.ANTHROPIC_API_KEY
const FREE_TIER_DAILY_LIMIT = 10
const ANTHROPIC_API_URL = 'https://api.anthropic.com/v1/messages'
const MAX_BODY_BYTES = 30_000
const MAX_CHAT_REQUESTS_PER_MINUTE = 30
const MAX_MESSAGE_CHARS = 2_500
const MAX_HIGHLIGHT_CHARS = 600

const freeTierDailyCounter = new Map<string, { count: number; date: string }>()

const SYSTEM_PROMPT = `You are a biblical research assistant for Euangelion, a Christian devotional app.

Guidelines:
- Be warm, thoughtful, and scholarly without being academic or preachy.
- When discussing Scripture, cite specific references (book, chapter, verse).
- Offer cross-references and connections between passages when relevant.
- For word studies, reference the original Hebrew or Greek when helpful.
- Keep responses concise but substantive. Aim for 2-4 paragraphs unless the question demands more.
- You must only use the supplied local corpus context (devotional JSON + local reference volumes).
- Do not use or imply internet search, external retrieval, or knowledge outside provided context.
- If context is missing, say so plainly and invite a narrower question from the current devotional.`

function getLocalDevotionalContext(devotionalSlug?: string): string {
  if (!devotionalSlug) return ''
  const filePath = path.join(
    process.cwd(),
    'public',
    'devotionals',
    `${devotionalSlug}.json`,
  )
  if (!fs.existsSync(filePath)) return ''

  try {
    const data = JSON.parse(fs.readFileSync(filePath, 'utf8')) as Record<
      string,
      unknown
    >
    const title = String(data.title || devotionalSlug)
    const scriptureReference = String(data.scriptureReference || '')
    const modules = Array.isArray(data.modules)
      ? (data.modules as Array<Record<string, unknown>>)
      : []
    const scripture = modules.find((module) => module.type === 'scripture')
    const teaching = modules.find((module) => module.type === 'teaching')
    const reflection = modules.find((module) => module.type === 'reflection')

    return [
      `Devotional: ${title}`,
      scriptureReference ? `Scripture: ${scriptureReference}` : '',
      scripture && scripture.content
        ? `Scripture text: ${String((scripture.content as Record<string, unknown>).text || '').slice(0, 700)}`
        : '',
      teaching && teaching.content
        ? `Teaching excerpt: ${String((teaching.content as Record<string, unknown>).body || '').slice(0, 700)}`
        : '',
      reflection && reflection.content
        ? `Reflection prompt: ${String((reflection.content as Record<string, unknown>).prompt || '').slice(0, 300)}`
        : '',
    ]
      .filter(Boolean)
      .join('\n')
  } catch {
    return ''
  }
}

function getLocalReferenceContext(): string {
  const filePath = path.join(process.cwd(), 'content', 'reference', 'README.md')
  if (!fs.existsSync(filePath)) return ''
  try {
    return fs.readFileSync(filePath, 'utf8').slice(0, 1400)
  } catch {
    return ''
  }
}

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

  const devotionalContext = getLocalDevotionalContext(devotionalSlug)
  const referenceContext = getLocalReferenceContext()

  if (devotionalContext) {
    parts.push(`Local devotional context:\n${devotionalContext}`)
  }

  if (referenceContext) {
    parts.push(`Local reference-volume context:\n${referenceContext}`)
  }

  return parts.length > 0 ? `\n\nContext:\n${parts.join('\n\n')}` : ''
}

interface ChatRequestBody {
  messages: Array<{ role: 'user' | 'assistant'; content: string }>
  devotionalSlug?: string
  highlightedText?: string
  userApiKey?: string
}

function getUtcDateKey(): string {
  return new Date().toISOString().slice(0, 10)
}

function consumeDailyFreeTier(sessionKey: string): boolean {
  const date = getUtcDateKey()
  const current = freeTierDailyCounter.get(sessionKey)
  if (!current || current.date !== date) {
    freeTierDailyCounter.set(sessionKey, { count: 1, date })
    return true
  }
  if (current.count >= FREE_TIER_DAILY_LIMIT) return false
  current.count += 1
  freeTierDailyCounter.set(sessionKey, current)
  return true
}

export async function POST(request: NextRequest) {
  try {
    const limiter = takeRateLimit({
      namespace: 'chat',
      key: getClientKey(request),
      limit: MAX_CHAT_REQUESTS_PER_MINUTE,
      windowMs: 60_000,
    })
    if (!limiter.ok) {
      return withRateLimitHeaders(
        NextResponse.json(
          { error: 'Too many chat requests. Please retry shortly.' },
          { status: 429 },
        ),
        limiter.retryAfterSeconds,
      )
    }

    const parsed = await readJsonWithLimit<ChatRequestBody>({
      request,
      maxBytes: MAX_BODY_BYTES,
    })
    if (!parsed.ok) {
      return NextResponse.json(
        { error: parsed.error },
        { status: parsed.status },
      )
    }

    const body = parsed.data
    const rawMessages = Array.isArray(body.messages) ? body.messages : []
    const messages = rawMessages
      .slice(-10)
      .map((item) => ({
        role: item.role,
        content: sanitizeSingleLine(item.content, MAX_MESSAGE_CHARS),
      }))
      .filter(
        (item) =>
          (item.role === 'user' || item.role === 'assistant') &&
          item.content.length > 0,
      )

    const devotionalSlug = sanitizeSingleLine(body.devotionalSlug, 120)
    const highlightedText = sanitizeOptionalText(
      body.highlightedText,
      MAX_HIGHLIGHT_CHARS,
    )
    const userApiKey = sanitizeOptionalText(body.userApiKey, 240)

    if (!messages || messages.length === 0) {
      return NextResponse.json(
        { error: 'Messages are required' },
        { status: 400 },
      )
    }

    if (!devotionalSlug && !highlightedText) {
      return NextResponse.json(
        {
          error:
            'Study chat is limited to devotional context. Open a devotional or highlight text first.',
        },
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
      const sessionToken = await getOrCreateAuditSessionToken()
      if (!consumeDailyFreeTier(sessionToken)) {
        return NextResponse.json(
          {
            error: `You\u2019ve used your ${FREE_TIER_DAILY_LIMIT} daily questions. Add your own API key in Settings for unlimited access.`,
            limitReached: true,
          },
          { status: 429 },
        )
      }
    }

    const contextPrompt = buildContextPrompt(
      devotionalSlug || undefined,
      highlightedText ?? undefined,
    )
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
        messages: messages.map((m) => ({
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
