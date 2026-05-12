import Link from 'next/link'

/**
 * Audit #14 (HOMEPAGE-AUDIT-2026-05-11): a new reader who clicks
 * "Daily Bread" should NOT hit a dead end that asks them to do
 * something else first. Lead with today's Bible-365 reading
 * (accessible without an account); demote the Soul-Audit-personalized
 * plan to a secondary option labeled "personalized."
 *
 * Founder direction 2026-05-08 pins the homepage TODAY content to
 * what-is-the-gospel-day-1 until Bible-365 rotation ships; we reuse
 * that here so the cue matches the front page exactly.
 */
const TODAY_FALLBACK = {
  slug: 'what-is-the-gospel-day-1',
  series: 'What Is the Gospel?',
  day: 1,
  title: 'A Voice in the Wilderness',
  scripture: 'Mark 1:1, 3',
  teaser:
    'The beginning of the good news about Jesus the Messiah — a voice calling in the wilderness, “Prepare the way for the Lord.”',
}

export default function EmptyState() {
  return (
    <div className="mx-auto max-w-3xl px-5 py-12">
      <p className="text-label vw-small mb-3 text-gold">
        TODAY · {TODAY_FALLBACK.series.toUpperCase()} · DAY {TODAY_FALLBACK.day}
      </p>
      <p className="text-label vw-small mb-2 text-secondary">
        {TODAY_FALLBACK.scripture}
      </p>
      <h1 className="vw-heading-md mb-4">{TODAY_FALLBACK.title}</h1>
      <p className="vw-body mb-6 text-secondary">{TODAY_FALLBACK.teaser}</p>
      <p className="vw-small mb-6 text-secondary">
        Each daily reading includes a scripture passage, vocabulary notes,
        historical context, a bridge to Christ, a reflection question, and a
        prayer. 5–7 minutes.
      </p>
      <div className="flex flex-col items-start gap-4 sm:flex-row sm:items-center">
        <Link href={`/devotional/${TODAY_FALLBACK.slug}`} className="cta-major">
          READ TODAY&rsquo;S EDITION
        </Link>
        <Link href="/series" className="link-highlight text-label vw-small">
          Browse every plan
        </Link>
      </div>

      <div
        className="mt-12 border-t pt-8"
        style={{ borderColor: 'var(--color-border)' }}
      >
        <p className="text-label vw-small mb-2 text-gold">
          YOUR PERSONALIZED PATH
        </p>
        <p className="vw-small mb-4 text-secondary">
          Want a 7-day plan built around what you&rsquo;re actually wrestling
          with? Take the Soul Audit and we&rsquo;ll match you to a series from
          our library.
        </p>
        <Link href="/soul-audit" className="link-highlight text-label vw-small">
          Take the Soul Audit →
        </Link>
      </div>
    </div>
  )
}
