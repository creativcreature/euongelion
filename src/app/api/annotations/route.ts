import { NextRequest, NextResponse } from 'next/server'
import { addAnnotation, listAnnotations } from '@/lib/soul-audit/repository'
import { getOrCreateAuditSessionToken } from '@/lib/soul-audit/session'

interface AnnotationBody {
  devotionalSlug?: string
  annotationType?: 'note' | 'highlight' | 'sticky' | 'sticker'
  anchorText?: string | null
  body?: string | null
  style?: Record<string, unknown> | null
}

const ALLOWED_TYPES = new Set(['note', 'highlight', 'sticky', 'sticker'])

export async function POST(request: NextRequest) {
  try {
    const payload = (await request.json()) as AnnotationBody
    const devotionalSlug = String(payload.devotionalSlug || '').trim()
    const annotationType = String(payload.annotationType || '').trim()

    if (!devotionalSlug || !ALLOWED_TYPES.has(annotationType)) {
      return NextResponse.json(
        { error: 'devotionalSlug and valid annotationType are required.' },
        { status: 400 },
      )
    }

    const sessionToken = await getOrCreateAuditSessionToken()
    const row = await addAnnotation({
      sessionToken,
      devotionalSlug,
      annotationType: annotationType as
        | 'note'
        | 'highlight'
        | 'sticky'
        | 'sticker',
      anchorText: payload.anchorText ?? null,
      body: payload.body ?? null,
      style: payload.style ?? null,
    })

    return NextResponse.json({ ok: true, annotation: row }, { status: 200 })
  } catch (error) {
    console.error('Annotation create error:', error)
    return NextResponse.json(
      { error: 'Unable to save annotation.' },
      { status: 500 },
    )
  }
}

export async function GET(request: NextRequest) {
  try {
    const devotionalSlug = request.nextUrl.searchParams.get('devotionalSlug')
    const sessionToken = await getOrCreateAuditSessionToken()

    const annotations = listAnnotations(sessionToken).filter((annotation) =>
      devotionalSlug ? annotation.devotional_slug === devotionalSlug : true,
    )

    return NextResponse.json({ ok: true, annotations }, { status: 200 })
  } catch (error) {
    console.error('Annotation list error:', error)
    return NextResponse.json(
      { error: 'Unable to fetch annotations.' },
      { status: 500 },
    )
  }
}
