/**
 * The asset reservoir (plan §53): one index of every visual the Daily Bread
 * can print, with what is actually recorded about each, and how often and how
 * recently the paper has used it.
 *
 * Nothing here is inferred. A field the sources do not record stays empty (an
 * empty list, or `rights: 'unrecorded'`), so a gap is visible instead of
 * papered over. Built by `npm run daily-bread -- reservoir` into
 * docs/daily-bread/asset-reservoir.json.
 */
import type { DailyEdition, ProceduralSceneId } from '../types'

export type ReservoirKind = 'historical-art' | 'euangelion-art' | 'procedural-poster' | 'comic'

export interface ReservoirAsset {
  /** `<kind>:<key>` — stable across rebuilds. */
  id: string
  kind: ReservoirKind
  src: string
  title: string
  artist: string | null
  tags: string[]
  scriptureAffinity: string[]
  liturgicalAffinity: string[]
  /** As recorded by the source, or 'unrecorded'. */
  rights: string
  /** width / height, or null when the file was not measured. */
  aspectRatio: number | null
  /** null when edition history was not read for this build. */
  usageCount: number | null
  lastUsed: string | null
}

export interface ReservoirSources {
  /** Audited Gallery prints (docs/print-audit-2026-08-18.json, verdict clean). */
  prints: { file: string; artist: string }[]
  /** Vasari captions by file (src/data/gallery-vasari.json). */
  vasari: Map<string, { title: string }>
  /** Series with their riso hero (src/data/series.ts). */
  series: { slug: string; title: string; heroImage?: string; keywords: string[]; framework: string }[]
  scenes: readonly ProceduralSceneId[]
  /** Founder-approved Echo & Dust strips. */
  strips: { panelId: string; image: string; caption: string; width: number; height: number }[]
  /** Pixel sizes of local files, by public src. */
  dimensions: Map<string, { width: number; height: number }>
  /** Published editions, when usage is wanted. */
  editions?: Pick<DailyEdition, 'editionDate' | 'modules' | 'assets'>[]
}

const PRINT_DIR = '/images/devotional-prints'

/** The reference a series is framed on: "Matthew 6:33 - Seek first…" → "Matthew 6:33". */
export function frameworkReference(framework: string): string[] {
  const ref = framework.split(/\s+[-–—]\s+/)[0]?.trim()
  return ref && /\d/.test(ref) ? [ref] : []
}

export function buildReservoir(sources: ReservoirSources): ReservoirAsset[] {
  const ratio = (src: string) => {
    const d = sources.dimensions.get(src)
    return d && d.height > 0 ? Math.round((d.width / d.height) * 1000) / 1000 : null
  }
  const assets: ReservoirAsset[] = []

  for (const print of sources.prints) {
    const src = `${PRINT_DIR}/${print.file}`
    assets.push({
      id: `historical-art:${print.file.replace(/\.webp$/, '')}`,
      kind: 'historical-art',
      src,
      title: sources.vasari.get(print.file)?.title ?? print.file.replace(/\.webp$/, ''),
      artist: print.artist,
      tags: print.file.replace(/\.webp$/, '').split('-').slice(1),
      scriptureAffinity: [],
      liturgicalAffinity: [],
      // The print audit records a visual verdict, not rights.
      rights: 'unrecorded',
      aspectRatio: ratio(src),
      usageCount: null,
      lastUsed: null,
    })
  }

  for (const s of sources.series) {
    if (!s.heroImage) continue
    assets.push({
      id: `euangelion-art:${s.slug}`,
      kind: 'euangelion-art',
      src: s.heroImage,
      title: s.title,
      artist: 'Euangelion riso series art',
      tags: [...s.keywords],
      scriptureAffinity: frameworkReference(s.framework),
      liturgicalAffinity: [],
      // src/lib/series-hero.ts records series riso art as license 'Original'.
      rights: 'Original (Euangelion)',
      aspectRatio: ratio(s.heroImage),
      usageCount: null,
      lastUsed: null,
    })
  }

  for (const scene of sources.scenes) {
    assets.push({
      id: `procedural-poster:${scene}`,
      kind: 'procedural-poster',
      src: `procedural:${scene}`,
      title: scene,
      artist: null,
      tags: scene.split('-'),
      scriptureAffinity: [],
      liturgicalAffinity: [],
      rights: 'First-party code (this repository)',
      aspectRatio: 2,
      usageCount: null,
      lastUsed: null,
    })
  }

  for (const strip of sources.strips) {
    assets.push({
      id: `comic:${strip.panelId}`,
      kind: 'comic',
      src: strip.image,
      title: strip.caption,
      artist: 'Echo & Dust',
      tags: ['echo-and-dust'],
      scriptureAffinity: [],
      liturgicalAffinity: [],
      rights: 'Original (Euangelion)',
      aspectRatio: strip.height > 0 ? Math.round((strip.width / strip.height) * 1000) / 1000 : null,
      usageCount: null,
      lastUsed: null,
    })
  }

  if (sources.editions) {
    const uses = new Map<string, { count: number; last: string }>()
    const record = (src: string, date: string) => {
      const u = uses.get(src) ?? { count: 0, last: '' }
      u.count += 1
      if (date > u.last) u.last = date
      uses.set(src, u)
    }
    for (const e of sources.editions) {
      const seen = new Set<string>()
      const once = (src: string | undefined) => {
        if (src && !seen.has(src)) {
          seen.add(src)
          record(src, e.editionDate)
        }
      }
      once(e.assets?.leadPlate?.src)
      for (const m of e.modules) {
        if (m.type === 'gallery') m.plates.forEach((p) => once(p.image))
        if (m.type === 'comic') once(m.image?.src)
        if (m.type === 'scene') once(`procedural:${m.scene}`)
      }
    }
    for (const a of assets) {
      const u = uses.get(a.src)
      a.usageCount = u?.count ?? 0
      a.lastUsed = u?.last || null
    }
  }

  return assets.sort((a, b) => a.id.localeCompare(b.id))
}
