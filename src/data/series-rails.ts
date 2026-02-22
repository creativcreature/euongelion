/**
 * Series Rails Configuration
 * Editorially curated theme/mood groupings for the Apple TV-style browse page.
 * Pathways (Sleep/Awake/Shepherd) are INTERNAL — these rails group by FEELING.
 */

export type RailLayout =
  | 'rail'
  | 'grid'
  | 'spotlight-rail'
  | 'centered-row'
  | 'featured-grid'

export interface SeriesRail {
  id: string
  label: string
  subtitle: string
  layout: RailLayout
  slugs: string[]
}

// Featured editorial spotlight (asymmetric grid: 1 large + 2 stacked)
export const FEATURED_SERIES_SLUGS = [
  'identity',
  'too-busy-for-god',
  'why-jesus',
  'hope',
] as const

// Theme/mood rails — editorially curated
export const SERIES_RAILS: SeriesRail[] = [
  {
    id: 'overwhelmed',
    label: "When You're Overwhelmed",
    subtitle: 'Too much, too fast, too loud — and the invitation to stop.',
    layout: 'rail',
    slugs: [
      'too-busy-for-god',
      'hearing-god-in-the-noise',
      'peace',
      'surrender-to-gods-will',
      'abiding-in-his-presence',
      'present-in-the-chaos',
    ],
  },
  {
    id: 'searching',
    label: "When You're Searching",
    subtitle: 'Curious, skeptical, asking the big questions.',
    layout: 'grid',
    slugs: [
      'what-is-the-gospel',
      'why-jesus',
      'what-does-it-mean-to-believe',
      'what-is-christianity',
      'kingdom',
      'the-work-of-god',
    ],
  },
  {
    id: 'hurting',
    label: "When You're Hurting",
    subtitle: 'Grief, guilt, shaken — and the hope that enters darkness.',
    layout: 'rail',
    slugs: [
      'hope',
      'identity',
      'what-happens-when-you-repeatedly-sin',
      'the-nature-of-belief',
      'truth',
      'coming-to-the-end-of-ourselves',
    ],
  },
  {
    id: 'deeper',
    label: 'Going Deeper',
    subtitle: 'Scripture deep-dives for those ready to dig.',
    layout: 'spotlight-rail',
    slugs: [
      'in-the-beginning-week-1',
      'the-word-before-words',
      'genesis-two-stories-of-creation',
      'once-saved-always-saved',
      'what-is-carrying-a-cross',
      'anointed',
      'standing-strong',
    ],
  },
  {
    id: 'people',
    label: 'When You Need Your People',
    subtitle: 'Lonely, called, ready to serve — community and mission.',
    layout: 'rail',
    slugs: [
      'community',
      'the-blueprint-of-community',
      'provision',
      'signs-boldness-opposition-integrity',
      'witness-under-pressure-expansion',
    ],
  },
  {
    id: 'worth',
    label: 'Finding Your Worth',
    subtitle: 'When you question your value, your roots, your purpose.',
    layout: 'centered-row',
    slugs: ['valued', 'rooted', 'identity'],
  },
]

// Wake-Up Originals — branded collection
export const WAKEUP_ORIGINALS_SLUGS = [
  'identity',
  'peace',
  'community',
  'kingdom',
  'provision',
  'truth',
  'hope',
] as const

// Topic filter categories for search panel
export const TOPIC_FILTERS = [
  { value: 'overwhelmed', label: 'Overwhelmed' },
  { value: 'searching', label: 'Searching' },
  { value: 'hurting', label: 'Hurting' },
  { value: 'deeper', label: 'Going Deeper' },
  { value: 'people', label: 'Community' },
  { value: 'worth', label: 'Finding Worth' },
] as const

// Reading time filter categories
export const READING_TIME_FILTERS = [
  { value: 'short', label: 'Quick (5 days)', min: 1, max: 5 },
  { value: 'medium', label: 'Standard (6 days)', min: 6, max: 6 },
  { value: 'long', label: 'Deep (7+ days)', min: 7, max: 99 },
] as const
