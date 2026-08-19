/**
 * The Daily Bread — committed editorial content (F-097/F-098, trimmed by SA-090).
 *
 * WHAT REMAINS HERE: the practices and the reading guides — founder-shipped
 * editorial in our own voice, deterministic by day of year.
 *
 * WHAT LEFT, AND WHERE IT WENT (SA-090, 2026-08-18):
 *   - PANELS (the daily cartoon) — RETIRED. Off-style and off-subject
 *     (a 1940s fedora in a first-century parable). The slot is now The
 *     Ninety-Nine, a drawn strip served from edition_items ('strip').
 *   - WORD_STUDIES — superseded by the lexicon-grounded word generator
 *     (src/lib/edition/generators/word.ts), which draws on the full
 *     Strong's index instead of a 12-item loop.
 *   - PRAYER_FOCUS — superseded by the Daily Prayer: scripture prayed
 *     verbatim, served from edition_items ('prayer'). Founder: "make it a
 *     daily prayer with prayers pulled directly from scripture."
 *   - DISPATCHES / COMMUNITY / PRAYERS — the deliberately-empty reported
 *     sections. Their invention line survives them: reported facts about
 *     real people now enter ONLY through edition_items rows whose kinds
 *     ('screening', 'letter', 'notice') carry source attribution, via the
 *     admin review queue. Nothing publishes unseen.
 *
 * Everything rotates by DAY OF YEAR, never at random, so two readers opening
 * the paper on the same morning read the same edition. That property is what
 * makes it an edition rather than a feed.
 */

/** Pick one item for a given day of the year. Deterministic, never random. */
export function pickForDay<T>(
  items: readonly T[],
  dayOfYear: number,
): T | null {
  if (items.length === 0) return null
  return items[dayOfYear % items.length]
}

/** Pick `count` items starting at the day's offset, wrapping around. */
export function pickManyForDay<T>(
  items: readonly T[],
  dayOfYear: number,
  count: number,
): T[] {
  if (items.length === 0) return []
  const out: T[] = []
  for (let i = 0; i < Math.min(count, items.length); i += 1) {
    out.push(items[(dayOfYear + i) % items.length])
  }
  return out
}

/* ── The Practice ─────────────────────────────────────────────────────── */

export interface Practice {
  /** One instruction. Imperative, concrete, doable today. */
  instruction: string
  /** Why it is worth doing — one sentence, no sermon. */
  reason: string
  /** How long it actually takes. */
  duration: string
}

/**
 * One small thing to do today. Written to be finishable — a practice a reader
 * abandons on day two was too ambitious to print.
 */
export const PRACTICES: Practice[] = [
  {
    instruction:
      'Read the same paragraph three times before deciding what it means.',
    reason:
      'The first read is for gist, the second for detail, the third for what you skipped.',
    duration: '4 minutes',
  },
  {
    instruction: 'Pray one sentence, then stop.',
    reason: 'Silence is not the gap between prayers. It is part of the prayer.',
    duration: '3 minutes',
  },
  {
    instruction:
      'Name three things you were given today before you ask for a fourth.',
    reason: 'Gratitude first changes what you end up asking for.',
    duration: '2 minutes',
  },
  {
    instruction:
      'Put your phone in another room for the length of the reading.',
    reason: 'Attention is the only thing the reading actually requires of you.',
    duration: '10 minutes',
  },
  {
    instruction:
      'Say the Lord’s Prayer slowly enough to mean the line about forgiving.',
    reason: 'It is the only line in it that comes with a condition attached.',
    duration: '2 minutes',
  },
  {
    instruction:
      'Write down the question the passage raised. Do not answer it yet.',
    reason:
      'A question you sit with for a day teaches more than one you close in a minute.',
    duration: '2 minutes',
  },
  {
    instruction: 'Send someone the verse that stuck, with no commentary.',
    reason:
      'Attaching an explanation usually means you are sending it about them.',
    duration: '1 minute',
  },
  {
    instruction: 'Sit still for two minutes before you open anything.',
    reason: 'You cannot hear a text you arrived at out of breath.',
    duration: '2 minutes',
  },
  {
    instruction: 'Read the passage out loud.',
    reason:
      'Your ear catches what your eye smooths over — every one of these was written to be heard.',
    duration: '5 minutes',
  },
  {
    instruction: 'Give away one thing today that you would rather keep.',
    reason:
      'Generosity is a habit of the hands before it is a conviction of the heart.',
    duration: 'Today',
  },
  {
    instruction: 'Pray for someone you are avoiding, by name.',
    reason:
      'It is very difficult to keep resenting someone you are holding up out loud.',
    duration: '3 minutes',
  },
  {
    instruction:
      'Take the long walk instead of the short one, without headphones.',
    reason:
      'Most of what you have been putting off thinking about surfaces in the first ten minutes.',
    duration: '20 minutes',
  },
  {
    instruction: 'Fast from one ordinary thing until sundown.',
    reason:
      'Hunger of any kind is a reliable reminder that you are not self-sustaining.',
    duration: 'Until dusk',
  },
  {
    instruction: 'End the day on the verse you started it with.',
    reason: 'A text you meet twice in one day starts to belong to you.',
    duration: '2 minutes',
  },
]

/* ── How to read — practical guides ───────────────────────────────────── */

export interface Guide {
  /**
   * Stable kebab-case id — the /guides/[slug] route segment. The full essay
   * for each guide lives in src/data/guide-essays.ts, keyed by this slug.
   */
  slug: string
  /** Section kicker: what kind of guide this is. */
  kicker: 'Method' | 'Practice' | 'Tools' | 'Getting started'
  title: string
  standfirst: string
  /** Three or four steps. A guide with nine steps is an essay. */
  steps: string[]
  /**
   * Riso plate, generated for THIS guide's subject.
   *
   * Founder 2026-08-16: "The Daily Bread suffers the same terrible images.
   * They need to be redone with the image prompt i prescribed." These six were
   * regenerated against the locked devo-go preamble
   * (`scripts/imagery/prompt-preamble.md`) — cobalt on cream, Ben-Day dots
   * carrying every tone, no greys, no gold, no glow, no text — replacing the
   * older library posters, which were glowing gold-and-blue scenes from a
   * different era of the brand.
   */
  image: string
  alt: string
  minutes: string
}

/**
 * Practical guides to reading and studying the Bible.
 *
 * Founder: "the site will eventually have practical guides on biblke reading
 * and studying etc too. Today page could lead this effort." These are the
 * first of them, printed in the edition rather than filed in a help centre —
 * which is the point of a paper that teaches.
 *
 * Every plate is picked for what the guide is ABOUT: a scroll for reading a
 * whole book, the Emmaus road for asking who is speaking, the tablets for
 * letting scripture interpret scripture. No arbitrary image use.
 */
export const GUIDES: Guide[] = [
  {
    slug: 'read-a-whole-book',
    kicker: 'Getting started',
    title: 'Read a whole book before you read a single verse',
    standfirst:
      'Every book in the Bible was written to be received in one sitting. Almost nobody reads them that way.',
    steps: [
      'Pick a short one — Philippians, Ruth, Mark, 1 John.',
      'Read it start to finish without stopping to look anything up.',
      'Write one sentence on what the whole thing seemed to be about.',
      'Only then go back for the verse that caught you.',
    ],
    image: '/images/edition/guide-whole-book.webp',
    alt: 'A hand holding an open scroll',
    minutes: '20–40 min',
  },
  {
    slug: 'who-is-speaking',
    kicker: 'Method',
    title: 'Ask who is speaking, and who is being spoken to',
    standfirst:
      'Most misreadings are not theological. They are a promise made to someone else, read as though it were addressed to you.',
    steps: [
      'Name the speaker. Name the audience. Both are usually in the sentence before.',
      'Ask what that audience would have heard — not what you hear.',
      'Ask what has to be true of God for the line to make sense.',
      'Then ask what it asks of you.',
    ],
    image: '/images/edition/guide-who-speaks.webp',
    alt: 'Two travellers on a road, joined by a stranger',
    minutes: '10 min',
  },
  {
    slug: 'scripture-interprets-scripture',
    kicker: 'Method',
    title: 'Let scripture interpret scripture',
    standfirst:
      'The oldest study tool there is: when a passage is dark, go and find the place it is quoting.',
    steps: [
      'Follow the cross-references in your margin — they are there for this.',
      'When the New Testament quotes the Old, read the whole original paragraph.',
      'Notice what changed in the quoting. That is usually the argument.',
      'Prefer the clear passage over the obscure one when they seem to disagree.',
    ],
    image: '/images/edition/guide-scripture-interprets.webp',
    alt: 'Two stone tablets',
    minutes: '15 min',
  },
  {
    slug: 'lectio-divina',
    kicker: 'Practice',
    title: 'Lectio divina, in four passes',
    standfirst:
      'A monastic reading pattern that is fifteen centuries old and takes about eight minutes.',
    steps: [
      'Read: hear it once, slowly, all the way through.',
      'Reflect: read again, and stop on the word that snags.',
      'Respond: say back to God whatever that word raised.',
      'Rest: stop reading. Stay a minute longer than is comfortable.',
    ],
    image: '/images/edition/guide-lectio.webp',
    alt: 'A hand holding a lamp aloft',
    minutes: '8 min',
  },
  {
    slug: 'word-roots',
    kicker: 'Tools',
    title: 'Take one word down to its root',
    standfirst:
      'You do not need Greek. You need a concordance and the patience to follow one word around.',
    steps: [
      'Pick a word that is carrying weight — grace, remember, wait.',
      'Look up every place the same original word appears.',
      'Read three of those passages in full.',
      'Come back to your verse. It will have thickened.',
    ],
    image: '/images/edition/guide-word-root.webp',
    alt: 'A mustard seed held in an open palm',
    minutes: '20 min',
  },
  {
    slug: 'read-together',
    kicker: 'Practice',
    title: 'Read it with one other person',
    standfirst:
      'These texts were formed in company and read aloud in rooms. Reading alone is the modern exception.',
    steps: [
      'Find one person. Two is a study; three is a schedule.',
      'Read the same passage separately, before you meet.',
      'Each say the one thing you noticed and the one thing you did not follow.',
      'Leave the unresolved thing unresolved. Come back to it.',
    ],
    image: '/images/edition/guide-together.webp',
    alt: 'Two hands breaking bread',
    minutes: '30 min',
  },
]
