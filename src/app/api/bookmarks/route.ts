import { NextRequest, NextResponse } from 'next/server'
import {
  addBookmark,
  listBookmarksWithFallback,
  removeBookmark,
} from '@/lib/soul-audit/repository'
import { getOrCreateAuditSessionToken } from '@/lib/soul-audit/session'
import {
  getClientKey,
  isSafeSlug,
  readJsonWithLimit,
  sanitizeOptionalText,
  takeRateLimit,
  withRateLimitHeaders,
} from '@/lib/api-security'

interface BookmarkBody {
  devotionalSlug?: string
  note?: string | null
}

const MAX_BODY_BYTES = 4_096
const MAX_BOOKMARK_REQUESTS_PER_MINUTE = 80

export async function POST(request: NextRequest) {
  try {
    const limiter = takeRateLimit({
      namespace: 'bookmarks-post',
      key: getClientKey(request),
      limit: MAX_BOOKMARK_REQUESTS_PER_MINUTE,
      windowMs: 60_000,
    })
    if (!limiter.ok) {
      return withRateLimitHeaders(
        NextResponse.json(
          { error: 'Too many bookmark requests. Please retry shortly.' },
          { status: 429 },
        ),
        limiter.retryAfterSeconds,
      )
    }

    const parsed = await readJsonWithLimit<BookmarkBody>({
      request,
      maxBytes: MAX_BODY_BYTES,
    })
    if (!parsed.ok) {
      return NextResponse.json(
        { error: parsed.error },
        { status: parsed.status },
      )
    }

    const body = parsed.data
    const devotionalSlug = String(body.devotionalSlug || '').trim()
    if (!devotionalSlug || !isSafeSlug(devotionalSlug)) {
      return NextResponse.json(
        { error: 'A safe devotionalSlug is required.' },
        { status: 400 },
      )
    }

    const sessionToken = await getOrCreateAuditSessionToken()
    const bookmark = await addBookmark({
      sessionToken,
      devotionalSlug,
      note: sanitizeOptionalText(body.note, 1_000),
    })

    return NextResponse.json({ ok: true, bookmark }, { status: 200 })
  } catch (error) {
    console.error('Bookmark create error:', error)
    return NextResponse.json(
      { error: 'Unable to save bookmark.' },
      { status: 500 },
    )
  }
}

export async function GET() {
  try {
    const sessionToken = await getOrCreateAuditSessionToken()
    const bookmarks = await listBookmarksWithFallback(sessionToken)
    return NextResponse.json({ ok: true, bookmarks }, { status: 200 })
  } catch (error) {
    console.error('Bookmark list error:', error)
    return NextResponse.json(
      { error: 'Unable to fetch bookmarks.' },
      { status: 500 },
    )
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const devotionalSlug = String(
      request.nextUrl.searchParams.get('devotionalSlug') || '',
    ).trim()
    if (!devotionalSlug || !isSafeSlug(devotionalSlug)) {
      return NextResponse.json(
        { error: 'A safe devotionalSlug query parameter is required.' },
        { status: 400 },
      )
    }

    const sessionToken = await getOrCreateAuditSessionToken()
    await removeBookmark({
      sessionToken,
      devotionalSlug,
    })

    return NextResponse.json({ ok: true }, { status: 200 })
  } catch (error) {
    console.error('Bookmark delete error:', error)
    return NextResponse.json(
      { error: 'Unable to remove bookmark.' },
      { status: 500 },
    )
  }
}
