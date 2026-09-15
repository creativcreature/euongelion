/**
 * The funnies are ECHO & DUST — the Daily Bread's own strip, locked by the
 * founder (content/strip-reference/ECHO-AND-DUST-CANON.md, 2026-08-20):
 * Teddy, Echo and Dust. Nothing else is Echo & Dust, so nothing else is printed
 * in its place (SA-142 / F-184, founder 2026-09-14: "the comic strip is
 * completely wrong… where is Dust and Echo?").
 *
 * ONE STRIP PER WEEK (founder, 2026-09-14: "the comic should be weekly and the
 * bread daily… One strip shown all week"; "I want to approve the months of
 * comics at once"). A week's strip is an edition_items `strip` row dated that
 * week's Monday, and it prints only once the founder has APPROVED it
 * (status published) — a draft never prints on its own.
 *
 * The chain, for an edition date:
 *   1. approved-art     the week's approved strip (or, for the daily-strip era,
 *                       the approved strip dated that very day)
 *   2. archive-reprint  otherwise ONE approved strip from before the week,
 *                       reprinted every day of the week and credited with its
 *                       first run; the least recently printed first, never one
 *                       printed in the three weeks before
 *   3. omitted          nothing approved ran before the week
 *
 * Every image is checked at build (HTTP 200, image/*). No model is called: the
 * strip is written and drawn upstream, and approved by the founder.
 */
import { cleanText, safeAssetSrc } from '../safe'
import { addDays, weekStart } from '../time'
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

/** How far back a reprint may not repeat (the three weeks before its week). */
export const REPRINT_COOLDOWN_DAYS = 21

export async function composeComic(params: {
  dateSlug: string
  /** Founder-APPROVED strips, any date (publishedStripBank). */
  bank: StripBankEntry[]
  /** What recent editions printed: date and strip id, any order. */
  recent: { editionDate: string; comicId?: string }[]
  /** True when the image URL answers 200 with an image. */
  assetAvailable: (src: string) => Promise<boolean>
}): Promise<ComicChainResult> {
  const notes: string[] = []
  const base = { usage: [] as ProviderUsage[], providerDeterministic: true, notes }
  const week = weekStart(params.dateSlug)
  const reachable = async (entry: StripBankEntry, what: string) => {
    if (await params.assetAvailable(entry.image)) return true
    notes.push(`comic: ${what} image not reachable (${entry.panelId})`)
    return false
  }

  // 1. The week's approved strip (the daily-strip era: the day's own).
  const own =
    params.bank.find((s) => s.publishDate === week) ??
    params.bank.find((s) => s.publishDate === params.dateSlug)
  if (own && (await reachable(own, 'the week’s strip'))) {
    return {
      ...base,
      module: stripModule(own, 'approved-art'),
      level: 'approved-art',
      providerDeterministic: false,
      sourceItemIds: own.id ? [own.id] : [],
    }
  }

  // 2. The week's reprint. Earlier in the same week → the same strip again.
  const byId = new Map(params.bank.map((s) => [s.panelId, s]))
  const sameWeek = params.recent
    .filter((r) => r.editionDate >= week && r.editionDate < params.dateSlug && r.comicId)
    .sort((a, b) => a.editionDate.localeCompare(b.editionDate))
  for (const r of sameWeek) {
    const entry = byId.get(r.comicId!)
    if (entry && entry.publishDate < week && (await reachable(entry, 'this week’s reprint'))) {
      return {
        ...base,
        module: stripModule(entry, 'archive-reprint', entry.publishDate),
        level: 'archive-reprint',
        sourceItemIds: entry.id ? [entry.id] : [],
      }
    }
  }
  const lastPrinted = new Map<string, string>()
  for (const r of params.recent) {
    if (!r.comicId || r.editionDate >= week) continue
    if ((lastPrinted.get(r.comicId) ?? '') < r.editionDate) lastPrinted.set(r.comicId, r.editionDate)
  }
  const cooldownFrom = addDays(week, -REPRINT_COOLDOWN_DAYS)
  const candidates = params.bank
    .filter((s) => s.publishDate < week)
    .sort((a, b) => {
      const la = lastPrinted.get(a.panelId) ?? ''
      const lb = lastPrinted.get(b.panelId) ?? ''
      return la.localeCompare(lb) || a.publishDate.localeCompare(b.publishDate)
    })
  const fresh = candidates.filter((s) => (lastPrinted.get(s.panelId) ?? '') < cooldownFrom)
  for (const candidate of fresh.length > 0 ? fresh : candidates) {
    if (!(await reachable(candidate, 'reprint candidate'))) continue
    return {
      ...base,
      module: stripModule(candidate, 'archive-reprint', candidate.publishDate),
      level: 'archive-reprint',
      sourceItemIds: candidate.id ? [candidate.id] : [],
    }
  }

  // 3. Nothing approved to print — never a stand-in drawing.
  notes.push(
    candidates.length === 0
      ? 'comic: omitted (no approved Echo & Dust strip for the week and none before it)'
      : 'comic: omitted (no reachable approved Echo & Dust strip)',
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
