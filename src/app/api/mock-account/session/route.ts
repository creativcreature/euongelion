import { NextRequest, NextResponse } from 'next/server'
import {
  getMockAccountSession,
  upsertMockAccountSession,
} from '@/lib/soul-audit/repository'
import { getOrCreateAuditSessionToken } from '@/lib/soul-audit/session'

type Mode = 'anonymous' | 'mock_account'

interface Body {
  mode?: Mode
  analyticsOptIn?: boolean
}

function capabilities(mode: Mode) {
  if (mode === 'mock_account') {
    return [
      'bookmarks',
      'archive',
      'notes',
      'highlights',
      'sticky-notes',
      'stickers',
      'quote-sharing',
      'study-chat-history',
      'data-export',
    ]
  }
  return ['bookmarks', 'resume']
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as Body
    const mode: Mode =
      body.mode === 'mock_account' ? 'mock_account' : 'anonymous'
    const analyticsOptIn = Boolean(body.analyticsOptIn)
    const sessionToken = await getOrCreateAuditSessionToken()

    const session = await upsertMockAccountSession({
      sessionToken,
      mode,
      analyticsOptIn,
    })

    return NextResponse.json({
      ok: true,
      sessionToken,
      mode: session.mode,
      analyticsOptIn: session.analytics_opt_in,
      capabilities: capabilities(session.mode),
    })
  } catch (error) {
    console.error('Mock account session error:', error)
    return NextResponse.json(
      { error: 'Unable to start mock account session.' },
      { status: 500 },
    )
  }
}

export async function GET() {
  try {
    const sessionToken = await getOrCreateAuditSessionToken()
    const session = getMockAccountSession(sessionToken)
    const mode: Mode = session?.mode ?? 'anonymous'

    return NextResponse.json({
      ok: true,
      sessionToken,
      mode,
      analyticsOptIn: session?.analytics_opt_in ?? false,
      capabilities: capabilities(mode),
    })
  } catch (error) {
    console.error('Mock account session lookup error:', error)
    return NextResponse.json(
      { error: 'Unable to fetch mock account session.' },
      { status: 500 },
    )
  }
}
