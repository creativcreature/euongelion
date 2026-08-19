import { NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { onAuthSuccess } from '@/lib/auth'
import {
  createRequestId,
  logApiError,
  sanitizeSafeRedirectPath,
} from '@/lib/api-security'
import { shouldRequirePostSignupOnboarding } from '@/lib/auth/onboarding'

type SupportedOtpType =
  | 'signup'
  | 'invite'
  | 'magiclink'
  | 'recovery'
  | 'email'
  | 'email_change'

const SUPPORTED_OTP_TYPES = new Set<SupportedOtpType>([
  'signup',
  'invite',
  'magiclink',
  'recovery',
  'email',
  'email_change',
])

function parseOtpType(value: string | null): SupportedOtpType | null {
  if (!value) return null
  const normalized = value.trim().toLowerCase() as SupportedOtpType
  return SUPPORTED_OTP_TYPES.has(normalized) ? normalized : null
}

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const tokenHash = searchParams.get('token_hash')
  const otpType = parseOtpType(searchParams.get('type'))
  const redirect =
    sanitizeSafeRedirectPath(searchParams.get('redirect')) ||
    sanitizeSafeRedirectPath(searchParams.get('next')) ||
    '/'

  if (code || (tokenHash && otpType)) {
    const cookieStore = await cookies()

    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll()
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options),
            )
          },
        },
      },
    )

    const authResult = code
      ? await supabase.auth.exchangeCodeForSession(code)
      : await supabase.auth.verifyOtp({
          token_hash: tokenHash as string,
          type: otpType as SupportedOtpType,
        })

    if (!authResult.error && authResult.data.user) {
      // Link anonymous session to authenticated user
      await onAuthSuccess(authResult.data.user.id)

      // M4 — keep public.users.email in step with auth.users.email.
      // Billing resolves accounts by public.users.email, and the signup
      // trigger only copies the address once. The email_change OTP
      // landing is the one moment the auth email actually changes, so
      // THIS is the sync point — never at updateUser() time, when the
      // change is still unconfirmed. With secure email change there are
      // two landings (one per inbox); each re-syncs to whatever
      // auth.users.email is right now, so the mirror flips exactly when
      // the auth email does. Auth itself has already succeeded here — a
      // failed mirror write is logged loudly (billing-facing desync)
      // but does not fail the callback: the sign-in email DID change.
      if (!code && otpType === 'email_change') {
        const requestId = createRequestId()
        const { data: freshData, error: freshError } =
          await supabase.auth.getUser()
        const freshUser = freshData.user
        if (freshError || !freshUser?.email) {
          logApiError({
            scope: 'auth-callback',
            requestId,
            error:
              freshError ??
              new Error(
                'No user email after email_change verification — public.users.email not synced.',
              ),
            path: '/auth/callback',
            context: { stage: 'email-change-refetch' },
          })
        } else {
          // Same RLS-scoped server client as the verification itself:
          // "Users can update own profile" limits this to the caller's row.
          const { data: profileRow, error: profileError } = await supabase
            .from('users')
            .update({ email: freshUser.email })
            .eq('id', freshUser.id)
            .select('id')
            .maybeSingle()
          if (profileError || !profileRow) {
            logApiError({
              scope: 'auth-callback',
              requestId,
              error:
                profileError ??
                new Error(
                  `public.users row missing for ${freshUser.id} — email mirror not updated.`,
                ),
              path: '/auth/callback',
              context: { stage: 'email-change-profile-sync' },
            })
          }
        }
      }
      const shouldOnboard = shouldRequirePostSignupOnboarding(
        authResult.data.user,
      )
      const alreadyHeadingToOnboarding = redirect.startsWith('/onboarding')

      if (shouldOnboard && !alreadyHeadingToOnboarding) {
        const query = new URLSearchParams()
        query.set('redirect', redirect)
        return NextResponse.redirect(`${origin}/onboarding?${query.toString()}`)
      }

      return NextResponse.redirect(`${origin}${redirect}`)
    }
  }

  // Auth failed — redirect to sign-in with explicit state.
  return NextResponse.redirect(
    `${origin}/auth/sign-in?error=auth_failed&redirect=${encodeURIComponent(redirect)}`,
  )
}
