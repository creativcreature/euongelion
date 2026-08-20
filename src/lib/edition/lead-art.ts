/**
 * The daily lead art (SA-114 / F-158).
 *
 * Founder: "The lead image for the daily bread should change daily —
 * representing the verse of the day."
 *
 * MANIFEST-FIRST (hard image rule): the lead is CHOSEN from the curated,
 * Vasari-captioned print pool (src/data/gallery-vasari.json — 145 prints an
 * agent actually looked at), never generated. The verse's own words score
 * against each print's title + description, so the picture genuinely
 * represents the text; when nothing matches, the caller keeps the series
 * art rather than hanging an arbitrary picture over the day's reading.
 */
import VASARI from '@/data/gallery-vasari.json'

interface VasariEntry {
  file: string
  title: string
  shown: string
  quality: string
}

export interface LeadArt {
  file: string
  image: string
  title: string
  shown: string
  quality: string
}

const STOPWORDS = new Set(
  `a an and are as at be but by for from had has have he her him his i in is it its me my not of on or our she so that the thee their them they thou thy to unto upon was we were what when who will with you your ye shall said say unto also do did done which them then there this these those out into up down over under all any been`.split(
    ' ',
  ),
)

/** Curated biblical theme expansion — a day about provision may find its
 *  print through bread, harvest, or manna. Hand-written, deliberately
 *  small: the goal is a REAL subject match, never a stretch. */
const EXPANSIONS: Record<string, string[]> = {
  bread: ['loaf', 'loaves', 'grain', 'wheat', 'table', 'feast', 'manna'],
  provision: ['bread', 'harvest', 'manna', 'loaves', 'feeding', 'grain'],
  treasure: ['gold', 'coins', 'riches', 'pearl'],
  hoarding: ['barns', 'storehouse', 'grain', 'harvest'],
  fear: ['storm', 'tempest', 'waves', 'dark', 'night'],
  storm: ['sea', 'waves', 'wind', 'boat', 'tempest'],
  shepherd: ['sheep', 'flock', 'lamb', 'fold'],
  sheep: ['shepherd', 'flock', 'lamb'],
  prayer: ['kneeling', 'hands', 'gethsemane', 'praying'],
  pray: ['kneeling', 'hands', 'praying'],
  light: ['lamp', 'candle', 'dawn', 'sun', 'morning'],
  water: ['sea', 'river', 'well', 'jordan', 'waves'],
  cross: ['calvary', 'crucifixion', 'golgotha'],
  death: ['tomb', 'grave', 'burial'],
  resurrection: ['tomb', 'risen', 'morning', 'dawn'],
  king: ['crown', 'throne', 'david'],
  harvest: ['wheat', 'field', 'reapers', 'grain', 'sower'],
  seed: ['sower', 'field', 'soil', 'wheat'],
  wilderness: ['desert', 'wandering', 'manna'],
  anxiety: ['storm', 'night', 'dark'],
  worry: ['birds', 'lilies', 'field', 'sparrow'],
  birds: ['sparrow', 'raven', 'dove'],
  money: ['coins', 'treasure', 'rich', 'gold'],
  rich: ['treasure', 'gold', 'barns', 'feast'],
  faith: ['walking', 'water', 'mustard'],
  doubt: ['thomas', 'storm', 'sinking'],
  rest: ['sabbath', 'sleep', 'green', 'pastures'],
  mercy: ['prodigal', 'samaritan', 'embrace'],
  forgiveness: ['prodigal', 'embrace', 'father'],
}

function tokenize(text: string): Set<string> {
  return new Set(
    text
      .toLowerCase()
      .replace(/[^a-z\s]/g, ' ')
      .split(/\s+/)
      .filter((w) => w.length > 2 && !STOPWORDS.has(w)),
  )
}

/** Deterministic tie-break: a tiny string hash of date+file. */
function jitter(dateIso: string, file: string): number {
  let h = 0
  const s = `${dateIso}:${file}`
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0
  return (h >>> 0) / 0xffffffff
}

/**
 * The best-matching print for the day's verse, or null when nothing
 * genuinely matches (score 0). Deterministic for a given date+verse.
 * `exclude` keeps the lead from doubling a print the gallery already hangs.
 */
export function pickLeadArt(
  dateIso: string,
  verseText: string,
  exclude: readonly string[] = [],
): LeadArt | null {
  const verse = tokenize(verseText)
  for (const t of [...verse]) {
    for (const x of EXPANSIONS[t] ?? []) verse.add(x)
  }
  if (verse.size === 0) return null
  const excluded = new Set(exclude)

  let best: { entry: VasariEntry; score: number } | null = null
  for (const entry of (VASARI as { entries: VasariEntry[] }).entries) {
    if (excluded.has(entry.file)) continue
    const titleTokens = tokenize(entry.title)
    const shownTokens = tokenize(entry.shown)
    let score = 0
    for (const t of verse) {
      if (titleTokens.has(t)) score += 3
      if (shownTokens.has(t)) score += 1
    }
    if (score === 0) continue
    score += jitter(dateIso, entry.file) // deterministic tie-break only
    if (!best || score > best.score) best = { entry, score }
  }
  if (!best || best.score < 2) return null
  return {
    file: best.entry.file,
    image: `/images/devotional-prints/${best.entry.file}`,
    title: best.entry.title,
    shown: best.entry.shown,
    quality: best.entry.quality,
  }
}
