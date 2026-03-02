import { NextResponse } from 'next/server'
import {
  createRequestId,
  jsonError,
  withRequestIdHeaders,
} from '@/lib/api-security'
import { clearSessionAuditState } from '@/lib/soul-audit/repository'
import {
  getOrCreateAuditSessionToken,
  rotateAuditSessionToken,
} from '@/lib/soul-audit/session'

const CURRENT_ROUTE_COOKIE = 'euangelion_current_route'

export async function POST() {
  const requestId = createRequestId()
  try {
    const sessionToken = await getOrCreateAuditSessionToken()
    await clearSessionAuditState(sessionToken)
    await rotateAuditSessionToken()

    const response = NextResponse.json(
      { ok: true, reset: true, requestId },
      { status: 200 },
    )
    response.cookies.delete(CURRENT_ROUTE_COOKIE)
    return withRequestIdHeaders(response, requestId)
  } catch (error) {
    console.error('Soul audit reset error:', error)
    return jsonError({
      error: 'Unable to reset audit state right now.',
      status: 500,
      requestId,
    })
  }
}
