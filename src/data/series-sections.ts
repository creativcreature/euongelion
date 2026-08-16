/**
 * Subject sections for the catalog (F-098).
 *
 * Founder 2026-08-16: "you can break these down by subject or something… should
 * feel like a newspaper but like newspaper website with 'sections' and such."
 *
 * A newspaper website is organised by SUBJECT — World, Business, Opinion — not
 * by how the paper was produced. So these sections are what a reading is ABOUT,
 * not which pathway it belongs to. Pathway was deliberately removed from the
 * browse surfaces (SA-050); it does not come back in through the side door.
 *
 * Every section name is a desk you could imagine an editor running. Ordering is
 * editorial, not alphabetical: a reader arriving cold meets BEGINNINGS first,
 * and the sections that presume commitment sit lower.
 *
 * ANY slug not listed here still renders — see `sectionsFor`, which sweeps the
 * remainder into a final section rather than dropping it. A catalog surface
 * that silently omits a reading is worse than an imperfect heading.
 */

export interface SubjectSection {
  /** Section name as it prints — set in caps by CSS, written in sentence case. */
  name: string
  /** One line of standfirst under the section rule. */
  blurb: string
  /** Series slugs, in the order they should print. */
  slugs: string[]
}

export const SUBJECT_SECTIONS: SubjectSection[] = [
  {
    name: 'Beginnings',
    blurb: 'The first questions, asked plainly — for anyone starting here.',
    slugs: [
      'what-is-the-gospel',
      'why-jesus',
      'what-is-christianity',
      'what-does-it-mean-to-believe',
      'truth',
    ],
  },
  {
    name: 'Scripture',
    blurb: 'Books and passages read straight through, in order.',
    slugs: [
      'in-the-beginning-week-1',
      'the-word-before-words',
      'genesis-two-stories-of-creation',
      'signs-boldness-opposition-integrity',
      'witness-under-pressure-expansion',
      'standing-strong',
      'the-nature-of-belief',
      'prayer-of-jabez',
    ],
  },
  {
    name: 'The interior life',
    blurb: 'Prayer, attention, and the practice of staying near.',
    slugs: [
      'abiding-in-his-presence',
      'hearing-god-in-the-noise',
      'too-busy-for-god',
      'present-in-the-chaos',
      'surrender-to-gods-will',
      'he-cannot-deny-himself',
    ],
  },
  {
    name: 'Under pressure',
    blurb: 'For weeks that are heavier than the ones before them.',
    slugs: [
      'peace',
      'hope',
      'looking-at-the-sun',
      'coming-to-the-end-of-ourselves',
      'rooted',
    ],
  },
  {
    name: 'Identity and work',
    blurb: 'Who you are, what you do, and what it pays.',
    slugs: ['identity', 'valued', 'anointed', 'provision', 'kingdom', 'the-work-of-god'],
  },
  {
    name: 'Together',
    blurb: 'Family, church, and the people you are praying for.',
    slugs: ['community', 'the-blueprint-of-community', 'the-harvest'],
  },
  {
    name: 'Hard questions',
    blurb: 'The ones people ask late, and quietly.',
    slugs: [
      'what-happens-when-you-repeatedly-sin',
      'once-saved-always-saved',
      'what-is-carrying-a-cross',
    ],
  },
]

/**
 * Group the given slugs into sections, preserving the caller's ordering within
 * each section and sweeping anything unclassified into a final section.
 *
 * Filtering and search run BEFORE this, so a section with nothing left in it
 * disappears entirely rather than printing an empty heading.
 */
export function sectionsFor(slugs: readonly string[]): SubjectSection[] {
  const remaining = new Set(slugs)
  const out: SubjectSection[] = []

  for (const section of SUBJECT_SECTIONS) {
    const present = section.slugs.filter((s) => remaining.has(s))
    if (present.length === 0) continue
    present.forEach((s) => remaining.delete(s))
    out.push({ ...section, slugs: present })
  }

  // Nothing is dropped. A reading with no desk is still a reading.
  if (remaining.size > 0) {
    out.push({
      name: 'Also in the catalog',
      blurb: 'Everything else currently in print.',
      slugs: slugs.filter((s) => remaining.has(s)),
    })
  }

  return out
}
