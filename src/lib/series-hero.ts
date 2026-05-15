import { SERIES_DATA } from '@/data/series'
import { SERIES_HERO } from '@/data/artwork-manifest'
import { SUBSTACK_SOURCES } from '@/data/substack-sources'
import type { ArtworkEntry } from '@/data/artwork-manifest'

/**
 * Founder direction 2026-05-12: "the main series image should show as
 * the thumbnail image for series cards throughout the site."
 *
 * R37 (2026-05-15): for substack-sourced series, the hero is now the
 * original substack post's cover image (cached locally at
 * /images/substack-cache/<hash>.<ext>). Founder direction: "every
 * Substack devotional must match its original Substack article —
 * using the original images." The featured-series rail and the
 * homepage card picker pick this up automatically.
 *
 * `SERIES_HERO` is auto-generated from the artist-print manifest and
 * currently ships empty. `series.heroImage` (set on every series in
 * `src/data/series.ts`) is the canonical fallback poster image.
 */
export function getSeriesHero(slug: string): ArtworkEntry | undefined {
  // R37: substack-sourced series take their hero from the original
  // substack post (cached locally). Look up Day 1 of the series.
  const firstDay = SUBSTACK_SOURCES[`${slug}-day-1`]
  if (firstDay && (firstDay.substackImageLocal || firstDay.substackImage)) {
    const src = firstDay.substackImageLocal || firstDay.substackImage!
    return {
      slug: `${slug}-substack-hero`,
      title: SERIES_DATA[slug]?.title ?? slug,
      artist: 'From the original Substack post',
      year: '',
      medium: 'substack header',
      museum: '',
      license: 'Substack source',
      printStyle: 'substack-header',
      src,
      rawSrc: src,
      relevance: '',
    }
  }

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
