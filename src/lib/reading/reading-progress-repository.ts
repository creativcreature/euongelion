import { randomUUID } from 'crypto'
import { createAdminClient } from '@/lib/supabase/admin'

/**
 * Server-side access to reading completions in `user_progress`
 * (migration 004, made slug-keyed by migration 019).
 *
 * Modelled directly on `lib/audio/listening-progress-repository.ts`, including
 * the choice NOT to build on the `safeXxx` helpers in
 * `lib/soul-audit/repository.ts`. Those swallow every error to `console.error`
 * and return, which is right for a best-effort cache write and wrong here:
 * this module has to be able to tell "migration 019 is not applied yet" apart
 * from "the database is broken", because the first is an expected state and
 * the second is an incident. Errors are thrown; the route decides what each
 * one means.
 *
 * ADMIN CLIENT, NOT THE ANON-KEY SERVER CLIENT. `user_progress` does carry
 * correct `auth.uid() = user_id` RLS policies (migration 004 §RLS Policies),
 * so the cookie-bound client in `lib/supabase/server.ts` would also work. The
 * service-role path is used anyway for the same reason migration 018 gives:
 * all access here is server-side and already scoped to the id returned by a
 * verified `getUser()`, so correctness does not hang on whether a policy
 * survived migrations 011/012 in production. RLS stays enabled as defence in
 * depth for any future client-side reader.
 */

export interface ReadingProgressRow {
  devotionalSlug: string
  completedAt: string
  timeSpentSeconds: number | null
}

/**
 * Migration 019 not applied yet.
 *
 * Four spellings, because which one PostgREST reports depends on how far the
 * schema is behind and whether its cache has been reloaded:
 *   - `42P01` / `PGRST205` — `user_progress` itself is missing (migration 004)
 *   - `42703` / `PGRST204` — the table is there but `devotional_slug` is not
 */
export function isPendingReadingProgressMigration(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false
  const code = String((error as { code?: unknown }).code ?? '')
  if (
    code === '42P01' ||
    code === 'PGRST205' ||
    code === '42703' ||
    code === 'PGRST204'
  ) {
    return true
  }
  const message = String((error as { message?: unknown }).message ?? '')
  return (
    /user_progress|devotional_slug/.test(message) &&
    /schema cache|does not exist|could not find/i.test(message)
  )
}

interface QueryResult {
  data: unknown
  error: unknown
}

interface Filterable extends PromiseLike<QueryResult> {
  eq: (column: string, value: string) => Filterable
  maybeSingle: () => Promise<QueryResult>
}

/**
 * The generated `Database` type still describes `user_progress` as it stood at
 * migration 004 — `devotional_id` required, no `devotional_slug`. Casting to
 * the shape actually used keeps this module honest about the post-019 schema
 * instead of writing `devotional_id: null as never` against a stale type. Same
 * approach as the listening-progress repository.
 */
function client() {
  return createAdminClient() as unknown as {
    from: (table: string) => {
      select: (cols: string) => Filterable
      upsert: (
        values: object,
        options: object,
      ) => {
        select: (cols: string) => { maybeSingle: () => Promise<QueryResult> }
      }
      // Undo. Narrow like the rest of this wrapper: only the chain actually
      // used, so the shape stays honest rather than importing a generated type
      // that no longer matches the post-019 schema.
      delete: () => {
        eq: (
          col: string,
          val: string,
        ) => {
          eq: (
            col: string,
            val: string,
          ) => {
            select: (cols: string) => Promise<{
              data: RawRow[] | null
              error: unknown
            }>
          }
        }
      }
    }
  }
}

const COLUMNS = 'devotional_slug, completed_at, time_spent_seconds'

interface RawRow {
  devotional_slug: string | null
  completed_at: string | null
  time_spent_seconds: number | null
}

/**
 * Rows without a slug are pre-019 id-keyed rows. They are dropped rather than
 * guessed at: no code path has ever written one, and inventing a slug for a
 * row whose devotional we cannot name would be a fabricated completion.
 */
function toRows(raw: RawRow[]): ReadingProgressRow[] {
  const rows: ReadingProgressRow[] = []
  for (const entry of raw) {
    if (!entry.devotional_slug || !entry.completed_at) continue
    rows.push({
      devotionalSlug: entry.devotional_slug,
      completedAt: entry.completed_at,
      timeSpentSeconds: entry.time_spent_seconds,
    })
  }
  return rows
}

/** Every devotional this account has finished, on any device. */
export async function listReadingProgress(params: {
  userId: string
}): Promise<ReadingProgressRow[]> {
  const { data, error } = await client()
    .from('user_progress')
    .select(COLUMNS)
    .eq('user_id', params.userId)

  if (error) throw error
  return toRows((data as RawRow[] | null) ?? [])
}

async function readOne(params: {
  userId: string
  devotionalSlug: string
}): Promise<ReadingProgressRow | null> {
  const { data, error } = await client()
    .from('user_progress')
    .select(COLUMNS)
    .eq('user_id', params.userId)
    .eq('devotional_slug', params.devotionalSlug)
    .maybeSingle()

  if (error) throw error
  if (!data) return null
  return toRows([data as RawRow])[0] ?? null
}

/**
 * Record that a devotional was finished.
 *
 * COMPLETION IS MONOTONE, and this is where that is enforced. Re-reading does
 * not un-finish a reading, and it does not move the date either: the row keeps
 * the EARLIEST `completed_at` of anything it has been told, because that is
 * when the reader actually finished it. A phone that syncs late must not
 * rewrite a completion the laptop recorded on Tuesday to today.
 *
 * `time_spent_seconds` likewise keeps the first reading's number rather than
 * the latest skim.
 *
 * Read-then-write rather than a single atomic upsert-with-expression, which
 * PostgREST has no way to express. The race is two devices reporting the same
 * devotional in the same instant, and the consequence is one of two identical
 * completions winning — nothing a reader can perceive.
 */
export async function upsertReadingCompletion(params: {
  userId: string
  devotionalSlug: string
  completedAt: string
  timeSpentSeconds: number | null
}): Promise<ReadingProgressRow> {
  const existing = await readOne({
    userId: params.userId,
    devotionalSlug: params.devotionalSlug,
  })

  const completedAt =
    existing && existing.completedAt <= params.completedAt
      ? existing.completedAt
      : params.completedAt

  const values = {
    id: randomUUID(),
    user_id: params.userId,
    // NULL since migration 019: the catalog this app serves lives in JSON, not
    // in `public.devotionals`, so there is no id to point at.
    devotional_id: null,
    devotional_slug: params.devotionalSlug,
    completed_at: completedAt,
    time_spent_seconds: existing?.timeSpentSeconds ?? params.timeSpentSeconds,
  }

  const { data, error } = await client()
    .from('user_progress')
    .upsert(values, { onConflict: 'user_id,devotional_slug' })
    .select(COLUMNS)
    .maybeSingle()

  if (error) throw error
  if (!data) {
    // An upsert that returns nothing means the write did not land. Reporting
    // success here is the silent fallback the project rules forbid.
    throw new Error('user_progress upsert returned no row')
  }
  const row = toRows([data as RawRow])[0]
  if (!row) {
    throw new Error('user_progress upsert returned a row without a slug')
  }
  return row
}

/**
 * Remove a completion.
 *
 * A reader who marks the wrong day has, until now, had no way back: the write
 * path had three steps and the read path had none of them in reverse. An action
 * a person can take by accident needs an inverse, or the product is telling them
 * their mistake is permanent.
 *
 * Deleting rather than tombstoning is deliberate. `user_progress` answers "has
 * this been read", and a row that says "no" is the same as no row — except that
 * it would also have to be filtered out of every count, every series standing
 * and every reconcile. The reconcile already treats absence as not-read, so
 * absence is the honest representation.
 *
 * Returns whether a row was actually removed, so the caller can tell a genuine
 * undo from a no-op on something that was never marked.
 */
export async function deleteReadingCompletion(params: {
  userId: string
  devotionalSlug: string
}): Promise<{ removed: boolean }> {
  const { data, error } = await client()
    .from('user_progress')
    .delete()
    .eq('user_id', params.userId)
    .eq('devotional_slug', params.devotionalSlug)
    .select(COLUMNS)

  if (error) throw error
  return { removed: Array.isArray(data) && data.length > 0 }
}
