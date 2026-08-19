/**
 * The Daily Bread — Today in Bible-365 (SA-092).
 *
 * The paper's pointer into the year-long plan: which day of Bible-365 today
 * is, what that reading is called, and where it reads. Everything comes from
 * the plan's own shipped file (`public/devotionals/bible-365-day-N.json`);
 * nothing is written here.
 *
 * A MISSING DAY FILE THROWS. The plan is a 365-file set — a hole in it is a
 * bug in the catalog, not a day off for the section (Development Rule 1).
 *
 * THE LEAP DAY: UTC day-of-year reaches 366 on 31 December of a leap year,
 * and the plan deliberately has 365 files — that is the plan's shape, not a
 * hole. Day 366 re-reads day 365 rather than skipping the section one
 * morning every four years. This is a documented mapping decision, made
 * loudly here and asserted in the tests — not a silent fallback.
 */
import { readFileSync } from 'node:fs'
import path from 'node:path'
import type { B365Payload, EditionItem } from '../kinds'

/** UTC day of year, 1-based. */
function utcDayOfYear(date: Date): number {
  const startOfYear = Date.UTC(date.getUTCFullYear(), 0, 1)
  const today = Date.UTC(
    date.getUTCFullYear(),
    date.getUTCMonth(),
    date.getUTCDate(),
  )
  if (Number.isNaN(today)) throw new Error('b365: invalid Date')
  return Math.floor((today - startOfYear) / 86_400_000) + 1
}

/** The plan day for a date: day-of-year, with 366 mapped to 365 (see the
 * file comment). Exported for the tests. */
export function planDayForDate(date: Date): number {
  return Math.min(utcDayOfYear(date), 365)
}

/**
 * Today's Bible-365 entry. Slot 0, published — the plan's own shipped file;
 * there is nothing to review.
 *
 * @param devotionalsDir Optional override for the plan directory. Defaults
 *   to the repo's `public/devotionals`; the tests point it at a directory
 *   with a hole in it to prove the throw.
 */
export async function generateB365(
  date: Date,
  devotionalsDir: string = path.join(process.cwd(), 'public', 'devotionals'),
): Promise<EditionItem<'b365'>[]> {
  const day = planDayForDate(date)
  const slug = `bible-365-day-${day}`
  const file = path.join(devotionalsDir, `${slug}.json`)

  let raw: string
  try {
    raw = readFileSync(file, 'utf8')
  } catch (cause) {
    throw new Error(
      `b365: plan day ${day} is missing at ${file} — the Bible-365 set is ` +
        `365 files and a hole in it is a bug: ${(cause as Error).message}`,
    )
  }

  const parsed = JSON.parse(raw) as {
    title?: unknown
    scriptureReference?: unknown
  }
  if (typeof parsed.title !== 'string' || parsed.title.length === 0) {
    throw new Error(`b365: ${slug}.json has no title`)
  }
  if (
    typeof parsed.scriptureReference !== 'string' ||
    parsed.scriptureReference.length === 0
  ) {
    throw new Error(`b365: ${slug}.json has no scriptureReference`)
  }

  const payload: B365Payload = {
    slug,
    day,
    title: parsed.title,
    reference: parsed.scriptureReference,
  }

  return [
    {
      kind: 'b365',
      publishDate: date.toISOString().slice(0, 10),
      slot: 0,
      status: 'published',
      payload,
    },
  ]
}
