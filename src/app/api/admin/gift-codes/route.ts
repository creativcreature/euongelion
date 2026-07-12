import { NextRequest, NextResponse } from 'next/server'
import { validateInternalSecret } from '@/lib/internal-auth'
import {
  createRequestId,
  jsonError,
  logApiError,
  readJsonWithLimit,
  withRequestIdHeaders,
} from '@/lib/api-security'
import { generateGiftCode, hashGiftCode } from '@/lib/billing/credits'
import { createAdminClient } from '@/lib/supabase/admin'

/**
 * POST /api/admin/gift-codes — founder/ops gift-code minting
 * (SA-027 path 6, brief §2 "generated in an admin view").
 *
 * INTERNAL-ONLY (X-Internal-Secret, same pattern as billing-reconcile).
 * Body: { count?: 1-100, credits?: 1-100, uses?: 1-1000, note?: string }.
 * Plaintext codes are returned ONCE in the response and never stored —
 * only sha256 hashes land in gift_codes. Save the response.
 */

interface MintBody {
  count?: number
  credits?: number
  uses?: number
  note?: string
}

function clampInt(
  value: unknown,
  fallback: number,
  min: number,
  max: number,
): number {
  const n = Number(value)
  if (!Number.isInteger(n)) return fallback
  return Math.min(max, Math.max(min, n))
}

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

  const parsed = await readJsonWithLimit<MintBody>({
    request,
    maxBytes: 2_048,
  })
  const body = parsed.ok ? parsed.data : {}
  const count = clampInt(body.count, 1, 1, 100)
  const credits = clampInt(body.credits, 1, 1, 100)
  const uses = clampInt(body.uses, 1, 1, 1000)
  const note =
    typeof body.note === 'string' ? body.note.trim().slice(0, 200) : null

  try {
    const supabase = createAdminClient()
    const codes: string[] = []
    const rows = []
    for (let i = 0; i < count; i++) {
      const code = generateGiftCode()
      codes.push(code)
      rows.push({
        code_hash: hashGiftCode(code),
        credits,
        uses_remaining: uses,
        note,
      })
    }

    const { error } = await (supabase as any).from('gift_codes').insert(rows)
    if (error) {
      return jsonError({
        error: `Mint failed: ${error.message}`,
        status: 500,
        requestId,
        code: 'MINT_FAILED',
      })
    }

    return withRequestIdHeaders(
      NextResponse.json(
        {
          ok: true,
          codes,
          credits,
          uses,
          note,
          warning:
            'Plaintext codes are shown ONCE and never stored. Save them now.',
        },
        { status: 200, headers: { 'Cache-Control': 'no-store' } },
      ),
      requestId,
    )
  } catch (error) {
    logApiError({
      scope: 'admin-gift-codes',
      requestId,
      error,
      method: request.method,
      path: '/api/admin/gift-codes',
    })
    return jsonError({
      error: 'Mint failed.',
      status: 500,
      requestId,
      code: 'MINT_FAILED',
    })
  }
}
