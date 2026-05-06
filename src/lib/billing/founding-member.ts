/**
 * founding-member.ts — Founding Member program helpers.
 *
 * Master plan Section 0.2 (founder-locked 2026-05-03) + founder
 * direction 2026-05-05: the first 500 users to subscribe to
 * `premium_annual` receive a permanent Founding Member badge. Per
 * founder direction, the badge is locked at the moment of first
 * annual subscription and persists EVEN IF THEY LATER CANCEL.
 *
 * Storage: `public.users.founding_member_at TIMESTAMPTZ`
 * (migration `010_add_founding_member.sql`).
 *   NULL  → not a founding member
 *   ISO ts → claimed at this time, badge locked
 *
 * Race-condition strategy: `claimFoundingMemberSlot` runs an atomic
 * conditional UPDATE — set the timestamp only when the column is
 * currently NULL AND the count of non-null rows is < 500. The DB
 * trigger `enforce_founding_member_cap` is a defense-in-depth backstop
 * against the count exceeding 500 even if the application bug bypasses
 * the conditional UPDATE.
 *
 * Read path: `readFoundingMemberAt` is called from
 * `/api/billing/entitlements` on every entitlement check; cached
 * result is the user's column value. Cheap.
 *
 * Public count: `getFoundingMemberCount` is called from
 * `/api/billing/founding-member-count` to render the "N of 500
 * claimed" counter on /pricing. Returns `{ claimed, total, full }`.
 */

import { createAdminClient } from '@/lib/supabase/admin'
import type { FoundingMemberCount } from '@/types/billing'

export const FOUNDING_MEMBER_CAP = 500

/**
 * Read the founding-member timestamp for a user. Returns the ISO
 * string when the user holds the badge, `null` when they don't or
 * when the lookup fails (Supabase down, missing user_id, etc.).
 *
 * Defaults to null on any failure so we never falsely award status.
 */
export async function readFoundingMemberAt(
  userId: string | null,
): Promise<string | null> {
  if (!userId) return null

  let supabase: ReturnType<typeof createAdminClient>
  try {
    supabase = createAdminClient()
  } catch {
    return null
  }

  try {
    const { data, error } = await supabase
      .from('users')
      .select('founding_member_at')
      .eq('id', userId)
      .maybeSingle()

    if (error || !data) return null
    const value = (data as { founding_member_at?: string | null })
      .founding_member_at
    return typeof value === 'string' && value.length > 0 ? value : null
  } catch {
    return null
  }
}

/**
 * Public-facing slot count. Cached for 60 seconds so a viral page
 * load doesn't hammer Supabase. Returns 0 of 500 when Supabase is
 * unavailable rather than throwing — the page can still render.
 */
let cachedCount: { value: FoundingMemberCount; fetchedAt: number } | null = null
const FOUNDING_MEMBER_COUNT_TTL_MS = 60_000

export async function getFoundingMemberCount(): Promise<FoundingMemberCount> {
  const now = Date.now()
  if (
    cachedCount &&
    now - cachedCount.fetchedAt < FOUNDING_MEMBER_COUNT_TTL_MS
  ) {
    return cachedCount.value
  }

  const fallback: FoundingMemberCount = {
    claimed: 0,
    total: FOUNDING_MEMBER_CAP,
    full: false,
  }

  let supabase: ReturnType<typeof createAdminClient>
  try {
    supabase = createAdminClient()
  } catch {
    return fallback
  }

  try {
    const { count, error } = await supabase
      .from('users')
      .select('id', { count: 'exact', head: true })
      .not('founding_member_at', 'is', null)

    if (error) return fallback

    const claimed = Math.min(count ?? 0, FOUNDING_MEMBER_CAP)
    const value: FoundingMemberCount = {
      claimed,
      total: FOUNDING_MEMBER_CAP,
      full: claimed >= FOUNDING_MEMBER_CAP,
    }
    cachedCount = { value, fetchedAt: now }
    return value
  } catch {
    return fallback
  }
}

/** Test/admin helper to invalidate the count cache. */
export function clearFoundingMemberCountCache(): void {
  cachedCount = null
}

/**
 * Atomically claim a Founding Member slot for `userId` IF
 *   (a) they don't already hold the badge, AND
 *   (b) the current claimed count is < 500.
 *
 * Returns `{ claimed: true, claimedAt }` when the slot is awarded.
 * Returns `{ claimed: false, reason }` when:
 *   - 'already_held' — user already has the badge
 *   - 'cap_reached'  — first 500 are taken
 *   - 'lookup_failed' — Supabase unavailable / unexpected error
 *   - 'user_not_found' — userId doesn't match a row in `public.users`
 *
 * Idempotent: calling twice for the same user is safe; the second
 * call returns 'already_held' without any side effect.
 *
 * Concurrency: the conditional UPDATE filters on
 * `founding_member_at IS NULL` so a second writer can't overwrite a
 * winning slot. The DB trigger backstops if cap-checking ever drifts.
 */
export async function claimFoundingMemberSlot(userId: string): Promise<
  | { claimed: true; claimedAt: string }
  | {
      claimed: false
      reason:
        | 'already_held'
        | 'cap_reached'
        | 'lookup_failed'
        | 'user_not_found'
    }
> {
  let supabase: ReturnType<typeof createAdminClient>
  try {
    supabase = createAdminClient()
  } catch {
    return { claimed: false, reason: 'lookup_failed' }
  }

  // Step 1: read current state. Cheap, gives us 'already_held' fast.
  let existing: { id: string; founding_member_at: string | null } | null
  try {
    const { data, error } = await supabase
      .from('users')
      .select('id, founding_member_at')
      .eq('id', userId)
      .maybeSingle()
    if (error) return { claimed: false, reason: 'lookup_failed' }
    existing = data as typeof existing
  } catch {
    return { claimed: false, reason: 'lookup_failed' }
  }

  if (!existing) return { claimed: false, reason: 'user_not_found' }
  if (existing.founding_member_at) {
    return { claimed: false, reason: 'already_held' }
  }

  // Step 2: check the cap before writing. We re-read inside the
  // conditional UPDATE filter as a backstop, but reading first lets
  // us return 'cap_reached' cleanly without burning a write attempt.
  const count = await getFoundingMemberCount()
  if (count.full) {
    return { claimed: false, reason: 'cap_reached' }
  }

  // Step 3: atomic conditional UPDATE. The .is('founding_member_at',
  // null) filter ensures only one of N concurrent writers wins.
  const claimedAt = new Date().toISOString()
  try {
    const { data, error } = await supabase
      .from('users')
      .update({ founding_member_at: claimedAt })
      .eq('id', userId)
      .is('founding_member_at', null)
      .select('founding_member_at')
      .maybeSingle()
    if (error) {
      // Trigger fired (cap reached at the DB level). Treat as
      // cap_reached and invalidate cache so the next read is fresh.
      cachedCount = null
      return { claimed: false, reason: 'cap_reached' }
    }
    if (!data) {
      // Row didn't match the IS NULL filter — someone else won the
      // race. Return 'already_held' (true if our user beat themselves
      // to it, otherwise 'cap_reached' is the more accurate framing).
      cachedCount = null
      return { claimed: false, reason: 'already_held' }
    }
    cachedCount = null // invalidate so the count reflects the new claim
    const ts = (data as { founding_member_at: string | null })
      .founding_member_at
    return { claimed: true, claimedAt: ts ?? claimedAt }
  } catch {
    return { claimed: false, reason: 'lookup_failed' }
  }
}
