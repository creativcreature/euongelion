import { NextRequest, NextResponse } from 'next/server'
import { addBookmark, listBookmarks } from '@/lib/soul-audit/repository'
import { getOrCreateAuditSessionToken } from '@/lib/soul-audit/session'

interface BookmarkBody {
  devotionalSlug?: string
  note?: string | null
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as BookmarkBody
    const devotionalSlug = String(body.devotionalSlug || '').trim()
    if (!devotionalSlug) {
      return NextResponse.json(
        { error: 'devotionalSlug is required.' },
        { status: 400 },
      )
    }

    const sessionToken = await getOrCreateAuditSessionToken()
    const bookmark = await addBookmark({
      sessionToken,
      devotionalSlug,
      note: body.note ?? null,
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
    const bookmarks = listBookmarks(sessionToken)
    return NextResponse.json({ ok: true, bookmarks }, { status: 200 })
  } catch (error) {
    console.error('Bookmark list error:', error)
    return NextResponse.json(
      { error: 'Unable to fetch bookmarks.' },
      { status: 500 },
    )
  }
}
