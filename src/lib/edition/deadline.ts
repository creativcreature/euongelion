/**
 * The 7am rule (SA-114 / F-158). Founder, 2026-08-19: "the new daily bread
 * goes live at 7 everyday. the weekly devotional goes live 7 am monday."
 *
 * The paper works like a morning paper: the edition FLIPS at 7:00am Eastern.
 * Before 7am, yesterday's edition is still the live one; at 7am the new day
 * arrives whole — including any draft the founder did not reject. Silence
 * publishes at the flip; rejection is the veto; the founder's window to
 * approve or change runs right up to 7am of the posting day. Enforced at
 * read time — no cron, no promotion writes, nothing to fail silently.
 */
import { createAdminClient } from '@/lib/supabase/admin'
import type {
  EditionItem,
  EditionKind,
  EditionPayloadMap,
  EditionStatus,
} from './kinds'
import type { Edition } from './store'

/** New York's UTC offset in minutes for a given instant (DST-safe). */
function nyOffsetMinutes(at: Date): number {
  const tzName = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/New_York',
    timeZoneName: 'shortOffset',
  })
    .formatToParts(at)
    .find((p) => p.type === 'timeZoneName')?.value // e.g. "GMT-4"
  const m = tzName?.match(/GMT([+-]\d+)(?::(\d+))?/)
  const hours = m ? Number(m[1]) : -5
  const minutes = m?.[2] ? Number(m[2]) * Math.sign(hours) : 0
  return hours * 60 + minutes
}

/**
 * Which edition is live right now: today's date in New York, minus a day
 * when the clock has not reached 7am there yet.
 */
export function effectiveEditionDate(now: Date = new Date()): string {
  const offset = nyOffsetMinutes(now)
  const ny = new Date(now.getTime() + offset * 60_000)
  if (ny.getUTCHours() < 7) {
    ny.setUTCDate(ny.getUTCDate() - 1)
  }
  return ny.toISOString().slice(0, 10)
}

/** True once the edition for this posting day is (or has been) the live one —
 * the moment its unrejected drafts print. */
export function draftIsLive(dateIso: string, now: Date = new Date()): boolean {
  return dateIso <= effectiveEditionDate(now)
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

/**
 * The reader-facing edition under the 7am rule: published rows always;
 * draft rows once the edition is live. Throws on a failed read (Rule 1).
 */
export async function getLiveEdition(
  dateIso: string,
  now: Date = new Date(),
): Promise<Edition> {
  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from('edition_items')
    .select(
      'id, kind, publish_date, slot, status, payload, source_name, source_url',
    )
    .eq('publish_date', dateIso)
    .in('status', ['published', 'draft'])
    .order('slot', { ascending: true })

  if (error) {
    throw new Error(`edition read failed for ${dateIso}: ${error.message}`)
  }

  const includeDrafts = draftIsLive(dateIso, now)
  const edition: Edition = {}
  for (const row of (data ?? []) as Row[]) {
    if (row.status === 'draft' && !includeDrafts) continue
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
