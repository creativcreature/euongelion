import Link from 'next/link'

export default function EmptyState() {
  return (
    <div className="mx-auto max-w-lg px-5 py-16 text-center">
      <p className="text-label vw-small mb-3 text-gold">DAILY BREAD</p>
      <h1 className="vw-heading-md mb-4">Your daily bread is waiting.</h1>
      <p className="vw-body mb-8 text-secondary">
        Take the Soul Audit to receive a personalized 7-day devotional plan
        grounded in real scripture and theology. Or browse the full series
        library.
      </p>
      <div className="flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
        <Link href="/soul-audit" className="cta-major">
          TAKE THE SOUL AUDIT
        </Link>
        <Link href="/series" className="link-highlight text-label vw-small">
          BROWSE SERIES
        </Link>
      </div>
    </div>
  )
}
