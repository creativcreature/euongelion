import { NextRequest, NextResponse } from 'next/server'
import {
  addBookmark,
  listBookmarksWithFallback,
  removeBookmark,
} from '@/lib/soul-audit/repository'
import { getUser } from '@/lib/auth'
import {
  createRequestId,
  getClientKey,
  isSafeSlug,
  jsonError,
  logApiError,
  readJsonWithLimit,
  sanitizeOptionalText,
  takeRateLimit,
  withRequestIdHeaders,
} from '@/lib/api-security'
import { logApiFailure } from '@/lib/observability/api-failure'

interface BookmarkBody {
  devotionalSlug?: string
  note?: string | null
}

const MAX_BODY_BYTES = 4_096
const MAX_BOOKMARK_REQUESTS_PER_MINUTE = 80

export async function POST(request: NextRequest) {
  const requestId = createRequestId()
  const clientKey = getClientKey(request)
  try {
    // Saving works for anonymous (session-keyed) users too — bookmark storage
    // is keyed by session_token, matching the rest of the reading flow. A
    // signed-in user's id takes precedence when present.
    const user = await getUser()
    if (!user) {
      // SA-062 reverses SA-018's amendment: a bookmark is save-state, and
      // save-state requires an account. There is no anonymous session-token
      // fallback any more — the reader is told, not silently half-served.
      return jsonError({
        error: 'Sign in to keep your library.',
        code: 'AUTH_REQUIRED_SAVE_STATE',
        status: 401,
        requestId,
      })
    }
    const sessionToken = user.id

    const limiter = await takeRateLimit({
      namespace: 'bookmarks-post',
      key: clientKey,
      limit: MAX_BOOKMARK_REQUESTS_PER_MINUTE,
      windowMs: 60_000,
    })
    if (!limiter.ok) {
      return jsonError({
        error: 'Too many bookmark requests. Please retry shortly.',
        status: 429,
        requestId,
        rateLimit: limiter,
      })
    }

    const parsed = await readJsonWithLimit<BookmarkBody>({
      request,
      maxBytes: MAX_BODY_BYTES,
    })
    if (!parsed.ok) {
      return jsonError({
        error: parsed.error,
        status: parsed.status,
        requestId,
      })
    }

    const body = parsed.data
    const devotionalSlug = String(body.devotionalSlug || '').trim()
    if (!devotionalSlug || !isSafeSlug(devotionalSlug)) {
      return jsonError({
        error: 'A safe devotionalSlug is required.',
        status: 400,
        requestId,
      })
    }
    const bookmark = await addBookmark({
      sessionToken,
      devotionalSlug,
      note: sanitizeOptionalText(body.note, 1_000),
    })

    return withRequestIdHeaders(
      NextResponse.json({ ok: true, bookmark }, { status: 200 }),
      requestId,
    )
  } catch (error) {
    logApiError({
      scope: 'bookmarks-post',
      requestId,
      error,
      method: request.method,
      path: request.nextUrl.pathname,
      clientKey,
    })
    logApiFailure({
      scope: 'bookmarks-post',
      requestId,
      code: 'UPSTREAM_DB_ERROR',
      error,
      method: request.method,
      path: request.nextUrl.pathname,
      clientKey,
    })
    return jsonError({
      error: 'Unable to save bookmark.',
      code: 'BOOKMARK_SAVE_FAILED',
      status: 500,
      requestId,
    })
  }
}

export async function GET() {
  const requestId = createRequestId()
  try {
    const user = await getUser()
    if (!user) {
      // SA-062 reverses SA-018's amendment: a bookmark is save-state, and
      // save-state requires an account. There is no anonymous session-token
      // fallback any more — the reader is told, not silently half-served.
      return jsonError({
        error: 'Sign in to keep your library.',
        code: 'AUTH_REQUIRED_SAVE_STATE',
        status: 401,
        requestId,
      })
    }
    const sessionToken = user.id
    const bookmarks = await listBookmarksWithFallback(sessionToken)
    return withRequestIdHeaders(
      NextResponse.json({ ok: true, bookmarks }, { status: 200 }),
      requestId,
    )
  } catch (error) {
    logApiError({
      scope: 'bookmarks-get',
      requestId,
      error,
      method: 'GET',
      path: '/api/bookmarks',
    })
    logApiFailure({
      scope: 'bookmarks-get',
      requestId,
      code: 'UPSTREAM_DB_ERROR',
      error,
      method: 'GET',
      path: '/api/bookmarks',
    })
    return jsonError({
      error: 'Unable to fetch bookmarks.',
      code: 'BOOKMARK_LIST_FAILED',
      status: 500,
      requestId,
    })
  }
}

export async function DELETE(request: NextRequest) {
  const requestId = createRequestId()
  const clientKey = getClientKey(request)
  try {
    const user = await getUser()
    if (!user) {
      // SA-062 reverses SA-018's amendment: a bookmark is save-state, and
      // save-state requires an account. There is no anonymous session-token
      // fallback any more — the reader is told, not silently half-served.
      return jsonError({
        error: 'Sign in to keep your library.',
        code: 'AUTH_REQUIRED_SAVE_STATE',
        status: 401,
        requestId,
      })
    }
    const sessionToken = user.id

    const devotionalSlug = String(
      request.nextUrl.searchParams.get('devotionalSlug') || '',
    ).trim()
    if (!devotionalSlug || !isSafeSlug(devotionalSlug)) {
      return jsonError({
        error: 'A safe devotionalSlug query parameter is required.',
        status: 400,
        requestId,
      })
    }
    await removeBookmark({
      sessionToken,
      devotionalSlug,
    })

    return withRequestIdHeaders(
      NextResponse.json({ ok: true }, { status: 200 }),
      requestId,
    )
  } catch (error) {
    logApiError({
      scope: 'bookmarks-delete',
      requestId,
      error,
      method: request.method,
      path: request.nextUrl.pathname,
      clientKey,
    })
    logApiFailure({
      scope: 'bookmarks-delete',
      requestId,
      code: 'UPSTREAM_DB_ERROR',
      error,
      method: request.method,
      path: request.nextUrl.pathname,
      clientKey,
    })
    return jsonError({
      error: 'Unable to remove bookmark.',
      code: 'BOOKMARK_DELETE_FAILED',
      status: 500,
      requestId,
    })
  }
}
