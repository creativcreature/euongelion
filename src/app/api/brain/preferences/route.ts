import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import {
  createRequestId,
  jsonError,
  readJsonWithLimit,
  withRequestIdHeaders,
} from '@/lib/api-security'
import {
  buildBrainSettingsPatch,
  readBrainSettingsFromMetadata,
  sanitizeBrainSettings,
  type BrainSettings,
} from '@/lib/brain/preferences'

type PreferencesBody = Partial<{
  defaultBrainMode: BrainSettings['defaultBrainMode']
  openWebDefaultEnabled: boolean
  devotionalLengthPreference: BrainSettings['devotionalLengthPreference']
  devotionalDepthPreference: BrainSettings['devotionalLengthPreference']
}>

const MAX_BODY_BYTES = 8_192

function resolveIncomingSettings(
  body: PreferencesBody,
  current: BrainSettings,
): BrainSettings {
  return sanitizeBrainSettings({
    defaultBrainMode: body.defaultBrainMode ?? current.defaultBrainMode,
    openWebDefaultEnabled:
      typeof body.openWebDefaultEnabled === 'boolean'
        ? body.openWebDefaultEnabled
        : current.openWebDefaultEnabled,
    devotionalLengthPreference:
      body.devotionalLengthPreference ??
      body.devotionalDepthPreference ??
      current.devotionalLengthPreference,
  })
}

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

    const settings = readBrainSettingsFromMetadata(user)

    return withRequestIdHeaders(
      NextResponse.json(
        {
          ok: true,
          settings,
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
          : 'Unable to load brain preferences.',
      status: 500,
      requestId,
    })
  }
}

export async function POST(request: NextRequest) {
  const requestId = createRequestId()
  try {
    const parsed = await readJsonWithLimit<PreferencesBody>({
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
      error,
    } = await supabase.auth.getUser()

    if (error || !user) {
      return jsonError({
        error: 'Unauthorized.',
        status: 401,
        requestId,
      })
    }

    const current = readBrainSettingsFromMetadata(user)
    const next = resolveIncomingSettings(parsed.data, current)
    const patch = buildBrainSettingsPatch({
      existingMetadata: user.user_metadata,
      settings: next,
    })

    const { data, error: updateError } = await supabase.auth.updateUser({
      data: patch,
    })

    if (updateError || !data.user) {
      return jsonError({
        error: updateError?.message || 'Unable to save brain preferences.',
        status: 500,
        requestId,
      })
    }

    return withRequestIdHeaders(
      NextResponse.json(
        {
          ok: true,
          settings: readBrainSettingsFromMetadata(data.user),
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
          : 'Unable to save brain preferences.',
      status: 500,
      requestId,
    })
  }
}
