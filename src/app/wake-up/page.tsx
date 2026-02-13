'use client'

import Link from 'next/link'
import EuangelionShellHeader from '@/components/EuangelionShellHeader'
import FadeIn from '@/components/motion/FadeIn'
import StaggerGrid from '@/components/motion/StaggerGrid'
import DevotionalMilestoneReveal from '@/components/newspaper/DevotionalMilestoneReveal'
import { typographer } from '@/lib/typographer'
import { DEVOTIONAL_SERIES, WAKEUP_SERIES_ORDER } from '@/data/series'

export default function WakeUpPage() {
  return (
    <div className="newspaper-home min-h-screen">
      <EuangelionShellHeader />

      {/* Full-viewport Hero */}
      <header className="section-rule grid min-h-[82vh] items-center gap-6 px-6 py-12 text-center md:px-[60px] lg:px-20">
        <DevotionalMilestoneReveal variant="cinematic">
          <h1
            className="text-display mb-6"
            style={{ fontSize: 'clamp(3rem, 8vw, 6rem)', lineHeight: 1 }}
          >
            WAKE UP
          </h1>
        </DevotionalMilestoneReveal>
        <FadeIn delay={0.2} y={0}>
          <p className="text-label vw-small mb-8 text-gold">
            {WAKEUP_SERIES_ORDER.length} SERIES &middot;{' '}
            {WAKEUP_SERIES_ORDER.length * 5} DEVOTIONALS &middot; 5 DAYS EACH
          </p>
        </FadeIn>
        <FadeIn delay={0.4} y={12}>
          <p
            className="text-serif-italic vw-body-lg mx-auto mb-16 text-secondary"
            style={{ maxWidth: '50ch' }}
          >
            {typographer(
              'In a world drowning in noise, Wake Up offers something rare: clarity, rest, and truth. Seven questions for the searching. Five days per question. Ancient structure. Modern urgency.',
            )}
          </p>
        </FadeIn>
        <FadeIn delay={0.6} y={16}>
          <Link
            href="/wake-up/series/identity"
            className="inline-block bg-[var(--color-fg)] px-10 py-5 text-label vw-small text-[var(--color-bg)] transition-all duration-300 hover:bg-gold hover:text-tehom focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold"
            style={{
              transitionTimingFunction: 'cubic-bezier(0, 0, 0.2, 1)',
            }}
          >
            Start with Question 01
          </Link>
        </FadeIn>
      </header>

      {/* Problem Statement — full-width surface */}
      <DevotionalMilestoneReveal
        className="bg-surface section-breathing"
        style={{ borderTop: '2px solid var(--color-border-strong)' }}
        as="section"
      >
        <div className="mx-auto max-w-7xl px-6 md:px-[60px] lg:px-20">
          <div className="mx-auto max-w-3xl text-center">
            <FadeIn>
              <p className="vw-body mb-6 text-secondary">
                {typographer(
                  'We live in apocalyptic times. Political violence. Economic collapse. 43% more anxious than last year. The ground beneath us is shaking.',
                )}
              </p>
            </FadeIn>
            <FadeIn delay={0.1}>
              <p className="text-serif-italic vw-body-lg">
                {typographer(
                  'The seven questions below aren\u2019t easy. But they\u2019re honest. Each one invites you into a 5-day journey to seek first the kingdom\u2014and discover that everything else gets added.',
                )}
              </p>
            </FadeIn>
          </div>
        </div>
      </DevotionalMilestoneReveal>

      {/* How It Works */}
      <DevotionalMilestoneReveal
        className="section-breathing"
        style={{ borderTop: '2px solid var(--color-border-strong)' }}
        as="section"
      >
        <div className="mx-auto max-w-7xl px-6 md:px-[60px] lg:px-20">
          <FadeIn>
            <h2 className="text-label vw-small mb-16 text-center text-gold">
              HOW IT WORKS
            </h2>
          </FadeIn>
          <StaggerGrid className="mx-auto grid max-w-4xl gap-12 text-center md:grid-cols-3 md:gap-16">
            <div>
              <div
                className="mb-4 text-gold"
                style={{
                  fontFamily: 'var(--font-family-serif)',
                  fontSize: 'clamp(2rem, 4vw, 3.5rem)',
                  fontWeight: 300,
                  lineHeight: 1,
                }}
              >
                01
              </div>
              <p className="vw-body text-secondary">
                {typographer('Pick a question that speaks to where you are.')}
              </p>
            </div>
            <div>
              <div
                className="mb-4 text-gold"
                style={{
                  fontFamily: 'var(--font-family-serif)',
                  fontSize: 'clamp(2rem, 4vw, 3.5rem)',
                  fontWeight: 300,
                  lineHeight: 1,
                }}
              >
                02
              </div>
              <p className="vw-body text-secondary">
                {typographer('Read one devotional per day for 5 days.')}
              </p>
            </div>
            <div>
              <div
                className="mb-4 text-gold"
                style={{
                  fontFamily: 'var(--font-family-serif)',
                  fontSize: 'clamp(2rem, 4vw, 3.5rem)',
                  fontWeight: 300,
                  lineHeight: 1,
                }}
              >
                03
              </div>
              <p className="vw-body text-secondary">
                {typographer(
                  'Reflect, journal, and let God reorder your heart.',
                )}
              </p>
            </div>
          </StaggerGrid>
          <FadeIn>
            <p className="vw-body mt-16 text-center text-tertiary">
              {typographer(
                'Each series follows a chiastic arc\u2014building toward a revelation, then reflecting back. Ancient structure. Modern questions.',
              )}
            </p>
          </FadeIn>
        </div>
      </DevotionalMilestoneReveal>

      {/* Seven Questions — the main event */}
      <main
        id="main-content"
        className="section-breathing"
        style={{ borderTop: '2px solid var(--color-border-strong)' }}
      >
        <div className="mx-auto max-w-7xl px-6 md:px-[60px] lg:px-20">
          <FadeIn>
            <h2 className="text-label vw-small mb-16 text-center text-gold md:text-left">
              SEVEN QUESTIONS FOR THE SEARCHING
            </h2>
          </FadeIn>

          <StaggerGrid>
            {DEVOTIONAL_SERIES.map((series) => (
              <Link
                key={series.slug}
                href={`/wake-up/series/${series.slug}`}
                className="block"
              >
                <div
                  className={`group py-10 transition-all duration-300 md:py-14 ${series.isCenter ? 'bg-surface-raised md:-mx-8 md:px-8' : ''}`}
                  style={{
                    borderBottom: '1px solid var(--color-border)',
                    transitionTimingFunction: 'cubic-bezier(0, 0, 0.2, 1)',
                  }}
                >
                  <div className="flex items-start gap-6 md:gap-10">
                    {/* Large section number */}
                    <span
                      className={`shrink-0 transition-colors duration-300 ${series.isCenter ? 'text-gold' : 'text-muted group-hover:text-secondary'}`}
                      style={{
                        fontFamily: 'var(--font-family-serif)',
                        fontSize: 'clamp(1.5rem, 3vw, 2.5rem)',
                        fontWeight: 100,
                        lineHeight: 1.2,
                      }}
                    >
                      {series.number}
                    </span>

                    {/* Question text */}
                    <div className="flex-1">
                      <p className="text-serif-italic vw-body-lg transition-all duration-300 group-hover:translate-x-2">
                        <span className="transition-colors duration-300 group-hover:text-gold">
                          {series.question}
                        </span>
                      </p>
                    </div>

                    {/* BEGIN arrow */}
                    <span className="hidden shrink-0 self-center text-label vw-small text-muted transition-colors duration-300 group-hover:text-[var(--color-text-primary)] md:inline-block">
                      BEGIN &rarr;
                    </span>
                  </div>
                </div>
              </Link>
            ))}
          </StaggerGrid>
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
