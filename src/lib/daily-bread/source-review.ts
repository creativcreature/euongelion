/**
 * Re-check, at publish time, that the reviewed edition_items an edition was
 * built from have not been rejected since the build (the SA-114 veto keeps
 * working after V2 freezes a paper).
 */
import { createAdminClient } from '@/lib/supabase/admin'

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export async function rejectedEditionItemIds(ids: string[]): Promise<string[]> {
  const clean = [...new Set(ids.filter((id) => UUID_RE.test(id)))].slice(0, 200)
  if (clean.length === 0) return []
  const { data, error } = await createAdminClient()
    .from('edition_items')
    .select('id')
    .in('id', clean)
    .eq('status', 'rejected')
  if (error) {
    throw new Error(`edition_items review re-check failed: ${error.message}`)
  }
  return ((data ?? []) as { id: string }[]).map((r) => r.id)
}
