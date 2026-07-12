/**
 * turnstile — server-side Cloudflare Turnstile verification (brief §12.4).
 *
 * A clean CONDITIONAL feature, never a silent stub (Dev Rule #1/#6):
 *  - `TURNSTILE_SECRET_KEY` unset → verification is OFF and request
 *    handling is exactly what it was before this feature existed.
 *  - Secret set → the request MUST carry a valid token; a missing or
 *    failed token is rejected with an honest error.
 *
 * The paired client key is `NEXT_PUBLIC_TURNSTILE_SITE_KEY` (sign-in
 * page). Both must be configured together — founder setup step.
 */

const SITEVERIFY_URL =
  'https://challenges.cloudflare.com/turnstile/v0/siteverify'

export function turnstileSecretKey(): string | null {
  const key = process.env.TURNSTILE_SECRET_KEY?.trim()
  return key && key.length > 0 ? key : null
}

export type TurnstileVerification =
  | { ok: true }
  | { ok: false; reason: 'missing_token' | 'rejected' | 'unavailable' }

export async function verifyTurnstileToken(params: {
  token: string | null | undefined
  secretKey: string
  remoteIp?: string | null
  fetchImpl?: typeof fetch
}): Promise<TurnstileVerification> {
  const token = typeof params.token === 'string' ? params.token.trim() : ''
  if (!token) {
    return { ok: false, reason: 'missing_token' }
  }

  const form = new URLSearchParams()
  form.set('secret', params.secretKey)
  form.set('response', token)
  if (params.remoteIp) form.set('remoteip', params.remoteIp)

  const doFetch = params.fetchImpl ?? fetch
  try {
    const response = await doFetch(SITEVERIFY_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: form.toString(),
    })
    if (!response.ok) {
      // Cloudflare itself failed to answer — the request cannot be
      // verified, and we do not pretend it was (fail closed, honestly).
      return { ok: false, reason: 'unavailable' }
    }
    const payload = (await response.json()) as { success?: boolean }
    return payload.success === true
      ? { ok: true }
      : { ok: false, reason: 'rejected' }
  } catch {
    return { ok: false, reason: 'unavailable' }
  }
}

/** One honest sentence per failure mode — every error ends in an action. */
export function turnstileFailureMessage(
  reason: Exclude<TurnstileVerification, { ok: true }>['reason'],
): string {
  if (reason === 'unavailable') {
    return 'We couldn’t reach the verification service. Wait a moment and try again.'
  }
  return 'We couldn’t verify this request came from a person. Refresh the page and try again.'
}
