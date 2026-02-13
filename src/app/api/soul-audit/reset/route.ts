import { NextResponse } from 'next/server'
import { clearSessionAuditState } from '@/lib/soul-audit/repository'
import { getOrCreateAuditSessionToken } from '@/lib/soul-audit/session'

const CURRENT_ROUTE_COOKIE = 'euangelion_current_route'

export async function POST() {
  try {
    const sessionToken = await getOrCreateAuditSessionToken()
    await clearSessionAuditState(sessionToken)

    const response = NextResponse.json(
      {
        ok: true,
        reset: true,
      },
      { status: 200 },
    )
    response.cookies.delete(CURRENT_ROUTE_COOKIE)
    return response
  } catch (error) {
    console.error('Soul audit reset error:', error)
    return NextResponse.json(
      { error: 'Unable to reset audit state right now.' },
      { status: 500 },
    )
  }
}
