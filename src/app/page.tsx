import Link from 'next/link'

export default function Home() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-black p-6 text-center text-cream">
      <div className="max-w-2xl">
        <p className="text-label vw-small mb-8 text-gold">
          EU·AN·GE·LION (yoo-an-GEL-ee-on) · GREEK: &ldquo;GOOD NEWS&rdquo;
        </p>

        <h1 className="text-display vw-heading-xl mb-8">EUANGELION</h1>

        <p
          className="text-serif-italic vw-body-lg mx-auto mb-12"
          style={{ maxWidth: '45ch' }}
        >
          Daily bread for the cluttered, hungry soul. Ancient wisdom, modern
          design. Spiritual formation over engagement metrics.
        </p>

        <Link
          href="/wake-up"
          className="inline-block bg-cream px-10 py-5 text-label vw-small text-black transition-all duration-300 hover:bg-gold hover:text-cream focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold"
        >
          Enter Wake-Up Magazine
        </Link>

        <p className="vw-small mt-16 text-gray-500">&copy; 2026 Euangelion</p>
      </div>
    </div>
  )
}
