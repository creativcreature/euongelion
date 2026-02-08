'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Navigation from '@/components/Navigation'

interface AuditResult {
  crisis: boolean
  message?: string
  resources?: Array<{ name: string; contact: string }>
  match: {
    slug: string
    title: string
    question: string
    confidence: number
    reasoning: string
  }
  alternatives: Array<{
    slug: string
    title: string
    question: string
  }>
}

export default function SoulAuditResultsPage() {
  const [result] = useState<AuditResult | null>(() => {
    if (typeof window === 'undefined') return null
    const stored = sessionStorage.getItem('soul-audit-result')
    return stored ? JSON.parse(stored) : null
  })
  const router = useRouter()

  useEffect(() => {
    if (!result) {
      router.push('/soul-audit')
    }
  }, [result, router])

  useEffect(() => {
    if (!result) return

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('gentle-rise')
          }
        })
      },
      { threshold: 0.15 },
    )

    const elements = document.querySelectorAll('.observe-fade')
    elements.forEach((el) => observer.observe(el))

    return () => observer.disconnect()
  }, [result])

  if (!result) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-page">
        <p className="text-muted">Loading...</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-page">
      <Navigation />

      <main
        id="main-content"
        className="mx-auto max-w-3xl px-6 pb-32 pt-12 md:px-[60px] md:pb-48 md:pt-20"
      >
        {/* Crisis Response */}
        {result.crisis && result.resources && (
          <div
            className="observe-fade mb-16 p-8 md:p-12"
            style={{
              backgroundColor: 'var(--color-surface-raised)',
              border: '1px solid var(--color-border)',
            }}
          >
            <h2 className="text-serif-italic vw-heading-md mb-6">
              We hear you.
            </h2>
            <p className="vw-body mb-6 leading-relaxed text-secondary">
              What you&apos;re carrying sounds incredibly heavy. Before we
              continue, we want you to know: you matter, and there are people
              who want to help.
            </p>
            <div className="mb-8 space-y-4">
              {result.resources.map((resource) => (
                <div key={resource.name} className="flex items-center gap-4">
                  <span className="text-label vw-small text-gold">
                    {resource.contact}
                  </span>
                  <span className="vw-body text-secondary">
                    {resource.name}
                  </span>
                </div>
              ))}
            </div>
            <p className="vw-body text-secondary">
              God sees you. He hasn&apos;t forgotten you.
            </p>
          </div>
        )}

        {/* Match Header */}
        <div className="observe-fade mb-6 text-center">
          <p className="text-label vw-small mb-6 text-gold">
            {result.crisis ? "WHEN YOU'RE READY" : 'WE FOUND SOMETHING FOR YOU'}
          </p>
          <h1 className="text-serif-italic vw-heading-md mb-8">
            {result.crisis
              ? "When you're ready, we have words of hope waiting."
              : "Here's where we'll start."}
          </h1>
          <p
            className="vw-body mx-auto text-secondary"
            style={{ maxWidth: '50ch' }}
          >
            {result.match.reasoning}
          </p>
        </div>

        {/* Primary Match */}
        <Link
          href={`/wake-up/series/${result.match.slug}`}
          className="observe-fade group mt-12 block"
        >
          <div
            className="p-8 transition-all duration-300 md:p-12"
            style={{
              backgroundColor: 'var(--color-surface-raised)',
              border: '1px solid var(--color-border)',
              transitionTimingFunction: 'cubic-bezier(0, 0, 0.2, 1)',
            }}
          >
            <p className="text-label vw-small mb-4 text-gold">YOUR SERIES</p>
            <h2 className="text-serif-italic vw-heading-md mb-4 transition-colors duration-300 group-hover:text-gold">
              {result.match.question}
            </h2>
            <div className="mt-8 flex items-center justify-between">
              <span className="text-label vw-small text-muted">
                5-DAY JOURNEY
              </span>
              <span className="text-label vw-small text-muted transition-colors duration-300 group-hover:text-[var(--color-text-primary)]">
                START READING &rarr;
              </span>
            </div>
          </div>
        </Link>

        {/* Alternatives */}
        {result.alternatives.length > 0 && (
          <div className="observe-fade mt-16">
            <p className="text-label vw-small mb-8 text-muted">ALSO CONSIDER</p>
            <div className="space-y-4">
              {result.alternatives.map((alt) => (
                <Link
                  key={alt.slug}
                  href={`/wake-up/series/${alt.slug}`}
                  className="group block"
                >
                  <div
                    className="flex items-center justify-between py-6 transition-all duration-300"
                    style={{
                      borderBottom: '1px solid var(--color-border)',
                      transitionTimingFunction: 'cubic-bezier(0, 0, 0.2, 1)',
                    }}
                  >
                    <p className="text-serif-italic vw-body-lg transition-all duration-300 group-hover:translate-x-2 group-hover:text-gold">
                      {alt.question}
                    </p>
                    <span className="hidden shrink-0 pl-6 text-label vw-small text-muted transition-colors duration-300 group-hover:text-[var(--color-text-primary)] md:inline">
                      BEGIN &rarr;
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* Browse All */}
        <div className="observe-fade mt-16 text-center">
          <p className="vw-body mb-6 text-secondary">
            Not quite right? You can always explore on your own.
          </p>
          <Link
            href="/wake-up"
            className="inline-block px-10 py-5 text-label vw-small text-muted transition-all duration-300 hover:text-[var(--color-text-primary)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold"
            style={{
              borderBottom: '1px solid var(--color-border)',
              transitionTimingFunction: 'cubic-bezier(0, 0, 0.2, 1)',
            }}
          >
            Browse All Series
          </Link>
        </div>
      </main>

      {/* Footer */}
      <footer
        className="py-16 md:py-24"
        style={{ borderTop: '1px solid var(--color-border)' }}
      >
        <div className="mx-auto max-w-7xl px-6 md:px-[60px] lg:px-20">
          <div className="text-center">
            <p className="text-label vw-small leading-relaxed text-muted">
              SOMETHING TO HOLD ONTO.
            </p>
            <p className="vw-small mt-8 text-muted">&copy; 2026 EUANGELION</p>
          </div>
        </div>
      </footer>
    </div>
  )
}
