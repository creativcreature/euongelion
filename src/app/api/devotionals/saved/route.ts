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

const MAX_BODY_BYTES = 4_096
const MAX_REQUESTS_PER_MINUTE = 80

interface SavedBody {
  devotionalSlug?: string
  note?: string | null
}

export async function GET() {
  const requestId = createRequestId()
  try {
    const user = await getUser()
    if (!user) {
      return jsonError({
        error: 'Sign in is required to read saved devotionals.',
        code: 'AUTH_REQUIRED',
        status: 401,
        requestId,
      })
    }
    const bookmarks = await listBookmarksWithFallback(user.id)
    return withRequestIdHeaders(
      NextResponse.json(
        {
          ok: true,
          saved: bookmarks.map((b) => ({
            devotionalSlug: b.devotional_slug,
            note: b.note,
            savedAt: b.created_at,
          })),
        },
        { status: 200 },
      ),
      requestId,
    )
  } catch (error) {
    logApiError({
      scope: 'devotionals-saved-get',
      requestId,
      error,
      method: 'GET',
      path: '/api/devotionals/saved',
    })
    return jsonError({
      error: 'Unable to fetch saved devotionals.',
      status: 500,
      requestId,
    })
  }
}

export async function POST(request: NextRequest) {
  const requestId = createRequestId()
  const clientKey = getClientKey(request)
  try {
    const user = await getUser()
    if (!user) {
      return jsonError({
        error: 'Sign in is required to save a devotional.',
        code: 'AUTH_REQUIRED',
        status: 401,
        requestId,
      })
    }

    const limiter = await takeRateLimit({
      namespace: 'devotionals-saved-post',
      key: clientKey,
      limit: MAX_REQUESTS_PER_MINUTE,
      windowMs: 60_000,
    })
    if (!limiter.ok) {
      return jsonError({
        error: 'Too many requests. Please retry shortly.',
        status: 429,
        requestId,
        rateLimit: limiter,
      })
    }

    const parsed = await readJsonWithLimit<SavedBody>({
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

    const devotionalSlug = String(parsed.data.devotionalSlug || '').trim()
    if (!devotionalSlug || !isSafeSlug(devotionalSlug)) {
      return jsonError({
        error: 'A safe devotionalSlug is required.',
        status: 400,
        requestId,
      })
    }

    const bookmark = await addBookmark({
      sessionToken: user.id,
      devotionalSlug,
      note: sanitizeOptionalText(parsed.data.note, 1_000),
    })

    return withRequestIdHeaders(
      NextResponse.json(
        {
          ok: true,
          saved: {
            devotionalSlug: bookmark.devotional_slug,
            note: bookmark.note,
            savedAt: bookmark.created_at,
          },
        },
        { status: 200 },
      ),
      requestId,
    )
  } catch (error) {
    logApiError({
      scope: 'devotionals-saved-post',
      requestId,
      error,
      method: 'POST',
      path: '/api/devotionals/saved',
      clientKey,
    })
    return jsonError({
      error: 'Unable to save devotional.',
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
        error: 'Sign in is required to remove a saved devotional.',
        code: 'AUTH_REQUIRED',
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

    await removeBookmark({
      sessionToken: user.id,
      devotionalSlug,
    })

    return withRequestIdHeaders(
      NextResponse.json({ ok: true }, { status: 200 }),
      requestId,
    )
  } catch (error) {
    logApiError({
      scope: 'devotionals-saved-delete',
      requestId,
      error,
      method: 'DELETE',
      path: '/api/devotionals/saved',
      clientKey,
    })
    return jsonError({
      error: 'Unable to remove saved devotional.',
      status: 500,
      requestId,
    })
  }
}
