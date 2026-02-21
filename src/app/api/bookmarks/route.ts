import { NextRequest, NextResponse } from 'next/server'
import {
  addBookmark,
  listBookmarksWithFallback,
  removeBookmark,
} from '@/lib/soul-audit/repository'
import { getOrCreateAuditSessionToken } from '@/lib/soul-audit/session'
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
    const user = await getUser()
    if (!user) {
      return jsonError({
        error: 'Sign in is required before saving bookmarks.',
        code: 'AUTH_REQUIRED_SAVE_STATE',
        status: 401,
        requestId,
      })
    }

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

    const sessionToken = user.id
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
    return jsonError({
      error: 'Unable to save bookmark.',
      status: 500,
      requestId,
    })
  }
}

export async function GET() {
  const requestId = createRequestId()
  try {
    const user = await getUser()
    const sessionToken = user?.id ?? (await getOrCreateAuditSessionToken())
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
    return jsonError({
      error: 'Unable to fetch bookmarks.',
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
      return jsonError({
        error: 'Sign in is required before modifying bookmarks.',
        code: 'AUTH_REQUIRED_SAVE_STATE',
        status: 401,
        requestId,
      })
    }

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

    const sessionToken = user.id
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
    return jsonError({
      error: 'Unable to remove bookmark.',
      status: 500,
      requestId,
    })
  }
}
