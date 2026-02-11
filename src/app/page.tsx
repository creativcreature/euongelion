'use client'

import { useRef, useState, useSyncExternalStore } from 'react'
import Link from 'next/link'
import Navigation from '@/components/Navigation'
import SeriesHero from '@/components/SeriesHero'
import FadeIn from '@/components/motion/FadeIn'
import StaggerGrid from '@/components/motion/StaggerGrid'
import { useSoulAuditStore } from '@/stores/soulAuditStore'
import { typographer } from '@/lib/typographer'
import { SERIES_DATA, FEATURED_SERIES, ALL_SERIES_ORDER } from '@/data/series'

const emptySubscribe = () => () => {}

const TRUST_POINTS = [
  'No account required',
  '5-7 minutes per day',
  'Biblically grounded',
]

const FLOW_STEPS = [
  {
    id: '01',
    title: 'Name what you are carrying',
    body: 'Tell us what you are wrestling with and we will point you to a fitting series.',
  },
  {
    id: '02',
    title: 'Read one short devotional daily',
    body: 'Each day is designed to be doable and deep: scripture, reflection, prayer, and action.',
  },
  {
    id: '03',
    title: 'Build traction, not guilt',
    body: 'You keep moving with clear next steps instead of getting stuck in spiritual overwhelm.',
  },
]

const FAQ_ITEMS = [
  {
    question: 'What if I am skeptical or spiritually numb?',
    answer:
      'This is built for honest questions, not polished church answers. You can start exactly where you are.',
  },
  {
    question: 'How much time do I need each day?',
    answer:
      'Most days are 5-7 minutes. Long enough to matter, short enough to sustain.',
  },
  {
    question: 'Do I need to sign up first?',
    answer:
      'No. You can run a soul audit and start reading immediately. Account features are optional.',
  },
]

export default function Home() {
  const [auditText, setAuditText] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const resultsRef = useRef<HTMLDivElement>(null)
  const hydrated = useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false,
  )
  const { auditCount, recordAudit, hasReachedLimit } = useSoulAuditStore()
  const limitReached = hydrated && hasReachedLimit()

  const [auditResults, setAuditResults] = useState<{
    matches: Array<{
      slug: string
      title: string
      question: string
      confidence: number
      reasoning: string
      preview?: { verse: string; paragraph: string }
    }>
  } | null>(null)

  async function handleAuditSubmit() {
    if (limitReached) {
      setError('You\u2019ve explored enough. Time to dive in.')
      return
    }

    const trimmed = auditText.trim()
    if (trimmed.length === 0) {
      setError('Take your time. When you\u2019re ready, just write what comes.')
      return
    }
    if (trimmed.length < 10) {
      setError('Say a little more. Even one sentence helps.')
      return
    }

    setIsSubmitting(true)
    setError(null)

    try {
      const res = await fetch('/api/soul-audit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ response: trimmed }),
      })

      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(
          data.error ||
            'Something broke. It\u2019s not you. We\u2019re working on it.',
        )
      }

      const data = await res.json()
      sessionStorage.setItem('soul-audit-result', JSON.stringify(data))

      if (data.matches) {
        setAuditResults(data)
        recordAudit(trimmed, data)
      } else if (data.match) {
        const matches = [
          data.match,
          ...(data.alternatives || []).map(
            (alt: { slug: string; title: string; question: string }) => ({
              ...alt,
              confidence: 0.7,
              reasoning: '',
            }),
          ),
        ].slice(0, 3)
        setAuditResults({ matches })
        recordAudit(trimmed, { matches })
      }

      setTimeout(() => {
        resultsRef.current?.scrollIntoView({
          behavior: 'smooth',
          block: 'start',
        })
      }, 100)
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Something broke. Try again.',
      )
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen bg-page">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'WebSite',
            name: 'Euangelion',
            url: 'https://euangelion.app',
            description:
              'Daily bread for the cluttered, hungry soul. Christian devotional series for people who believe, used to believe, or want to believe.',
            publisher: {
              '@type': 'Organization',
              name: 'Euangelion',
              url: 'https://euangelion.app',
            },
          }),
        }}
      />

      <Navigation />

      <main id="main-content">
        <header
          className="section-breathing"
          style={{ borderBottom: '1px solid var(--color-border)' }}
        >
          <div className="mx-auto grid max-w-7xl gap-12 px-6 md:grid-cols-12 md:px-[60px] lg:px-20">
            <div className="md:col-span-7">
              <FadeIn>
                <p className="text-label vw-small mb-6 text-gold">
                  DAILY GUIDANCE FOR REAL STRUGGLES
                </p>
                <h1 className="vw-heading-xl mb-6 max-w-[16ch]">
                  {typographer('Find your next faithful step.')}
                </h1>
                <p className="vw-body-lg mb-8 max-w-[36ch] text-secondary type-prose">
                  {typographer(
                    'Euangelion helps you move from spiritual fog to practical next steps through short, honest, scripture-rooted devotionals.',
                  )}
                </p>
              </FadeIn>

              <FadeIn delay={0.1}>
                <div className="mb-8 flex flex-col gap-4 sm:flex-row">
                  <a
                    href="#start-audit"
                    className="bg-[var(--color-fg)] px-8 py-4 text-center text-label vw-small text-[var(--color-bg)] transition-all duration-300 hover:bg-gold hover:text-tehom"
                  >
                    Start 2-Minute Soul Audit
                  </a>
                  <Link
                    href="/series"
                    className="border px-8 py-4 text-center text-label vw-small text-[var(--color-text-primary)] transition-colors duration-300 hover:border-gold hover:text-gold"
                    style={{ borderColor: 'var(--color-border)' }}
                  >
                    Browse Series Library
                  </Link>
                </div>
              </FadeIn>

              <FadeIn delay={0.15}>
                <div className="grid gap-3 sm:grid-cols-3">
                  {TRUST_POINTS.map((point) => (
                    <div
                      key={point}
                      className="px-4 py-3 text-center text-label vw-small text-muted"
                      style={{ border: '1px solid var(--color-border)' }}
                    >
                      {point}
                    </div>
                  ))}
                </div>
              </FadeIn>
            </div>

            <div className="md:col-span-5">
              <FadeIn delay={0.2}>
                <div
                  className="bg-surface-raised p-7"
                  style={{ border: '1px solid var(--color-border)' }}
                >
                  <p className="text-label vw-small mb-4 text-gold">
                    WHAT YOU GET THIS WEEK
                  </p>
                  <ul className="space-y-4">
                    <li className="vw-body text-secondary type-prose">
                      {typographer(
                        'A clear starting point based on your actual struggle.',
                      )}
                    </li>
                    <li className="vw-body text-secondary type-prose">
                      {typographer(
                        'A focused daily reading rhythm without information overload.',
                      )}
                    </li>
                    <li className="vw-body text-secondary type-prose">
                      {typographer(
                        'Concrete reflection prompts that turn insight into action.',
                      )}
                    </li>
                  </ul>
                  <div
                    className="mt-6 pt-6"
                    style={{ borderTop: '1px solid var(--color-border)' }}
                  >
                    <Link
                      href="/wake-up"
                      className="text-label vw-small text-muted transition-colors duration-300 hover:text-[var(--color-text-primary)]"
                    >
                      Explore Wake-Up Magazine &rarr;
                    </Link>
                  </div>
                </div>
              </FadeIn>
            </div>
          </div>
        </header>

        <section
          id="start-audit"
          className="section-breathing"
          style={{ borderBottom: '1px solid var(--color-border)' }}
        >
          <div className="mx-auto max-w-4xl px-6 md:px-[60px] lg:px-20">
            <FadeIn>
              <p className="text-label vw-small mb-6 text-center text-gold">
                START HERE
              </p>
              <h2 className="vw-heading-md mb-4 text-center">
                {typographer('What are you wrestling with right now?')}
              </h2>
              <p className="vw-body mb-10 text-center text-secondary type-prose">
                {typographer(
                  'Write honestly. We will match you to the best next series in seconds.',
                )}
              </p>
            </FadeIn>

            <FadeIn delay={0.1}>
              <div
                className="bg-surface-raised p-6 md:p-8"
                style={{ border: '1px solid var(--color-border)' }}
              >
                {limitReached ? (
                  <div className="text-center">
                    <p className="text-serif-italic vw-body-lg mb-8 text-secondary">
                      {typographer(
                        'You\u2019ve explored enough. Time to dive in.',
                      )}
                    </p>
                    <Link
                      href="/series"
                      className="inline-block w-full bg-[var(--color-fg)] px-10 py-4 text-label vw-small text-[var(--color-bg)] transition-all duration-300 hover:bg-gold hover:text-tehom"
                    >
                      Browse All Series &rarr;
                    </Link>
                  </div>
                ) : (
                  <>
                    {hydrated && auditCount > 0 && (
                      <p className="vw-small mb-4 text-center text-muted oldstyle-nums">
                        Audit {auditCount + 1} of 3
                      </p>
                    )}

                    <textarea
                      value={auditText}
                      onChange={(e) => {
                        setAuditText(e.target.value)
                        setError(null)
                      }}
                      placeholder="Lately, I've been..."
                      rows={4}
                      disabled={isSubmitting}
                      className="mb-4 w-full resize-none bg-surface p-5 text-serif-italic vw-body text-[var(--color-text-primary)] placeholder-[var(--color-text-muted)] focus:outline-none"
                      style={{
                        border: '1px solid var(--color-border)',
                        lineHeight: 1.7,
                      }}
                      onFocus={(e) => {
                        e.target.style.borderColor = 'var(--color-gold)'
                      }}
                      onBlur={(e) => {
                        e.target.style.borderColor = 'var(--color-border)'
                      }}
                    />

                    {error && (
                      <p className="vw-small mb-4 text-center text-secondary">
                        {error}
                      </p>
                    )}

                    <button
                      onClick={handleAuditSubmit}
                      disabled={isSubmitting}
                      className="w-full bg-[var(--color-fg)] px-10 py-4 text-label vw-small text-[var(--color-bg)] transition-all duration-300 hover:bg-gold hover:text-tehom disabled:opacity-50"
                    >
                      {isSubmitting ? 'Finding Your Match...' : 'Get My Match'}
                    </button>

                    <p className="vw-small mt-4 text-center text-muted">
                      No account required. You can start reading immediately.
                    </p>
                  </>
                )}
              </div>
            </FadeIn>
          </div>
        </section>

        {auditResults && (
          <section
            ref={resultsRef}
            className="section-breathing"
            style={{ borderBottom: '1px solid var(--color-border)' }}
          >
            <div className="mx-auto max-w-7xl px-6 md:px-[60px] lg:px-20">
              <FadeIn>
                <p className="text-label vw-small mb-6 text-center text-gold">
                  YOUR BEST NEXT SERIES
                </p>
                <h2 className="text-serif-italic vw-heading-md mb-12 text-center">
                  {typographer('Start with one of these today.')}
                </h2>
              </FadeIn>

              <StaggerGrid className="grid gap-6 md:grid-cols-3">
                {auditResults.matches.slice(0, 3).map((match, index) => (
                  <Link
                    key={match.slug}
                    href={`/wake-up/series/${match.slug}`}
                    className="group block"
                  >
                    <div
                      className="flex h-full flex-col overflow-hidden transition-all duration-300"
                      style={{
                        border: `1px solid ${index === 0 ? 'var(--color-gold)' : 'var(--color-border)'}`,
                      }}
                    >
                      <SeriesHero
                        seriesSlug={match.slug}
                        size="thumbnail"
                        overlay
                      />
                      <div className="flex flex-1 flex-col p-6">
                        <p className="text-label vw-small mb-3 text-gold">
                          {SERIES_DATA[match.slug]?.title || match.title}
                        </p>
                        <p className="text-serif-italic vw-body mb-3 flex-1 transition-colors duration-300 group-hover:text-gold">
                          {typographer(match.question)}
                        </p>
                        {match.reasoning && (
                          <p className="vw-small mb-4 text-tertiary type-prose">
                            {typographer(match.reasoning)}
                          </p>
                        )}
                        <div className="flex items-center justify-between">
                          <span className="text-label vw-small text-muted oldstyle-nums">
                            {SERIES_DATA[match.slug]?.days.length || '?'} DAYS
                          </span>
                          <span className="text-label vw-small text-muted transition-colors duration-300 group-hover:text-[var(--color-text-primary)]">
                            START &rarr;
                          </span>
                        </div>
                      </div>
                    </div>
                  </Link>
                ))}
              </StaggerGrid>
            </div>
          </section>
        )}

        <section
          className="dot-pattern section-breathing"
          style={{ borderBottom: '1px solid var(--color-border)' }}
        >
          <div className="mx-auto max-w-7xl px-6 md:px-[60px] lg:px-20">
            <FadeIn>
              <h2 className="vw-heading-md mb-4 text-center">
                {typographer('How this works')}
              </h2>
              <p className="vw-body mx-auto mb-12 text-center text-secondary type-prose">
                {typographer(
                  'A simple flow built to help you move forward quickly, not get stuck in more content.',
                )}
              </p>
            </FadeIn>

            <StaggerGrid className="mx-auto grid max-w-5xl gap-6 md:grid-cols-3">
              {FLOW_STEPS.map((step) => (
                <div
                  key={step.id}
                  className="p-6 text-center"
                  style={{ border: '1px solid var(--color-border)' }}
                >
                  <p className="text-gold oldstyle-nums mb-3 vw-heading-md">
                    {step.id}
                  </p>
                  <h3 className="vw-body mb-3 text-[var(--color-text-primary)]">
                    {typographer(step.title)}
                  </h3>
                  <p className="vw-small text-secondary type-prose">
                    {typographer(step.body)}
                  </p>
                </div>
              ))}
            </StaggerGrid>
          </div>
        </section>

        <section
          className="section-breathing"
          style={{ borderBottom: '1px solid var(--color-border)' }}
        >
          <div className="mx-auto max-w-7xl px-6 md:px-[60px] lg:px-20">
            <FadeIn>
              <h2 className="vw-heading-md mb-4 text-center">
                {typographer('Featured series')}
              </h2>
              <p className="vw-body mx-auto mb-12 text-center text-secondary type-prose">
                {typographer(
                  'Start with a proven path used by readers navigating doubt, burnout, grief, and renewal.',
                )}
              </p>
            </FadeIn>

            <StaggerGrid className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
              {FEATURED_SERIES.map((slug) => {
                const series = SERIES_DATA[slug]
                if (!series) return null
                return (
                  <Link
                    key={slug}
                    href={`/wake-up/series/${slug}`}
                    className="group block"
                  >
                    <div
                      className="overflow-hidden transition-all duration-300"
                      style={{ border: '1px solid var(--color-border)' }}
                    >
                      <SeriesHero seriesSlug={slug} size="card" overlay />
                      <div className="p-6">
                        <p className="text-label vw-small mb-2 text-gold">
                          {series.title.toUpperCase()}
                        </p>
                        <div
                          className="mb-3"
                          style={{
                            height: '1px',
                            background: 'var(--color-gold)',
                            opacity: 0.2,
                          }}
                        />
                        <p className="text-serif-italic vw-body transition-colors duration-300 group-hover:text-gold">
                          {typographer(series.question)}
                        </p>
                        <p className="vw-small mt-4 text-muted oldstyle-nums">
                          {series.days.length} DAYS
                        </p>
                      </div>
                    </div>
                  </Link>
                )
              })}
            </StaggerGrid>

            <FadeIn>
              <div className="mt-12 text-center">
                <Link
                  href="/series"
                  className="inline-block px-10 py-4 text-label vw-small text-muted transition-all duration-300 hover:text-[var(--color-text-primary)]"
                  style={{ borderBottom: '1px solid var(--color-border)' }}
                >
                  View All {ALL_SERIES_ORDER.length} Series
                </Link>
              </div>
            </FadeIn>
          </div>
        </section>

        <section
          className="section-breathing"
          style={{ borderBottom: '1px solid var(--color-border)' }}
        >
          <div className="mx-auto max-w-7xl px-6 md:px-[60px] lg:px-20">
            <FadeIn>
              <h2 className="vw-heading-md mb-12 text-center">
                {typographer('Common questions')}
              </h2>
            </FadeIn>

            <StaggerGrid className="grid gap-6 md:grid-cols-3">
              {FAQ_ITEMS.map((item) => (
                <article
                  key={item.question}
                  className="h-full p-6"
                  style={{ border: '1px solid var(--color-border)' }}
                >
                  <h3 className="vw-body mb-3 text-[var(--color-text-primary)]">
                    {typographer(item.question)}
                  </h3>
                  <p className="vw-small text-secondary type-prose">
                    {typographer(item.answer)}
                  </p>
                </article>
              ))}
            </StaggerGrid>
          </div>
        </section>

        <section className="bg-surface section-breathing">
          <div className="mx-auto max-w-4xl px-6 text-center md:px-[60px] lg:px-20">
            <FadeIn>
              <p className="text-label vw-small mb-6 text-gold">
                READY TO BEGIN?
              </p>
              <h2 className="text-serif-italic vw-heading-md mb-6">
                {typographer('Start with one honest sentence.')}
              </h2>
              <p className="vw-body mx-auto mb-10 text-secondary type-prose">
                {typographer(
                  'You do not need certainty before you begin. You need a next step.',
                )}
              </p>
              <div className="flex flex-col justify-center gap-4 sm:flex-row">
                <a
                  href="#start-audit"
                  className="bg-[var(--color-fg)] px-10 py-4 text-label vw-small text-[var(--color-bg)] transition-all duration-300 hover:bg-gold hover:text-tehom"
                >
                  Take Soul Audit
                </a>
                <Link
                  href="/series"
                  className="border px-10 py-4 text-label vw-small text-[var(--color-text-primary)] transition-colors duration-300 hover:border-gold hover:text-gold"
                  style={{ borderColor: 'var(--color-border)' }}
                >
                  Browse Series
                </Link>
              </div>
            </FadeIn>
          </div>
        </section>
      </main>

      <footer
        className="py-16 md:py-20"
        style={{ borderTop: '1px solid var(--color-border)' }}
      >
        <div className="mx-auto max-w-7xl px-6 md:px-[60px] lg:px-20">
          <div className="text-center">
            <p
              className="text-label vw-small leading-relaxed text-muted type-caption"
              style={{ letterSpacing: '0.2em' }}
            >
              SOMETHING TO HOLD ONTO.
            </p>
            <div className="mt-8 flex items-center justify-center gap-6">
              <Link
                href="/privacy"
                className="vw-small text-muted transition-colors duration-200 hover:text-[var(--color-text-primary)]"
              >
                Privacy
              </Link>
              <Link
                href="/terms"
                className="vw-small text-muted transition-colors duration-200 hover:text-[var(--color-text-primary)]"
              >
                Terms
              </Link>
            </div>
            <p className="vw-small mt-6 text-muted oldstyle-nums">
              &copy; 2026 EUANGELION
            </p>
          </div>
        </div>
      </footer>
    </div>
  )
}
