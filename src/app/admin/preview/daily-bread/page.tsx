/**
 * /admin/preview/daily-bread — tomorrow's paper, rendered REAL (SA-114 / F-158).
 *
 * The identical EditionPage component the public route renders, for any
 * date (?date=YYYY-MM-DD, default tomorrow), with drafts VISIBLE and
 * wrapped in approve/reject chrome. Founder rule: only the founder sees
 * drafts — the /admin layout gates server-side, and this page asserts the
 * allowlist AGAIN itself (defense in depth); everyone else gets 404.
 *
 * The deadline rule (founder, 2026-08-19): a draft the founder has not
 * rejected GOES LIVE at 3am Eastern on its posting day. This page is where
 * that window is exercised.
 */
import Link from 'next/link'
import { assertAdminOr404 } from '@/lib/admin/assert-admin'
import EditionPage from '@/components/edition/EditionPage'

export const dynamic = 'force-dynamic'

function dateOrTomorrow(raw: string | undefined): Date {
  if (raw && /^\d{4}-\d{2}-\d{2}$/.test(raw)) {
    const d = new Date(`${raw}T00:00:00Z`)
    if (!Number.isNaN(d.getTime())) return d
  }
  return new Date(Date.now() + 86_400_000)
}

export default async function DailyBreadPreview({
  searchParams,
}: {
  searchParams: Promise<{ date?: string }>
}) {
  await assertAdminOr404()

  const { date: rawDate } = await searchParams
  const date = dateOrTomorrow(rawDate)
  const iso = date.toISOString().slice(0, 10)
  const prev = new Date(date.getTime() - 86_400_000).toISOString().slice(0, 10)
  const next = new Date(date.getTime() + 86_400_000).toISOString().slice(0, 10)

  return (
    <div>
      <div className="preview-datebar">
        <Link
          href={`/admin/preview/daily-bread?date=${prev}`}
          className="preview-ribbon"
        >
          ← {prev}
        </Link>
        <span className="preview-ribbon">
          PREVIEW — {iso} — this edition goes live at 7am ET; unrejected drafts
          print with it
        </span>
        <Link
          href={`/admin/preview/daily-bread?date=${next}`}
          className="preview-ribbon"
        >
          {next} →
        </Link>
      </div>
      <EditionPage date={date} preview />
    </div>
  )
}
