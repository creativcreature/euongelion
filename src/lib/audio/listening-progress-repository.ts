import { randomUUID } from 'crypto'
import { createAdminClient } from '@/lib/supabase/admin'

/**
 * Server-side access to `listening_progress` (migration 018).
 *
 * Deliberately NOT built on the `safeXxx` helpers in
 * `lib/soul-audit/repository.ts`. Those swallow every error to `console.error`
 * and return, which is right for a best-effort cache write but wrong here:
 * this module has to be able to tell "the table does not exist yet" apart from
 * "the database is broken", because the first is an expected state until the
 * founder applies the migration and the second is an incident. Errors are
 * thrown; the route decides what each one means.
 */

export interface ListeningProgressRow {
  positionSeconds: number
  durationSeconds: number | null
  secondsListened: number
  completedAt: string | null
  lastPlayedAt: string
}

/**
 * Postgres `42P01 undefined_table`, surfaced by PostgREST as `PGRST205`.
 *
 * Both spellings are checked because which one you get depends on whether the
 * schema cache has been reloaded — the same table can report either within
 * minutes of a migration.
 */
export function isMissingListeningProgressTable(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false
  const code = String((error as { code?: unknown }).code ?? '')
  if (code === '42P01' || code === 'PGRST205') return true
  const message = String((error as { message?: unknown }).message ?? '')
  return (
    /listening_progress/.test(message) &&
    /schema cache|does not exist/.test(message)
  )
}

function client() {
  return createAdminClient() as unknown as {
    from: (table: string) => {
      select: (cols: string) => {
        eq: (
          c: string,
          v: string,
        ) => {
          eq: (
            c: string,
            v: string,
          ) => {
            maybeSingle: () => Promise<{ data: unknown; error: unknown }>
          }
        }
      }
      upsert: (
        values: object,
        options: object,
      ) => {
        select: (cols: string) => {
          maybeSingle: () => Promise<{ data: unknown; error: unknown }>
        }
      }
    }
  }
}

interface RawRow {
  position_seconds: number
  duration_seconds: number | null
  seconds_listened: number
  completed_at: string | null
  last_played_at: string
}

function toRow(raw: RawRow): ListeningProgressRow {
  return {
    positionSeconds: raw.position_seconds,
    durationSeconds: raw.duration_seconds,
    secondsListened: raw.seconds_listened,
    completedAt: raw.completed_at,
    lastPlayedAt: raw.last_played_at,
  }
}

export async function readListeningProgress(params: {
  userId: string
  devotionalSlug: string
}): Promise<ListeningProgressRow | null> {
  const { data, error } = await client()
    .from('listening_progress')
    .select(
      'position_seconds, duration_seconds, seconds_listened, completed_at, last_played_at',
    )
    .eq('user_id', params.userId)
    .eq('devotional_slug', params.devotionalSlug)
    .maybeSingle()

  if (error) throw error
  return data ? toRow(data as RawRow) : null
}

/**
 * Record a position.
 *
 * `seconds_listened` ACCUMULATES rather than being overwritten, so a reader who
 * replays a passage three times has listened three times — position alone says
 * nothing about that, and the whole point of keeping it is to be able to show
 * someone their own journey later.
 *
 * Read-then-write rather than a single atomic increment: PostgREST has no
 * upsert-with-expression, and the alternative is a stored procedure, which is
 * more prod DDL than this earns. The race is two devices playing the SAME
 * devotional simultaneously, where one device's delta can be lost. That is a
 * rare case with a trivial consequence — a slightly low listening total — and
 * it is not worth a migration to close.
 */
export async function upsertListeningProgress(params: {
  userId: string
  devotionalSlug: string
  positionSeconds: number
  durationSeconds: number | null
  listenedDelta: number
  ended: boolean
}): Promise<ListeningProgressRow> {
  const existing = await readListeningProgress({
    userId: params.userId,
    devotionalSlug: params.devotionalSlug,
  })

  const now = new Date().toISOString()
  const values = {
    id: randomUUID(),
    user_id: params.userId,
    devotional_slug: params.devotionalSlug,
    position_seconds: params.positionSeconds,
    duration_seconds: params.durationSeconds,
    seconds_listened: (existing?.secondsListened ?? 0) + params.listenedDelta,
    // Once completed, stays completed. Re-listening does not un-finish a
    // reading, and clearing it would lose the date it was first finished.
    completed_at: params.ended
      ? (existing?.completedAt ?? now)
      : (existing?.completedAt ?? null),
    last_played_at: now,
  }

  const { data, error } = await client()
    .from('listening_progress')
    .upsert(values, { onConflict: 'user_id,devotional_slug' })
    .select(
      'position_seconds, duration_seconds, seconds_listened, completed_at, last_played_at',
    )
    .maybeSingle()

  if (error) throw error
  if (!data) {
    // An upsert that returns nothing means the write did not land. Reporting
    // success here is the "silent fallback" the project rules forbid.
    throw new Error('listening_progress upsert returned no row')
  }
  return toRow(data as RawRow)
}
