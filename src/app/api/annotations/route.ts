import { NextRequest, NextResponse } from 'next/server'
import {
  addAnnotation,
  listAnnotationsWithFallback,
  removeAnnotation,
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

interface AnnotationBody {
  devotionalSlug?: string
  annotationType?: 'note' | 'highlight' | 'sticky' | 'sticker'
  anchorText?: string | null
  body?: string | null
  style?: Record<string, unknown> | null
}

const ALLOWED_TYPES = new Set(['note', 'highlight', 'sticky', 'sticker'])
const MAX_BODY_BYTES = 8_192
const MAX_ANNOTATION_REQUESTS_PER_MINUTE = 80

export async function POST(request: NextRequest) {
  try {
    const limiter = takeRateLimit({
      namespace: 'annotations-post',
      key: getClientKey(request),
      limit: MAX_ANNOTATION_REQUESTS_PER_MINUTE,
      windowMs: 60_000,
    })
    if (!limiter.ok) {
      return withRateLimitHeaders(
        NextResponse.json(
          { error: 'Too many annotation requests. Please retry shortly.' },
          { status: 429 },
        ),
        limiter.retryAfterSeconds,
      )
    }

    const parsed = await readJsonWithLimit<AnnotationBody>({
      request,
      maxBytes: MAX_BODY_BYTES,
    })
    if (!parsed.ok) {
      return NextResponse.json(
        { error: parsed.error },
        { status: parsed.status },
      )
    }

    const payload = parsed.data
    const devotionalSlug = String(payload.devotionalSlug || '').trim()
    const annotationType = String(payload.annotationType || '').trim()

    if (
      !devotionalSlug ||
      !isSafeSlug(devotionalSlug) ||
      !ALLOWED_TYPES.has(annotationType)
    ) {
      return NextResponse.json(
        {
          error: 'Safe devotionalSlug and valid annotationType are required.',
        },
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
      anchorText: sanitizeOptionalText(payload.anchorText, 500),
      body: sanitizeOptionalText(payload.body, 4_000),
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
    const annotationType = request.nextUrl.searchParams.get('annotationType')
    const styleSource = request.nextUrl.searchParams.get('styleSource')
    const styleKind = request.nextUrl.searchParams.get('styleKind')
    if (devotionalSlug && !isSafeSlug(devotionalSlug)) {
      return NextResponse.json(
        { error: 'Invalid devotionalSlug query parameter.' },
        { status: 400 },
      )
    }
    const sessionToken = await getOrCreateAuditSessionToken()

    if (annotationType && !ALLOWED_TYPES.has(annotationType)) {
      return NextResponse.json(
        { error: 'Invalid annotationType query parameter.' },
        { status: 400 },
      )
    }

    const annotations = (
      await listAnnotationsWithFallback(sessionToken)
    ).filter((annotation) => {
      if (devotionalSlug && annotation.devotional_slug !== devotionalSlug) {
        return false
      }
      if (annotationType && annotation.annotation_type !== annotationType) {
        return false
      }
      if (styleSource) {
        const source = String(annotation.style?.source || '').trim()
        if (source !== styleSource) return false
      }
      if (styleKind) {
        const kind = String(annotation.style?.kind || '').trim()
        if (kind !== styleKind) return false
      }
      return true
    })

    return NextResponse.json({ ok: true, annotations }, { status: 200 })
  } catch (error) {
    console.error('Annotation list error:', error)
    return NextResponse.json(
      { error: 'Unable to fetch annotations.' },
      { status: 500 },
    )
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const annotationId = String(
      request.nextUrl.searchParams.get('annotationId') || '',
    ).trim()
    if (!annotationId) {
      return NextResponse.json(
        { error: 'annotationId query parameter is required.' },
        { status: 400 },
      )
    }

    const sessionToken = await getOrCreateAuditSessionToken()
    await removeAnnotation({
      sessionToken,
      annotationId,
    })

    return NextResponse.json({ ok: true }, { status: 200 })
  } catch (error) {
    console.error('Annotation delete error:', error)
    return NextResponse.json(
      { error: 'Unable to remove annotation.' },
      { status: 500 },
    )
  }
}
