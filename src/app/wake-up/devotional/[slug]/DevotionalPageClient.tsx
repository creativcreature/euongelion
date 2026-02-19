'use client'

import { Fragment, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import EuangelionShellHeader from '@/components/EuangelionShellHeader'
import Breadcrumbs from '@/components/Breadcrumbs'
import ScrollProgress from '@/components/ScrollProgress'
import ReaderTimeline from '@/components/ReaderTimeline'
import ModuleRenderer from '@/components/ModuleRenderer'
import ShareButton from '@/components/ShareButton'
import DevotionalChat from '@/components/DevotionalChat'
import TextHighlightTrigger from '@/components/TextHighlightTrigger'
import SiteFooter from '@/components/SiteFooter'
import { typographer } from '@/lib/typographer'
import { startSeries } from '@/lib/progress'
import { isDayUnlocked } from '@/lib/day-gating'
import { useProgress, useReadingTime } from '@/hooks/useProgress'
import { useProgressStore } from '@/stores/progressStore'
import { useSettingsStore } from '@/stores/settingsStore'
import { SERIES_DATA } from '@/data/series'
import type { Devotional, Module, Panel } from '@/types'

function getSeriesSlugFromDevotional(slug: string): string | null {
  const match = slug.match(/^(.+)-day-\d+$/)
  if (!match) return null
  return match[1] === 'identity-crisis' ? 'identity' : match[1]
}

function getDayIndexFromSlug(slug: string): number {
  const match = slug.match(/-day-(\d+)$/)
  return match ? Number.parseInt(match[1], 10) - 1 : 0
}

export default function DevotionalPageClient({
  slug,
  silo = 'wake',
}: {
  slug: string
  silo?: 'wake' | 'euangelion'
}) {
  const [devotional, setDevotional] = useState<Devotional | null>(null)
  const [loading, setLoading] = useState(true)
  const [isCompleted, setIsCompleted] = useState(false)

  const router = useRouter()
  const { isRead, markComplete, canRead } = useProgress()
  const timeSpent = useReadingTime()

  const seriesSlug = getSeriesSlugFromDevotional(slug)
  const dayIndex = getDayIndexFromSlug(slug)

  const sabbathDay = useSettingsStore((s) => s.sabbathDay)
  const dayLockingEnabled = useSettingsStore((s) => s.dayLockingEnabled)
  const seriesStartDate = useProgressStore((s) =>
    seriesSlug ? s.seriesStartDates[seriesSlug] || null : null,
  )
  const zustandStartSeries = useProgressStore((s) => s.startSeries)

  const dayGate = isDayUnlocked(
    dayIndex,
    seriesStartDate,
    sabbathDay,
    dayLockingEnabled,
  )

  const seriesDays = seriesSlug ? SERIES_DATA[seriesSlug]?.days : null
  const isWake = silo === 'wake'
  const brandWord = isWake ? 'WAKE UP' : 'EUANGELION'
  const headerTone = isWake ? 'wake' : 'default'
  const parentRoute = isWake ? '/wake-up' : '/series'
  const seriesRoutePrefix = isWake ? '/wake-up/series' : '/series'
  const devotionalRoutePrefix = isWake ? '/wake-up/devotional' : '/devotional'
  const parentLabel = isWake ? 'WAKE-UP' : 'SERIES'
  const modules = (devotional as (Devotional & { modules?: Module[] }) | null)
    ?.modules
  const panels = devotional?.panels
  const currentDayIdx = seriesDays?.findIndex((d) => d.slug === slug) ?? -1
  const prevDay =
    currentDayIdx > 0 && seriesDays ? seriesDays[currentDayIdx - 1] : null
  const nextDay =
    currentDayIdx >= 0 && seriesDays && currentDayIdx < seriesDays.length - 1
      ? seriesDays[currentDayIdx + 1]
      : null
  const totalDays = seriesDays?.length || 0
  const currentDayNum = currentDayIdx >= 0 ? currentDayIdx + 1 : 0
  const timelineAnchors = useMemo(() => {
    const source =
      modules && modules.length > 0
        ? modules.map((module) => module.heading || module.type || 'Section')
        : (panels ?? []).slice(1).map((panel) => panel.heading || 'Section')

    return source.map((label, index) => ({
      id: `devotional-section-${index + 1}`,
      label: `S${index + 1}: ${label}`,
    }))
  }, [modules, panels])

  useEffect(() => {
    setIsCompleted(isRead(slug))
  }, [isRead, slug])

  useEffect(() => {
    async function loadDevotional() {
      try {
        const response = await fetch(`/devotionals/${slug}.json`)
        if (!response.ok) throw new Error('Devotional not found')
        const data = (await response.json()) as Devotional
        setDevotional(data)

        if (seriesSlug) {
          startSeries(seriesSlug)
          zustandStartSeries(seriesSlug)
        }
      } catch {
        setDevotional(null)
      } finally {
        setLoading(false)
      }
    }

    void loadDevotional()
  }, [slug, seriesSlug, zustandStartSeries])

  async function saveBookmark(title: string) {
    await fetch('/api/bookmarks', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        devotionalSlug: slug,
        note: title,
      }),
    })
    window.dispatchEvent(new CustomEvent('libraryUpdated'))
  }

  if (loading) {
    return (
      <div className="mock-home">
        <main id="main-content" className="mock-paper">
          <EuangelionShellHeader brandWord={brandWord} tone={headerTone} />
          <section className="devotional-shell-main shell-content-pad mx-auto max-w-6xl">
            <Breadcrumbs
              className="mb-7"
              items={[
                { label: 'HOME', href: '/' },
                { label: parentLabel, href: parentRoute },
                { label: 'DEVOTIONAL' },
              ]}
            />
            <section
              className="devotional-shell-panel border px-6 py-10 text-center"
              style={{ borderColor: 'var(--color-border)' }}
            >
              <p className="text-label vw-small mb-3 text-gold">LOADING</p>
              <h1 className="vw-heading-md">Preparing your devotional.</h1>
            </section>
          </section>
          <SiteFooter />
          <section className="mock-bottom-brand">
            <h2 className="text-masthead mock-masthead-word">
              <span className="js-shell-masthead-fit mock-masthead-text">
                {brandWord}
              </span>
            </h2>
          </section>
        </main>
      </div>
    )
  }

  if (!devotional) {
    return (
      <div className="mock-home">
        <main id="main-content" className="mock-paper">
          <EuangelionShellHeader brandWord={brandWord} tone={headerTone} />
          <section className="devotional-shell-main shell-content-pad mx-auto max-w-6xl">
            <Breadcrumbs
              className="mb-7"
              items={[
                { label: 'HOME', href: '/' },
                { label: parentLabel, href: parentRoute },
                { label: 'DEVOTIONAL' },
              ]}
            />
            <section
              className="devotional-shell-panel border px-6 py-10 text-center"
              style={{ borderColor: 'var(--color-border)' }}
            >
              <p className="text-label vw-small mb-3 text-gold">NOT FOUND</p>
              <h1 className="vw-heading-md">
                We couldn&apos;t load this reading.
              </h1>
              <p className="vw-small mt-3 text-secondary">
                Try a different devotional from your series.
              </p>
              <Link
                href={parentRoute}
                className="cta-major text-label vw-small mt-6 inline-block px-5 py-2"
              >
                {isWake ? 'BROWSE WAKE UP' : 'BROWSE SERIES'}
              </Link>
            </section>
          </section>
          <SiteFooter />
          <section className="mock-bottom-brand">
            <h2 className="text-masthead mock-masthead-word">
              <span className="js-shell-masthead-fit mock-masthead-text">
                {brandWord}
              </span>
            </h2>
          </section>
        </main>
      </div>
    )
  }

  return (
    <div className="mock-home">
      <main id="main-content" className="mock-paper">
        <ScrollProgress showLabel />
        <EuangelionShellHeader brandWord={brandWord} tone={headerTone} />

        <section className="devotional-shell-main shell-content-pad mx-auto max-w-6xl">
          <Breadcrumbs
            className="devotional-shell-breadcrumb mb-7"
            items={[
              { label: 'HOME', href: '/' },
              { label: parentLabel, href: parentRoute },
              ...(seriesSlug
                ? [
                    {
                      label: (
                        SERIES_DATA[seriesSlug]?.title || 'SERIES'
                      ).toUpperCase(),
                      href: `${seriesRoutePrefix}/${seriesSlug}`,
                    },
                  ]
                : []),
              { label: (devotional.title || 'DEVOTIONAL').toUpperCase() },
            ]}
          />

          <header
            className="devotional-shell-panel devotional-shell-block mb-8 border px-6 py-6"
            style={{ borderColor: 'var(--color-border)' }}
          >
            <div className="mb-3 flex flex-wrap items-center gap-3">
              {devotional.scriptureReference && (
                <p className="text-label vw-small text-gold">
                  {devotional.scriptureReference}
                </p>
              )}
              {totalDays > 0 && (
                <p className="text-label vw-small text-muted oldstyle-nums">
                  DAY {currentDayNum} OF {totalDays}
                </p>
              )}
            </div>
            <h1 className="vw-heading-md mb-3">
              {typographer(devotional.title)}
            </h1>
            {devotional.teaser && (
              <p className="vw-body text-secondary">
                {typographer(devotional.teaser)}
              </p>
            )}

            <div className="mt-5 flex flex-wrap items-center gap-3">
              <Link
                href={
                  seriesSlug
                    ? `${seriesRoutePrefix}/${seriesSlug}`
                    : parentRoute
                }
                className="text-label vw-small link-highlight"
              >
                BACK TO SERIES
              </Link>
              <ShareButton
                title={devotional.title}
                text={`${devotional.title} — Euangelion`}
              />
            </div>
          </header>

          <section className="devotional-shell-grid md:grid md:grid-cols-[260px_minmax(0,1fr)] md:gap-8">
            <aside className="devotional-shell-sidebar-wrap mb-6 md:mb-0">
              <div
                className="devotional-shell-sidebar shell-sticky-panel border-subtle bg-surface-raised p-4 md:h-fit"
                style={{ borderColor: 'var(--color-border)' }}
              >
                {seriesDays && seriesDays.length > 0 && (
                  <>
                    <p className="text-label vw-small mb-3 text-gold">
                      IN THIS SERIES
                    </p>
                    <div className="mb-5 grid gap-2">
                      {seriesDays.map((day) => {
                        const check = canRead(day.slug)
                        const isLocked = !check.canRead && day.slug !== slug
                        const isCurrent = day.slug === slug

                        if (isLocked) {
                          return (
                            <div
                              key={day.slug}
                              className="border px-3 py-2"
                              style={{
                                borderColor: 'var(--color-border)',
                                opacity: 0.58,
                              }}
                            >
                              <p className="text-label vw-small text-gold">
                                DAY {day.day} • LOCKED
                              </p>
                              <p className="vw-small text-secondary">
                                {day.title}
                              </p>
                            </div>
                          )
                        }

                        return (
                          <Link
                            key={day.slug}
                            href={`${devotionalRoutePrefix}/${day.slug}`}
                            className="block border px-3 py-2"
                            style={{
                              borderColor: isCurrent
                                ? 'var(--color-border-strong)'
                                : 'var(--color-border)',
                              background: isCurrent
                                ? 'var(--color-active)'
                                : 'transparent',
                            }}
                          >
                            <p className="text-label vw-small text-gold">
                              DAY {day.day}
                            </p>
                            <p className="vw-small text-secondary">
                              {day.title}
                            </p>
                          </Link>
                        )
                      })}
                    </div>
                  </>
                )}

                {timelineAnchors.length > 0 && (
                  <div
                    className="border-t pt-4"
                    style={{ borderColor: 'var(--color-border)' }}
                  >
                    <p className="text-label vw-small mb-3 text-gold">
                      TIMELINE
                    </p>
                    <ReaderTimeline
                      anchors={timelineAnchors}
                      className="reader-sidebar-timeline"
                    />
                  </div>
                )}

                <div
                  className="border-t pt-4"
                  style={{ borderColor: 'var(--color-border)' }}
                >
                  <p className="text-label vw-small mb-3 text-gold">LIBRARY</p>
                  <div className="grid gap-2">
                    <Link
                      href="/daily-bread?tab=today"
                      className="block border px-3 py-2 text-secondary"
                      style={{ borderColor: 'var(--color-border)' }}
                    >
                      Today + 7 Days
                    </Link>
                    <Link
                      href="/daily-bread?tab=archive"
                      className="block border px-3 py-2 text-secondary"
                      style={{ borderColor: 'var(--color-border)' }}
                    >
                      Archived Pages
                    </Link>
                    <Link
                      href="/daily-bread?tab=bookmarks"
                      className="block border px-3 py-2 text-secondary"
                      style={{ borderColor: 'var(--color-border)' }}
                    >
                      Bookmarks
                    </Link>
                    <Link
                      href="/daily-bread?tab=notes"
                      className="block border px-3 py-2 text-secondary"
                      style={{ borderColor: 'var(--color-border)' }}
                    >
                      Notes
                    </Link>
                    <Link
                      href="/daily-bread?tab=highlights"
                      className="block border px-3 py-2 text-secondary"
                      style={{ borderColor: 'var(--color-border)' }}
                    >
                      Highlights
                    </Link>
                    <Link
                      href="/daily-bread?tab=chat-history"
                      className="block border px-3 py-2 text-secondary"
                      style={{ borderColor: 'var(--color-border)' }}
                    >
                      Chat History
                    </Link>
                  </div>
                </div>
              </div>
            </aside>

            <div>
              {!dayGate.unlocked ? (
                <section
                  className="devotional-shell-panel border px-6 py-8"
                  style={{ borderColor: 'var(--color-border)' }}
                >
                  <p className="vw-body text-secondary">
                    {typographer(dayGate.message)}
                  </p>
                  <button
                    type="button"
                    onClick={() => router.back()}
                    className="cta-major text-label vw-small mt-6 px-5 py-2"
                  >
                    BACK TO SERIES
                  </button>
                </section>
              ) : (
                <>
                  <div className="space-y-6">
                    {modules
                      ? modules.map((module, index) => (
                          <article
                            key={index}
                            id={`devotional-section-${index + 1}`}
                            className="devotional-shell-panel border px-6 py-6"
                            style={{ borderColor: 'var(--color-border)' }}
                          >
                            <ModuleRenderer module={module} />
                          </article>
                        ))
                      : panels?.slice(1).map((panel, index) => (
                          <Fragment key={panel.number}>
                            <article
                              id={`devotional-section-${index + 1}`}
                              className="devotional-shell-panel border px-6 py-6"
                              style={{ borderColor: 'var(--color-border)' }}
                            >
                              {index > 0 && (
                                <div
                                  className="mb-6 border-t"
                                  style={{ borderColor: 'var(--color-border)' }}
                                  aria-hidden="true"
                                />
                              )}
                              <PanelComponent panel={panel} />
                            </article>
                          </Fragment>
                        ))}
                  </div>

                  <section
                    className="devotional-shell-panel mt-6 border px-6 py-5"
                    style={{ borderColor: 'var(--color-border)' }}
                  >
                    <p className="vw-small text-secondary">
                      {isCompleted
                        ? 'Completed. Return anytime to read again.'
                        : 'Finished reading? Mark this day complete.'}
                    </p>
                    <div className="mt-4 flex flex-wrap items-center gap-3">
                      {!isCompleted && (
                        <button
                          type="button"
                          className="cta-major text-label vw-small px-5 py-2"
                          onClick={() => {
                            markComplete(slug, timeSpent)
                            setIsCompleted(true)
                            window.dispatchEvent(
                              new CustomEvent('libraryUpdated'),
                            )
                          }}
                        >
                          MARK COMPLETE
                        </button>
                      )}
                      <button
                        type="button"
                        className="text-label vw-small link-highlight"
                        onClick={() => void saveBookmark(devotional.title)}
                      >
                        SAVE BOOKMARK
                      </button>
                    </div>
                  </section>
                </>
              )}
            </div>
          </section>

          {(prevDay || nextDay) && (
            <nav
              className="devotional-shell-nav mt-8 grid gap-4 md:grid-cols-2"
              aria-label="Devotional navigation"
            >
              {prevDay ? (
                <Link
                  href={`${devotionalRoutePrefix}/${prevDay.slug}`}
                  className="devotional-shell-panel block border px-5 py-4"
                  style={{ borderColor: 'var(--color-border)' }}
                >
                  <p className="text-label vw-small text-gold">
                    &larr; PREVIOUS
                  </p>
                  <p className="vw-body text-secondary">{prevDay.title}</p>
                </Link>
              ) : (
                <div
                  className="devotional-shell-panel border px-5 py-4"
                  style={{ borderColor: 'var(--color-border)', opacity: 0.5 }}
                />
              )}

              {nextDay ? (
                <Link
                  href={`${devotionalRoutePrefix}/${nextDay.slug}`}
                  className="devotional-shell-panel block border px-5 py-4 text-right"
                  style={{ borderColor: 'var(--color-border)' }}
                >
                  <p className="text-label vw-small text-gold">NEXT &rarr;</p>
                  <p className="vw-body text-secondary">{nextDay.title}</p>
                </Link>
              ) : (
                <div
                  className="devotional-shell-panel border px-5 py-4"
                  style={{ borderColor: 'var(--color-border)', opacity: 0.5 }}
                />
              )}
            </nav>
          )}
        </section>
        <SiteFooter />
        <section className="mock-bottom-brand">
          <h2 className="text-masthead mock-masthead-word">
            <span className="js-shell-masthead-fit mock-masthead-text">
              {brandWord}
            </span>
          </h2>
        </section>
      </main>

      {dayGate.unlocked && (
        <>
          <TextHighlightTrigger devotionalSlug={slug} />
          <DevotionalChat
            devotionalSlug={slug}
            devotionalTitle={devotional.title}
          />
        </>
      )}
    </div>
  )
}

function PanelComponent({ panel }: { panel: Panel }) {
  return (
    <article>
      {panel.heading && (
        <p className="text-label vw-small mb-3 text-gold">{panel.heading}</p>
      )}

      {panel.content.split('\n\n').map((paragraph, i) => {
        const isScripture =
          paragraph.trim().startsWith('\u201c') &&
          paragraph.trim().endsWith('\u201d')

        return (
          <p
            key={i}
            className={`vw-body mb-4 ${isScripture ? 'text-serif-italic' : 'text-secondary'} type-prose`}
            style={{ whiteSpace: 'pre-line' }}
          >
            {paragraph
              .split('**')
              .map((part, j) =>
                j % 2 === 1 ? <strong key={j}>{part}</strong> : part,
              )}
          </p>
        )
      })}
    </article>
  )
}
