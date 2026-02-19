import { NextRequest, NextResponse } from 'next/server'
import {
  addAnnotation,
  listAnnotationsWithFallback,
  removeAnnotation,
  updateAnnotation,
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

interface AnnotationBody {
  annotationId?: string
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
  const requestId = createRequestId()
  const clientKey = getClientKey(request)
  try {
    const user = await getUser()
    if (!user) {
      return jsonError({
        error: 'Sign in is required before saving notes or highlights.',
        code: 'AUTH_REQUIRED_SAVE_STATE',
        status: 401,
        requestId,
      })
    }

    const limiter = takeRateLimit({
      namespace: 'annotations-post',
      key: clientKey,
      limit: MAX_ANNOTATION_REQUESTS_PER_MINUTE,
      windowMs: 60_000,
    })
    if (!limiter.ok) {
      return jsonError({
        error: 'Too many annotation requests. Please retry shortly.',
        status: 429,
        requestId,
        rateLimit: limiter,
      })
    }

    const parsed = await readJsonWithLimit<AnnotationBody>({
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

    const payload = parsed.data
    const devotionalSlug = String(payload.devotionalSlug || '').trim()
    const annotationType = String(payload.annotationType || '').trim()

    if (
      !devotionalSlug ||
      !isSafeSlug(devotionalSlug) ||
      !ALLOWED_TYPES.has(annotationType)
    ) {
      return jsonError({
        error: 'Safe devotionalSlug and valid annotationType are required.',
        status: 400,
        requestId,
      })
    }

    const sessionToken = user.id
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

    return withRequestIdHeaders(
      NextResponse.json({ ok: true, annotation: row }, { status: 200 }),
      requestId,
    )
  } catch (error) {
    logApiError({
      scope: 'annotations-post',
      requestId,
      error,
      method: request.method,
      path: request.nextUrl.pathname,
      clientKey,
    })
    return jsonError({
      error: 'Unable to save annotation.',
      status: 500,
      requestId,
    })
  }
}

export async function GET(request: NextRequest) {
  const requestId = createRequestId()
  const clientKey = getClientKey(request)
  try {
    const devotionalSlug = request.nextUrl.searchParams.get('devotionalSlug')
    const annotationType = request.nextUrl.searchParams.get('annotationType')
    const styleSource = request.nextUrl.searchParams.get('styleSource')
    const styleKind = request.nextUrl.searchParams.get('styleKind')
    if (devotionalSlug && !isSafeSlug(devotionalSlug)) {
      return jsonError({
        error: 'Invalid devotionalSlug query parameter.',
        status: 400,
        requestId,
      })
    }
    const user = await getUser()
    const sessionToken = user?.id ?? (await getOrCreateAuditSessionToken())

    if (annotationType && !ALLOWED_TYPES.has(annotationType)) {
      return jsonError({
        error: 'Invalid annotationType query parameter.',
        status: 400,
        requestId,
      })
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

    return withRequestIdHeaders(
      NextResponse.json({ ok: true, annotations }, { status: 200 }),
      requestId,
    )
  } catch (error) {
    logApiError({
      scope: 'annotations-get',
      requestId,
      error,
      method: request.method,
      path: request.nextUrl.pathname,
      clientKey,
    })
    return jsonError({
      error: 'Unable to fetch annotations.',
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
        error: 'Sign in is required before deleting notes or highlights.',
        code: 'AUTH_REQUIRED_SAVE_STATE',
        status: 401,
        requestId,
      })
    }

    const annotationId = String(
      request.nextUrl.searchParams.get('annotationId') || '',
    ).trim()
    if (!annotationId) {
      return jsonError({
        error: 'annotationId query parameter is required.',
        status: 400,
        requestId,
      })
    }

    const sessionToken = user.id
    await removeAnnotation({
      sessionToken,
      annotationId,
    })

    return withRequestIdHeaders(
      NextResponse.json({ ok: true }, { status: 200 }),
      requestId,
    )
  } catch (error) {
    logApiError({
      scope: 'annotations-delete',
      requestId,
      error,
      method: request.method,
      path: request.nextUrl.pathname,
      clientKey,
    })
    return jsonError({
      error: 'Unable to remove annotation.',
      status: 500,
      requestId,
    })
  }
}

export async function PATCH(request: NextRequest) {
  const requestId = createRequestId()
  const clientKey = getClientKey(request)
  try {
    const user = await getUser()
    if (!user) {
      return jsonError({
        error: 'Sign in is required before updating notes or stickies.',
        code: 'AUTH_REQUIRED_SAVE_STATE',
        status: 401,
        requestId,
      })
    }

    const limiter = takeRateLimit({
      namespace: 'annotations-patch',
      key: clientKey,
      limit: MAX_ANNOTATION_REQUESTS_PER_MINUTE,
      windowMs: 60_000,
    })
    if (!limiter.ok) {
      return jsonError({
        error: 'Too many annotation update requests. Please retry shortly.',
        status: 429,
        requestId,
        rateLimit: limiter,
      })
    }

    const parsed = await readJsonWithLimit<AnnotationBody>({
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

    const payload = parsed.data
    const annotationId = String(payload.annotationId || '').trim()
    if (!annotationId) {
      return jsonError({
        error: 'annotationId is required.',
        status: 400,
        requestId,
      })
    }

    const row = await updateAnnotation({
      sessionToken: user.id,
      annotationId,
      anchorText: sanitizeOptionalText(payload.anchorText, 500),
      body: sanitizeOptionalText(payload.body, 4_000),
      style: payload.style ?? null,
    })

    if (!row) {
      return jsonError({
        error: 'Annotation not found.',
        status: 404,
        requestId,
      })
    }

    return withRequestIdHeaders(
      NextResponse.json({ ok: true, annotation: row }, { status: 200 }),
      requestId,
    )
  } catch (error) {
    logApiError({
      scope: 'annotations-patch',
      requestId,
      error,
      method: request.method,
      path: request.nextUrl.pathname,
      clientKey,
    })
    return jsonError({
      error: 'Unable to update annotation.',
      status: 500,
      requestId,
    })
  }
}
