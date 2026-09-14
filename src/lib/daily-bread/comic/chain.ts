/**
 * The funnies are ECHO & DUST — the Daily Bread's own strip, locked by the
 * founder (content/strip-reference/ECHO-AND-DUST-CANON.md, 2026-08-20):
 * Teddy, Echo and Dust, drawn from the locked character sheet by the SA-114
 * strip machine (scripts/edition/strip/generate-strip.mjs) and reviewed in the
 * founder's queue. Nothing else is Echo & Dust, so nothing else is printed in
 * its place (SA-142 / F-184, founder 2026-09-14: "the comic strip is
 * completely wrong… where is Dust and Echo?").
 *
 * The chain:
 *   1. approved-art     the date's Echo & Dust strip, live at the rollover under
 *                       the SA-114 rule (published, or an unrejected draft)
 *   2. archive-reprint  a strip the founder PUBLISHED that first ran before this
 *                       edition's date, least recently printed — credited on
 *                       the page as a reprint with its first-run date
 *   3. omitted          no strip; the composition closes the gap
 *
 * Every image is checked at build (HTTP 200, image/*) so a frozen edition never
 * points at a missing file. No model is called here: the strip is written and
 * drawn upstream, against the canon.
 */
import type { Edition } from '@/lib/edition/store'
import { cleanText, safeAssetSrc } from '../safe'
import type { ComicModule, ComicSourceLevel, ProviderUsage } from '../types'

export interface ComicChainResult {
  module: ComicModule | null
  level: ComicSourceLevel
  usage: ProviderUsage[]
  providerDeterministic: boolean
  notes: string[]
  sourceItemIds: string[]
}

/** One founder-published Echo & Dust strip, as stored in edition_items. */
export interface StripBankEntry {
  id: string
  publishDate: string
  panelId: string
  image: string
  width: number
  height: number
  alt: string
  caption: string
}

interface StripPayload {
  image?: unknown
  alt?: unknown
  caption?: unknown
  panelId?: unknown
  width?: unknown
  height?: unknown
}

function stripModule(
  entry: { id?: string; panelId: string; image: string; width: number; height: number; alt: string; caption: string },
  level: 'approved-art' | 'archive-reprint',
  firstRan?: string,
): ComicModule {
  return {
    type: 'comic',
    level,
    title: cleanText(entry.caption, 120),
    caption: cleanText(entry.caption, 200),
    stripId: entry.panelId,
    image: { src: entry.image, width: entry.width, height: entry.height, alt: cleanText(entry.alt, 600) },
    ...(firstRan ? { firstRan } : {}),
  }
}

function payloadEntry(id: string | undefined, publishDate: string, p: StripPayload): StripBankEntry | null {
  const image = typeof p.image === 'string' ? safeAssetSrc(p.image) : null
  const width = Number(p.width)
  const height = Number(p.height)
  const panelId = typeof p.panelId === 'string' ? p.panelId : ''
  if (!image || !panelId || !(width > 0) || !(height > 0)) return null
  return {
    id: id ?? '',
    publishDate,
    panelId,
    image,
    width,
    height,
    alt: typeof p.alt === 'string' ? p.alt : '',
    caption: typeof p.caption === 'string' ? p.caption : 'Echo & Dust',
  }
}

export async function composeComic(params: {
  dateSlug: string
  liveItems: Edition
  /** Founder-published strips (any date); filtered to those that ran before dateSlug. */
  bank: StripBankEntry[]
  /** Strip ids printed in recent editions, newest first. */
  recentComicIds: string[]
  /** True when the image URL answers 200 with an image. */
  assetAvailable: (src: string) => Promise<boolean>
}): Promise<ComicChainResult> {
  const notes: string[] = []
  const base = { usage: [] as ProviderUsage[], providerDeterministic: true, notes }

  // 1. Today's Echo & Dust strip.
  const today = params.liveItems.strip?.[0]
  if (today) {
    const entry = payloadEntry(today.id, params.dateSlug, today.payload as StripPayload)
    if (!entry) {
      notes.push('comic: the day’s strip row failed the asset policy')
    } else if (!(await params.assetAvailable(entry.image))) {
      notes.push(`comic: the day’s strip image is not reachable (${entry.panelId})`)
    } else {
      return {
        ...base,
        module: stripModule(entry, 'approved-art'),
        level: 'approved-art',
        providerDeterministic: false,
        sourceItemIds: today.id ? [today.id] : [],
      }
    }
  }

  // 2. A reprint from the founder-published strips that ran before today,
  //    least recently printed first (never printed in the window beats all).
  const recency = (panelId: string) => {
    const i = params.recentComicIds.indexOf(panelId)
    return i === -1 ? Number.POSITIVE_INFINITY : i
  }
  const candidates = params.bank
    .filter((s) => s.publishDate < params.dateSlug)
    .sort((a, b) => recency(b.panelId) - recency(a.panelId) || a.publishDate.localeCompare(b.publishDate))
  for (const candidate of candidates) {
    if (!(await params.assetAvailable(candidate.image))) {
      notes.push(`comic: reprint candidate image not reachable (${candidate.panelId})`)
      continue
    }
    return {
      ...base,
      module: stripModule(candidate, 'archive-reprint', candidate.publishDate),
      level: 'archive-reprint',
      sourceItemIds: candidate.id ? [candidate.id] : [],
    }
  }

  // 3. Nothing to print — never a stand-in drawing.
  notes.push(
    candidates.length === 0
      ? 'comic: omitted (no Echo & Dust strip for the date and none published before it)'
      : 'comic: omitted (no reachable Echo & Dust strip)',
  )
  return { ...base, module: null, level: 'omitted', sourceItemIds: [] }
}

/** Build-time asset check: a HEAD request that must answer 200 with an image. */
export async function httpImageAvailable(src: string, fetchImpl: typeof fetch = fetch): Promise<boolean> {
  if (!/^https:\/\//.test(src)) return src.startsWith('/')
  try {
    const res = await fetchImpl(src, { method: 'HEAD', signal: AbortSignal.timeout(10_000) })
    return res.ok && (res.headers.get('content-type') ?? '').startsWith('image/')
  } catch {
    return false
  }
}

/**
 * The reprint bank from every strip row: founder-PUBLISHED strips only, and
 * never one whose image file is shared with another strip row. A shared file
 * means one strip was written over another in storage (2026-08-24: "No. 4: The
 * Receipt" over the published No. 1's echo-dust-004.jpg), so the picture no
 * longer matches the caption — reprinting it would print the wrong strip.
 */
export function publishedStripBank(
  rows: { id: string; publish_date: string; status: string; payload: unknown }[],
): StripBankEntry[] {
  const users = new Map<string, number>()
  for (const row of rows) {
    const image = (row.payload as StripPayload | null)?.image
    if (typeof image === 'string') users.set(image, (users.get(image) ?? 0) + 1)
  }
  return rows
    .filter((row) => row.status === 'published')
    .map(stripBankEntryFromRow)
    .filter((e): e is StripBankEntry => e !== null && (users.get(e.image) ?? 0) <= 1)
}

/** The bank row mapper, shared by the Supabase source and tests. */
export function stripBankEntryFromRow(row: { id: string; publish_date: string; payload: unknown }): StripBankEntry | null {
  return payloadEntry(row.id, row.publish_date, (row.payload ?? {}) as StripPayload)
}
