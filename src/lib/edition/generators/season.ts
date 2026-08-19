/**
 * The Daily Bread — The Season (SA-090 / F-136).
 *
 * A newspaper carries a weather box. This one carries the church year: where
 * we are, what today is called, and one line saying why that matters. It is
 * DETERMINISTIC — the liturgical calendar is computed from the date, so the
 * whole section is a pure function of the day and needs no review.
 *
 * The note is our own editorial voice, written once per season and committed
 * here. That is inside the invention line (F-098): we write our own copy, we
 * do not invent other people's reported facts. The season, the day label and
 * the feast all come from `liturgicalDay`.
 */
import { liturgicalDay, type LiturgicalSeason } from '@/lib/liturgical'
import type { EditionItem, SeasonPayload } from '../kinds'

/**
 * One sentence per season, keyed by the season `liturgicalDay` returns.
 *
 * Typing this as a total Record over the union means a new season cannot be
 * added to `LiturgicalSeason` without the compiler demanding a note for it,
 * and the runtime lookup below throws if one is ever missing anyway. A season
 * with no note must fail loudly rather than render a box with a blank line.
 */
const SEASON_NOTES: Record<LiturgicalSeason, string> = {
  advent:
    'The church starts its year in the dark on purpose, spending four weeks admitting it is waiting for a rescue that has not arrived yet.',
  christmas:
    'Twelve days, not one — the feast keeps going long after the shops have moved on, because it takes a while to say out loud that God has a body.',
  epiphany:
    'The season of showing: a star, a river, a wedding, and the question quietly shifting from whether the child was born to who he turns out to be.',
  lent: 'Forty days walked deliberately toward a cross, with fasting as the honest admission that we are dust and were never sustained by bread.',
  'holy-week':
    'The slowest week in the calendar, where the church stops summarising and walks the last days of Jesus hour by hour.',
  easter:
    'Fifty days of feasting — the answer to Good Friday is not an argument but a season too long to be mistaken for a mood.',
  pentecost:
    'The promised Spirit arrives loudly, and the good news starts speaking every language in the room at once.',
  ordinary:
    'Counted time, not empty time: the long green stretch where the church practises what the feasts declared.',
}

/**
 * The Season for one UTC date. Always exactly one item, slot 0, approved.
 * Throws if the calendar returns a season we have no note for.
 */
export async function generateSeason(
  date: Date,
): Promise<EditionItem<'season'>[]> {
  const day = liturgicalDay(date)
  const note = SEASON_NOTES[day.season]
  if (!note) {
    throw new Error(
      `no Season note for liturgical season "${day.season}" — add one to SEASON_NOTES before it can publish`,
    )
  }

  const payload: SeasonPayload = {
    seasonLabel: day.seasonLabel,
    note,
    ...(day.dayLabel ? { dayLabel: day.dayLabel } : {}),
    ...(day.feast ? { feast: day.feast } : {}),
  }

  return [
    {
      kind: 'season',
      publishDate: day.date.toISOString().slice(0, 10),
      slot: 0,
      status: 'approved',
      payload,
    },
  ]
}
