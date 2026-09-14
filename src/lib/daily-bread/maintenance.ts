/**
 * Maintenance on PUBLISHED editions, always through revisions (the issue
 * number, date and publication stamp never change; the correction is recorded
 * as an immutable revision and the page says "Corrected edition").
 */
import { getSeriesHero } from '@/lib/series-hero'
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
    plate: hero && src ? { id: `series:${lead.seriesSlug}`, src, alt: '', kind: 'series-hero' } : undefined,
  }
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
