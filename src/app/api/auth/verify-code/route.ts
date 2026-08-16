import { NextRequest, NextResponse } from 'next/server'
import { onAuthSuccess } from '@/lib/auth'
import { shouldRequirePostSignupOnboarding } from '@/lib/auth/onboarding'
import { createClient } from '@/lib/supabase/server'
import {
  getClientKey,
  readJsonWithLimit,
  sanitizeSafeRedirectPath,
  takeRateLimit,
  withRateLimitHeaders,
} from '@/lib/api-security'

/**
 * POST /api/auth/verify-code — in-app magic-code entry (F-065;
 * MOBBIN-POLISH-AUDIT-2026-07-10 Part 3, Linear model).
 *
 * The magic-link email is issued by `signInWithOtp` (see
 * /api/auth/magic-link). Supabase mints BOTH a link (token_hash) and a
 * 6-digit OTP code for the same sign-in; this route verifies the typed
 * code via `verifyOtp({ email, token, type: 'email' })` so the reader
 * never has to leave the app. NOTE: whether the code is VISIBLE in the
 * email depends on the hosted Supabase email template including
 * `{{ .Token }}` — the verify path works regardless.
 *
 * Success MUST land in exactly the same state as the emailed-link path
 * (/auth/callback/route.ts): verifyOtp writes the Supabase session
 * cookies through the same server-client cookie adapter, then we run the
 * identical post-auth sequence — `onAuthSuccess` (links the anonymous
 * session to the user) and the `shouldRequirePostSignupOnboarding`
 * routing decision. The response carries `next` (either the sanitized
 * redirect or /onboarding?redirect=…) and the client performs a full
 * navigation so server components see the fresh auth cookies.
 */

interface VerifyCodeBody {
  email?: string
  code?: string
  redirect?: string
}

const MAX_BODY_BYTES = 2_048
/**
 * Brute-force guard: a 6-digit code has 10^6 combinations; Supabase also
 * invalidates the token after repeated failures and enforces its own
 * verify rate limits. 10 attempts/minute per client is generous for
 * honest typos and useless for guessing.
 */
const MAX_VERIFY_ATTEMPTS_PER_MINUTE = 10

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
}

/** The emailed OTP is 6 digits; strip whitespace people paste along. */
function normalizeCode(raw: string): string | null {
  const compact = raw.replace(/\s+/g, '')
  // 6 to 8 digits. Supabase's `mailer_otp_length` is project configuration and
  // was found set to 8 while this validator demanded exactly 6 — so every code
  // a reader typed was rejected before it ever reached verifyOtp. The config is
  // now 6 (the convention Google, Apple, Stripe and GitHub all use), but being
  // liberal in what we accept means a future config change cannot silently
  // break sign-in again.
  return /^\d{6,8}$/.test(compact) ? compact : null
}

export async function POST(request: NextRequest) {
  try {
    const limiter = await takeRateLimit({
      namespace: 'auth-verify-code',
      key: getClientKey(request),
      limit: MAX_VERIFY_ATTEMPTS_PER_MINUTE,
      windowMs: 60_000,
    })
    if (!limiter.ok) {
      return withRateLimitHeaders(
        NextResponse.json(
          { error: 'Too many attempts. Wait a minute and try again.' },
          { status: 429 },
        ),
        limiter,
      )
    }

    const parsed = await readJsonWithLimit<VerifyCodeBody>({
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

    const code = normalizeCode(String(parsed.data.code || ''))
    if (!code) {
      return NextResponse.json(
        { error: 'Enter the 6-digit code from the email.' },
        { status: 400 },
      )
    }

    const redirect = sanitizeSafeRedirectPath(parsed.data.redirect) || '/'

    const supabase = await createClient()
    const { data, error } = await supabase.auth.verifyOtp({
      email,
      token: code,
      type: 'email',
    })

    if (error || !data.user) {
      // Supabase deliberately does not distinguish "wrong" from
      // "expired/used" (both surface as otp_expired) — one honest message.
      if (error?.status === 429) {
        return NextResponse.json(
          {
            error:
              'Too many attempts for this email. Wait a few minutes, then request a fresh link.',
          },
          { status: 429 },
        )
      }
      return NextResponse.json(
        {
          error:
            'That code didn’t work — it may be mistyped, expired, or already used. Request a fresh email below and try again.',
        },
        { status: 400 },
      )
    }

    // Identical post-auth sequence to /auth/callback: link the anonymous
    // session, then decide whether first-session onboarding comes next.
    await onAuthSuccess(data.user.id)

    const shouldOnboard = shouldRequirePostSignupOnboarding(data.user)
    const alreadyHeadingToOnboarding = redirect.startsWith('/onboarding')
    const next =
      shouldOnboard && !alreadyHeadingToOnboarding
        ? `/onboarding?${new URLSearchParams({ redirect }).toString()}`
        : redirect

    return NextResponse.json({ ok: true, next })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Something went wrong.'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
