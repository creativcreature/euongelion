/**
 * The Coloring Corner — premade line art for the daily mini art game
 * (SA-114 / F-158). Founder: "a color by the number kinda thing, where they
 * can fill in premade art either using a crayon scribble or a color
 * dropper."
 *
 * Each artwork is hand-authored SVG line art in the paper's register:
 * simple iconic biblical scenes, closed regions with a SUGGESTED crayon
 * number (like a real color-by-number card — the reader is free to ignore
 * it). Rotates by day-of-year; the bank grows over time.
 */

export interface ColoringRegion {
  /** Closed SVG path for the fillable region. */
  d: string
  /** Suggested crayon number (1-8) — printed small in the region. */
  n: number
  /** Where the little number sits. */
  nx: number
  ny: number
  label: string
}

export interface ColoringArt {
  id: string
  title: string
  /** One quiet line under the frame. */
  caption: string
  viewBox: string
  regions: ColoringRegion[]
  /** Non-fillable ink outlines drawn on top. */
  outlines: string[]
}

export const COLORING_BANK: readonly ColoringArt[] = [
  {
    id: 'loaf',
    title: 'Daily Bread',
    caption: 'One loaf, one board, one morning.',
    viewBox: '0 0 400 300',
    regions: [
      {
        d: 'M0 0 H400 V190 H0 Z',
        n: 6,
        nx: 40,
        ny: 40,
        label: 'the morning sky',
      },
      { d: 'M0 190 H400 V300 H0 Z', n: 5, nx: 40, ny: 260, label: 'the table' },
      {
        d: 'M60 210 L340 210 L360 232 L80 232 Z',
        n: 7,
        nx: 210,
        ny: 224,
        label: 'the board',
      },
      {
        d: 'M90 200 C90 140 310 140 310 200 Z',
        n: 2,
        nx: 200,
        ny: 178,
        label: 'the loaf',
      },
      {
        d: 'M120 158 C150 128 250 128 280 158 C250 148 150 148 120 158 Z',
        n: 3,
        nx: 200,
        ny: 148,
        label: 'the crust',
      },
      {
        d: 'M300 60 A28 28 0 1 1 299 59 Z',
        n: 3,
        nx: 300,
        ny: 64,
        label: 'the sun',
      },
    ],
    outlines: [
      'M90 200 C90 140 310 140 310 200',
      'M140 170 C160 160 180 162 190 170',
      'M210 166 C230 158 250 160 262 168',
      'M60 210 L340 210 L360 232 L80 232 Z',
    ],
  },
  {
    id: 'dove',
    title: 'The Dove Returns',
    caption: 'Over the water, an olive leaf.',
    viewBox: '0 0 400 300',
    regions: [
      { d: 'M0 0 H400 V200 H0 Z', n: 6, nx: 40, ny: 40, label: 'the sky' },
      { d: 'M0 200 H400 V300 H0 Z', n: 1, nx: 40, ny: 265, label: 'the flood' },
      {
        d: 'M150 140 C150 110 210 100 230 122 C260 118 268 140 250 152 C230 168 170 168 150 152 Z',
        n: 8,
        nx: 205,
        ny: 140,
        label: 'the dove',
      },
      {
        d: 'M175 128 C150 92 110 88 92 104 C120 106 146 122 160 142 Z',
        n: 8,
        nx: 130,
        ny: 112,
        label: 'the wing',
      },
      {
        d: 'M252 128 L294 112 L300 124 L262 138 Z',
        n: 4,
        nx: 284,
        ny: 124,
        label: 'the olive branch',
      },
      {
        d: 'M40 230 C100 214 160 246 220 230 C280 214 340 246 396 230 L396 258 C340 274 280 242 220 258 C160 274 100 242 40 258 Z',
        n: 1,
        nx: 210,
        ny: 246,
        label: 'the waves',
      },
    ],
    outlines: [
      'M150 140 C150 110 210 100 230 122 C260 118 268 140 250 152 C230 168 170 168 150 152 Z',
      'M175 128 C150 92 110 88 92 104 C120 106 146 122 160 142 Z',
      'M236 124 A3 3 0 1 1 235 123',
    ],
  },
  {
    id: 'lamp',
    title: 'A Lamp to My Feet',
    caption: 'One flame against the evening.',
    viewBox: '0 0 400 300',
    regions: [
      { d: 'M0 0 H400 V300 H0 Z', n: 1, nx: 40, ny: 40, label: 'the night' },
      {
        d: 'M140 210 L260 210 L240 260 L160 260 Z',
        n: 5,
        nx: 200,
        ny: 240,
        label: 'the stand',
      },
      {
        d: 'M120 170 C120 130 280 130 280 170 C280 200 120 200 120 170 Z',
        n: 7,
        nx: 200,
        ny: 172,
        label: 'the bowl',
      },
      {
        d: 'M188 130 C182 96 200 78 200 78 C200 78 218 96 212 130 C206 142 194 142 188 130 Z',
        n: 3,
        nx: 200,
        ny: 112,
        label: 'the flame',
      },
      {
        d: 'M196 118 C193 102 200 92 200 92 C200 92 207 102 204 118 C202 124 198 124 196 118 Z',
        n: 2,
        nx: 200,
        ny: 106,
        label: 'the heart of the flame',
      },
      {
        d: 'M60 60 A10 10 0 1 1 59 59 Z M330 90 A8 8 0 1 1 329 89 Z M310 40 A6 6 0 1 1 309 39 Z',
        n: 3,
        nx: 64,
        ny: 64,
        label: 'the stars',
      },
    ],
    outlines: [
      'M120 170 C120 130 280 130 280 170 C280 200 120 200 120 170 Z',
      'M140 210 L260 210 L240 260 L160 260 Z',
      'M188 130 C182 96 200 78 200 78 C200 78 218 96 212 130 C206 142 194 142 188 130 Z',
    ],
  },
]

/** Deterministic day pick — the same artwork for every reader all day. */
export function pickColoringForDay(date: Date): ColoringArt {
  const start = Date.UTC(date.getUTCFullYear(), 0, 0)
  const day = Math.floor((date.getTime() - start) / 86_400_000)
  return COLORING_BANK[day % COLORING_BANK.length]
}
