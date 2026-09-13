/**
 * Safe activation for Daily Bread V2 (SA-142 / F-184).
 *
 * DAILY_BREAD_V2 (server-only):
 *   unset / 'off'  → /daily-bread renders the SA-090 edition exactly as before;
 *                    the V2 date routes 404. This is the default.
 *   'on'           → /daily-bread and /daily-bread/YYYY-MM-DD render frozen V2
 *                    editions from the repository.
 *
 * DAILY_BREAD_V2_SOURCE (server-only):
 *   'supabase' (default) → daily_bread_editions via the service role.
 *   'fixture'            → a read-only fixture set (local Workers preview and
 *                          visual QA only; never set in production).
 *
 * Neither name is NEXT_PUBLIC_*, so neither is inlined into a browser bundle.
 */

export type DailyBreadSource = 'supabase' | 'fixture'

export function dailyBreadV2Enabled(
  env: Record<string, string | undefined> = process.env,
): boolean {
  return (env.DAILY_BREAD_V2 ?? '').trim().toLowerCase() === 'on'
}

export function dailyBreadSource(
  env: Record<string, string | undefined> = process.env,
): DailyBreadSource {
  const raw = (env.DAILY_BREAD_V2_SOURCE ?? '').trim().toLowerCase()
  if (raw === '' || raw === 'supabase') return 'supabase'
  if (raw === 'fixture') return 'fixture'
  throw new Error(
    `DAILY_BREAD_V2_SOURCE must be 'supabase' or 'fixture' (got a different value)`,
  )
}
