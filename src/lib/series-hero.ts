import { SERIES_DATA } from '@/data/series'
import { SERIES_HERO } from '@/data/artwork-manifest'
import type { ArtworkEntry } from '@/data/artwork-manifest'

/**
 * Founder direction 2026-05-12: "the main series image should show as
 * the thumbnail image for series cards throughout the site."
 *
 * `SERIES_HERO` is auto-generated from the artist-print manifest and
 * currently ships empty. `series.heroImage` (set on every series in
 * `src/data/series.ts`) is the canonical poster image. This helper
 * resolves a hero with that fallback so every series card renders
 * the right thumbnail regardless of manifest state.
 */
export function getSeriesHero(slug: string): ArtworkEntry | undefined {
  const fromManifest = SERIES_HERO[slug]
  if (fromManifest) return fromManifest

  const series = SERIES_DATA[slug]
  if (!series?.heroImage) return undefined

  return {
    slug: `${slug}-series-hero`,
    title: series.title,
    artist: 'Euangelion',
    year: '2026',
    medium: 'editorial illustration',
    museum: '',
    license: 'Original',
    printStyle: 'series-hero',
    src: series.heroImage,
    rawSrc: series.heroImage,
    relevance: '',
  }
}
