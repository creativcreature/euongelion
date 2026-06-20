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
import { createRequestId, jsonError } from '@/lib/api-security'
import { logApiFailure } from '@/lib/observability/api-failure'

/**
 * Mock-account data export (F-036).
 *
 * Schema version of the export envelope. Bump when the *shape* of the
 * export changes (new artifact type, renamed field) so a downstream
 * importer can branch on it. Stamped into every successful export so a
 * file downloaded today is self-describing months from now.
 */
const EXPORT_SCHEMA_VERSION = '2026-06-20'

/** The artifact types this export is contractually required to carry. */
const REQUIRED_ARTIFACT_TYPES = [
  'auditRuns',
  'auditSelections',
  'annotations',
  'bookmarks',
] as const

export async function GET() {
  const requestId = createRequestId()
  try {
    const sessionToken = await getOrCreateAuditSessionToken()
    const session = await getMockAccountSessionWithFallback(sessionToken)

    if (!session || session.mode !== 'mock_account') {
      logApiFailure({
        scope: 'mock-account-export',
        requestId,
        code: 'AUTH_FORBIDDEN',
        method: 'GET',
        path: '/api/mock-account/export',
        context: { reason: 'mock-account-mode-required' },
      })
      return jsonError({
        error: 'Data export is available in mock account mode only.',
        code: 'MOCK_ACCOUNT_REQUIRED',
        status: 403,
        requestId,
      })
    }

    if (!session.analytics_opt_in) {
      logApiFailure({
        scope: 'mock-account-export',
        requestId,
        code: 'AUTH_CONSENT_REQUIRED',
        method: 'GET',
        path: '/api/mock-account/export',
        context: { reason: 'analytics-opt-in-required' },
      })
      return jsonError({
        error: 'Enable analytics opt-in to export your mock account data.',
        code: 'ANALYTICS_OPT_IN_REQUIRED',
        status: 403,
        requestId,
      })
    }

    const [auditRuns, auditSelections, annotations, bookmarks] =
      await Promise.all([
        listAuditRunsForSessionWithFallback(sessionToken),
        listSelectionsForSessionWithFallback(sessionToken),
        listAnnotationsWithFallback(sessionToken),
        listBookmarksWithFallback(sessionToken),
      ])

    const data = {
      auditRuns,
      auditSelections,
      annotations,
      bookmarks,
    }

    const summary = {
      auditRuns: auditRuns.length,
      auditSelections: auditSelections.length,
      annotations: annotations.length,
      bookmarks: bookmarks.length,
    }

    // Export-completeness check (F-036): the envelope must carry every
    // artifact type the contract promises, each as a real array. A
    // missing key means an upstream read silently dropped a category —
    // surface that as a server fault rather than handing the user a
    // partial export that *looks* complete. NO SILENT FALLBACK.
    const missingArtifactTypes = REQUIRED_ARTIFACT_TYPES.filter(
      (key) => !Array.isArray(data[key]),
    )
    if (missingArtifactTypes.length > 0) {
      logApiFailure({
        scope: 'mock-account-export',
        requestId,
        code: 'UPSTREAM_DB_ERROR',
        method: 'GET',
        path: '/api/mock-account/export',
        context: { reason: 'export-incomplete', missingArtifactTypes },
      })
      return jsonError({
        error:
          'Your export could not be assembled completely. No partial file was produced. Please retry.',
        code: 'EXPORT_INCOMPLETE',
        status: 500,
        requestId,
        details: { missingArtifactTypes },
      })
    }

    return NextResponse.json({
      ok: true,
      schemaVersion: EXPORT_SCHEMA_VERSION,
      requestId,
      exportedAt: new Date().toISOString(),
      mode: session.mode,
      analyticsOptIn: session.analytics_opt_in,
      retention: RETENTION_POLICY,
      retentionSummary: retentionPolicySummary(),
      // Completeness manifest: which artifact types are present and how
      // many of each, so the downloaded file proves its own coverage.
      completeness: {
        artifactTypes: [...REQUIRED_ARTIFACT_TYPES],
        complete: true,
        counts: summary,
      },
      summary,
      data,
    })
  } catch (error) {
    logApiFailure({
      scope: 'mock-account-export',
      requestId,
      code: 'INTERNAL_UNEXPECTED',
      error,
      method: 'GET',
      path: '/api/mock-account/export',
    })
    return jsonError({
      error: 'Unable to export mock account data.',
      code: 'EXPORT_FAILED',
      status: 500,
      requestId,
    })
  }
}
