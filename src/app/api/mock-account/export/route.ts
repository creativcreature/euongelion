import { NextResponse } from 'next/server'
import {
  getMockAccountSessionWithFallback,
  listAnnotationsWithFallback,
  listAuditRunsForSessionWithFallback,
  listBookmarksWithFallback,
  listSelectionsForSessionWithFallback,
} from '@/lib/soul-audit/repository'
import {
  RETENTION_POLICY,
  retentionPolicySummary,
} from '@/lib/privacy/retention'
import { getOrCreateAuditSessionToken } from '@/lib/soul-audit/session'

export async function GET() {
  try {
    const sessionToken = await getOrCreateAuditSessionToken()
    const session = await getMockAccountSessionWithFallback(sessionToken)

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

    const [auditRuns, auditSelections, annotations, bookmarks] =
      await Promise.all([
        listAuditRunsForSessionWithFallback(sessionToken),
        listSelectionsForSessionWithFallback(sessionToken),
        listAnnotationsWithFallback(sessionToken),
        listBookmarksWithFallback(sessionToken),
      ])

    return NextResponse.json({
      ok: true,
      exportedAt: new Date().toISOString(),
      mode: session.mode,
      analyticsOptIn: session.analytics_opt_in,
      retention: RETENTION_POLICY,
      retentionSummary: retentionPolicySummary(),
      summary: {
        auditRuns: auditRuns.length,
        auditSelections: auditSelections.length,
        annotations: annotations.length,
        bookmarks: bookmarks.length,
      },
      data: {
        auditRuns,
        auditSelections,
        annotations,
        bookmarks,
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
