import Link from 'next/link'

export default function Home() {
  return (
    <div className="flex min-h-screen flex-col bg-tehom text-scroll">
      {/* Full-viewport hero */}
      <div className="flex min-h-screen flex-col items-center justify-center px-6 text-center">
        <p className="landing-reveal landing-reveal-1 text-label vw-small mb-8 text-gold">
          EU&middot;AN&middot;GE&middot;LION (yoo-an-GEL-ee-on) &middot; GREEK:
          &ldquo;GOOD NEWS&rdquo;
        </p>

        <h1
          className="landing-reveal landing-reveal-2 text-masthead mb-8"
          style={{ fontSize: 'clamp(4rem, 10vw, 8rem)' }}
        >
          EUANGELION
        </h1>

        <p
          className="landing-reveal landing-reveal-3 text-serif-italic mx-auto mb-16 text-secondary"
          style={{
            fontSize: 'clamp(1.25rem, 2vw, 1.75rem)',
            maxWidth: '45ch',
            lineHeight: 1.6,
          }}
        >
          Daily bread for the cluttered, hungry soul. Ancient wisdom, modern
          design. Spiritual formation over engagement metrics.
        </p>

        <Link
          href="/wake-up"
          className="landing-reveal landing-reveal-3 inline-block bg-scroll px-10 py-5 text-label vw-small text-tehom transition-all duration-300 hover:bg-gold hover:text-tehom focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold"
        >
          Enter Wake-Up Magazine
        </Link>

        {/* Scroll indicator */}
        <div className="landing-reveal landing-reveal-4 mt-auto pb-12">
          <svg
            className="scroll-indicator h-6 w-6 text-muted"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M19 9l-7 7-7-7"
            />
          </svg>
        </div>
      </div>

      {/* Copyright below fold */}
      <div className="px-6 pb-12 text-center">
        <p className="vw-small text-muted">&copy; 2026 Euangelion</p>
      </div>
    </div>
  )
}
