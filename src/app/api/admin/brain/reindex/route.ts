import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import {
  createRequestId,
  jsonError,
  withRequestIdHeaders,
} from '@/lib/api-security'
import { getCanonicalRagIndex } from '@/lib/brain/rag-index'

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

  const allowed = adminAllowlist()
  const email = user.email?.toLowerCase() || ''
  if (!email || !allowed.includes(email)) {
    return { ok: false as const, reason: 'Forbidden.', status: 403 }
  }

  return { ok: true as const }
}

export async function GET() {
  const requestId = createRequestId()
  try {
    const auth = await assertAdmin()
    if (!auth.ok) {
      return jsonError({
        error: auth.reason,
        status: auth.status,
        requestId,
      })
    }

    const index = getCanonicalRagIndex(false)
    return withRequestIdHeaders(
      NextResponse.json(
        {
          ok: true,
          builtAt: index.builtAt,
          documentCount: index.docs.length,
        },
        { status: 200 },
      ),
      requestId,
    )
  } catch (error) {
    return jsonError({
      error:
        error instanceof Error ? error.message : 'Unable to read index status.',
      status: 500,
      requestId,
    })
  }
}

export async function POST() {
  const requestId = createRequestId()
  try {
    const auth = await assertAdmin()
    if (!auth.ok) {
      return jsonError({
        error: auth.reason,
        status: auth.status,
        requestId,
      })
    }

    const index = getCanonicalRagIndex(true)
    return withRequestIdHeaders(
      NextResponse.json(
        {
          ok: true,
          builtAt: index.builtAt,
          documentCount: index.docs.length,
          reindexed: true,
        },
        { status: 200 },
      ),
      requestId,
    )
  } catch (error) {
    return jsonError({
      error:
        error instanceof Error ? error.message : 'Unable to rebuild index.',
      status: 500,
      requestId,
    })
  }
}
