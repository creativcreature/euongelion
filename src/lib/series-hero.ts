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
  // F-083 audit fix 2026-07-27: the riso `series.heroImage` (set on
  // every series) now BEATS the legacy Substack cover photo. R37's
  // substack-first order shipped real photographs onto series cards
  // and the Daily Bread hero — forbidden by the image rules (CLAUDE.md
  // hard rule #4) once riso art existed for all series.
  const risoHero = SERIES_DATA[slug]?.heroImage
  if (risoHero) {
    return {
      slug: `${slug}-hero`,
      title: SERIES_DATA[slug]?.title ?? slug,
      artist: 'Euangelion riso series art',
      year: '',
      medium: 'risograph poster',
      museum: '',
      license: 'Original',
      printStyle: 'riso-duotone',
      src: risoHero,
      rawSrc: risoHero,
      relevance: '',
    }
  }

  // Legacy fallback for any series without riso art.
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
