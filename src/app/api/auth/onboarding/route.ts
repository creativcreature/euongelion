import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import {
  buildOnboardingMetadataPatch,
  readOnboardingStateFromMetadata,
  sanitizeOnboardingPreferences,
} from '@/lib/auth/onboarding'
import { buildBrainSettingsPatch } from '@/lib/brain/preferences'
import {
  createRequestId,
  jsonError,
  logApiError,
  readJsonWithLimit,
  withRequestIdHeaders,
} from '@/lib/api-security'

interface OnboardingSaveBody {
  skipped?: boolean
  preferences?: unknown
}

const MAX_BODY_BYTES = 8_192

export async function GET() {
  const requestId = createRequestId()

  try {
    const supabase = await createClient()
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser()

    if (error || !user) {
      return jsonError({
        error: 'Unauthorized.',
        status: 401,
        requestId,
      })
    }

    const onboarding = readOnboardingStateFromMetadata(user.user_metadata)

    return withRequestIdHeaders(
      NextResponse.json(
        {
          authenticated: true,
          onboarding,
        },
        { status: 200 },
      ),
      requestId,
    )
  } catch (error) {
    return jsonError({
      error:
        error instanceof Error
          ? error.message
          : 'Unable to load onboarding state.',
      status: 500,
      requestId,
    })
  }
}

export async function POST(request: NextRequest) {
  const requestId = createRequestId()

  try {
    const parsed = await readJsonWithLimit<OnboardingSaveBody>({
      request,
      maxBytes: MAX_BODY_BYTES,
    })

    if (!parsed.ok) {
      return jsonError({
        error: parsed.error,
        status: parsed.status,
        requestId,
      })
    }

    const supabase = await createClient()
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser()

    if (userError || !user) {
      return jsonError({
        error: 'Unauthorized.',
        status: 401,
        requestId,
      })
    }

    const existing = readOnboardingStateFromMetadata(user.user_metadata)
    const preferences = sanitizeOnboardingPreferences(
      parsed.data.preferences,
      existing.preferences,
    )
    const skipped = parsed.data.skipped === true

    const onboardingPatch = buildOnboardingMetadataPatch({
      existingMetadata: user.user_metadata,
      preferences,
      skipped,
    })
    const metadataPatch = buildBrainSettingsPatch({
      existingMetadata: onboardingPatch,
      settings: {
        defaultBrainMode: preferences.defaultBrainMode,
        openWebDefaultEnabled: preferences.openWebDefaultEnabled,
        devotionalLengthPreference: preferences.devotionalDepthPreference,
      },
    })

    const { data, error: updateError } = await supabase.auth.updateUser({
      data: metadataPatch,
    })

    if (updateError || !data.user) {
      return jsonError({
        error: updateError?.message || 'Unable to save onboarding state.',
        status: 500,
        requestId,
      })
    }

    // B7: onboarding completion lives in TWO places. Auth user_metadata
    // is the SOURCE OF TRUTH — it is what the app reads, via
    // readOnboardingStateFromMetadata, and it was saved above.
    // public.users.onboarding_completed is a SECONDARY SYNC only:
    // nothing reads it — the admin reset (/api/admin/reset-my-account)
    // merely writes it back to false. The mirror is attempted on the
    // same request so the two rarely drift, but a mirror failure must
    // never fail onboarding itself.
    //
    // The server client is deliberate: RLS ("Users can update own
    // profile") scopes this to the caller's own row. Asking for the row
    // back turns a zero-row write — a missing profile record — into a
    // logged warning instead of a silent half-save.
    const { data: profileRow, error: profileError } = await supabase
      .from('users')
      .update({ onboarding_completed: true })
      .eq('id', user.id)
      .select('id')
      .maybeSingle()

    let profileSyncWarning: string | null = null
    if (profileError) {
      profileSyncWarning = `Your welcome was saved, but the profile record could not be synced: ${profileError.message}`
    } else if (!profileRow) {
      profileSyncWarning =
        'Your welcome was saved, but your profile record is missing, so the sync column was not written.'
    }

    if (profileSyncWarning) {
      logApiError({
        scope: 'auth-onboarding',
        requestId,
        error: profileError ?? new Error(profileSyncWarning),
        method: request.method,
        path: '/api/auth/onboarding',
        context: { stage: 'profile-mirror-sync', userId: user.id },
      })
    }

    const onboarding = readOnboardingStateFromMetadata(data.user.user_metadata)

    return withRequestIdHeaders(
      NextResponse.json(
        {
          ok: true,
          onboarding,
          ...(profileSyncWarning ? { warning: profileSyncWarning } : {}),
        },
        { status: 200 },
      ),
      requestId,
    )
  } catch (error) {
    return jsonError({
      error:
        error instanceof Error
          ? error.message
          : 'Unable to save onboarding state.',
      status: 500,
      requestId,
    })
  }
}
