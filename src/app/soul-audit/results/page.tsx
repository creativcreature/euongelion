'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Navigation from '@/components/Navigation'
import SeriesHero from '@/components/SeriesHero'
import ShareButton from '@/components/ShareButton'
import FadeIn from '@/components/motion/FadeIn'
import StaggerGrid from '@/components/motion/StaggerGrid'
import { typographer } from '@/lib/typographer'
import { SERIES_DATA } from '@/data/series'
import type { AuditMatch, SoulAuditResponse } from '@/types/soul-audit'

function normalizeSoulAuditResponse(
  data: Partial<SoulAuditResponse>,
): SoulAuditResponse {
  const customPlan =
    data.customPlan &&
    Array.isArray(data.customPlan.days) &&
    data.customPlan.days.length > 0
      ? data.customPlan
      : data.customDevotional
        ? {
            title: 'Your Custom Plan',
            summary: 'A temporary plan crafted from what you shared.',
            generatedAt:
              data.customDevotional.generatedAt || new Date().toISOString(),
            days: [
              {
                day: 1,
                chiasticPosition: 'A' as const,
                title: data.customDevotional.title,
                scriptureReference: data.customDevotional.scriptureReference,
                scriptureText: data.customDevotional.scriptureText,
                reflection: data.customDevotional.reflection,
                prayer: data.customDevotional.prayer,
                nextStep: data.customDevotional.nextStep,
                journalPrompt: data.customDevotional.journalPrompt,
              },
            ],
          }
        : undefined

  return {
    crisis: Boolean(data.crisis),
    message: data.message,
    resources: data.resources,
    customPlan,
    customDevotional: data.customDevotional,
    matches: Array.isArray(data.matches)
      ? data.matches
      : data.match
        ? [
            data.match,
            ...((data.alternatives || []).map((alt) => ({
              ...alt,
              confidence: 0.7,
              reasoning: '',
            })) || []),
          ].slice(0, 3)
        : [],
  }
}

export default function SoulAuditResultsPage() {
  const [result] = useState<SoulAuditResponse | null>(() => {
    if (typeof window === 'undefined') return null
    const stored = sessionStorage.getItem('soul-audit-result')
    if (!stored) return null
    try {
      return normalizeSoulAuditResponse(
        JSON.parse(stored) as Partial<SoulAuditResponse>,
      )
    } catch {
      return null
    }
  })
  const router = useRouter()

  useEffect(() => {
    if (!result) {
      router.push('/soul-audit')
    }
  }, [result, router])

  if (!result) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-page">
        <p className="text-muted">Loading...</p>
      </div>
    )
  }

  // Normalize to matches array (handle both new and legacy format)
  const matches: AuditMatch[] = result.matches
    ? result.matches
    : result.match
      ? [
          result.match,
          ...(result.alternatives || []).map((alt) => ({
            ...alt,
            confidence: 0.7,
            reasoning: '',
          })),
        ]
      : []

  return (
    <div className="min-h-screen bg-page">
      <Navigation />

      <main
        id="main-content"
        aria-live="polite"
        className="mx-auto max-w-7xl px-6 pb-32 pt-12 md:px-[60px] md:pb-48 md:pt-20 lg:px-20"
      >
        {/* Crisis Response */}
        {result.crisis && result.resources && (
          <FadeIn>
            <div
              className="mb-16 p-8 md:p-12"
              style={{
                backgroundColor: 'var(--color-surface-raised)',
                border: '1px solid var(--color-border)',
              }}
            >
              <h2 className="text-serif-italic vw-heading-md mb-6">
                {typographer('We hear you.')}
              </h2>
              <p className="vw-body mb-6 leading-relaxed text-secondary">
                {typographer(
                  'What you\u2019re carrying sounds incredibly heavy. Before we continue, we want you to know: you matter, and there are people who want to help.',
                )}
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
                {typographer('God sees you. He hasn\u2019t forgotten you.')}
              </p>
            </div>
          </FadeIn>
        )}

        {/* Header */}
        <div className="mb-12 text-center">
          <FadeIn>
            <p className="text-label vw-small mb-6 text-gold">
              {result.crisis
                ? "WHEN YOU'RE READY"
                : 'WE CRAFTED THIS FOR THIS WEEK'}
            </p>
          </FadeIn>
          <FadeIn delay={0.1}>
            <h1 className="text-serif-italic vw-heading-md mb-4">
              {typographer(
                result.crisis
                  ? 'When you\u2019re ready, we have words of hope waiting.'
                  : 'Here is your custom 5-day plan.',
              )}
            </h1>
          </FadeIn>
        </div>

        {result.customPlan && (
          <FadeIn>
            <section className="mb-14">
              <article
                className="mb-8 p-8 md:p-10"
                style={{ border: '1px solid var(--color-border)' }}
              >
                <p className="text-label vw-small mb-2 text-gold">
                  PLAN SUMMARY
                </p>
                <h2 className="vw-heading-md mb-3 max-w-[26ch]">
                  {typographer(result.customPlan.title)}
                </h2>
                <p className="vw-body max-w-[74ch] text-secondary type-prose">
                  {typographer(result.customPlan.summary)}
                </p>
              </article>

              <div className="space-y-8">
                {result.customPlan.days.map((dayPlan) => (
                  <article
                    key={`audit-day-${dayPlan.day}`}
                    className="p-8 md:p-10"
                    style={{ border: '1px solid var(--color-border)' }}
                  >
                    <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                      <p className="text-label vw-small text-gold">
                        DAY {dayPlan.day}
                        {dayPlan.chiasticPosition
                          ? ` • ${dayPlan.chiasticPosition}`
                          : ''}
                      </p>
                      <p className="text-label vw-small text-muted">
                        {dayPlan.scriptureReference}
                      </p>
                    </div>
                    <h2 className="vw-heading-md mb-4 max-w-[24ch]">
                      {typographer(dayPlan.title)}
                    </h2>
                    <p className="scripture-block vw-body mb-6 text-secondary type-prose">
                      {typographer(dayPlan.scriptureText)}
                    </p>
                    <div className="vw-body mb-6 max-w-[72ch] text-secondary type-prose">
                      {dayPlan.reflection
                        .split('\n\n')
                        .filter(Boolean)
                        .map((paragraph, index) => (
                          <p
                            key={`audit-day-${dayPlan.day}-reflection-${index}`}
                            className="mb-4"
                          >
                            {typographer(paragraph)}
                          </p>
                        ))}
                    </div>
                    <div
                      className="mb-5"
                      style={{ borderTop: '1px solid var(--color-border)' }}
                    />
                    <p className="text-label vw-small mb-2 text-gold">PRAYER</p>
                    <p className="text-serif-italic vw-body mb-5 text-secondary type-prose">
                      {typographer(dayPlan.prayer)}
                    </p>
                    <div className="grid gap-5 md:grid-cols-2">
                      <div>
                        <p className="text-label vw-small mb-2 text-gold">
                          NEXT STEP
                        </p>
                        <p className="vw-small text-secondary type-prose">
                          {typographer(dayPlan.nextStep)}
                        </p>
                      </div>
                      <div>
                        <p className="text-label vw-small mb-2 text-gold">
                          JOURNAL PROMPT
                        </p>
                        <p className="vw-small text-secondary type-prose">
                          {typographer(dayPlan.journalPrompt)}
                        </p>
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            </section>
          </FadeIn>
        )}

        <FadeIn>
          <div className="mb-8 text-center">
            <p className="text-label vw-small text-muted">
              SERIES PATHWAYS FOR DEEPER FOLLOW-UP
            </p>
          </div>
        </FadeIn>

        {/* 3 Equal Cards */}
        <StaggerGrid className="grid gap-6 md:grid-cols-3">
          {matches.slice(0, 3).map((match, index) => (
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
                <SeriesHero seriesSlug={match.slug} size="thumbnail" overlay />
                <div className="flex flex-1 flex-col p-6 md:p-8">
                  <p className="text-label vw-small mb-3 text-gold">
                    {SERIES_DATA[match.slug]?.title || match.title}
                  </p>
                  <h2 className="text-serif-italic vw-body-lg mb-3 transition-colors duration-300 group-hover:text-gold">
                    {typographer(match.question)}
                  </h2>
                  {match.reasoning && (
                    <p className="vw-small mb-4 text-tertiary">
                      {typographer(match.reasoning)}
                    </p>
                  )}
                  {match.preview?.verse && (
                    <div
                      className="mb-4 border-l-2 pl-4"
                      style={{ borderColor: 'var(--color-gold)' }}
                    >
                      <p className="vw-small text-serif-italic text-secondary">
                        {typographer(
                          `\u201c${
                            match.preview.verse.length > 150
                              ? match.preview.verse.slice(0, 150) + '\u2026'
                              : match.preview.verse
                          }\u201d`,
                        )}
                      </p>
                    </div>
                  )}
                  {match.preview?.paragraph && (
                    <p className="vw-small mb-4 text-tertiary">
                      {typographer(
                        match.preview.paragraph.length > 150
                          ? match.preview.paragraph.slice(0, 150) + '\u2026'
                          : match.preview.paragraph,
                      )}
                    </p>
                  )}
                  <div className="mt-auto flex items-center justify-between pt-4">
                    <span className="text-label vw-small text-muted">
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

        {/* Browse All + Share */}
        <FadeIn>
          <div className="mt-16 text-center">
            <p className="vw-body mb-6 text-secondary">
              {typographer(
                'Not quite right? You can always explore on your own.',
              )}
            </p>
            <div className="flex items-center justify-center gap-8">
              <Link
                href="/series"
                className="inline-block px-10 py-5 text-label vw-small text-muted transition-all duration-300 hover:text-[var(--color-text-primary)]"
                style={{
                  borderBottom: '1px solid var(--color-border)',
                }}
              >
                Browse All Series
              </Link>
              <ShareButton
                title="My Soul Audit Results"
                text="I took the Soul Audit on Euangelion"
                label="Share Results"
              />
            </div>
          </div>
        </FadeIn>
      </main>

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
