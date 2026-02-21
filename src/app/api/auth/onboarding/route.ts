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

    const onboarding = readOnboardingStateFromMetadata(data.user.user_metadata)

    return withRequestIdHeaders(
      NextResponse.json(
        {
          ok: true,
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
          : 'Unable to save onboarding state.',
      status: 500,
      requestId,
    })
  }
}
