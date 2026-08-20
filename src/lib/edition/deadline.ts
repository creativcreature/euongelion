/**
 * The 3am rule (SA-111 / F-157). Founder, 2026-08-19: "drafts go live if I
 * dont directly approve. I have until 3am the day it posts to approve or
 * change."
 *
 * So the live paper reads PUBLISHED rows plus any DRAFT whose posting day
 * has passed 3:00am Eastern — silence is consent, rejection is the veto,
 * and the founder's editing window runs right up to the deadline. Enforced
 * at read time: no cron, no promotion writes, nothing to fail silently. A
 * rejected draft never renders regardless of the clock.
 */
import { createAdminClient } from '@/lib/supabase/admin'
import type {
  EditionItem,
  EditionKind,
  EditionPayloadMap,
  EditionStatus,
} from './kinds'
import type { Edition } from './store'

/**
 * The UTC instant of 3:00am America/New_York on the given posting day —
 * DST-safe via Intl (7am UTC in summer, 8am in winter, computed not assumed).
 */
export function deadlineUtc(dateIso: string): Date {
  // Offset for that calendar date in New York.
  const probe = new Date(`${dateIso}T12:00:00Z`)
  const tzName = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/New_York',
    timeZoneName: 'shortOffset',
  })
    .formatToParts(probe)
    .find((p) => p.type === 'timeZoneName')?.value // e.g. "GMT-4"
  const m = tzName?.match(/GMT([+-]\d+)(?::(\d+))?/)
  const offsetHours = m ? Number(m[1]) : -5
  const offsetMinutes = m?.[2] ? Number(m[2]) * Math.sign(offsetHours) : 0
  // 3am local = 3 - offset hours UTC (offset is negative for New York).
  const utcHour = 3 - offsetHours
  const d = new Date(`${dateIso}T00:00:00Z`)
  d.setUTCHours(utcHour, -offsetMinutes, 0, 0)
  return d
}

/** True when a draft for this posting day has crossed its 3am-ET deadline. */
export function draftIsLive(dateIso: string, now: Date = new Date()): boolean {
  return now.getTime() >= deadlineUtc(dateIso).getTime()
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
 * The reader-facing edition under the 3am rule: published rows always;
 * draft rows only past the deadline. Throws on a failed read (Rule 1) —
 * the page shows its visible failure band, never a thinner paper.
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
