import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import {
  createRequestId,
  getClientKey,
  jsonError,
  logApiError,
  readJsonWithLimit,
  takeRateLimit,
  withRequestIdHeaders,
} from '@/lib/api-security'
import { redeemGiftCode } from '@/lib/billing/credits'

/**
 * POST /api/billing/redeem — gift-code redemption (SA-027 path 6).
 *
 * "Someone covered your edition." Authenticated (credits attach to an
 * account), rate-limited 5 attempts/hour/IP (brief §12.3), hashes-only
 * comparison in the DB via the atomic redeem_gift_code function (lock →
 * per-user uniqueness → decrement uses → credit → journal). Invalid and
 * exhausted codes are indistinguishable (no guessing oracle).
 */

const CODE_SHAPE = /^[A-Za-z0-9-]{12,32}$/

export async function POST(request: NextRequest) {
  const requestId = createRequestId()

  const limiter = await takeRateLimit({
    namespace: 'billing-redeem',
    key: getClientKey(request),
    limit: 5,
    windowMs: 60 * 60_000,
  })
  if (!limiter.ok) {
    return jsonError({
      error: 'Too many redemption attempts. Please try again later.',
      code: 'RATE_LIMITED',
      status: 429,
      requestId,
      rateLimit: limiter,
    })
  }

  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) {
      return jsonError({
        error:
          'Sign in to redeem a code — the editions attach to your account.',
        code: 'AUTH_REQUIRED',
        status: 401,
        requestId,
      })
    }

    const parsed = await readJsonWithLimit<{ code?: string }>({
      request,
      maxBytes: 1_024,
    })
    if (!parsed.ok) {
      return jsonError({
        error: parsed.error,
        status: parsed.status,
        requestId,
      })
    }
    const code = (parsed.data.code || '').trim()
    if (!CODE_SHAPE.test(code)) {
      return jsonError({
        error: 'That doesn’t look like a code. Check for typos and try again.',
        code: 'INVALID_CODE',
        status: 400,
        requestId,
      })
    }

    const result = await redeemGiftCode({ userId: user.id, code })
    if (!result.ok) {
      if (result.reason === 'already_redeemed') {
        return jsonError({
          error: 'You’ve already redeemed this code.',
          code: 'ALREADY_REDEEMED',
          status: 409,
          requestId,
        })
      }
      if (result.reason === 'invalid_code') {
        return jsonError({
          error:
            'That code isn’t valid or has been fully used. Check for typos and try again.',
          code: 'INVALID_CODE',
          status: 404,
          requestId,
        })
      }
      return jsonError({
        error: 'Unable to redeem right now. Please try again in a moment.',
        code: 'REDEEM_FAILED',
        status: 500,
        requestId,
      })
    }

    return withRequestIdHeaders(
      NextResponse.json(
        {
          ok: true,
          creditsAdded: result.creditsAdded,
          balance: result.newBalance,
          message: 'Someone covered your edition.',
        },
        { status: 200, headers: { 'Cache-Control': 'no-store' } },
      ),
      requestId,
    )
  } catch (error) {
    logApiError({
      scope: 'billing-redeem',
      requestId,
      error,
      method: request.method,
      path: '/api/billing/redeem',
    })
    return jsonError({
      error: 'Unable to redeem right now. Please try again in a moment.',
      code: 'REDEEM_FAILED',
      status: 500,
      requestId,
    })
  }
}
