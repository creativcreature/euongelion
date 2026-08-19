/**
 * The masthead's authors (SA-089 follow-on).
 *
 * Two names sign every reading, and each gets a page: Milo, the house
 * pseudonym for the AI-assisted composition process, and James Parker, the
 * editor. Historic voices (Augustine, Spurgeon, …) are QUOTED sources, not
 * authors — they are listed on /how-we-write and deliberately absent here.
 *
 * PORTRAITS: no photographs of either exist and none may be fabricated.
 * Each entry carries an author MARK instead — a plate from the audited print
 * archive (docs/print-audit-2026-08-18.json, verdict=clean only), captioned
 * so it never claims to be a likeness. Real photographs await the founder.
 */

export interface AuthorAppearance {
  /** Where on the site this author's words appear. */
  label: string
  description: string
  href: string
}

export interface AuthorMark {
  /** Path under public/, servable as-is. Must be an audit-clean print. */
  image: string
  /** Alt text — always says "author mark", never implies a likeness. */
  alt: string
  /** One line on what the plate shows and why it stands for this author. */
  note: string
}

export interface Author {
  slug: string
  name: string
  role: string
  /** One sentence for metadata and cards. */
  summary: string
  /** The bio, paragraph by paragraph. 120–200 words total, honest. */
  bio: readonly string[]
  mark: AuthorMark
  appearances: readonly AuthorAppearance[]
}

export const AUTHORS: readonly Author[] = [
  {
    slug: 'milo',
    name: 'Milo',
    role: 'Writer',
    summary:
      'The house pseudonym for the AI-assisted composition process behind ' +
      'the readings — arranged and reviewed by human editors.',
    bio: [
      'Milo is not a person. It is the house pseudonym for the way ' +
        'Euangelion’s readings are composed: a synthesis of AI tools ' +
        'that assembles each devotional from verbatim Scripture, the ' +
        'church’s historic voices, and the reference library — ' +
        'arranging, sequencing, and bridging material that already exists ' +
        'rather than inventing it. Every reading that carries the byline ' +
        'was produced by that process and then read, shaped, and verified ' +
        'by human editors before it printed.',
      'The name exists so the credit can be honest in both directions. ' +
        'Signing these readings with a human author’s name would be ' +
        'false, because no human wrote the prose. Leaving them unsigned ' +
        'would be false too, as if devotionals simply appeared. So the work ' +
        'is signed the way a publishing house signs the work of its ' +
        'composing room — with a house name that says exactly what ' +
        'stands behind it. When a page reads “Written by Milo,” ' +
        'read it as a disclosure, not a disguise.',
    ],
    // Wright of Derby's orrery lecture: an instrument arranged around a lamp
    // standing in for the sun — an apt mark for a pseudonym that arranges
    // light it does not produce. Audit-clean (print-audit-2026-08-18).
    mark: {
      image: '/images/devotional-prints/wright-philosopher-orrery.webp',
      alt: 'Author mark for Milo — a lamp-lit orrery, after Wright of Derby',
      note: 'A lamp-lit orrery, after Wright of Derby — an instrument arranged around a light it does not produce.',
    },
    appearances: [
      {
        label: 'The devotional catalog',
        description:
          'Every series in the catalog — each reading carries the Milo byline.',
        href: '/series',
      },
      {
        label: 'The Daily Bread and its Sunday features',
        description:
          'The daily paper’s readings, including the net-new Sunday lead.',
        href: '/daily-bread',
      },
    ],
  },
  {
    slug: 'james-parker',
    name: 'James Parker',
    role: 'Editor',
    summary:
      'The editor of Euangelion — selects, shapes, verifies, and ' +
      'carries final responsibility for what prints.',
    bio: [
      'James Parker is Euangelion’s editor, and the editor’s ' +
        'chair is deliberately where he stays. He does not take the writing ' +
        'credit — by his own ruling — so that he can come to each ' +
        'reading and discover it the way a reader does. What he does take ' +
        'is responsibility for everything the byline sits above.',
      'The editing here is the classical kind: selecting what enters the ' +
        'catalog, shaping what the composing process produces, verifying ' +
        'that Scripture is quoted verbatim and that historic voices say ' +
        'only what they actually said, and passing the verdicts in the ' +
        'review queue that decide what The Daily Bread may print. Every ' +
        'reading on the site closes with “Edited by James ' +
        'Parker” because every reading passed through that edit. If ' +
        'something on Euangelion is wrong — a false attribution, a ' +
        'careless claim, a word out of place — responsibility for it ' +
        'ends at this desk, not at the pseudonym.',
    ],
    // Rembrandt's Titus reading: a reader bent over open pages — the edit is
    // reading everything before it prints. Audit-clean
    // (print-audit-2026-08-18: "blank-paged book, no lettering").
    mark: {
      image: '/images/devotional-prints/rembrandt-titus-reading.webp',
      alt: 'Author mark for James Parker — a reader over open pages, after Rembrandt',
      note: 'A reader over open pages, after Rembrandt — the edit is reading everything before it prints.',
    },
    appearances: [
      {
        label: 'Every reading’s edit',
        description:
          'Each reading closes “Edited by James Parker” — the selection, shaping, and verification behind it.',
        href: '/how-we-write',
      },
      {
        label: 'The review queue’s verdicts',
        description:
          'Drafted sections of The Daily Bread publish only after a verdict in the review queue.',
        href: '/how-we-write',
      },
    ],
  },
]

export const AUTHOR_SLUGS: readonly string[] = AUTHORS.map((a) => a.slug)

export function getAuthor(slug: string): Author | undefined {
  return AUTHORS.find((a) => a.slug === slug)
}

/**
 * Match a rendered byline name ("Milo", "James Parker") to its author page.
 * Exact trimmed match only — an overridden byline for a work that genuinely
 * differs must NOT be linked to a page about someone else.
 */
export function findAuthorByName(name: string): Author | undefined {
  const wanted = name.trim()
  return AUTHORS.find((a) => a.name === wanted)
}
