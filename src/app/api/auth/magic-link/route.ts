import { NextRequest, NextResponse } from 'next/server'
import { sendMagicLink } from '@/lib/auth'
import {
  turnstileFailureMessage,
  turnstileSecretKey,
  verifyTurnstileToken,
} from '@/lib/auth/turnstile'
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
  /** Cloudflare Turnstile token — required only when the server has
   *  TURNSTILE_SECRET_KEY configured (brief §12.4). */
  turnstileToken?: string
}

// Turnstile tokens can be up to 2048 characters, so the body cap leaves
// room for token + email + redirect.
const MAX_BODY_BYTES = 8_192
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

    // Turnstile (brief §12.4) — verification runs ONLY when the secret is
    // configured; with it unset this route behaves exactly as before.
    const secretKey = turnstileSecretKey()
    if (secretKey) {
      const verification = await verifyTurnstileToken({
        token: parsed.data.turnstileToken,
        secretKey,
        remoteIp:
          request.headers.get('cf-connecting-ip') ||
          request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
          null,
      })
      if (!verification.ok) {
        return NextResponse.json(
          { error: turnstileFailureMessage(verification.reason) },
          { status: verification.reason === 'unavailable' ? 503 : 403 },
        )
      }
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
