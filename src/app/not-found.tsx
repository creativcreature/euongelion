import Link from 'next/link'
import EuangelionShellHeader from '@/components/EuangelionShellHeader'

export default function NotFound() {
  return (
    <div className="newspaper-home min-h-screen">
      <EuangelionShellHeader />

      <main
        id="main-content"
        className="flex min-h-[calc(100vh-64px)] flex-col items-center justify-center px-6 text-center"
      >
        <p className="text-label vw-small mb-6 text-gold">404</p>
        <h1 className="text-serif-italic vw-heading-md mb-6">
          This page doesn&apos;t exist.
        </h1>
        <p
          className="vw-body mb-10 text-secondary"
          style={{ maxWidth: '40ch' }}
        >
          Whatever you were looking for, it&apos;s not here. But there&apos;s
          plenty that is.
        </p>
        <div className="flex items-center gap-6">
          <Link
            href="/"
            className="bg-[var(--color-fg)] px-8 py-4 text-label vw-small text-[var(--color-bg)] transition-all duration-300 hover:bg-gold hover:text-tehom"
          >
            Go Home
          </Link>
          <Link
            href="/series"
            className="vw-small text-muted transition-colors duration-200 hover:text-[var(--color-text-primary)]"
          >
            Browse Series
          </Link>
        </div>
      </main>
    </div>
  )
}
