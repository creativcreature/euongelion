import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import {
  createRequestId,
  getClientKey,
  jsonError,
  logApiError,
  takeRateLimit,
  withRequestIdHeaders,
} from '@/lib/api-security'
import { resolveEntitlementSnapshot } from '@/lib/billing/entitlements'
import { readUserBillingState } from '@/lib/billing/subscription-state'
import type { BillingEntitlementsResponse } from '@/types/billing'

const MAX_REQUESTS_PER_MINUTE = 60

export async function GET(request: NextRequest) {
  const requestId = createRequestId()
  const clientKey = getClientKey(request)

  try {
    const limiter = await takeRateLimit({
      namespace: 'billing-entitlements',
      key: clientKey,
      limit: MAX_REQUESTS_PER_MINUTE,
      windowMs: 60_000,
    })

    if (!limiter.ok) {
      return jsonError({
        error: 'Too many entitlement checks. Please retry shortly.',
        code: 'RATE_LIMITED',
        status: 429,
        requestId,
        rateLimit: limiter,
      })
    }

    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    const userMetadata = (user?.user_metadata || {}) as Record<string, unknown>

    // SA-028: subscription state comes from public.users — the row the
    // Stripe webhooks write — via the single reader. Auth metadata is
    // consulted only for cosmetic ownerships (themes/stickers), never
    // for tier. Founding Member rides on the same row.
    const billingState = await readUserBillingState(user?.id)
    const snapshot = resolveEntitlementSnapshot({
      subscriptionTier: billingState?.effectiveTier ?? 'free',
      ownedThemes: userMetadata.owned_themes,
      ownedStickerPacks: userMetadata.owned_sticker_packs,
    })

    const payload: BillingEntitlementsResponse = {
      ok: true,
      requestId,
      authenticated: Boolean(user),
      entitlements: {
        subscriptionTier: snapshot.subscriptionTier,
        premiumActive: snapshot.premiumActive,
        foundingMember: billingState?.foundingMemberAt != null,
        foundingMemberAt: billingState?.foundingMemberAt ?? null,
        ownedThemes: snapshot.ownedThemes,
        ownedStickerPacks: snapshot.ownedStickerPacks,
        features: snapshot.features,
        subscriptionStatus: billingState?.subscriptionStatus ?? null,
        subscriptionRenewsAt: billingState?.subscriptionRenewsAt ?? null,
        premiumExpiresAt: billingState?.premiumExpiresAt ?? null,
        freeGenerationUsed: billingState?.freeGenerationUsedAt != null,
      },
    }

    return withRequestIdHeaders(
      NextResponse.json(payload, {
        status: 200,
        headers: { 'Cache-Control': 'no-store' },
      }),
      requestId,
    )
  } catch (error) {
    logApiError({
      scope: 'billing-entitlements',
      requestId,
      error,
      method: request.method,
      path: request.nextUrl.pathname,
      clientKey,
    })
    return jsonError({
      error: 'Unable to resolve entitlements right now.',
      code: 'ENTITLEMENTS_UNAVAILABLE',
      status: 500,
      requestId,
    })
  }
}
