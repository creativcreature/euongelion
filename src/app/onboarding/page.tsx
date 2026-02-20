import { redirect } from 'next/navigation'
import EuangelionShellHeader from '@/components/EuangelionShellHeader'
import SiteFooter from '@/components/SiteFooter'
import { sanitizeSafeRedirectPath } from '@/lib/api-security'
import {
  readOnboardingStateFromMetadata,
  sanitizeOnboardingPreferences,
} from '@/lib/auth/onboarding'
import { createClient } from '@/lib/supabase/server'
import OnboardingClient from './OnboardingClient'

type SearchParamValue = string | string[] | undefined

function firstParam(value: SearchParamValue): string | null {
  if (typeof value === 'string') return value
  if (Array.isArray(value) && value.length > 0) return value[0] ?? null
  return null
}

export default async function OnboardingPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, SearchParamValue>>
}) {
  const resolved = searchParams ? await searchParams : {}
  const redirectTarget =
    sanitizeSafeRedirectPath(firstParam(resolved.redirect)) || '/'
  const forceReplay = firstParam(resolved.force) === '1'

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect(`/auth/sign-in?redirect=${encodeURIComponent('/onboarding')}`)
  }

  const onboardingState = readOnboardingStateFromMetadata(user.user_metadata)
  if (onboardingState.completed && !forceReplay) {
    redirect(redirectTarget)
  }

  const initialPreferences = sanitizeOnboardingPreferences(
    onboardingState.preferences,
  )

  return (
    <div className="mock-home">
      <main id="main-content" className="mock-paper">
        <EuangelionShellHeader />

        <section className="shell-content-pad mx-auto flex min-h-[calc(100vh-120px)] max-w-2xl flex-col justify-center py-12">
          <OnboardingClient
            finalRedirect={redirectTarget}
            initialPreferences={initialPreferences}
          />
        </section>

        <SiteFooter />
      </main>
    </div>
  )
}
