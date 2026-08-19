import { NextResponse, type NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import {
  createRequestId,
  jsonError,
  logApiError,
  readJsonWithLimit,
  withRequestIdHeaders,
} from '@/lib/api-security'
import { getReviewQueue, reviewEditionItem } from '@/lib/edition/store'

/**
 * /api/admin/edition — the review queue for The Daily Bread (SA-090 / F-136).
 *
 * GET  → every `draft` row awaiting a verdict, oldest edition first.
 * POST → { id, verdict: 'published' | 'rejected' } records one verdict.
 *
 * Auth is the SAME gate the other admin surfaces use: a Supabase session whose
 * email is in ADMIN_EMAIL_ALLOWLIST (see `/api/admin/brain/reindex` and the
 * `/admin/*` layout). An unset or empty allowlist means there are no admins and
 * every request fails closed.
 *
 * Nothing here degrades: a failed queue read returns the database's own message
 * with a 500 so the client can render a visible failure, never an empty queue
 * that looks like "all caught up" (Development Rule 1).
 */

export const dynamic = 'force-dynamic'

/** Supabase row ids are UUIDs. Anything else never reaches the database. */
const EDITION_ITEM_ID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

const VERDICTS = ['published', 'rejected'] as const
type Verdict = (typeof VERDICTS)[number]

interface ReviewBody {
  id?: unknown
  verdict?: unknown
}

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

  return { ok: true as const, userId: user.id }
}

export async function GET(request: NextRequest) {
  const requestId = createRequestId()
  try {
    const auth = await assertAdmin()
    if (!auth.ok) {
      return jsonError({ error: auth.reason, status: auth.status, requestId })
    }

    const items = await getReviewQueue()
    return withRequestIdHeaders(
      NextResponse.json({ ok: true, items }, { status: 200 }),
      requestId,
    )
  } catch (error) {
    logApiError({
      scope: 'admin-edition-queue',
      requestId,
      error,
      method: request.method,
      path: '/api/admin/edition',
    })
    return jsonError({
      error:
        error instanceof Error
          ? error.message
          : 'Unable to read the review queue.',
      status: 500,
      requestId,
      code: 'QUEUE_READ_FAILED',
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

    const parsed = await readJsonWithLimit<ReviewBody>({
      request,
      maxBytes: 1_024,
    })
    if (!parsed.ok) {
      return jsonError({
        error: parsed.error,
        status: parsed.status,
        requestId,
        code: 'BAD_BODY',
      })
    }

    const { id, verdict } = parsed.data
    if (typeof id !== 'string' || !EDITION_ITEM_ID_RE.test(id.trim())) {
      return jsonError({
        error: 'A valid edition item id is required.',
        status: 400,
        requestId,
        code: 'BAD_ITEM_ID',
      })
    }
    if (typeof verdict !== 'string' || !VERDICTS.includes(verdict as Verdict)) {
      return jsonError({
        error: "verdict must be 'published' or 'rejected'.",
        status: 400,
        requestId,
        code: 'BAD_VERDICT',
      })
    }

    const recorded = await reviewEditionItem(
      id.trim(),
      verdict as Verdict,
      auth.userId,
    )
    if (!recorded) {
      // The row left `draft` between the queue read and this click. Reporting
      // 200 here would tell the reviewer their verdict stuck when the database
      // ignored it (Development Rule 1) — the client refetches on this status.
      return jsonError({
        error: 'Already reviewed',
        status: 409,
        requestId,
        code: 'ALREADY_REVIEWED',
      })
    }

    return withRequestIdHeaders(
      NextResponse.json({ ok: true, id: id.trim(), verdict }, { status: 200 }),
      requestId,
    )
  } catch (error) {
    logApiError({
      scope: 'admin-edition-review',
      requestId,
      error,
      method: request.method,
      path: '/api/admin/edition',
    })
    return jsonError({
      error:
        error instanceof Error
          ? error.message
          : 'Unable to record the verdict.',
      status: 500,
      requestId,
      code: 'REVIEW_FAILED',
    })
  }
}
