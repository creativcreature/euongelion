/**
 * The daily sheet arrangement (SA-114 / F-158).
 *
 * Founder, 2026-08-20: "Ensure the Daily bread layout is a different layout
 * daily... same modules but slightly altered layouts, but staple things
 * staying anchored daily. 3 anchors."
 *
 * The three anchors: the LEAD opens the paper (it renders above the sheet),
 * the FUNNIES hold the same mid-paper spot every day (readers look for the
 * comic where they left it), and the READING closes the paper (it renders
 * below the sheet). Everything between shuffles on a day-of-week rotation —
 * seven HAND-COMPOSED variants, not a random shuffle, because free
 * permutation would recreate the exact games-clustering the founder
 * rejected. Deterministic from the edition date: every reader sees the same
 * paper, and the arrangement flips with the 7am boundary because callers
 * pass the effective edition date.
 */

/** One key per full-width row group of the paper sheet, in the classic
 *  (Sunday) order. Each key spans a complete grid row, so any permutation
 *  keeps every row's internal composition intact. */
export const SHEET_ROW_KEYS = [
  'desk', // the practice beside the word
  'thirds1', // quiz 1 of 3, the red letters, bible-in-a-year
  'crossword', // the crossword beside the catechism (GAME)
  'funnies', // ANCHORED — the strip beside the season
  'gallery', // the gallery spread
  'verse', // the verse rebuilt beside the archive (GAME)
  'howtoread', // the reading guides
  'wordsearch', // the word search beside quiz 2 of 3 (GAME)
  'hymnal', // the hymnal beside the proverb
  'memory', // memory verse, the question, quiz 3 of 3
  'prayer', // the daily prayer, voices, and the minis
  'coloring', // the coloring corner — the paper's back-page art game (GAME)
] as const

export type SheetRowKey = (typeof SHEET_ROW_KEYS)[number]

/** Rows containing an interactive game — never adjacent, any variant. */
export const GAME_ROWS = [
  'crossword',
  'verse',
  'wordsearch',
  'coloring',
] as const

/** The funnies' fixed position in every variant (0-based). */
export const FUNNIES_INDEX = 3

/** Seven hand-composed arrangements, Sunday..Saturday. Every variant keeps
 *  the funnies at FUNNIES_INDEX and at least one non-game row between any
 *  two game rows. Validated by __tests__/edition-arrange.test.ts. */
const WEEK_VARIANTS: readonly (readonly SheetRowKey[])[] = [
  // Sunday — the classic layout, as designed.
  [
    'desk',
    'thirds1',
    'crossword',
    'funnies',
    'gallery',
    'verse',
    'howtoread',
    'wordsearch',
    'hymnal',
    'memory',
    'prayer',
    'coloring',
  ],
  // Monday — the hymnal opens the week; games drift later.
  [
    'hymnal',
    'desk',
    'crossword',
    'funnies',
    'thirds1',
    'verse',
    'gallery',
    'wordsearch',
    'howtoread',
    'memory',
    'prayer',
    'coloring',
  ],
  // Tuesday — the gallery leads; the word search comes up early.
  [
    'gallery',
    'thirds1',
    'wordsearch',
    'funnies',
    'desk',
    'crossword',
    'hymnal',
    'verse',
    'howtoread',
    'memory',
    'prayer',
    'coloring',
  ],
  // Wednesday — the guides lead; memory row sits high.
  [
    'howtoread',
    'memory',
    'crossword',
    'funnies',
    'hymnal',
    'wordsearch',
    'thirds1',
    'verse',
    'gallery',
    'desk',
    'prayer',
    'coloring',
  ],
  // Thursday — the desk holds, the verse game comes early.
  [
    'desk',
    'hymnal',
    'verse',
    'funnies',
    'memory',
    'crossword',
    'gallery',
    'wordsearch',
    'thirds1',
    'howtoread',
    'prayer',
    'coloring',
  ],
  // Friday — thirds lead into an early word search.
  [
    'thirds1',
    'gallery',
    'wordsearch',
    'funnies',
    'howtoread',
    'verse',
    'desk',
    'crossword',
    'memory',
    'hymnal',
    'prayer',
    'coloring',
  ],
  // Saturday — a slow morning: guides and hymnal high, games spaced late.
  [
    'memory',
    'howtoread',
    'crossword',
    'funnies',
    'gallery',
    'wordsearch',
    'desk',
    'verse',
    'hymnal',
    'thirds1',
    'prayer',
    'coloring',
  ],
]

/** The arrangement for a date (pass the EFFECTIVE edition date — the same
 *  `now` EditionPage derives from the 7am rule). */
export function arrangeSheetRows(date: Date): readonly SheetRowKey[] {
  return WEEK_VARIANTS[date.getUTCDay()]
}
