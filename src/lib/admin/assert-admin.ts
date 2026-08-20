import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

/**
 * SA-114 / F-158 — the page-level admin gate.
 *
 * The /admin layout also gates, but a layout gate is NOT enough: React
 * renders a layout and its page CONCURRENTLY, so the page's markup can be
 * flushed into the stream before the layout's notFound() aborts it. Measured
 * against the local Workers runtime on 2026-08-19: anonymous GET /admin
 * returned the hub's card markup inside the (200-status) not-found stream.
 * Every /admin page must therefore assert the allowlist ITSELF, first, so a
 * non-admin request renders nothing of the page at all.
 *
 * Fails closed: anonymous, unlisted, or an unset/empty allowlist → 404.
 */
export function adminAllowlist(): string[] {
  return (process.env.ADMIN_EMAIL_ALLOWLIST || '')
    .split(',')
    .map((entry) => entry.trim().toLowerCase())
    .filter(Boolean)
}

export async function assertAdminOr404(): Promise<void> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  const email = user?.email?.toLowerCase() ?? ''
  const allowed = adminAllowlist()
  if (!email || allowed.length === 0 || !allowed.includes(email)) {
    notFound()
  }
}
