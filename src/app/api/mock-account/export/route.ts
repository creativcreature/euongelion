import { NextResponse } from 'next/server'
import {
  getMockAccountSession,
  listAnnotations,
  listAuditRunsForSession,
  listBookmarks,
  listSelectionsForSession,
} from '@/lib/soul-audit/repository'
import { getOrCreateAuditSessionToken } from '@/lib/soul-audit/session'

export async function GET() {
  try {
    const sessionToken = await getOrCreateAuditSessionToken()
    const session = getMockAccountSession(sessionToken)

    if (!session || session.mode !== 'mock_account') {
      return NextResponse.json(
        {
          error: 'Data export is available in mock account mode only.',
          code: 'MOCK_ACCOUNT_REQUIRED',
        },
        { status: 403 },
      )
    }

    if (!session.analytics_opt_in) {
      return NextResponse.json(
        {
          error: 'Enable analytics opt-in to export your mock account data.',
          code: 'ANALYTICS_OPT_IN_REQUIRED',
        },
        { status: 403 },
      )
    }

    return NextResponse.json({
      exportedAt: new Date().toISOString(),
      mode: session.mode,
      sessionToken,
      data: {
        auditRuns: listAuditRunsForSession(sessionToken),
        auditSelections: listSelectionsForSession(sessionToken),
        annotations: listAnnotations(sessionToken),
        bookmarks: listBookmarks(sessionToken),
      },
    })
  } catch (error) {
    console.error('Mock account export error:', error)
    return NextResponse.json(
      { error: 'Unable to export mock account data.' },
      { status: 500 },
    )
  }
}
