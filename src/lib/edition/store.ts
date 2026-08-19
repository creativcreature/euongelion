/**
 * The Daily Bread — edition store (SA-090 / F-136).
 *
 * The ONLY module that touches edition_items. Generators produce EditionItem
 * values; the runner writes them through here; the page reads through here.
 *
 * FAILURE BEHAVIOUR IS SPLIT DELIBERATELY (Development Rule 1):
 *   - a missing SECTION is normal — the page renders nothing for it;
 *   - a missing DATABASE is an error — getEdition THROWS and the page shows a
 *     visible failure state. This module never returns a plausible empty
 *     edition when the read itself failed.
 */
import { createAdminClient } from '@/lib/supabase/admin'
import {
  validateEditionItem,
  type EditionItem,
  type EditionKind,
  type EditionPayloadMap,
} from './kinds'

/** One assembled edition: every published row for a date, grouped by kind,
 * slot-ordered. Kinds with no rows are simply absent. */
export type Edition = {
  [K in EditionKind]?: EditionItem<K>[]
}

interface EditionRow {
  id: string
  kind: EditionKind
  publish_date: string
  slot: number
  status: EditionItem['status']
  payload: unknown
  source_name: string | null
  source_url: string | null
}

function rowToItem(row: EditionRow): EditionItem {
  return {
    id: row.id,
    kind: row.kind,
    publishDate: row.publish_date,
    slot: row.slot,
    status: row.status,
    payload: row.payload as EditionPayloadMap[EditionKind],
    sourceName: row.source_name ?? undefined,
    sourceUrl: row.source_url ?? undefined,
  }
}

/**
 * Read the published edition for a UTC date ('YYYY-MM-DD').
 * THROWS on any database failure — the caller decides how a broken paper
 * looks, and it must look broken (Rule 1), never silently empty.
 */
export async function getEdition(date: string): Promise<Edition> {
  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from('edition_items')
    .select('id, kind, publish_date, slot, status, payload, source_name, source_url')
    .eq('publish_date', date)
    .eq('status', 'published')
    .order('slot', { ascending: true })

  if (error) {
    throw new Error(`edition read failed for ${date}: ${error.message}`)
  }

  const edition: Edition = {}
  for (const row of (data ?? []) as EditionRow[]) {
    const item = rowToItem(row)
    const bucket = (edition[item.kind] ??= [])
    ;(bucket as EditionItem[]).push(item)
  }
  return edition
}

/**
 * Upsert a batch of items, validating every one first. Used by the runner and
 * by the approval queue. Rejects the WHOLE batch on the first invalid item —
 * a partially-written edition is worse than a loudly-failed one.
 */
export async function upsertEditionItems(items: EditionItem[]): Promise<number> {
  for (const item of items) {
    const err = validateEditionItem(item)
    if (err) {
      throw new Error(
        `invalid edition item (${item.kind} ${item.publishDate} slot ${item.slot}): ${err}`,
      )
    }
  }
  if (items.length === 0) return 0

  const supabase = createAdminClient()
  const rows = items.map((item) => ({
    kind: item.kind,
    publish_date: item.publishDate,
    slot: item.slot,
    status: item.status,
    payload: item.payload as unknown as Record<string, unknown>,
    source_name: item.sourceName ?? null,
    source_url: item.sourceUrl ?? null,
  }))

  const { error } = await supabase
    .from('edition_items')
    .upsert(rows, { onConflict: 'kind,publish_date,slot' })

  if (error) {
    throw new Error(`edition write failed: ${error.message}`)
  }
  return rows.length
}

/** Everything awaiting review, oldest edition first. Service-role read. */
export async function getReviewQueue(): Promise<EditionItem[]> {
  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from('edition_items')
    .select('id, kind, publish_date, slot, status, payload, source_name, source_url')
    .eq('status', 'draft')
    .order('publish_date', { ascending: true })
    .order('kind', { ascending: true })
    .order('slot', { ascending: true })

  if (error) throw new Error(`review queue read failed: ${error.message}`)
  return ((data ?? []) as EditionRow[]).map(rowToItem)
}

/** Approve or reject one item by id. Approving publishes it. */
export async function reviewEditionItem(
  id: string,
  verdict: 'published' | 'rejected',
  reviewerId: string,
): Promise<void> {
  const supabase = createAdminClient()
  const { error } = await supabase
    .from('edition_items')
    .update({
      status: verdict,
      approved_by: reviewerId,
      approved_at: new Date().toISOString(),
    })
    .eq('id', id)
    .eq('status', 'draft')

  if (error) throw new Error(`review update failed for ${id}: ${error.message}`)
}

/**
 * Recent payloads of a kind, for no-repeat-within-N-days checks in
 * generators. Looks BACK from `beforeDate` exclusive.
 */
export async function getRecentPayloads(
  kind: EditionKind,
  beforeDate: string,
  days: number,
): Promise<unknown[]> {
  const since = new Date(`${beforeDate}T00:00:00Z`)
  since.setUTCDate(since.getUTCDate() - days)
  const sinceStr = since.toISOString().slice(0, 10)

  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from('edition_items')
    .select('payload')
    .eq('kind', kind)
    .gte('publish_date', sinceStr)
    .lt('publish_date', beforeDate)
    .neq('status', 'rejected')

  if (error) throw new Error(`recent payloads read failed (${kind}): ${error.message}`)
  return (data ?? []).map((r) => r.payload)
}
