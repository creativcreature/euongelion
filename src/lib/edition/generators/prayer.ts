/**
 * The Daily Bread — the Daily Prayer generator (SA-090 / F-136).
 *
 * Founder decision 7: the old rotating "prayer focus" list is replaced by a
 * prayer pulled directly from scripture and printed in full. Nothing here is
 * written by us. The generator selects a reference from the canon below and
 * reads the text out of the committed BSB corpus.
 *
 * THE CANON RULE: every entry is scripture that *prays, or blesses God*. That
 * is wider than second-person address, and deliberately so — it admits two
 * things the church has always prayed as its own words even though the text
 * reports them rather than addresses them:
 *
 *   1. Paul's reported intercessions — Ephesians 1:17-23, Ephesians 3:14-21,
 *      Philippians 1:9-11, Colossians 1:9-14. Paul tells a church what he asks
 *      God for it; the church has prayed those petitions back ever since.
 *   2. The benedictions and doxologies — the Benedictus (Luke 1:68-79) opens
 *      "Blessed be the Lord, the God of Israel", which is blessing God, not
 *      petition, and it is a canticle of the daily office.
 *
 * What the rule still excludes is scripture *about* God addressed to people:
 * psalms that are pure testimony to a congregation (100, 103, 121, 136, 150),
 * historical recitals (78, 105, 107), oracles (2, 110), and songs addressed to
 * a human king (45) are all deliberately absent. If a reference in this list
 * does not resolve, that is a bug in the canon and the generator throws — it
 * never catches-and-skips (Development Rule 1).
 *
 * THE PRINTED REFERENCE IS THIS FILE'S STRING, not `getVerse`'s `canonical`.
 * The corpus names the book "Psalms", so `canonical` renders "Psalms 141" —
 * plural, which is how you cite the book and never how you cite a single
 * psalm. 90 of the 146 entries here are psalms, so trusting `canonical` was
 * wrong on 62% of days. `getVerse` still supplies the TEXT; the reference is
 * ours. The tests assert the singular.
 *
 * DETERMINISM: selection is `UTC day-of-year % canon length`. Two readers on
 * the same morning get the same prayer. The TRUE invariant is: no prayer
 * repeats within any 146-day stretch inside a year, so each prayer prints
 * two or three times a year. The 30-day no-repeat acceptance also survives
 * the 1 January index reset: the jump lands at index 1 while the preceding
 * 29 days sit at indexes ≥ (365 % 146) − 28 = 45, so the ranges cannot
 * overlap for any canon of at least 103 entries — proven in the test.
 */
import { getVerse } from '@/lib/bible/getVerse'
import type { EditionItem, PrayerPayload } from '../kinds'

/** One prayer of scripture: where it is, and whose mouth it is in. */
export interface ScripturePrayer {
  /** A reference `parseReference` understands. */
  reference: string
  /** Who prays it, read off the text or its superscription. */
  prayedBy: string
}

/**
 * The canon. Psalm attributions come from the superscriptions (verified
 * against the WEB corpus, which prints them); untitled psalms are credited to
 * "The psalmist" rather than guessed at.
 */
export const PRAYER_CANON: readonly ScripturePrayer[] = [
  // ── The Psalter ──────────────────────────────────────────────────────
  { reference: 'Psalm 3', prayedBy: 'David' },
  { reference: 'Psalm 4', prayedBy: 'David' },
  { reference: 'Psalm 5', prayedBy: 'David' },
  { reference: 'Psalm 6', prayedBy: 'David' },
  { reference: 'Psalm 7', prayedBy: 'David' },
  { reference: 'Psalm 8', prayedBy: 'David' },
  { reference: 'Psalm 9', prayedBy: 'David' },
  { reference: 'Psalm 10', prayedBy: 'The psalmist' },
  { reference: 'Psalm 12', prayedBy: 'David' },
  { reference: 'Psalm 13', prayedBy: 'David' },
  { reference: 'Psalm 16', prayedBy: 'David' },
  { reference: 'Psalm 17', prayedBy: 'David' },
  { reference: 'Psalm 19', prayedBy: 'David' },
  { reference: 'Psalm 21', prayedBy: 'David' },
  { reference: 'Psalm 22:1-21', prayedBy: 'David' },
  { reference: 'Psalm 23', prayedBy: 'David' },
  { reference: 'Psalm 25', prayedBy: 'David' },
  { reference: 'Psalm 26', prayedBy: 'David' },
  { reference: 'Psalm 27', prayedBy: 'David' },
  { reference: 'Psalm 28', prayedBy: 'David' },
  { reference: 'Psalm 30', prayedBy: 'David' },
  { reference: 'Psalm 31', prayedBy: 'David' },
  { reference: 'Psalm 32', prayedBy: 'David' },
  { reference: 'Psalm 35', prayedBy: 'David' },
  { reference: 'Psalm 36', prayedBy: 'David' },
  { reference: 'Psalm 38', prayedBy: 'David' },
  { reference: 'Psalm 39', prayedBy: 'David' },
  { reference: 'Psalm 40', prayedBy: 'David' },
  { reference: 'Psalm 41', prayedBy: 'David' },
  { reference: 'Psalm 42', prayedBy: 'The sons of Korah' },
  { reference: 'Psalm 43', prayedBy: 'The psalmist' },
  { reference: 'Psalm 44', prayedBy: 'The sons of Korah' },
  { reference: 'Psalm 51', prayedBy: 'David' },
  { reference: 'Psalm 54', prayedBy: 'David' },
  { reference: 'Psalm 55', prayedBy: 'David' },
  { reference: 'Psalm 56', prayedBy: 'David' },
  { reference: 'Psalm 57', prayedBy: 'David' },
  { reference: 'Psalm 59', prayedBy: 'David' },
  { reference: 'Psalm 60', prayedBy: 'David' },
  { reference: 'Psalm 61', prayedBy: 'David' },
  { reference: 'Psalm 62', prayedBy: 'David' },
  { reference: 'Psalm 63', prayedBy: 'David' },
  { reference: 'Psalm 65', prayedBy: 'David' },
  { reference: 'Psalm 66', prayedBy: 'The psalmist' },
  { reference: 'Psalm 67', prayedBy: 'The psalmist' },
  { reference: 'Psalm 69', prayedBy: 'David' },
  { reference: 'Psalm 70', prayedBy: 'David' },
  { reference: 'Psalm 71', prayedBy: 'The psalmist' },
  { reference: 'Psalm 72', prayedBy: 'Solomon' },
  { reference: 'Psalm 73:21-28', prayedBy: 'Asaph' },
  { reference: 'Psalm 74', prayedBy: 'Asaph' },
  { reference: 'Psalm 77', prayedBy: 'Asaph' },
  { reference: 'Psalm 79', prayedBy: 'Asaph' },
  { reference: 'Psalm 80', prayedBy: 'Asaph' },
  { reference: 'Psalm 83', prayedBy: 'Asaph' },
  { reference: 'Psalm 84', prayedBy: 'The sons of Korah' },
  { reference: 'Psalm 85', prayedBy: 'The sons of Korah' },
  { reference: 'Psalm 86', prayedBy: 'David' },
  { reference: 'Psalm 88', prayedBy: 'Heman the Ezrahite' },
  { reference: 'Psalm 89:46-52', prayedBy: 'Ethan the Ezrahite' },
  { reference: 'Psalm 90', prayedBy: 'Moses' },
  { reference: 'Psalm 92', prayedBy: 'The psalmist' },
  { reference: 'Psalm 93', prayedBy: 'The psalmist' },
  { reference: 'Psalm 94', prayedBy: 'The psalmist' },
  { reference: 'Psalm 101', prayedBy: 'David' },
  { reference: 'Psalm 102', prayedBy: 'The afflicted' },
  { reference: 'Psalm 104:1-24', prayedBy: 'The psalmist' },
  { reference: 'Psalm 108', prayedBy: 'David' },
  { reference: 'Psalm 109', prayedBy: 'David' },
  { reference: 'Psalm 115', prayedBy: 'The psalmist' },
  { reference: 'Psalm 116', prayedBy: 'The psalmist' },
  { reference: 'Psalm 118:19-29', prayedBy: 'The psalmist' },
  { reference: 'Psalm 119:33-40', prayedBy: 'The psalmist' },
  { reference: 'Psalm 119:41-48', prayedBy: 'The psalmist' },
  { reference: 'Psalm 119:73-80', prayedBy: 'The psalmist' },
  { reference: 'Psalm 119:105-112', prayedBy: 'The psalmist' },
  { reference: 'Psalm 119:145-152', prayedBy: 'The psalmist' },
  { reference: 'Psalm 119:169-176', prayedBy: 'The psalmist' },
  { reference: 'Psalm 123', prayedBy: 'The psalmist' },
  { reference: 'Psalm 130', prayedBy: 'The psalmist' },
  { reference: 'Psalm 131:1-2', prayedBy: 'David' },
  { reference: 'Psalm 132:1-10', prayedBy: 'The psalmist' },
  { reference: 'Psalm 138', prayedBy: 'David' },
  { reference: 'Psalm 139', prayedBy: 'David' },
  { reference: 'Psalm 140', prayedBy: 'David' },
  { reference: 'Psalm 141', prayedBy: 'David' },
  { reference: 'Psalm 142', prayedBy: 'David' },
  { reference: 'Psalm 143', prayedBy: 'David' },
  { reference: 'Psalm 144', prayedBy: 'David' },
  { reference: 'Psalm 145', prayedBy: 'David' },

  // ── Law and history ──────────────────────────────────────────────────
  { reference: 'Genesis 18:23-32', prayedBy: 'Abraham' },
  { reference: 'Genesis 24:12-14', prayedBy: "Abraham's servant" },
  { reference: 'Genesis 32:9-12', prayedBy: 'Jacob' },
  { reference: 'Exodus 15:1-13', prayedBy: 'Moses and the Israelites' },
  { reference: 'Exodus 32:11-13', prayedBy: 'Moses' },
  { reference: 'Exodus 33:12-18', prayedBy: 'Moses' },
  { reference: 'Numbers 14:13-19', prayedBy: 'Moses' },
  { reference: 'Deuteronomy 3:23-25', prayedBy: 'Moses' },
  { reference: 'Joshua 7:7-9', prayedBy: 'Joshua' },
  { reference: '1 Samuel 1:11', prayedBy: 'Hannah' },
  { reference: '1 Samuel 2:1-10', prayedBy: 'Hannah' },
  { reference: '2 Samuel 7:18-29', prayedBy: 'David' },
  { reference: '1 Kings 3:6-9', prayedBy: 'Solomon' },
  { reference: '1 Kings 8:22-30', prayedBy: 'Solomon' },
  { reference: '1 Kings 18:36-37', prayedBy: 'Elijah' },
  { reference: '1 Chronicles 4:10', prayedBy: 'Jabez' },
  { reference: '1 Chronicles 29:10-19', prayedBy: 'David' },
  { reference: '2 Chronicles 14:11', prayedBy: 'Asa' },
  { reference: '2 Chronicles 20:6-12', prayedBy: 'Jehoshaphat' },
  { reference: 'Ezra 9:6-15', prayedBy: 'Ezra' },
  { reference: 'Nehemiah 1:5-11', prayedBy: 'Nehemiah' },
  { reference: 'Nehemiah 9:5-15', prayedBy: 'The Levites' },
  { reference: 'Job 42:1-6', prayedBy: 'Job' },

  // ── The prophets ─────────────────────────────────────────────────────
  { reference: 'Isaiah 12:1-6', prayedBy: 'Isaiah' },
  { reference: 'Isaiah 25:1-5', prayedBy: 'Isaiah' },
  { reference: 'Isaiah 37:15-20', prayedBy: 'Hezekiah' },
  { reference: 'Isaiah 38:10-20', prayedBy: 'Hezekiah' },
  { reference: 'Isaiah 63:15-19', prayedBy: 'Isaiah' },
  { reference: 'Isaiah 64:1-12', prayedBy: 'Isaiah' },
  { reference: 'Jeremiah 10:23-25', prayedBy: 'Jeremiah' },
  { reference: 'Jeremiah 17:14-18', prayedBy: 'Jeremiah' },
  { reference: 'Jeremiah 20:7-13', prayedBy: 'Jeremiah' },
  { reference: 'Jeremiah 32:17-25', prayedBy: 'Jeremiah' },
  { reference: 'Lamentations 5:1-22', prayedBy: 'The people of Judah' },
  { reference: 'Daniel 2:20-23', prayedBy: 'Daniel' },
  { reference: 'Daniel 9:4-19', prayedBy: 'Daniel' },
  { reference: 'Jonah 2:2-9', prayedBy: 'Jonah' },
  { reference: 'Micah 7:18-20', prayedBy: 'Micah' },
  { reference: 'Habakkuk 1:2-4', prayedBy: 'Habakkuk' },
  { reference: 'Habakkuk 3:2-19', prayedBy: 'Habakkuk' },

  // ── The New Testament ────────────────────────────────────────────────
  { reference: 'Matthew 6:9-13', prayedBy: 'Jesus' },
  { reference: 'Matthew 11:25-26', prayedBy: 'Jesus' },
  { reference: 'Luke 1:46-55', prayedBy: 'Mary' },
  { reference: 'Luke 1:68-79', prayedBy: 'Zechariah' },
  { reference: 'Luke 2:29-32', prayedBy: 'Simeon' },
  { reference: 'John 17:1-26', prayedBy: 'Jesus' },
  { reference: 'Acts 4:24-30', prayedBy: 'The church in Jerusalem' },
  { reference: 'Ephesians 1:17-23', prayedBy: 'Paul' },
  { reference: 'Ephesians 3:14-21', prayedBy: 'Paul' },
  { reference: 'Philippians 1:9-11', prayedBy: 'Paul' },
  { reference: 'Colossians 1:9-14', prayedBy: 'Paul' },
  { reference: 'Revelation 4:11', prayedBy: 'The twenty-four elders' },
  {
    reference: 'Revelation 5:9-10',
    prayedBy: 'The elders and the living creatures',
  },
  { reference: 'Revelation 11:17-18', prayedBy: 'The twenty-four elders' },
  {
    reference: 'Revelation 15:3-4',
    prayedBy: 'Those victorious over the beast',
  },
  { reference: 'Revelation 16:5-7', prayedBy: 'The angel of the waters' },
]

/** UTC day of year, 1-based. Keyed off the UTC date only — never local time. */
export function utcDayOfYear(date: Date): number {
  const startOfYear = Date.UTC(date.getUTCFullYear(), 0, 1)
  const today = Date.UTC(
    date.getUTCFullYear(),
    date.getUTCMonth(),
    date.getUTCDate(),
  )
  return Math.floor((today - startOfYear) / 86_400_000) + 1
}

/** The edition date this generator writes to: 'YYYY-MM-DD', UTC. */
export function utcDateKey(date: Date): string {
  return date.toISOString().slice(0, 10)
}

/** Which prayer runs on this date. Exported so the runner and the tests can
 * assert the rotation without reading the corpus. */
export function prayerForDate(date: Date): ScripturePrayer {
  return PRAYER_CANON[utcDayOfYear(date) % PRAYER_CANON.length]
}

/**
 * Today's prayer, printed in full from the BSB corpus.
 *
 * Deterministic and offline: the only input is the date. `getVerse` throws if
 * the reference cannot be parsed or the text cannot be found, and that throw is
 * deliberately not caught — a broken canon entry must break the build, not
 * quietly publish a shorter paper.
 *
 * `getVerse` supplies the TEXT only. The printed reference is the canon's own
 * string — see THE PRINTED REFERENCE note at the top of this file for why
 * `result.canonical` is not usable here.
 */
export async function generatePrayer(
  date: Date,
): Promise<EditionItem<'prayer'>[]> {
  const entry = prayerForDate(date)
  const result = await getVerse(entry.reference, 'BSB')

  const payload: PrayerPayload = {
    reference: entry.reference,
    translation: 'BSB',
    text: result.text,
    prayedBy: entry.prayedBy,
  }

  return [
    {
      kind: 'prayer',
      publishDate: utcDateKey(date),
      slot: 0,
      status: 'approved',
      payload,
    },
  ]
}
