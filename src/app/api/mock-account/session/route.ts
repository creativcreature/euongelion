import { NextRequest, NextResponse } from 'next/server'
import {
  getClientKey,
  readJsonWithLimit,
  takeRateLimit,
  withRateLimitHeaders,
} from '@/lib/api-security'
import {
  getMockAccountSessionWithFallback,
  upsertMockAccountSession,
} from '@/lib/soul-audit/repository'
import {
  RETENTION_POLICY,
  retentionPolicySummary,
} from '@/lib/privacy/retention'
import { getOrCreateAuditSessionToken } from '@/lib/soul-audit/session'

type Mode = 'anonymous' | 'mock_account'

interface Body {
  mode?: Mode
  analyticsOptIn?: boolean
}

const MAX_SESSION_BODY_BYTES = 2_048
const MAX_SESSION_REQUESTS_PER_MINUTE = 40

function capabilities(mode: Mode) {
  if (mode === 'mock_account') {
    return [
      'bookmarks',
      'archive',
      'notes',
      'highlights',
      'sticky-notes',
      'stickers',
      'quote-sharing',
      'study-chat-history',
      'data-export',
    ]
  }
  return ['bookmarks', 'resume']
}

function responsePayload(params: { mode: Mode; analyticsOptIn: boolean }) {
  return {
    ok: true,
    mode: params.mode,
    analyticsOptIn: params.analyticsOptIn,
    isAnonymousDefault: params.mode === 'anonymous',
    capabilities: capabilities(params.mode),
    retention: RETENTION_POLICY,
    retentionSummary: retentionPolicySummary(),
  }
}

export async function POST(request: NextRequest) {
  try {
    const limiter = takeRateLimit({
      namespace: 'mock-account-session',
      key: getClientKey(request),
      limit: MAX_SESSION_REQUESTS_PER_MINUTE,
      windowMs: 60_000,
    })
    if (!limiter.ok) {
      return withRateLimitHeaders(
        NextResponse.json(
          { error: 'Too many session requests. Please retry shortly.' },
          { status: 429 },
        ),
        limiter.retryAfterSeconds,
      )
    }

    const parsed = await readJsonWithLimit<Body>({
      request,
      maxBytes: MAX_SESSION_BODY_BYTES,
    })
    if (!parsed.ok) {
      return NextResponse.json(
        { error: parsed.error },
        { status: parsed.status },
      )
    }

    const body = parsed.data
    const mode: Mode =
      body.mode === 'mock_account' ? 'mock_account' : 'anonymous'
    const analyticsOptIn = Boolean(body.analyticsOptIn)
    const sessionToken = await getOrCreateAuditSessionToken()

    const session = await upsertMockAccountSession({
      sessionToken,
      mode,
      analyticsOptIn,
    })

    return NextResponse.json(
      responsePayload({
        mode: session.mode,
        analyticsOptIn: session.analytics_opt_in,
      }),
    )
  } catch (error) {
    console.error('Mock account session error:', error)
    return NextResponse.json(
      { error: 'Unable to start mock account session.' },
      { status: 500 },
    )
  }
}

export async function GET() {
  try {
    const sessionToken = await getOrCreateAuditSessionToken()
    const session = await getMockAccountSessionWithFallback(sessionToken)
    const mode: Mode = session?.mode ?? 'anonymous'

    return NextResponse.json(
      responsePayload({
        mode,
        analyticsOptIn: session?.analytics_opt_in ?? false,
      }),
    )
  } catch (error) {
    console.error('Mock account session lookup error:', error)
    return NextResponse.json(
      { error: 'Unable to fetch mock account session.' },
      { status: 500 },
    )
  }
}
