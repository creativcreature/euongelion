import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import {
  createRequestId,
  jsonError,
  withRequestIdHeaders,
} from '@/lib/api-security'
import {
  getUsageEvents,
  getUsageSummary,
  resolvePrincipalId,
} from '@/lib/brain/usage-ledger'
import { getOrCreateAuditSessionToken } from '@/lib/soul-audit/session'
import { resolveEntitlementSnapshot } from '@/lib/billing/entitlements'

export async function GET() {
  const requestId = createRequestId()
  try {
    const [supabase, sessionToken] = await Promise.all([
      createClient(),
      getOrCreateAuditSessionToken(),
    ])
    const {
      data: { user },
    } = await supabase.auth.getUser()

    const principalId = resolvePrincipalId({
      userId: user?.id || null,
      sessionToken,
    })
    const metadata = {
      subscriptionTier:
        user?.user_metadata?.subscription_tier ||
        user?.app_metadata?.subscription_tier,
      ownedThemes:
        user?.user_metadata?.owned_themes || user?.app_metadata?.owned_themes,
      ownedStickerPacks:
        user?.user_metadata?.owned_sticker_packs ||
        user?.app_metadata?.owned_sticker_packs,
    }
    const entitlements = resolveEntitlementSnapshot(metadata)

    const [summary, events] = await Promise.all([
      getUsageSummary({
        principalId,
        isPremium: entitlements.premiumActive,
      }),
      getUsageEvents({ principalId }),
    ])

    return withRequestIdHeaders(
      NextResponse.json(
        {
          ok: true,
          principalId,
          summary,
          events,
          entitlements: {
            premiumActive: entitlements.premiumActive,
            subscriptionTier: entitlements.subscriptionTier,
          },
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
          : 'Unable to load usage summary.',
      status: 500,
      requestId,
    })
  }
}
