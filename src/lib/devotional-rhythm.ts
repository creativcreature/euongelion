/**
 * R30: shared helper for the 2-column zig-zag rhythm used on the
 * dedicated /devotional/[slug] reader and on Daily Bread's
 * CuratedActiveView. Modules whose visual weight is too large to
 * live in a half-column (scripture passages, hero cards, big art,
 * video, journey, recap, sabbath, inline images, CTA, interactive)
 * break the pattern with a full-width row. Everything else
 * alternates left/right based on the count of half-width modules
 * rendered so far — full-width breaks don't reset the alternation.
 */

const FULL_WIDTH_MODULE_TYPES = new Set([
  'scripture',
  'art',
  'hero-card',
  'video',
  'inline-image',
  'journey',
  'recap',
  'sabbath',
  'cta',
  'interactive',
])

export type RhythmPosition = 'left' | 'right' | 'full'

export function getRhythmPosition(
  type: string | undefined,
  halfIndex: number,
): RhythmPosition {
  if (type && FULL_WIDTH_MODULE_TYPES.has(type)) return 'full'
  return halfIndex % 2 === 0 ? 'left' : 'right'
}
