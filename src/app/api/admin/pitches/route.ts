/**
 * The pitch site's API (SA-114 / F-158) — admin-only.
 *
 * GET  → the pitch index with each pitch's responses merged in.
 * GET ?slug=… → one pitch, full html + responses.
 * POST {slug, verdict?, comment?} → append the founder's response.
 *
 * Storage-backed (private `pitches` bucket, service-role reads/writes) so
 * ANY session can publish without a deploy and the founder's responses are
 * durable, one archive, one place.
 */
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import {
  listPitches,
  readPitch,
  readResponses,
  writeResponses,
} from '@/lib/pitches'

export const dynamic = 'force-dynamic'

const VERDICTS = ['approved', 'rejected', 'parked', 'comment'] as const
type Verdict = (typeof VERDICTS)[number]

export interface PitchResponse {
  at: string
  verdict: Verdict
  comment: string
}

function adminAllowlist(): string[] {
  return (process.env.ADMIN_EMAIL_ALLOWLIST || '')
    .split(',')
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean)
}

async function requireAdmin(): Promise<NextResponse | null> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  const email = user?.email?.toLowerCase() ?? ''
  const allowed = adminAllowlist()
  if (!email || allowed.length === 0 || !allowed.includes(email)) {
    return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 })
  }
  return null
}

export async function GET(request: NextRequest) {
  const denied = await requireAdmin()
  if (denied) return denied
  const slug = request.nextUrl.searchParams.get('slug')
  if (slug) {
    if (!/^[a-z0-9-]{1,64}$/.test(slug)) {
      return NextResponse.json({ error: 'Bad slug.' }, { status: 400 })
    }
    const pitch = await readPitch(slug)
    if (!pitch)
      return NextResponse.json({ error: 'Not found.' }, { status: 404 })
    const responses = await readResponses(slug)
    return NextResponse.json({ ok: true, pitch, responses })
  }
  return NextResponse.json({ ok: true, pitches: await listPitches() })
}

export async function POST(request: NextRequest) {
  const denied = await requireAdmin()
  if (denied) return denied
  let body: { slug?: unknown; verdict?: unknown; comment?: unknown }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Bad JSON.' }, { status: 400 })
  }
  const slug = typeof body.slug === 'string' ? body.slug : ''
  if (!/^[a-z0-9-]{1,64}$/.test(slug)) {
    return NextResponse.json({ error: 'Bad slug.' }, { status: 400 })
  }
  const verdict = (
    typeof body.verdict === 'string' ? body.verdict : 'comment'
  ) as Verdict
  if (!VERDICTS.includes(verdict)) {
    return NextResponse.json({ error: 'Bad verdict.' }, { status: 400 })
  }
  const comment = typeof body.comment === 'string' ? body.comment.trim() : ''
  if (verdict === 'comment' && !comment) {
    return NextResponse.json(
      { error: 'A comment needs words.' },
      { status: 400 },
    )
  }
  if (!(await readPitch(slug))) {
    return NextResponse.json({ error: 'No such pitch.' }, { status: 404 })
  }
  const responses = await readResponses(slug)
  responses.push({ at: new Date().toISOString(), verdict, comment })
  await writeResponses(slug, responses)
  return NextResponse.json({ ok: true, responses })
}
