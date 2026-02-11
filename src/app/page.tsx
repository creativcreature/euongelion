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
    <div className="newspaper-home min-h-screen">
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

      <main id="main-content">
        <header className="border-subtle border-b pb-12 pt-4 md:pb-14 md:pt-8">
          <div className="mx-auto max-w-[1720px] px-4 md:px-[56px] lg:px-20">
            <FadeIn>
              <div className="newspaper-subrule text-label vw-small mb-6 flex flex-wrap items-center justify-between gap-3 py-2 text-muted">
                <span>HOME EDITION</span>
                <span className="hidden md:inline">
                  SPIRITUAL FORMATION JOURNAL
                </span>
                <span className="hidden lg:inline">Issue 01</span>
              </div>
            </FadeIn>

            <FadeIn delay={0.03}>
              <h1
                className="group text-masthead relative mb-2 w-full cursor-default text-center select-none"
                style={{
                  fontSize: 'clamp(3.75rem, 18vw, 16rem)',
                  lineHeight: 0.88,
                  letterSpacing: '0.13em',
                }}
                aria-label="Euangelion. Good News."
                title="Hover to reveal meaning"
              >
                <span className="block transition-all duration-500 group-hover:-translate-y-8 group-hover:opacity-0">
                  EUANGELION
                </span>
                <span className="pointer-events-none absolute inset-0 block translate-y-8 opacity-0 transition-all duration-500 group-hover:translate-y-0 group-hover:opacity-100">
                  GOOD NEWS
                </span>
              </h1>
              <Navigation variant="newspaper" showSkipLink={false} />
              <p className="vw-body mx-auto mb-10 mt-6 max-w-[40ch] text-center text-secondary type-prose">
                {typographer(
                  'A daily paper for your soul: clear scripture, honest reflection, and one faithful step forward.',
                )}
              </p>
            </FadeIn>

            <div className="newspaper-rule grid gap-8 pt-8 md:grid-cols-12 md:gap-10">
              <article className="md:col-span-7">
                <FadeIn delay={0.05}>
                  <p className="text-label vw-small mb-4 text-gold">
                    LEAD STORY
                  </p>
                  <h2 className="vw-heading-md mb-4 max-w-[22ch]">
                    {typographer('Find your next faithful step today.')}
                  </h2>
                  <p className="vw-body mb-8 max-w-[44ch] text-secondary type-prose">
                    {typographer(
                      'Run a short soul audit and get matched to a focused devotional path for the season you are actually in.',
                    )}
                  </p>
                </FadeIn>

                <FadeIn delay={0.12}>
                  <ul className="newspaper-subrule flex flex-wrap items-center gap-x-6 gap-y-2 py-3">
                    {TRUST_POINTS.map((point) => (
                      <li
                        key={point}
                        className="vw-small flex items-center text-secondary"
                      >
                        <span className="mr-2 text-gold" aria-hidden="true">
                          •
                        </span>
                        {point}
                      </li>
                    ))}
                  </ul>
                </FadeIn>
              </article>

              <aside className="md:col-span-5">
                <FadeIn delay={0.18}>
                  <div id="start-audit" className="newspaper-card p-6 md:p-7">
                    <p className="text-label vw-small mb-4 text-gold">
                      SOUL AUDIT • FRONT PAGE
                    </p>
                    <h2 className="vw-heading-md mb-3">
                      {typographer('What are you wrestling with right now?')}
                    </h2>
                    <p className="vw-small mb-5 text-secondary type-prose">
                      {typographer(
                        'Write one honest paragraph and we will match you with your best next series.',
                      )}
                    </p>

                    {limitReached ? (
                      <div className="text-center">
                        <p className="text-serif-italic vw-body mb-6 text-secondary">
                          {typographer(
                            'You\u2019ve explored enough. Time to dive in.',
                          )}
                        </p>
                        <Link
                          href="/series"
                          className="text-label vw-small inline-block w-full border border-[var(--color-text-primary)] bg-[var(--color-text-primary)] px-8 py-3 text-[var(--color-bg)] transition-colors duration-200 hover:bg-transparent hover:text-[var(--color-text-primary)]"
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
                          className="text-serif-italic vw-body mb-4 w-full resize-none border border-subtle bg-[rgba(255,255,255,0.65)] p-5 text-[var(--color-text-primary)] placeholder-[var(--color-text-muted)] focus:outline-none"
                          style={{ lineHeight: 1.7 }}
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
                          className="text-label vw-small w-full border border-[var(--color-text-primary)] bg-[var(--color-text-primary)] px-8 py-3 text-[var(--color-bg)] transition-colors duration-200 hover:bg-transparent hover:text-[var(--color-text-primary)] disabled:opacity-50"
                        >
                          {isSubmitting
                            ? 'Finding Your Match...'
                            : 'Get My Match'}
                        </button>

                        <p className="vw-small mt-4 text-center text-muted">
                          No account required. Start reading immediately.
                        </p>
                      </>
                    )}
                  </div>
                </FadeIn>
              </aside>
            </div>
          </div>
        </header>

        {auditResults && (
          <section
            ref={resultsRef}
            className="border-subtle border-b py-14 md:py-16 lg:py-20"
          >
            <div className="mx-auto max-w-[1720px] px-6 md:px-[56px] lg:px-20">
              <FadeIn>
                <div className="newspaper-subrule mb-10 py-3 text-center">
                  <p className="text-label vw-small mb-2 text-gold">
                    YOUR BEST NEXT SERIES
                  </p>
                  <h2 className="text-serif-italic vw-heading-md">
                    {typographer('Start here today.')}
                  </h2>
                </div>
              </FadeIn>

              <StaggerGrid className="grid gap-6 md:grid-cols-3">
                {auditResults.matches.slice(0, 3).map((match, index) => (
                  <Link
                    key={match.slug}
                    href={`/wake-up/series/${match.slug}`}
                    className="group block"
                  >
                    <div
                      className="newspaper-card flex h-full flex-col overflow-hidden transition-colors duration-200"
                      style={{
                        borderColor:
                          index === 0
                            ? 'var(--color-border-strong)'
                            : 'var(--color-border)',
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
                        <p className="text-serif-italic vw-body mb-3 flex-1 transition-colors duration-200 group-hover:text-gold">
                          {typographer(match.question)}
                        </p>
                        {match.reasoning && (
                          <p className="vw-small mb-4 text-tertiary type-prose">
                            {typographer(match.reasoning)}
                          </p>
                        )}
                        <div className="newspaper-rule mb-3" />
                        <div className="flex items-center justify-between">
                          <span className="text-label vw-small text-muted oldstyle-nums">
                            {SERIES_DATA[match.slug]?.days.length || '?'} DAYS
                          </span>
                          <span className="text-label vw-small text-muted transition-colors duration-200 group-hover:text-[var(--color-text-primary)]">
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

        <section className="border-subtle border-b py-14 md:py-16 lg:py-20">
          <div className="mx-auto max-w-[1720px] px-6 md:px-[56px] lg:px-20">
            <FadeIn>
              <div className="newspaper-subrule mx-auto mb-10 max-w-4xl py-3 text-center">
                <p className="text-label vw-small mb-2 text-gold">THE FLOW</p>
                <h2 className="vw-heading-md mb-3">
                  {typographer('How this works')}
                </h2>
                <p className="vw-body mx-auto max-w-[36ch] text-secondary type-prose">
                  {typographer(
                    'Clear, daily progress designed for consistency and traction.',
                  )}
                </p>
              </div>
            </FadeIn>

            <StaggerGrid className="grid gap-6 md:grid-cols-3">
              {FLOW_STEPS.map((step) => (
                <article
                  key={step.id}
                  className="newspaper-card flex h-full flex-col p-6"
                >
                  <p className="text-gold oldstyle-nums vw-heading-md mb-3">
                    {step.id}
                  </p>
                  <h3 className="vw-body mb-3 text-[var(--color-text-primary)]">
                    {typographer(step.title)}
                  </h3>
                  <p className="vw-small text-secondary type-prose">
                    {typographer(step.body)}
                  </p>
                </article>
              ))}
            </StaggerGrid>
          </div>
        </section>

        <section className="border-subtle border-b py-14 md:py-16 lg:py-20">
          <div className="mx-auto max-w-[1720px] px-6 md:px-[56px] lg:px-20">
            <FadeIn>
              <div className="newspaper-subrule mx-auto mb-10 max-w-4xl py-3 text-center">
                <p className="text-label vw-small mb-2 text-gold">
                  FEATURED STORIES
                </p>
                <h2 className="vw-heading-md mb-3">
                  {typographer('Featured series')}
                </h2>
                <p className="vw-body mx-auto max-w-[42ch] text-secondary type-prose">
                  {typographer(
                    'Choose a guided path for the exact struggle you are carrying.',
                  )}
                </p>
              </div>
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
                    <div className="newspaper-card overflow-hidden transition-colors duration-200">
                      <SeriesHero seriesSlug={slug} size="card" overlay />
                      <div className="p-6">
                        <p className="text-label vw-small mb-2 text-gold">
                          {series.title.toUpperCase()}
                        </p>
                        <div className="newspaper-rule mb-3" />
                        <p className="text-serif-italic vw-body transition-colors duration-200 group-hover:text-gold">
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
              <div className="mt-10 text-center">
                <Link
                  href="/series"
                  className="text-label vw-small inline-block border-b border-subtle px-4 pb-1 text-muted transition-colors duration-200 hover:text-[var(--color-text-primary)]"
                >
                  View All {ALL_SERIES_ORDER.length} Series
                </Link>
              </div>
            </FadeIn>
          </div>
        </section>

        <section className="border-subtle border-b py-14 md:py-16 lg:py-20">
          <div className="mx-auto max-w-[1720px] px-6 md:px-[56px] lg:px-20">
            <FadeIn>
              <div className="newspaper-subrule mx-auto mb-10 max-w-4xl py-3 text-center">
                <p className="text-label vw-small mb-2 text-gold">HELP DESK</p>
                <h2 className="vw-heading-md">
                  {typographer('Common questions')}
                </h2>
              </div>
            </FadeIn>

            <StaggerGrid className="grid gap-6 md:grid-cols-3">
              {FAQ_ITEMS.map((item) => (
                <article
                  key={item.question}
                  className="newspaper-card h-full p-6"
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

        <section className="py-14 md:py-16 lg:py-20">
          <div className="mx-auto max-w-[1720px] px-6 md:px-[56px] lg:px-20">
            <FadeIn>
              <div className="newspaper-card mx-auto max-w-4xl p-8 text-center md:p-10">
                <p className="text-label vw-small mb-4 text-gold">
                  READY TO BEGIN?
                </p>
                <h2 className="text-serif-italic vw-heading-md mb-5">
                  {typographer('Start with one honest sentence.')}
                </h2>
                <p className="vw-body mx-auto mb-8 max-w-[36ch] text-secondary type-prose">
                  {typographer(
                    'You do not need certainty before you begin. You need a next step.',
                  )}
                </p>
                <div className="flex flex-col justify-center gap-3 sm:flex-row">
                  <a
                    href="#start-audit"
                    className="text-label vw-small border border-[var(--color-text-primary)] bg-[var(--color-text-primary)] px-8 py-3 text-[var(--color-bg)] transition-colors duration-200 hover:bg-transparent hover:text-[var(--color-text-primary)]"
                  >
                    Take Soul Audit
                  </a>
                  <Link
                    href="/series"
                    className="text-label vw-small border border-subtle px-8 py-3 text-[var(--color-text-primary)] transition-colors duration-200 hover:border-[var(--color-text-primary)]"
                  >
                    Browse Series
                  </Link>
                </div>
              </div>
            </FadeIn>
          </div>
        </section>
      </main>

      <footer className="border-subtle border-t py-14 md:py-16">
        <div className="mx-auto max-w-[1720px] px-6 md:px-[56px] lg:px-20">
          <div className="text-center">
            <p
              className="text-label vw-small leading-relaxed text-muted type-caption"
              style={{ letterSpacing: '0.2em' }}
            >
              SOMETHING TO HOLD ONTO.
            </p>
            <div className="mt-6 flex items-center justify-center gap-6">
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
            <p className="vw-small mt-5 text-muted oldstyle-nums">
              &copy; 2026 EUANGELION
            </p>
          </div>
        </div>
      </footer>
    </div>
  )
}
