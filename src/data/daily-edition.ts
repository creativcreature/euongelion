/**
 * The Daily Edition's editorial sections (F-097).
 *
 * Founder 2026-08-16: "/today … I want it to be like a literally daily edition
 * of a newspaper, and to be structured the same way- include more information
 * here- not just a devotional, but like this is a place where people can come
 * for daily content- this can pull in stories of christ around the globe,
 * showcase community efforts, prayer lists etc."
 *
 * WHY THIS FILE IS EMPTY AND STAYS EMPTY UNTIL SOMEONE FILLS IT.
 *
 * The devotional, the scripture, the liturgical day and the archive all come
 * from real data already in the repo. These three sections do not: there is no
 * feed of global reports, no community submissions table, and no prayer
 * database. Inventing a plausible dispatch from Nigeria or a fictional prayer
 * request would be the worst thing this product could do — it publishes as
 * fact, under a masthead, in a devotional context.
 *
 * So the sections are declared, typed, and rendered ONLY when they carry real
 * entries. An empty section does not render at all — no placeholder card, no
 * "coming soon", no ghost. The page is complete without them and grows when
 * they are filled.
 *
 * Each entry carries a `source` because a dispatch without attribution is a
 * rumour. `date` is ISO so the edition can show what is current.
 */

export interface Dispatch {
  /** Headline, sentence case, no trailing period. */
  title: string
  /** Where it happened — "Kano, Nigeria". */
  place: string
  /** Two or three sentences. Reported, not editorialised. */
  body: string
  /** Publication or organisation this is reported from. Required. */
  source: string
  /** Link to the source report, if there is a public one. */
  href?: string
  /** ISO date of the report. */
  date: string
}

export interface CommunityEffort {
  title: string
  place: string
  body: string
  /** Who is doing it — a church, a mission, a named group. */
  by: string
  href?: string
  date: string
}

export interface PrayerRequest {
  /** What is being asked for, in the asker's own framing where possible. */
  request: string
  /** "A reader in Leeds", "The church in Aleppo" — never a full private name. */
  from: string
  date: string
}

/** Reported stories of Christ at work beyond this masthead. */
export const DISPATCHES: Dispatch[] = []

/** Efforts readers can join, give to, or pray for. */
export const COMMUNITY: CommunityEffort[] = []

/** The standing prayer list. */
export const PRAYERS: PrayerRequest[] = []

/** True when the edition has any editorial section to show. */
export function hasEditorialSections(): boolean {
  return DISPATCHES.length > 0 || COMMUNITY.length > 0 || PRAYERS.length > 0
}

/* ══════════════════════════════════════════════════════════════════════
   OUR OWN EDITORIAL (F-098)

   Founder 2026-08-16: "The today page needs more content, you will have to
   invent stuff that makes sense and would be relevant… the site will
   eventually have practical guides on biblke reading and studying etc too.
   Today page could lead this effort. Could use a daily cartoon etc."

   THE LINE THIS FILE HOLDS. Everything below is invented, and everything
   below is ours to invent: practices we are asking readers to try, guides we
   are teaching, captions written for our own illustrations, categories of
   intercession, and word studies at standard lexical meaning. All honest,
   because all of it is us speaking in our own voice.

   What stays uninvented is reported fact — the sections above. A dispatch
   saying a church in Kano did a thing, or a prayer request from a named
   reader, is a claim about real people with no source behind it. We invent
   our own voice; never other people's facts.

   Everything rotates by DAY OF YEAR, never at random, so two readers opening
   the paper on the same morning read the same edition. That property is what
   makes it an edition rather than a feed.
   ══════════════════════════════════════════════════════════════════════ */

/** Pick one item for a given day of the year. Deterministic, never random. */
export function pickForDay<T>(items: readonly T[], dayOfYear: number): T | null {
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
    instruction: 'Read the same paragraph three times before deciding what it means.',
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
    instruction: 'Name three things you were given today before you ask for a fourth.',
    reason: 'Gratitude first changes what you end up asking for.',
    duration: '2 minutes',
  },
  {
    instruction: 'Put your phone in another room for the length of the reading.',
    reason: 'Attention is the only thing the reading actually requires of you.',
    duration: '10 minutes',
  },
  {
    instruction: 'Say the Lord’s Prayer slowly enough to mean the line about forgiving.',
    reason: 'It is the only line in it that comes with a condition attached.',
    duration: '2 minutes',
  },
  {
    instruction: 'Write down the question the passage raised. Do not answer it yet.',
    reason:
      'A question you sit with for a day teaches more than one you close in a minute.',
    duration: '2 minutes',
  },
  {
    instruction: 'Send someone the verse that stuck, with no commentary.',
    reason: 'Attaching an explanation usually means you are sending it about them.',
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
    reason: 'Generosity is a habit of the hands before it is a conviction of the heart.',
    duration: 'Today',
  },
  {
    instruction: 'Pray for someone you are avoiding, by name.',
    reason:
      'It is very difficult to keep resenting someone you are holding up out loud.',
    duration: '3 minutes',
  },
  {
    instruction: 'Take the long walk instead of the short one, without headphones.',
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
  /** Section kicker: what kind of guide this is. */
  kicker: 'Method' | 'Practice' | 'Tools' | 'Getting started'
  title: string
  standfirst: string
  /** Three or four steps. A guide with nine steps is an essay. */
  steps: string[]
  /**
   * Riso plate, chosen for the guide's subject. These are webp derivatives of
   * `public/images/library/poster/*.png` — the originals are 1-2 MB each and
   * `next.config` sets `images.unoptimized`, so the raw PNG would ship to the
   * browser as-is. 25.1 MB of plates became 2.26 MB.
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
    image: '/images/edition/frag-holding-scroll.webp',
    alt: 'A hand holding an open scroll',
    minutes: '20–40 min',
  },
  {
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
    image: '/images/edition/nt-emmaus-road-stranger.webp',
    alt: 'Two travellers on a road, joined by a stranger',
    minutes: '10 min',
  },
  {
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
    image: '/images/edition/ot-stone-tablets-tablets.webp',
    alt: 'Two stone tablets',
    minutes: '15 min',
  },
  {
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
    image: '/images/edition/frag-holding-lamp-aloft.webp',
    alt: 'A hand holding a lamp aloft',
    minutes: '8 min',
  },
  {
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
    image: '/images/edition/par-mustard-seed-palm.webp',
    alt: 'A mustard seed held in an open palm',
    minutes: '20 min',
  },
  {
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
    image: '/images/edition/frag-breaking-bread-hands.webp',
    alt: 'Two hands breaking bread',
    minutes: '30 min',
  },
]

/* ── The daily panel ──────────────────────────────────────────────────── */

export interface Panel {
  title: string
  /** A single dry line, doing the work a cartoon caption does. */
  caption: string
  image: string
  alt: string
  reference: string
}

/**
 * The daily panel — this paper's single-panel cartoon slot.
 *
 * Founder: "Could use a daily cartoon etc. be creative for this page." A gag
 * strip would be the wrong register for this masthead, so the panel is what a
 * good editorial cartoon actually is: one image and one dry line that makes
 * you look at the image again. The plates are our own riso illustrations of
 * the parables; the captions are written for them.
 */
export const PANELS: Panel[] = [
  {
    title: 'The Persistent Widow',
    caption: 'She did not have a case. She had a calendar.',
    image: '/images/edition/par-persistent-widow.webp',
    alt: 'A widow standing before a seated judge',
    reference: 'Luke 18:1–8',
  },
  {
    title: 'The Tower Builder',
    caption: 'Everyone turns up for the groundbreaking.',
    image: '/images/edition/par-tower-builder-cost.webp',
    alt: 'An unfinished tower on a hillside',
    reference: 'Luke 14:28–30',
  },
  {
    title: 'The Talents',
    caption: 'The third man had a flawless plan. That was the problem.',
    image: '/images/edition/par-talents-three-bags.webp',
    alt: 'Three bags of coin',
    reference: 'Matthew 25:14–30',
  },
  {
    title: 'Two Roads',
    caption: 'One of them has considerably better signage.',
    image: '/images/edition/par-narrow-gate-broad-road.webp',
    alt: 'A narrow gate beside a broad road',
    reference: 'Matthew 7:13–14',
  },
  {
    title: 'The Lost Coin',
    caption: 'Nine were perfectly safe. She swept anyway.',
    image: '/images/edition/par-lost-coin-lamp.webp',
    alt: 'A woman sweeping a floor by lamplight',
    reference: 'Luke 15:8–10',
  },
  {
    title: 'The Far Country',
    caption: 'He had rehearsed a speech. He never got to finish it.',
    image: '/images/edition/par-prodigal-pigs.webp',
    alt: 'A young man among pigs',
    reference: 'Luke 15:11–24',
  },
  {
    title: 'The Mustard Seed',
    caption: 'Nobody plants this expecting shade.',
    image: '/images/edition/par-mustard-tree-birds.webp',
    alt: 'Birds nesting in the branches of a mustard tree',
    reference: 'Mark 4:30–32',
  },
  {
    title: 'The Wedding Feast',
    caption: 'The invitations went out twice. The second list came.',
    image: '/images/edition/par-wedding-feast-poor.webp',
    alt: 'A banquet table filling with unexpected guests',
    reference: 'Luke 14:15–24',
  },
  {
    title: 'The Lost Sheep',
    caption: 'Ninety-nine is a very good number. It was not the number.',
    image: '/images/edition/par-lost-sheep-shoulders.webp',
    alt: 'A shepherd carrying a sheep across his shoulders',
    reference: 'Luke 15:3–7',
  },
  {
    title: 'The Two Builders',
    caption: 'Both houses looked finished.',
    image: '/images/edition/par-builders-rock-sand.webp',
    alt: 'Two houses, one built on rock and one on sand',
    reference: 'Matthew 7:24–27',
  },
]

/* ── Word study ───────────────────────────────────────────────────────── */

export interface WordStudy {
  /** The word in its own script. */
  word: string
  translit: string
  language: 'Greek' | 'Hebrew'
  /** The gloss as a lexicon gives it. */
  gloss: string
  /** What the English usually flattens. */
  note: string
  reference: string
}

/**
 * A word a day, in the language it was written in.
 *
 * Standard lexical meaning only — this is the least speculative section in the
 * paper and it stays that way. No etymological flourishes, no "the Greek
 * really means" claims a lexicon would not support.
 */
export const WORD_STUDIES: WordStudy[] = [
  {
    word: 'εὐαγγέλιον',
    translit: 'euangelion',
    language: 'Greek',
    gloss: 'good news; the announcement of a victory',
    note: 'Not a religious genre before the Gospels borrowed it — it was the word for the news a herald carried back from a battle.',
    reference: 'Mark 1:1',
  },
  {
    word: 'חֶסֶד',
    translit: 'chesed',
    language: 'Hebrew',
    gloss: 'steadfast love; covenant loyalty',
    note: 'English needs two words for it: the warmth of love and the doggedness of loyalty. Hebrew uses one.',
    reference: 'Psalm 136',
  },
  {
    word: 'σπλαγχνίζομαι',
    translit: 'splanchnizomai',
    language: 'Greek',
    gloss: 'to be moved with compassion',
    note: 'Built on the word for the inner organs. "Compassion" is decorous; the Greek is visceral.',
    reference: 'Mark 6:34',
  },
  {
    word: 'שָׁלוֹם',
    translit: 'shalom',
    language: 'Hebrew',
    gloss: 'peace; wholeness, completeness, welfare',
    note: 'Wider than the absence of conflict. Closer to nothing missing and nothing broken.',
    reference: 'Numbers 6:26',
  },
  {
    word: 'μετάνοια',
    translit: 'metanoia',
    language: 'Greek',
    gloss: 'a change of mind; a turning',
    note: 'The weight falls on the turn, not the remorse. You can be very sorry and never change direction.',
    reference: 'Mark 1:15',
  },
  {
    word: 'הֶבֶל',
    translit: 'hevel',
    language: 'Hebrew',
    gloss: 'vapour, breath; fleeting',
    note: 'Usually printed as "meaningless" or "vanity". The image is closer to steam — real, and gone.',
    reference: 'Ecclesiastes 1:2',
  },
  {
    word: 'κοινωνία',
    translit: 'koinonia',
    language: 'Greek',
    gloss: 'fellowship; sharing in common, participation',
    note: 'Used of business partnerships and shared money long before it was used of a church service.',
    reference: 'Acts 2:42',
  },
  {
    word: 'רוּחַ',
    translit: 'ruach',
    language: 'Hebrew',
    gloss: 'breath; wind; spirit',
    note: 'One word does all three jobs, which is why the wind over the waters and the breath in a body rhyme.',
    reference: 'Genesis 1:2',
  },
  {
    word: 'χάρις',
    translit: 'charis',
    language: 'Greek',
    gloss: 'grace; favour freely given',
    note: 'In ordinary Greek, the word for a gift given without expectation of return — and for the thanks owed back.',
    reference: 'Ephesians 2:8',
  },
  {
    word: 'יָדַע',
    translit: 'yada',
    language: 'Hebrew',
    gloss: 'to know — by experience rather than by information',
    note: 'Used of knowing a fact, knowing a person, and knowing a craft. The knowing that comes of being near.',
    reference: 'Psalm 46:10',
  },
  {
    word: 'μακάριος',
    translit: 'makarios',
    language: 'Greek',
    gloss: 'blessed; fortunate, to be congratulated',
    note: 'Less a benediction than an observation: this is the person who is actually doing well.',
    reference: 'Matthew 5:3',
  },
  {
    word: 'נָחַם',
    translit: 'nacham',
    language: 'Hebrew',
    gloss: 'to comfort; to relent',
    note: 'The same root carries comfort and change of course, which is most of a theology in one verb.',
    reference: 'Isaiah 40:1',
  },
]

/* ── The prayer list ──────────────────────────────────────────────────── */

export interface PrayerFocus {
  /** Weekday index, 0 = Sunday. */
  weekday: number
  focus: string
  /** Three things to actually pray. Concrete, not abstract. */
  petitions: string[]
}

/**
 * A standing prayer list, one focus per weekday.
 *
 * Deliberately NOT a feed of submitted requests — see the note at the top of
 * this file. This is the pattern of intercession the Church has always kept:
 * categories of need that are true every week in every place, without anyone
 * having to file a report. Nothing here claims a fact about a named person.
 */
export const PRAYER_FOCUS: PrayerFocus[] = [
  {
    weekday: 0,
    focus: 'The Church gathered',
    petitions: [
      'For every congregation meeting today, in cathedrals and in living rooms.',
      'For those preaching, that they would say the true thing rather than the impressive one.',
      'For anyone walking in alone this morning.',
    ],
  },
  {
    weekday: 1,
    focus: 'Work',
    petitions: [
      'For people starting a week they have been dreading since Friday.',
      'For those out of work, and those afraid of losing it.',
      'For honest dealing where no one would notice dishonesty.',
    ],
  },
  {
    weekday: 2,
    focus: 'The sick',
    petitions: [
      'For those in hospital tonight, and for the ones sitting up beside them.',
      'For carers who are past the end of their strength.',
      'For pain that no scan has ever shown.',
    ],
  },
  {
    weekday: 3,
    focus: 'The persecuted church',
    petitions: [
      'For Christians who will meet in secret this week.',
      'For their children, carrying what they cannot explain at school.',
      'For their neighbours — and for courage that does not curdle into hatred.',
    ],
  },
  {
    weekday: 4,
    focus: 'Families',
    petitions: [
      'For parents at the end of themselves.',
      'For the estranged, on both sides of it.',
      'For anyone praying for someone who has walked away.',
    ],
  },
  {
    weekday: 5,
    focus: 'The poor and the displaced',
    petitions: [
      'For those who will go hungry today in wealthy countries.',
      'For refugees, and for the places deciding whether to receive them.',
      'For everyone who will sleep outside tonight.',
    ],
  },
  {
    weekday: 6,
    focus: 'Rest',
    petitions: [
      'For the exhausted, that they would actually stop.',
      'For those who cannot stop, because stopping costs money they do not have.',
      'For a good sabbath, and the nerve to keep it.',
    ],
  },
]

/** The prayer focus for a given weekday (0 = Sunday). */
export function prayerFocusFor(weekday: number): PrayerFocus {
  return PRAYER_FOCUS[weekday % 7]
}
