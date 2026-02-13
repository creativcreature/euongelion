import { NextRequest, NextResponse } from 'next/server'
import { POST as submitHandler } from './submit/route'

/**
 * Backward-compatible bridge.
 * New clients should call:
 * - POST /api/soul-audit/submit
 * - POST /api/soul-audit/consent
 * - POST /api/soul-audit/select
 */
export async function POST(request: NextRequest) {
  const response = await submitHandler(request)
  const payload = await response.json().catch(() => null)

  return NextResponse.json(
    {
      ...(payload || {}),
      deprecated: true,
      message:
        'Monolithic /api/soul-audit is deprecated. Use staged endpoints: submit, consent, select.',
    },
    { status: response.status },
  )
}
