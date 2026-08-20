/**
 * Preview reads for the founder's browser drafts (SA-111 / F-157).
 *
 * getEditionPreview returns EVERY row for a date — drafts, approved,
 * published — each carrying its id and status so the preview page can wrap
 * unapproved pieces in approve/reject chrome. Service-role read; only ever
 * called from the admin-gated preview route. Kept out of store.ts on
 * purpose: this file's semantics are "show the founder everything," the
 * store's are "show readers what is published."
 */
import { createAdminClient } from '@/lib/supabase/admin'
import type {
  EditionItem,
  EditionKind,
  EditionPayloadMap,
  EditionStatus,
} from './kinds'

export type PreviewEdition = {
  [K in EditionKind]?: EditionItem<K>[]
}

interface Row {
  id: string
  kind: EditionKind
  publish_date: string
  slot: number
  status: EditionStatus
  payload: unknown
  source_name: string | null
  source_url: string | null
}

export async function getEditionPreview(date: string): Promise<PreviewEdition> {
  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from('edition_items')
    .select(
      'id, kind, publish_date, slot, status, payload, source_name, source_url',
    )
    .eq('publish_date', date)
    .neq('status', 'rejected')
    .order('slot', { ascending: true })

  if (error) {
    throw new Error(`edition preview read failed for ${date}: ${error.message}`)
  }

  const edition: PreviewEdition = {}
  for (const row of (data ?? []) as Row[]) {
    const item: EditionItem = {
      id: row.id,
      kind: row.kind,
      publishDate: row.publish_date,
      slot: row.slot,
      status: row.status,
      payload: row.payload as EditionPayloadMap[EditionKind],
      sourceName: row.source_name ?? undefined,
      sourceUrl: row.source_url ?? undefined,
    }
    const bucket = (edition[item.kind] ??= [])
    ;(bucket as EditionItem[]).push(item)
  }
  return edition
}
