/**
 * Who may operate Daily Bread V2 endpoints: the scheduler (X-Internal-Secret,
 * constant-time compare) or a signed-in founder on ADMIN_EMAIL_ALLOWLIST.
 * Anonymous callers never run or inspect the pipeline.
 */
import { validateInternalSecret } from '@/lib/internal-auth'
import { createClient } from '@/lib/supabase/server'

export type DailyBreadAuth =
  | { ok: true; via: 'internal' | 'admin' }
  | { ok: false; status: 401 | 403 }

export function adminEmails(env: Record<string, string | undefined> = process.env): string[] {
  return (env.ADMIN_EMAIL_ALLOWLIST ?? '')
    .split(',')
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean)
}

export async function authorizeDailyBread(
  request: Request,
  options: { allowAdminSession: boolean },
): Promise<DailyBreadAuth> {
  if (validateInternalSecret(request)) return { ok: true, via: 'internal' }
  if (!options.allowAdminSession) return { ok: false, status: 403 }
  const supabase = await createClient()
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser()
  if (error || !user) return { ok: false, status: 401 }
  const allowed = adminEmails()
  const email = user.email?.toLowerCase() ?? ''
  if (!email || allowed.length === 0 || !allowed.includes(email)) return { ok: false, status: 403 }
  return { ok: true, via: 'admin' }
}
