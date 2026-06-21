import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

/** Parse the comma-separated admin email allowlist (same source the admin APIs
 *  use). Empty/unset → no admins → everything fails closed below. */
function adminAllowlist(): string[] {
  return (process.env.ADMIN_EMAIL_ALLOWLIST || '')
    .split(',')
    .map((entry) => entry.trim().toLowerCase())
    .filter(Boolean)
}

/**
 * Server-side gate for ALL `/admin/*` pages.
 *
 * The admin *APIs* were already gated (ADMIN_EMAIL_ALLOWLIST + Supabase auth),
 * but the admin *UI* pages (moderation, feed-controls, audit-logs,
 * youtube-allowlist, transparency, index) had no guard — anyone with the URL
 * could load them. This layout runs on the server before any admin page renders
 * and FAILS CLOSED: a request that is anonymous, signed-in-but-not-allowlisted,
 * or hitting an unset/empty allowlist gets a 404 (`notFound()`), so the admin
 * surface is never acknowledged or rendered to non-admins.
 *
 * Public-facing transparency lives at `/donation-disclosure`, not here.
 */
export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const email = user?.email?.toLowerCase() || ''
  const allowed = adminAllowlist()

  if (!email || allowed.length === 0 || !allowed.includes(email)) {
    notFound()
  }

  return <>{children}</>
}
