/**
 * Mapping from devotional slugs to downloaded Substack header images.
 *
 * Image filenames come from Substack HTML exports.  Several naming conventions exist:
 *   - {series}-{day}{total}          e.g. too-busy-for-god-16  = day 1 of 6
 *   - {series}-day-{day}{total}-week e.g. once-saved-always-saved-day-16-week
 *   - {series}-day-{day}{total}      e.g. the-blueprint-of-community-day-15  = day 1 of 5
 *   - hash suffixes                  e.g. in-the-beginning-week-1-the-god-who-fac
 *     (order determined by Substack post ID)
 *
 * Series intro / deepdive images are mapped under the SERIES_HERO_IMAGES export.
 */

// ============================================
// Devotional slug  ->  image path
// ============================================

export const DEVOTIONAL_IMAGES: Record<string, string> = {
  // ── Too Busy for God (6 days) ────────────────────────────────────────
  'too-busy-for-god-day-1': '/images/devotionals/too-busy-for-god-16.jpeg',
  'too-busy-for-god-day-2': '/images/devotionals/too-busy-for-god-26.jpeg',
  'too-busy-for-god-day-3': '/images/devotionals/too-busy-for-god-36.jpeg',
  'too-busy-for-god-day-4': '/images/devotionals/too-busy-for-god-46.jpeg',
  'too-busy-for-god-day-5': '/images/devotionals/too-busy-for-god-56.jpeg',
  'too-busy-for-god-day-6': '/images/devotionals/too-busy-for-god-66.jpeg',

  // ── Hearing God in the Noise (6 days) ────────────────────────────────
  'hearing-god-in-the-noise-day-1':
    '/images/devotionals/hearing-god-in-the-noise-16.jpeg',
  'hearing-god-in-the-noise-day-2':
    '/images/devotionals/hearing-god-in-the-noise-26.jpeg',
  'hearing-god-in-the-noise-day-3':
    '/images/devotionals/hearing-god-in-the-noise-36.jpeg',
  'hearing-god-in-the-noise-day-4':
    '/images/devotionals/hearing-god-in-the-noise-46.jpeg',
  'hearing-god-in-the-noise-day-5':
    '/images/devotionals/hearing-god-in-the-noise-56.jpeg',
  'hearing-god-in-the-noise-day-6':
    '/images/devotionals/hearing-god-in-the-noise-66.jpeg',

  // ── Abiding in His Presence (6 days) ─────────────────────────────────
  'abiding-in-his-presence-day-1':
    '/images/devotionals/abiding-in-his-presence-16.jpeg',
  'abiding-in-his-presence-day-2':
    '/images/devotionals/abiding-in-his-presence-26.jpeg',
  'abiding-in-his-presence-day-3':
    '/images/devotionals/abiding-in-his-presence-36.jpeg',
  'abiding-in-his-presence-day-4':
    '/images/devotionals/abiding-in-his-presence-46.jpeg',
  'abiding-in-his-presence-day-5':
    '/images/devotionals/abiding-in-his-presence-56.jpeg',
  'abiding-in-his-presence-day-6':
    '/images/devotionals/abiding-in-his-presence-66.jpeg',

  // ── Surrender to God's Will (6 days) ─────────────────────────────────
  'surrender-to-gods-will-day-1':
    '/images/devotionals/surrender-to-gods-will-16.jpeg',
  'surrender-to-gods-will-day-2':
    '/images/devotionals/surrender-to-gods-will-26.jpeg',
  'surrender-to-gods-will-day-3':
    '/images/devotionals/surrender-to-gods-will-36.jpeg',
  'surrender-to-gods-will-day-4':
    '/images/devotionals/surrender-to-gods-will-46.jpeg',
  'surrender-to-gods-will-day-5':
    '/images/devotionals/surrender-to-gods-will-56.jpeg',
  'surrender-to-gods-will-day-6':
    '/images/devotionals/surrender-to-gods-will-66.jpeg',

  // ── In the Beginning, Week 1 (6 days, hash-based names) ──────────────
  // Order determined by Substack post IDs: 174395966 → 174396053
  'in-the-beginning-week-1-day-1':
    '/images/devotionals/in-the-beginning-week-1-the-god-who.jpeg',
  'in-the-beginning-week-1-day-2':
    '/images/devotionals/in-the-beginning-week-1-the-god-who-fac.jpeg',
  'in-the-beginning-week-1-day-3':
    '/images/devotionals/in-the-beginning-week-1-the-god-who-c09.jpeg',
  'in-the-beginning-week-1-day-4':
    '/images/devotionals/in-the-beginning-week-1-the-god-who-1fa.jpeg',
  'in-the-beginning-week-1-day-5':
    '/images/devotionals/in-the-beginning-week-1-the-god-who-b48.jpeg',
  'in-the-beginning-week-1-day-6':
    '/images/devotionals/in-the-beginning-week-1-the-god-who-143.jpeg',

  // ── What is the Gospel? (6 days) ─────────────────────────────────────
  'what-is-the-gospel-day-1':
    '/images/devotionals/what-is-the-gospel-week-18.jpeg',
  'what-is-the-gospel-day-2':
    '/images/devotionals/what-is-the-gospel-day-26-week-28.jpeg',
  'what-is-the-gospel-day-3':
    '/images/devotionals/what-is-the-gospel-day-36-week-18.jpeg',
  'what-is-the-gospel-day-4':
    '/images/devotionals/what-is-the-gospel-day-46-week-18.jpeg',
  'what-is-the-gospel-day-5':
    '/images/devotionals/what-is-the-gospel-day-56-week-18.jpeg',
  'what-is-the-gospel-day-6':
    '/images/devotionals/what-is-the-gospel-day-66-week-18.jpeg',

  // ── Why Jesus? (6 days) ──────────────────────────────────────────────
  'why-jesus-day-1': '/images/devotionals/why-jesus-day-16-week-18.jpeg',
  'why-jesus-day-2': '/images/devotionals/why-jesus-day-26-week-18.jpeg',
  'why-jesus-day-3': '/images/devotionals/why-jesus-day-36-week-18.jpeg',
  'why-jesus-day-4': '/images/devotionals/why-jesus-day-46-week-18.jpeg',
  'why-jesus-day-5': '/images/devotionals/why-jesus-day-56-week-18.jpeg',
  'why-jesus-day-6': '/images/devotionals/why-jesus-day-66-week-18.jpeg',

  // ── What Does It Mean to Believe? (6 images, hash-based names) ───────
  // Order determined by Substack post IDs: 176520613 → 176520634
  // Only day 1 has a devotional JSON currently; mapping all images for future use
  'what-does-it-mean-to-believe-day-1':
    '/images/devotionals/what-does-it-mean-to-believe-day.jpeg',
  'what-does-it-mean-to-believe-day-2':
    '/images/devotionals/what-does-it-mean-to-believe-day-221.jpeg',
  'what-does-it-mean-to-believe-day-3':
    '/images/devotionals/what-does-it-mean-to-believe-day-5d9.jpeg',
  'what-does-it-mean-to-believe-day-4':
    '/images/devotionals/what-does-it-mean-to-believe-day-546.jpeg',
  'what-does-it-mean-to-believe-day-5':
    '/images/devotionals/what-does-it-mean-to-believe-day-400.jpeg',
  'what-does-it-mean-to-believe-day-6':
    '/images/devotionals/what-does-it-mean-to-believe-day-78f.jpeg',

  // ── What Is Carrying a Cross? (6 days) ───────────────────────────────
  'what-is-carrying-a-cross-day-1':
    '/images/devotionals/what-is-carrying-a-cross-day-16-week.jpeg',
  'what-is-carrying-a-cross-day-2':
    '/images/devotionals/what-is-carrying-a-cross-day-26-week.jpeg',
  'what-is-carrying-a-cross-day-3':
    '/images/devotionals/what-is-carrying-a-cross-day-36-week.jpeg',
  'what-is-carrying-a-cross-day-4':
    '/images/devotionals/what-is-carrying-a-cross-day-46-week.jpeg',
  'what-is-carrying-a-cross-day-5':
    '/images/devotionals/what-is-carrying-a-cross-day-56-week.jpeg',
  'what-is-carrying-a-cross-day-6':
    '/images/devotionals/what-is-carrying-a-cross-day-66-week.jpeg',

  // ── Once Saved, Always Saved? (6 days) ───────────────────────────────
  'once-saved-always-saved-day-1':
    '/images/devotionals/once-saved-always-saved-day-16-week.jpeg',
  'once-saved-always-saved-day-2':
    '/images/devotionals/once-saved-always-saved-day-26-week.jpeg',
  'once-saved-always-saved-day-3':
    '/images/devotionals/once-saved-always-saved-day-36-week.jpeg',
  'once-saved-always-saved-day-4':
    '/images/devotionals/once-saved-always-saved-day-46-week.jpeg',
  'once-saved-always-saved-day-5':
    '/images/devotionals/once-saved-always-saved-day-56-week.jpeg',
  'once-saved-always-saved-day-6':
    '/images/devotionals/once-saved-always-saved-day-66-week.jpeg',

  // ── What Happens When You Repeatedly Sin? (6 images, hash-based) ─────
  // Order determined by Substack post IDs: 178122010 → 178122051
  // Only day 1 has a devotional JSON currently
  'what-happens-when-you-repeatedly-sin-day-1':
    '/images/devotionals/what-happens-when-you-repeatedly.jpeg',
  'what-happens-when-you-repeatedly-sin-day-2':
    '/images/devotionals/what-happens-when-you-repeatedly-b38.jpeg',
  'what-happens-when-you-repeatedly-sin-day-3':
    '/images/devotionals/what-happens-when-you-repeatedly-d87.jpeg',
  'what-happens-when-you-repeatedly-sin-day-4':
    '/images/devotionals/what-happens-when-you-repeatedly-02c.jpeg',
  'what-happens-when-you-repeatedly-sin-day-5':
    '/images/devotionals/what-happens-when-you-repeatedly-085.jpeg',
  'what-happens-when-you-repeatedly-sin-day-6':
    '/images/devotionals/what-happens-when-you-repeatedly-a90.jpeg',

  // ── The Nature of Belief (6 days) ────────────────────────────────────
  'the-nature-of-belief-day-1':
    '/images/devotionals/the-nature-of-belief-day-16-week.jpeg',
  'the-nature-of-belief-day-2':
    '/images/devotionals/the-nature-of-belief-day-26-week.jpeg',
  'the-nature-of-belief-day-3':
    '/images/devotionals/the-nature-of-belief-day-36-week.jpeg',
  'the-nature-of-belief-day-4':
    '/images/devotionals/the-nature-of-belief-day-46-week.jpeg',
  'the-nature-of-belief-day-5':
    '/images/devotionals/the-nature-of-belief-day-56-week.jpeg',
  'the-nature-of-belief-day-6':
    '/images/devotionals/the-nature-of-belief-day-66-week.jpeg',

  // ── The Work of God (6 images) ───────────────────────────────────────
  // Only day 1 has a devotional JSON currently
  'the-work-of-god-day-1':
    '/images/devotionals/the-work-of-god-day-16-week-88.jpeg',
  'the-work-of-god-day-2':
    '/images/devotionals/the-work-of-god-day-26-week-88.jpeg',
  'the-work-of-god-day-3':
    '/images/devotionals/the-work-of-god-day-36-week-88.jpeg',
  'the-work-of-god-day-4':
    '/images/devotionals/the-work-of-god-day-46-week-88.jpeg',
  'the-work-of-god-day-5':
    '/images/devotionals/the-work-of-god-day-56-week-88.jpeg',
  'the-work-of-god-day-6':
    '/images/devotionals/the-work-of-god-day-66-week-88.jpeg',

  // ── The Word Before Words (5 days) ───────────────────────────────────
  'the-word-before-words-day-1':
    '/images/devotionals/the-word-before-words-day-15.jpeg',
  'the-word-before-words-day-2':
    '/images/devotionals/the-word-before-words-day-25.jpeg',
  'the-word-before-words-day-3':
    '/images/devotionals/the-word-before-words-day-35.jpeg',
  'the-word-before-words-day-4':
    '/images/devotionals/the-word-before-words-day-45.jpeg',
  'the-word-before-words-day-5':
    '/images/devotionals/the-word-before-words-day-55.jpeg',

  // ── Genesis: Two Stories of Creation (5 days, hash-based) ────────────
  // Order determined by Substack post IDs: 184167577 → 184167600
  'genesis-two-stories-of-creation-day-1':
    '/images/devotionals/genesis-two-stories-of-creation-day.jpeg',
  'genesis-two-stories-of-creation-day-2':
    '/images/devotionals/genesis-two-stories-of-creation-day-340.jpeg',
  'genesis-two-stories-of-creation-day-3':
    '/images/devotionals/genesis-two-stories-of-creation-day-a70.jpeg',
  'genesis-two-stories-of-creation-day-4':
    '/images/devotionals/genesis-two-stories-of-creation-day-a0f.jpeg',
  'genesis-two-stories-of-creation-day-5':
    '/images/devotionals/genesis-two-stories-of-creation-day-f0e.jpeg',

  // ── The Blueprint of Community (5 days) ──────────────────────────────
  'the-blueprint-of-community-day-1':
    '/images/devotionals/the-blueprint-of-community-day-15.jpeg',
  'the-blueprint-of-community-day-2':
    '/images/devotionals/the-blueprint-of-community-day-25.jpeg',
  'the-blueprint-of-community-day-3':
    '/images/devotionals/the-blueprint-of-community-day-35.jpeg',
  'the-blueprint-of-community-day-4':
    '/images/devotionals/the-blueprint-of-community-day-45.jpeg',
  'the-blueprint-of-community-day-5':
    '/images/devotionals/the-blueprint-of-community-day-55.jpeg',

  // ── Signs, Boldness, Opposition & Integrity (6 images, hash-based) ──
  // Order determined by Substack post IDs: 180948921 → 181014532
  // Only day 1 has a devotional JSON currently
  'signs-boldness-opposition-integrity-day-1':
    '/images/devotionals/signs-boldness-opposition-and-integrity.jpeg',
  'signs-boldness-opposition-integrity-day-2':
    '/images/devotionals/signs-boldness-opposition-and-integrity-fe5.jpeg',
  'signs-boldness-opposition-integrity-day-3':
    '/images/devotionals/signs-boldness-opposition-and-integrity-16f.jpeg',
  'signs-boldness-opposition-integrity-day-4':
    '/images/devotionals/signs-boldness-opposition-and-integrity-912.jpeg',
  'signs-boldness-opposition-integrity-day-5':
    '/images/devotionals/signs-boldness-opposition-and-integrity-dda.jpeg',
  'signs-boldness-opposition-integrity-day-6':
    '/images/devotionals/signs-boldness-opposition-and-integrity-0a1.jpeg',

  // ── From Jerusalem to the Nations (1 day) ────────────────────────────
  'from-jerusalem-to-the-nations-day-1':
    '/images/devotionals/from-jerusalem-to-the-nations-servants.jpeg',

  // ── Witness Under Pressure (6 images, hash-based) ────────────────────
  // Order determined by Substack post IDs: 181604844 → 181604879
  // Only day 1 has a devotional JSON currently
  'witness-under-pressure-expansion-day-1':
    '/images/devotionals/witness-under-pressure-and-expansion.jpeg',
  'witness-under-pressure-expansion-day-2':
    '/images/devotionals/witness-under-pressure-and-expansion-e3d.jpeg',
  'witness-under-pressure-expansion-day-3':
    '/images/devotionals/witness-under-pressure-and-expansion-bea.jpeg',
  'witness-under-pressure-expansion-day-4':
    '/images/devotionals/witness-under-pressure-and-expansion-0d9.jpeg',
  'witness-under-pressure-expansion-day-5':
    '/images/devotionals/witness-under-pressure-and-expansion-4cf.jpeg',
  'witness-under-pressure-expansion-day-6':
    '/images/devotionals/witness-under-pressure-and-expansion-8cd.jpeg',
}

// ============================================
// Series intro / deepdive hero images
// ============================================

export const SERIES_HERO_IMAGES: Record<string, string> = {
  'too-busy-for-god': '/images/devotionals/too-busy-for-god.png',
  'the-blueprint-of-community':
    '/images/devotionals/the-blueprint-of-community-deepdive.jpeg',
  'the-word-before-words':
    '/images/devotionals/the-word-before-words-week-1-deep.jpeg',
  'genesis-two-stories-of-creation':
    '/images/devotionals/genesis-two-stories-of-creation-deep.jpeg',
  // These series also have hero images in /images/series/ (referenced in series.ts heroImage)
  'signs-boldness-opposition-integrity':
    '/images/series/signs-boldness-opposition-integrity.jpeg',
  'from-jerusalem-to-the-nations':
    '/images/series/from-jerusalem-to-the-nations.jpeg',
  'witness-under-pressure-expansion':
    '/images/series/witness-under-pressure-expansion.jpeg',
  'what-happens-when-you-repeatedly-sin':
    '/images/series/what-happens-when-you-repeatedly-sin.jpeg',
  'the-work-of-god': '/images/series/the-work-of-god.jpeg',
}

// ============================================
// Helper: get image for a devotional slug
// ============================================

export function getDevotionalImage(slug: string): string | undefined {
  return DEVOTIONAL_IMAGES[slug]
}

// ============================================
// Helper: get hero image for a series slug
// ============================================

export function getSeriesHeroImage(seriesSlug: string): string | undefined {
  return SERIES_HERO_IMAGES[seriesSlug]
}
