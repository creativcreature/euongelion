import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import {
  createRequestId,
  jsonError,
  withRequestIdHeaders,
} from '@/lib/api-security'
import {
  providerAvailabilityForUser,
  openWebConfigured,
} from '@/lib/brain/router'
import { brainFlags } from '@/lib/brain/flags'
import { readBrainSettingsFromMetadata } from '@/lib/brain/preferences'
import {
  getUsageSummary,
  quotaRequiresByo,
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

    const settings = user ? readBrainSettingsFromMetadata(user) : null
    const entitlements = resolveEntitlementSnapshot({
      subscriptionTier:
        user?.user_metadata?.subscription_tier ||
        user?.app_metadata?.subscription_tier,
    })
    const principalId = resolvePrincipalId({
      userId: user?.id || null,
      sessionToken,
    })
    const usageSummary = await getUsageSummary({
      principalId,
      isPremium: entitlements.premiumActive,
    })
    const platformKeysEnabled = !quotaRequiresByo(usageSummary)

    const providers = providerAvailabilityForUser({
      userKeys: undefined,
      allowHighCostOnPlatform: false,
      platformKeysEnabled,
    })

    return withRequestIdHeaders(
      NextResponse.json(
        {
          ok: true,
          providers,
          defaults: {
            defaultBrainMode: settings?.defaultBrainMode || 'auto',
            openWebDefaultEnabled:
              settings?.openWebDefaultEnabled === true ? true : false,
          },
          flags: {
            brainRouterEnabled: brainFlags.brainRouterEnabled,
            brainSwitchUiEnabled: brainFlags.brainSwitchUiEnabled,
            openWebModeEnabled: brainFlags.openWebModeEnabled,
            openWebConfigured: openWebConfigured(),
          },
          usage: {
            quotaState: usageSummary.quota.state,
            platformBudgetRemainingUsd:
              usageSummary.platformBudget.remainingUsd,
            requiresByo: !platformKeysEnabled,
          },
        },
        { status: 200 },
      ),
      requestId,
    )
  } catch (error) {
    return jsonError({
      error:
        error instanceof Error ? error.message : 'Unable to load providers.',
      status: 500,
      requestId,
    })
  }
}
