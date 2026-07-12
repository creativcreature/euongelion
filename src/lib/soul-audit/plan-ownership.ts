/**
 * plan-ownership.ts — the ONE ownership policy for plan-scoped routes
 * (§12.3 IDOR; OWASP self-audit M-4, founder-authorized 2026-07-12).
 *
 * A plan (or its generation job) may be accessed by:
 *   1. the session that created it (session cookie matches), or
 *   2. the signed-in user that session belongs to (post-merge,
 *      cross-device via `user_sessions.user_id`).
 * Everyone else sees 404 — indistinguishable from a missing resource.
 *
 * Rows with no owning session token (legacy/transient) are exempt by
 * the caller's choice. When plan SHARING ships (brief §5 `share_slug`),
 * it gets its own explicit share tokens — bearer-UUID access is not a
 * sharing mechanism.
 */

import { createAdminClient } from '@/lib/supabase/admin'
import { createClient as createServerSupabase } from '@/lib/supabase/server'
import { getOrCreateAuditSessionToken } from './session'

export async function isCallerAuthorizedForSession(
  owningSessionToken: string | null | undefined,
): Promise<boolean> {
  if (!owningSessionToken) return true // legacy rows: caller decides policy

  try {
    const callerToken = await getOrCreateAuditSessionToken()
    if (callerToken === owningSessionToken) return true
  } catch {
    // no request-scoped cookie store — fall through to the user check
  }

  try {
    const server = await createServerSupabase()
    const {
      data: { user },
    } = await server.auth.getUser()
    if (!user) return false
    const admin = createAdminClient()
    const { data: link } = await (
      admin as ReturnType<typeof createAdminClient> &
        // user_sessions filtering by two columns — typed loosely because the
        // generated DB types don't model this chain shape.
        any
    )
      .from('user_sessions')
      .select('session_token')
      .eq('session_token', owningSessionToken)
      .eq('user_id', user.id)
      .maybeSingle()
    return Boolean(link)
  } catch {
    return false
  }
}
