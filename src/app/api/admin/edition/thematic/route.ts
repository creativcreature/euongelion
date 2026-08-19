import { NextResponse, type NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import {
  createRequestId,
  jsonError,
  readJsonWithLimit,
  withRequestIdHeaders,
} from '@/lib/api-security'

/**
 * /api/admin/edition/thematic — the founder's next-series thematic (SA-100).
 *
 * The EASY override: a box on /admin/edition writes here; the Wednesday
 * weekly-series run reads Supabase Storage FIRST (bucket `pipeline`, object
 * `next-series-thematic.md`), then the repo file, then derives. One-shot:
 * the run archives the object to `consumed/` when it uses it.
 *
 * Same admin gate as the queue: Supabase session + ADMIN_EMAIL_ALLOWLIST,
 * fail-closed.
 */

export const dynamic = 'force-dynamic'

const OBJECT_PATH = 'pipeline/next-series-thematic.md'

function adminAllowlist(): string[] {
  return (process.env.ADMIN_EMAIL_ALLOWLIST || '')
    .split(',')
    .map((entry) => entry.trim().toLowerCase())
    .filter(Boolean)
}

async function assertAdmin() {
  const supabase = await createClient()
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser()
  if (error || !user) {
    return { ok: false as const, reason: 'Unauthorized.', status: 401 }
  }
  const email = user.email?.toLowerCase() || ''
  if (!email || !adminAllowlist().includes(email)) {
    return { ok: false as const, reason: 'Forbidden.', status: 403 }
  }
  return { ok: true as const }
}

function storageHeaders(): Record<string, string> {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!key) throw new Error('SUPABASE_SERVICE_ROLE_KEY missing')
  return { apikey: key, Authorization: `Bearer ${key}` }
}

function storageUrl(): string {
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL
  if (!base) throw new Error('NEXT_PUBLIC_SUPABASE_URL missing')
  return `${base}/storage/v1/object/${OBJECT_PATH}`
}

export async function GET() {
  const requestId = createRequestId()
  try {
    const auth = await assertAdmin()
    if (!auth.ok) {
      return jsonError({ error: auth.reason, status: auth.status, requestId })
    }
    const res = await fetch(storageUrl(), { headers: storageHeaders() })
    if (res.status === 400 || res.status === 404) {
      return withRequestIdHeaders(
        NextResponse.json({ ok: true, thematic: null }),
        requestId,
      )
    }
    if (!res.ok) {
      return jsonError({
        error: `Storage read failed (${res.status}).`,
        status: 502,
        requestId,
      })
    }
    const thematic = await res.text()
    return withRequestIdHeaders(
      NextResponse.json({ ok: true, thematic }),
      requestId,
    )
  } catch (err) {
    return jsonError({
      error: err instanceof Error ? err.message : 'Unexpected failure.',
      status: 500,
      requestId,
    })
  }
}

export async function POST(request: NextRequest) {
  const requestId = createRequestId()
  try {
    const auth = await assertAdmin()
    if (!auth.ok) {
      return jsonError({ error: auth.reason, status: auth.status, requestId })
    }
    const body = await readJsonWithLimit<{ thematic?: unknown }>({
      request,
      maxBytes: 32 * 1024,
    })
    if (!body.ok) {
      return jsonError({ error: body.error, status: body.status, requestId })
    }
    const thematic =
      typeof body.data.thematic === 'string' ? body.data.thematic.trim() : ''
    if (!thematic || thematic.length < 8) {
      return jsonError({
        error: 'Write at least a sentence of thematic.',
        status: 400,
        requestId,
      })
    }
    const res = await fetch(storageUrl(), {
      method: 'POST',
      headers: {
        ...storageHeaders(),
        'Content-Type': 'text/markdown',
        'x-upsert': 'true',
      },
      body: thematic,
    })
    if (!res.ok) {
      return jsonError({
        error: `Storage write failed (${res.status}): ${await res.text()}`,
        status: 502,
        requestId,
      })
    }
    return withRequestIdHeaders(NextResponse.json({ ok: true }), requestId)
  } catch (err) {
    return jsonError({
      error: err instanceof Error ? err.message : 'Unexpected failure.',
      status: 500,
      requestId,
    })
  }
}

export async function DELETE() {
  const requestId = createRequestId()
  try {
    const auth = await assertAdmin()
    if (!auth.ok) {
      return jsonError({ error: auth.reason, status: auth.status, requestId })
    }
    const res = await fetch(storageUrl(), {
      method: 'DELETE',
      headers: storageHeaders(),
    })
    if (!res.ok && res.status !== 404 && res.status !== 400) {
      return jsonError({
        error: `Storage delete failed (${res.status}).`,
        status: 502,
        requestId,
      })
    }
    return withRequestIdHeaders(NextResponse.json({ ok: true }), requestId)
  } catch (err) {
    return jsonError({
      error: err instanceof Error ? err.message : 'Unexpected failure.',
      status: 500,
      requestId,
    })
  }
}
