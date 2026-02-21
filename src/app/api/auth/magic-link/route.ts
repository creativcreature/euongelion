import { NextRequest, NextResponse } from 'next/server'
import { sendMagicLink } from '@/lib/auth'
import {
  getClientKey,
  readJsonWithLimit,
  sanitizeSafeRedirectPath,
  takeRateLimit,
  withRateLimitHeaders,
} from '@/lib/api-security'

interface MagicLinkBody {
  email?: string
  redirectTo?: string
}

const MAX_BODY_BYTES = 2_048
const MAX_MAGIC_LINK_REQUESTS_PER_MINUTE = 8

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
}

export async function POST(request: NextRequest) {
  try {
    const limiter = await takeRateLimit({
      namespace: 'auth-magic-link',
      key: getClientKey(request),
      limit: MAX_MAGIC_LINK_REQUESTS_PER_MINUTE,
      windowMs: 60_000,
    })
    if (!limiter.ok) {
      return withRateLimitHeaders(
        NextResponse.json(
          { error: 'Too many sign-in attempts. Please retry shortly.' },
          { status: 429 },
        ),
        limiter,
      )
    }

    const parsed = await readJsonWithLimit<MagicLinkBody>({
      request,
      maxBytes: MAX_BODY_BYTES,
    })
    if (!parsed.ok) {
      return NextResponse.json(
        { error: parsed.error },
        { status: parsed.status },
      )
    }

    const email = String(parsed.data.email || '')
      .trim()
      .toLowerCase()

    if (!isValidEmail(email)) {
      return NextResponse.json(
        { error: 'Please enter a valid email address.' },
        { status: 400 },
      )
    }

    const redirectPath =
      sanitizeSafeRedirectPath(parsed.data.redirectTo) || '/auth/callback'
    const redirectTo = new URL(redirectPath, request.nextUrl.origin).toString()
    await sendMagicLink(email, redirectTo)

    return NextResponse.json({ success: true })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Something went wrong.'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
