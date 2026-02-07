import Link from 'next/link'

export default function Home() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-tehom p-6 text-center text-scroll">
      <div className="max-w-2xl">
        <p className="text-label vw-small mb-8 text-gold">
          EU&middot;AN&middot;GE&middot;LION (yoo-an-GEL-ee-on) &middot; GREEK:
          &ldquo;GOOD NEWS&rdquo;
        </p>

        <h1 className="text-masthead vw-heading-xl mb-8">EUANGELION</h1>

        <p
          className="text-serif-italic vw-body-lg mx-auto mb-12 text-secondary"
          style={{ maxWidth: '45ch' }}
        >
          Daily bread for the cluttered, hungry soul. Ancient wisdom, modern
          design. Spiritual formation over engagement metrics.
        </p>

        <Link
          href="/wake-up"
          className="inline-block bg-scroll px-10 py-5 text-label vw-small text-tehom transition-all duration-300 hover:bg-gold hover:text-tehom focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold"
        >
          Enter Wake-Up Magazine
        </Link>

        <p className="vw-small mt-16 text-muted">&copy; 2026 Euangelion</p>
      </div>
    </div>
  )
}
