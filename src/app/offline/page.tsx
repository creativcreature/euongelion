import Link from 'next/link'

export const metadata = {
  title: 'Offline',
}

export default function OfflinePage() {
  return (
    <main
      id="main-content"
      className="flex min-h-screen flex-col items-center justify-center bg-page px-6 text-center"
    >
      <p
        className="mb-8 text-gold"
        style={{
          fontFamily: 'var(--font-family-serif)',
          fontSize: 'clamp(2rem, 5vw, 3.5rem)',
          fontWeight: 300,
          lineHeight: 1.1,
        }}
      >
        You&rsquo;re offline.
      </p>
      <p
        className="text-serif-italic vw-body-lg mb-12 text-secondary"
        style={{ maxWidth: '50ch' }}
      >
        Previously read devotionals are still available. When you reconnect,
        everything will sync.
      </p>
      <Link
        href="/"
        className="text-label vw-small text-muted transition-colors duration-300 hover:text-[var(--color-text-primary)]"
      >
        Try Again &rarr;
      </Link>
    </main>
  )
}
