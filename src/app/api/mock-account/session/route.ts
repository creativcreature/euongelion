import { NextRequest, NextResponse } from 'next/server'
import {
  createRequestId,
  getClientKey,
  jsonError,
  readJsonWithLimit,
  takeRateLimit,
} from '@/lib/api-security'
import { logApiFailure } from '@/lib/observability/api-failure'
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
  const requestId = createRequestId()
  const clientKey = getClientKey(request)
  try {
    const limiter = await takeRateLimit({
      namespace: 'mock-account-session',
      key: clientKey,
      limit: MAX_SESSION_REQUESTS_PER_MINUTE,
      windowMs: 60_000,
    })
    if (!limiter.ok) {
      logApiFailure({
        scope: 'mock-account-session-post',
        requestId,
        code: 'RATE_LIMITED',
        method: 'POST',
        path: '/api/mock-account/session',
        clientKey,
      })
      return jsonError({
        error: 'Too many session requests. Please retry shortly.',
        code: 'RATE_LIMITED',
        status: 429,
        requestId,
        rateLimit: limiter,
      })
    }

    const parsed = await readJsonWithLimit<Body>({
      request,
      maxBytes: MAX_SESSION_BODY_BYTES,
    })
    if (!parsed.ok) {
      logApiFailure({
        scope: 'mock-account-session-post',
        requestId,
        code: 'VALIDATION_BODY_INVALID',
        method: 'POST',
        path: '/api/mock-account/session',
        clientKey,
        context: { status: parsed.status },
      })
      return jsonError({
        error: parsed.error,
        code: 'BODY_INVALID',
        status: parsed.status,
        requestId,
      })
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
    logApiFailure({
      scope: 'mock-account-session-post',
      requestId,
      code: 'INTERNAL_UNEXPECTED',
      error,
      method: 'POST',
      path: '/api/mock-account/session',
      clientKey,
    })
    return jsonError({
      error: 'Unable to start mock account session.',
      code: 'SESSION_START_FAILED',
      status: 500,
      requestId,
    })
  }
}

export async function GET() {
  const requestId = createRequestId()
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
    logApiFailure({
      scope: 'mock-account-session-get',
      requestId,
      code: 'INTERNAL_UNEXPECTED',
      error,
      method: 'GET',
      path: '/api/mock-account/session',
    })
    return jsonError({
      error: 'Unable to fetch mock account session.',
      code: 'SESSION_LOOKUP_FAILED',
      status: 500,
      requestId,
    })
  }
}
