/**
 * Safe activation for Daily Bread V2 (SA-142 / F-184).
 *
 * DAILY_BREAD_V2 (server-only):
 *   'on'           → /daily-bread and /daily-bread/YYYY-MM-DD render frozen V2
 *                    editions from the repository.
 *   'off'          → /daily-bread renders the SA-090 edition exactly as before;
 *                    the V2 date routes 404. This is the ROLLBACK switch.
 *   unset          → DAILY_BREAD_V2_DEFAULT below.
 *
 * Why the default lives in code: /daily-bread is prerendered at build time and
 * served at runtime. A flag that exists only as a runtime variable disagrees
 * with every build that forgets it (including another session's deploy), and
 * readers get the wrong paper until revalidation. A committed default makes
 * build and runtime agree with no configuration; rollback sets 'off' at both.
 *
 * DAILY_BREAD_V2_SOURCE (server-only):
 *   'supabase' (default) → daily_bread_editions via the service role.
 *   'fixture'            → a read-only fixture set (local Workers preview and
 *                          visual QA only; never set in production).
 *
 * Neither name is NEXT_PUBLIC_*, so neither is inlined into a browser bundle.
 */

export type DailyBreadSource = 'supabase' | 'fixture'

/** Go-live (founder, 2026-09-13: "I want it live on cloudflare"). */
export const DAILY_BREAD_V2_DEFAULT: 'on' | 'off' = 'on'

export function dailyBreadV2Enabled(
  env: Record<string, string | undefined> = process.env,
): boolean {
  const raw = (env.DAILY_BREAD_V2 ?? '').trim().toLowerCase()
  const value = raw === '' ? DAILY_BREAD_V2_DEFAULT : raw
  return value === 'on'
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
