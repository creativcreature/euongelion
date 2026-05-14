/**
 * Western liturgical calendar — current season + (when applicable)
 * the feast day / saint observed today. Lightweight, pure function;
 * no network. The dates that depend on Easter are computed from
 * Meeus's Easter algorithm (Gregorian).
 *
 * Used by:
 *   - DevotionalFolio: optional overline "Sixth Sunday of Easter"
 *   - ChurchYearSidebar (/daily-bread): card showing season + feast
 *
 * This is intentionally Western Christian (Roman Catholic / Anglican
 * / mainline Protestant common-lectionary calendar). The Eastern
 * calendar (Julian-Easter) is NOT computed here. Add separately if
 * the founder decides to support both.
 */

export type LiturgicalSeason =
  | 'advent'
  | 'christmas'
  | 'epiphany'
  | 'lent'
  | 'holy-week'
  | 'easter'
  | 'pentecost'
  | 'ordinary'

export interface LiturgicalDay {
  date: Date
  season: LiturgicalSeason
  seasonLabel: string
  /** e.g. "Sixth Sunday of Easter" or "Maundy Thursday" */
  dayLabel: string
  /** Liturgical color, lower-case word */
  color: 'purple' | 'white' | 'green' | 'red' | 'rose' | 'gold' | 'black'
  /** Optional saint or commemorative feast for this date (Western). */
  feast?: string
}

// ---- Easter calculation (Anonymous Gregorian algorithm, Meeus) ----
function easterDate(year: number): Date {
  const a = year % 19
  const b = Math.floor(year / 100)
  const c = year % 100
  const d = Math.floor(b / 4)
  const e = b % 4
  const f = Math.floor((b + 8) / 25)
  const g = Math.floor((b - f + 1) / 3)
  const h = (19 * a + b - d - g + 15) % 30
  const i = Math.floor(c / 4)
  const k = c % 4
  const l = (32 + 2 * e + 2 * i - h - k) % 7
  const m = Math.floor((a + 11 * h + 22 * l) / 451)
  const month = Math.floor((h + l - 7 * m + 114) / 31) // 3=March, 4=April
  const day = ((h + l - 7 * m + 114) % 31) + 1
  return new Date(Date.UTC(year, month - 1, day))
}

function adventStart(year: number): Date {
  // First Sunday of Advent — the Sunday nearest 30 Nov (closest, so
  // 27 Nov – 3 Dec). Algorithm: Sunday on or before Christmas Eve
  // minus 21 days.
  const xmas = new Date(Date.UTC(year, 11, 25))
  const xmasDow = xmas.getUTCDay()
  // Sunday before/on Dec 24 = Dec 24 - xmasDow days IF xmas falls
  // Mon-Sat; if Christmas is Sunday → previous Sunday is Dec 18.
  const lastSundayBeforeXmas = new Date(xmas)
  lastSundayBeforeXmas.setUTCDate(
    xmas.getUTCDate() - (xmasDow === 0 ? 7 : xmasDow),
  )
  // First Sunday of Advent = Last Sunday before Christmas − 21 days
  const first = new Date(lastSundayBeforeXmas)
  first.setUTCDate(lastSundayBeforeXmas.getUTCDate() - 21)
  return first
}

function addDays(d: Date, n: number): Date {
  const out = new Date(d)
  out.setUTCDate(d.getUTCDate() + n)
  return out
}

function sameUTCDate(a: Date, b: Date): boolean {
  return (
    a.getUTCFullYear() === b.getUTCFullYear() &&
    a.getUTCMonth() === b.getUTCMonth() &&
    a.getUTCDate() === b.getUTCDate()
  )
}

function ordinal(n: number): string {
  const s = ['th', 'st', 'nd', 'rd']
  const v = n % 100
  return n + (s[(v - 20) % 10] || s[v] || s[0])
}

// ---- Saint-day table (Western, RCL-flavored). Compact subset of the
// most-celebrated feasts. Add to as content needs. Keyed by MM-DD. ----
const FIXED_FEASTS: Record<string, string> = {
  '01-01': 'Mary, Mother of God',
  '01-06': 'Epiphany of the Lord',
  '01-25': 'Conversion of Paul',
  '02-02': 'Presentation of the Lord',
  '02-22': 'Chair of Peter',
  '03-19': 'Joseph, Husband of Mary',
  '03-25': 'Annunciation of the Lord',
  '06-24': 'Nativity of John the Baptist',
  '06-29': 'Peter & Paul',
  '08-06': 'Transfiguration of the Lord',
  '08-15': 'Assumption of Mary',
  '08-29': 'Beheading of John the Baptist',
  '09-08': 'Nativity of Mary',
  '09-14': 'Exaltation of the Holy Cross',
  '09-29': 'Michael, Gabriel, Raphael — Archangels',
  '10-04': 'Francis of Assisi',
  '11-01': 'All Saints',
  '11-02': 'All Souls',
  '11-30': 'Andrew the Apostle',
  '12-06': 'Nicholas of Myra',
  '12-08': 'Immaculate Conception',
  '12-13': 'Lucy of Syracuse',
  '12-25': 'The Nativity of the Lord',
  '12-26': 'Stephen, First Martyr',
  '12-27': 'John, Apostle & Evangelist',
  '12-28': 'Holy Innocents',
}

function fixedFeast(date: Date): string | undefined {
  const key = `${String(date.getUTCMonth() + 1).padStart(2, '0')}-${String(
    date.getUTCDate(),
  ).padStart(2, '0')}`
  return FIXED_FEASTS[key]
}

const SEASON_LABELS: Record<LiturgicalSeason, string> = {
  advent: 'Advent',
  christmas: 'Christmas',
  epiphany: 'Epiphany',
  lent: 'Lent',
  'holy-week': 'Holy Week',
  easter: 'Easter',
  pentecost: 'Pentecost',
  ordinary: 'Ordinary Time',
}

const SEASON_COLORS: Record<LiturgicalSeason, LiturgicalDay['color']> = {
  advent: 'purple',
  christmas: 'white',
  epiphany: 'green',
  lent: 'purple',
  'holy-week': 'red',
  easter: 'white',
  pentecost: 'red',
  ordinary: 'green',
}

export function liturgicalDay(now: Date = new Date()): LiturgicalDay {
  const utcNow = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()),
  )
  const year = utcNow.getUTCFullYear()

  const easter = easterDate(year)
  const ashWed = addDays(easter, -46)
  const palmSun = addDays(easter, -7)
  const maundyThu = addDays(easter, -3)
  const goodFri = addDays(easter, -2)
  const holySat = addDays(easter, -1)
  const ascension = addDays(easter, 39)
  const pentecost = addDays(easter, 49)
  const trinity = addDays(easter, 56)

  const adventThisYear = adventStart(year)
  const adventLastYear = adventStart(year - 1)
  const epiphany = new Date(Date.UTC(year, 0, 6))
  const baptismOfLord = (() => {
    // Sunday after Epiphany
    const d = new Date(epiphany)
    const dow = d.getUTCDay()
    if (dow === 0) return addDays(d, 7)
    return addDays(d, 7 - dow)
  })()

  let season: LiturgicalSeason
  let dayLabel = ''

  // Advent
  if (utcNow >= adventThisYear && utcNow < new Date(Date.UTC(year, 11, 25))) {
    season = 'advent'
    const week =
      Math.floor(
        (utcNow.getTime() - adventThisYear.getTime()) / 86_400_000 / 7,
      ) + 1
    dayLabel = `${ordinal(week)} Sunday of Advent`
  } else if (utcNow.getUTCMonth() === 11 && utcNow.getUTCDate() < 25) {
    // Before Christmas but before this year's Advent — likely
    // pre-Advent Ordinary (Christ the King area). Use last year's
    // Advent for context.
    if (utcNow >= adventLastYear) {
      season = 'advent'
      const week =
        Math.floor(
          (utcNow.getTime() - adventLastYear.getTime()) / 86_400_000 / 7,
        ) + 1
      dayLabel = `${ordinal(week)} Sunday of Advent`
    } else {
      season = 'ordinary'
      dayLabel = 'Ordinary Time'
    }
  } else if (
    (utcNow.getUTCMonth() === 11 && utcNow.getUTCDate() >= 25) ||
    (utcNow.getUTCMonth() === 0 && utcNow < epiphany)
  ) {
    season = 'christmas'
    dayLabel = 'Christmas Season'
  } else if (utcNow >= epiphany && utcNow < ashWed) {
    season = 'epiphany'
    if (sameUTCDate(utcNow, baptismOfLord)) {
      dayLabel = 'Baptism of the Lord'
    } else {
      dayLabel = 'Season after Epiphany'
    }
  } else if (utcNow >= ashWed && utcNow < palmSun) {
    season = 'lent'
    if (sameUTCDate(utcNow, ashWed)) {
      dayLabel = 'Ash Wednesday'
    } else {
      const wk =
        Math.floor((utcNow.getTime() - ashWed.getTime()) / 86_400_000 / 7) + 1
      dayLabel = `${ordinal(wk)} Week of Lent`
    }
  } else if (utcNow >= palmSun && utcNow < easter) {
    season = 'holy-week'
    if (sameUTCDate(utcNow, palmSun)) dayLabel = 'Palm Sunday'
    else if (sameUTCDate(utcNow, maundyThu)) dayLabel = 'Maundy Thursday'
    else if (sameUTCDate(utcNow, goodFri)) dayLabel = 'Good Friday'
    else if (sameUTCDate(utcNow, holySat)) dayLabel = 'Holy Saturday'
    else dayLabel = 'Holy Week'
  } else if (sameUTCDate(utcNow, easter)) {
    season = 'easter'
    dayLabel = 'Easter Sunday'
  } else if (utcNow > easter && utcNow < pentecost) {
    season = 'easter'
    const wk =
      Math.floor((utcNow.getTime() - easter.getTime()) / 86_400_000 / 7) + 1
    if (sameUTCDate(utcNow, ascension)) {
      dayLabel = 'Ascension of the Lord'
    } else {
      dayLabel = `${ordinal(wk)} Week of Easter`
    }
  } else if (sameUTCDate(utcNow, pentecost)) {
    season = 'pentecost'
    dayLabel = 'Pentecost'
  } else if (sameUTCDate(utcNow, trinity)) {
    season = 'ordinary'
    dayLabel = 'Trinity Sunday'
  } else {
    season = 'ordinary'
    // Approximate "Nth week in Ordinary Time" — Sundays-after-Pentecost
    // numbering is liturgically more accurate than calendar-week.
    const daysAfterPentecost = Math.floor(
      (utcNow.getTime() - pentecost.getTime()) / 86_400_000,
    )
    if (daysAfterPentecost > 0) {
      const wk = Math.floor(daysAfterPentecost / 7) + 1
      dayLabel = `${ordinal(wk)} Week after Pentecost`
    } else {
      dayLabel = 'Ordinary Time'
    }
  }

  return {
    date: utcNow,
    season,
    seasonLabel: SEASON_LABELS[season],
    dayLabel,
    color: SEASON_COLORS[season],
    feast: fixedFeast(utcNow),
  }
}
