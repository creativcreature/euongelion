import { NextResponse } from 'next/server'
import { getUser } from '@/lib/auth'
import { listArchivedSeries } from '@/lib/library/repository'
import { SERIES_DATA } from '@/data/series'
import {
  createRequestId,
  jsonError,
  logApiError,
  withRequestIdHeaders,
} from '@/lib/api-security'

export async function GET() {
  const requestId = createRequestId()
  try {
    const user = await getUser()
    if (!user) {
      return jsonError({
        error: 'Sign in is required to read your archive.',
        code: 'AUTH_REQUIRED',
        status: 401,
        requestId,
      })
    }

    const rows = await listArchivedSeries(user.id)
    return withRequestIdHeaders(
      NextResponse.json(
        {
          ok: true,
          archived: rows.map((row) => ({
            seriesSlug: row.series_slug,
            seriesTitle: SERIES_DATA[row.series_slug]?.title ?? null,
            totalDays: SERIES_DATA[row.series_slug]?.days.length ?? null,
            furthestDayReached: row.furthest_day_reached,
            state: row.state,
            archivedAt: row.archived_at,
          })),
        },
        { status: 200 },
      ),
      requestId,
    )
  } catch (error) {
    logApiError({
      scope: 'devotionals-archive-list',
      requestId,
      error,
      method: 'GET',
      path: '/api/devotionals/archive',
    })
    return jsonError({
      error: 'Unable to list archived series.',
      status: 500,
      requestId,
    })
  }
}
