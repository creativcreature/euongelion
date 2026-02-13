import { NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { onAuthSuccess } from '@/lib/auth'
import { sanitizeSafeRedirectPath } from '@/lib/api-security'

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
      return NextResponse.redirect(`${origin}${redirect}`)
    }
  }

  // Auth failed — redirect to home
  return NextResponse.redirect(`${origin}/?error=auth_failed`)
}
