/**
 * Maintenance on PUBLISHED editions, always through revisions (the issue
 * number, date and publication stamp never change; the correction is recorded
 * as an immutable revision and the page says "Corrected edition").
 */
import { getSeriesHero } from '@/lib/series-hero'
import { composeComic } from './comic/chain'
import { leadPlateId, type EditionSources } from './modules/build'
import type { DailyBreadRepository } from './repository/types'
import { safeAssetSrc } from './safe'
import { addDays, isValidDateSlug } from './time'
import type { AssetRef, DailyEdition, EditionModule, LeadModule } from './types'

export const LEAD_PLATE_REVISION_REASON =
  'Lead plate policy (SA-142): a keyword-matched library print is replaced by the series art, or removed from an authored feature.'

/** The corrected plate for an edition whose lead plate is a library print, or null if no change. */
export function correctedLeadPlate(edition: DailyEdition): { plate: AssetRef | undefined } | null {
  const lead = edition.modules.find((m): m is LeadModule => m.type === 'lead')
  if (!lead || lead.plate?.kind !== 'print') return null
  if (lead.authored) return { plate: undefined }
  const hero = lead.seriesSlug ? getSeriesHero(lead.seriesSlug) : undefined
  const src = hero ? safeAssetSrc(hero.src) : null
  return {
    plate: hero && src ? { id: leadPlateId('series-hero', lead.seriesSlug), src, alt: '', kind: 'series-hero' } : undefined,
  }
}

export const ECHO_DUST_REVISION_REASON =
  'Echo & Dust restored (SA-142): the funnies are Echo & Dust. A stand-in silhouette strip, or a strip file overwritten in storage, is replaced by the correct Echo & Dust strip or a credited reprint; before the first strip ran, the section is removed.'

export interface ComicRepairChange {
  date: string
  from: string
  to: string
}

/**
 * Put Echo & Dust back on published editions (founder 2026-09-14: "the comic
 * strip is completely wrong… where is Dust and Echo?"). For each published
 * edition, oldest first, the comic is recomputed with the weekly Echo & Dust
 * chain — the week's approved strip, else the week's reprint of an approved
 * strip from before it, else none — and written as a revision only when what
 * a reader sees differs from what is frozen.
 * Issue numbers, dates and every other module are untouched.
 */
export async function repairComics(params: {
  repo: DailyBreadRepository
  sources: Pick<EditionSources, 'publishedStrips' | 'assetAvailable'>
  from: string
  to: string
  dryRun: boolean
}): Promise<{ revised: ComicRepairChange[]; unchanged: string[]; missing: string[]; failed: { date: string; reason: string }[] }> {
  if (!isValidDateSlug(params.from) || !isValidDateSlug(params.to) || params.from > params.to) {
    throw new Error('repair-comics: --from and --to must be dates with from <= to')
  }
  const out = {
    revised: [] as ComicRepairChange[],
    unchanged: [] as string[],
    missing: [] as string[],
    failed: [] as { date: string; reason: string }[],
  }
  const bank = await params.sources.publishedStrips()
  // What this pass has printed per date (oldest first), for the weekly reprint
  // choice and its cooldown; seeded with the edition's frozen neighbours
  // before `from` so a partial range stays consistent with what precedes it.
  const printed = new Map<string, string>()
  for (let back = 1; back <= 28; back++) {
    const before = addDays(params.from, -back)
    const e = await params.repo.getEdition(before)
    const c = e?.modules.find((m) => m.type === 'comic')
    if (c?.type === 'comic' && c.stripId) printed.set(before, c.stripId)
  }
  const describe = (m: EditionModule | undefined) =>
    m && m.type === 'comic' ? `${m.level}:${m.stripId ?? m.script?.id ?? m.image?.src ?? '?'}` : 'none'

  for (let date = params.from; date <= params.to; date = addDays(date, 1)) {
    const edition = await params.repo.getEdition(date)
    if (!edition || edition.lifecycle !== 'published') {
      out.missing.push(date)
      continue
    }
    try {
      const recent = [...printed.entries()]
        .filter(([d]) => d < date && d >= addDays(date, -35))
        .map(([editionDate, comicId]) => ({ editionDate, comicId }))
      const comic = await composeComic({
        dateSlug: date,
        bank,
        recent,
        assetAvailable: (src) => params.sources.assetAvailable(src),
      })
      const current = edition.modules.find((m) => m.type === 'comic')
      if (comic.module?.stripId) printed.set(date, comic.module.stripId)
      const before = describe(current)
      const after = describe(comic.module ?? undefined)
      // Only what a reader sees counts: the level (strip vs reprint) and the
      // image. A frozen strip that merely lacks the newer stripId field is left
      // alone rather than given a pointless "Corrected edition".
      const unchanged =
        current?.type === 'comic' && comic.module
          ? !current.script && current.level === comic.module.level && current.image?.src === comic.module.image?.src
          : !current && !comic.module
      if (unchanged) {
        out.unchanged.push(date)
        continue
      }
      const modules: EditionModule[] = edition.modules.filter((m) => m.type !== 'comic')
      if (comic.module) modules.push(comic.module)
      if (params.dryRun) {
        out.revised.push({ date, from: before, to: after })
        continue
      }
      const res = await params.repo.createRevision(date, ECHO_DUST_REVISION_REASON, {
        modules,
        generation: { ...edition.generation, comicLevel: comic.level },
      })
      if (res.result === 'revised') out.revised.push({ date, from: before, to: after })
      else out.failed.push({ date, reason: res.result })
    } catch (error) {
      out.failed.push({ date, reason: error instanceof Error ? error.message : String(error) })
    }
  }
  return out
}

export async function repairLeadPlates(params: {
  repo: DailyBreadRepository
  from: string
  to: string
  dryRun: boolean
}): Promise<{ revised: string[]; unchanged: string[]; missing: string[]; failed: { date: string; reason: string }[] }> {
  if (!isValidDateSlug(params.from) || !isValidDateSlug(params.to) || params.from > params.to) {
    throw new Error('repair-lead-plates: --from and --to must be dates with from <= to')
  }
  const out = { revised: [] as string[], unchanged: [] as string[], missing: [] as string[], failed: [] as { date: string; reason: string }[] }
  for (let date = params.from; date <= params.to; date = addDays(date, 1)) {
    const edition = await params.repo.getEdition(date)
    if (!edition || edition.lifecycle !== 'published') {
      out.missing.push(date)
      continue
    }
    const fix = correctedLeadPlate(edition)
    if (!fix) {
      out.unchanged.push(date)
      continue
    }
    const modules: EditionModule[] = edition.modules.map((m) => {
      if (m.type !== 'lead') return m
      const { plate: _old, ...rest } = m
      void _old
      return fix.plate ? { ...rest, plate: fix.plate } : rest
    })
    const { leadPlate: _oldAsset, ...assetsRest } = edition.assets
    void _oldAsset
    const assets = fix.plate ? { ...assetsRest, leadPlate: fix.plate } : assetsRest
    if (params.dryRun) {
      out.revised.push(date)
      continue
    }
    const res = await params.repo.createRevision(date, LEAD_PLATE_REVISION_REASON, { modules, assets })
    if (res.result === 'revised') out.revised.push(date)
    else out.failed.push({ date, reason: res.result })
  }
  return out
}
