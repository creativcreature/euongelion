import { NextRequest, NextResponse } from 'next/server'
import { validateInternalSecret } from '@/lib/internal-auth'
import {
  createRequestId,
  jsonError,
  logApiError,
  withRequestIdHeaders,
} from '@/lib/api-security'
import { reconcileBillingState } from '@/lib/billing/reconciliation'

/**
 * POST /api/admin/billing-reconcile
 *
 * INTERNAL-ONLY route protected by `X-Internal-Secret` header
 * (same pattern as /api/admin/run-retention-cleanup).
 *
 * Runs the Stripe↔DB entitlement reconciliation (brief §12.1, SA-028)
 * and returns the structured report. Designed to be called nightly by:
 *   - A GitHub Action on a schedule
 *   - A future Cloudflare Cron Trigger (when the binding is enabled)
 *   - A manual ops call (`curl -H 'X-Internal-Secret: ...' -X POST ...`)
 *
 * Corrections are applied only on positive Stripe evidence; ambiguous
 * premium rows produce alerts, never silent downgrades. Returns 403 on
 * a missing/wrong secret, 503 when Stripe isn't configured, 200 with
 * the report otherwise.
 */

export const runtime = 'nodejs'

export async function POST(request: NextRequest) {
  const requestId = createRequestId()
  if (!validateInternalSecret(request)) {
    return jsonError({
      error: 'Forbidden',
      status: 403,
      requestId,
      code: 'INTERNAL_SECRET_REQUIRED',
    })
  }

  if (!process.env.STRIPE_SECRET_KEY) {
    return jsonError({
      error: 'Stripe is not configured — nothing to reconcile.',
      status: 503,
      requestId,
      code: 'STRIPE_NOT_CONFIGURED',
    })
  }

  try {
    const report = await reconcileBillingState()
    return withRequestIdHeaders(
      NextResponse.json(
        { ok: true, report },
        { status: 200, headers: { 'Cache-Control': 'no-store' } },
      ),
      requestId,
    )
  } catch (error) {
    logApiError({
      scope: 'admin-billing-reconcile',
      requestId,
      error,
      method: request.method,
      path: '/api/admin/billing-reconcile',
    })
    return jsonError({
      error: 'Billing reconciliation failed.',
      status: 500,
      requestId,
      code: 'RECONCILE_FAILED',
    })
  }
}
