'use client'

import { Fragment, useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import EuangelionShellHeader from '@/components/EuangelionShellHeader'
import ScrollProgress from '@/components/ScrollProgress'
import ModuleRenderer from '@/components/ModuleRenderer'
import ShareButton from '@/components/ShareButton'
import DevotionalChat from '@/components/DevotionalChat'
import TextHighlightTrigger from '@/components/TextHighlightTrigger'
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

export default function DevotionalPageClient({ slug }: { slug: string }) {
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
  const currentDayIdx = seriesDays?.findIndex((d) => d.slug === slug) ?? -1
  const prevDay =
    currentDayIdx > 0 && seriesDays ? seriesDays[currentDayIdx - 1] : null
  const nextDay =
    currentDayIdx >= 0 && seriesDays && currentDayIdx < seriesDays.length - 1
      ? seriesDays[currentDayIdx + 1]
      : null
  const totalDays = seriesDays?.length || 0
  const currentDayNum = currentDayIdx >= 0 ? currentDayIdx + 1 : 0

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
        <main className="mock-paper">
          <EuangelionShellHeader />
          <section
            className="mock-section-center"
            style={{ minHeight: '320px' }}
          >
            <p className="text-label mock-kicker">LOADING</p>
            <h1 className="mock-title-center">Preparing your devotional.</h1>
          </section>
        </main>
      </div>
    )
  }

  if (!devotional) {
    return (
      <div className="mock-home">
        <main className="mock-paper">
          <EuangelionShellHeader />
          <section
            className="mock-section-center"
            style={{ minHeight: '320px' }}
          >
            <p className="text-label mock-kicker">NOT FOUND</p>
            <h1 className="mock-title-center">
              We couldn&apos;t load this reading.
            </h1>
            <p className="mock-subcopy-center">
              Try a different devotional from your series.
            </p>
            <Link href="/wake-up" className="mock-btn text-label">
              BROWSE WAKE UP
            </Link>
          </section>
        </main>
      </div>
    )
  }

  const modules = (devotional as Devotional & { modules?: Module[] }).modules
  const panels = devotional.panels

  return (
    <div className="mock-home">
      <main className="mock-paper">
        <ScrollProgress />
        <EuangelionShellHeader />

        <section className="mock-devotional-hero">
          <div className="mock-devotional-hero-top text-label">
            {devotional.scriptureReference && (
              <span>{devotional.scriptureReference}</span>
            )}
            {totalDays > 0 && (
              <span>
                DAY {currentDayNum} OF {totalDays}
              </span>
            )}
          </div>
          <h1 className="mock-title">{typographer(devotional.title)}</h1>
          {devotional.teaser && (
            <p className="mock-body">{typographer(devotional.teaser)}</p>
          )}
          <div className="mock-devotional-hero-actions">
            <Link
              href={seriesSlug ? `/wake-up/series/${seriesSlug}` : '/wake-up'}
              className="mock-reset-btn text-label"
            >
              BACK TO SERIES
            </Link>
            <ShareButton
              title={devotional.title}
              text={`${devotional.title} — Euangelion`}
              className="mock-series-share"
            />
          </div>
        </section>

        <section className="mock-devotional-shell">
          <aside className="mock-devotional-sidebar">
            {seriesDays && seriesDays.length > 0 && (
              <>
                <p className="text-label mock-kicker">IN THIS SERIES</p>
                <nav
                  className="mock-devotional-daylist"
                  aria-label="Series days"
                >
                  {seriesDays.map((day) => {
                    const check = canRead(day.slug)
                    const isLocked = !check.canRead && day.slug !== slug
                    const isCurrent = day.slug === slug

                    const content = (
                      <>
                        <span className="text-label">DAY {day.day}</span>
                        <span>{day.title}</span>
                      </>
                    )

                    if (isLocked) {
                      return (
                        <div
                          key={day.slug}
                          className="mock-devotional-day is-locked"
                        >
                          {content}
                        </div>
                      )
                    }

                    return (
                      <Link
                        key={day.slug}
                        href={`/wake-up/devotional/${day.slug}`}
                        className={`mock-devotional-day ${isCurrent ? 'is-current' : ''}`}
                      >
                        {content}
                      </Link>
                    )
                  })}
                </nav>
              </>
            )}

            <div className="mock-devotional-library">
              <p className="text-label mock-kicker">LIBRARY</p>
              <Link href="/my-devotional?tab=archive">Archived Pages</Link>
              <Link href="/my-devotional?tab=bookmarks">Bookmarks</Link>
              <Link href="/my-devotional?tab=chat-notes">Chat Notes</Link>
              <Link href="/my-devotional?tab=favorite-verses">
                Favorite Verses
              </Link>
            </div>
          </aside>

          <div className="mock-devotional-main-wrap">
            {!dayGate.unlocked ? (
              <main id="main-content" className="mock-devotional-main">
                <section className="mock-devotional-lock">
                  <p className="mock-body">{typographer(dayGate.message)}</p>
                  <button
                    type="button"
                    onClick={() => router.back()}
                    className="mock-btn text-label"
                  >
                    BACK TO SERIES
                  </button>
                </section>
              </main>
            ) : (
              <main id="main-content" className="mock-devotional-main">
                <div className="mock-devotional-flow">
                  {modules
                    ? modules.map((module, index) => (
                        <section key={index} className="mock-devotional-block">
                          {index > 0 && (
                            <div
                              className="mock-devotional-divider"
                              aria-hidden="true"
                            />
                          )}
                          <ModuleRenderer module={module} />
                        </section>
                      ))
                    : panels?.slice(1).map((panel, index) => (
                        <Fragment key={panel.number}>
                          <section className="mock-devotional-block">
                            {index > 0 && (
                              <div
                                className="mock-devotional-divider"
                                aria-hidden="true"
                              />
                            )}
                            <PanelComponent panel={panel} />
                          </section>
                        </Fragment>
                      ))}
                </div>

                <section className="mock-devotional-actions">
                  <p className="mock-subcopy">
                    {isCompleted
                      ? 'Completed. Return anytime to read again.'
                      : 'Finished reading? Mark this day complete.'}
                  </p>
                  <div className="mock-devotional-action-row">
                    {!isCompleted && (
                      <button
                        type="button"
                        className="mock-btn text-label"
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
                      className="mock-reset-btn text-label"
                      onClick={() => void saveBookmark(devotional.title)}
                    >
                      SAVE BOOKMARK
                    </button>
                  </div>
                </section>
              </main>
            )}
          </div>
        </section>

        {(prevDay || nextDay) && (
          <nav
            className="mock-devotional-nav-row"
            aria-label="Devotional navigation"
          >
            {prevDay ? (
              <Link
                href={`/wake-up/devotional/${prevDay.slug}`}
                className="mock-devotional-nav-link"
              >
                <span className="text-label">&larr; PREVIOUS</span>
                <span>{prevDay.title}</span>
              </Link>
            ) : (
              <div className="mock-devotional-nav-link is-empty" />
            )}

            {nextDay ? (
              <Link
                href={`/wake-up/devotional/${nextDay.slug}`}
                className="mock-devotional-nav-link align-right"
              >
                <span className="text-label">NEXT &rarr;</span>
                <span>{nextDay.title}</span>
              </Link>
            ) : (
              <div className="mock-devotional-nav-link is-empty" />
            )}
          </nav>
        )}

        <section className="mock-bottom-brand">
          <h2 className="text-masthead mock-masthead-word">
            <span className="js-shell-masthead-fit mock-masthead-text">
              EUANGELION
            </span>
          </h2>
        </section>

        {dayGate.unlocked && (
          <>
            <TextHighlightTrigger devotionalSlug={slug} />
            <DevotionalChat
              devotionalSlug={slug}
              devotionalTitle={devotional.title}
            />
          </>
        )}
      </main>
    </div>
  )
}

function PanelComponent({ panel }: { panel: Panel }) {
  const isPrayer = panel.type === 'prayer'

  return (
    <article className={`mock-devotional-panel ${isPrayer ? 'is-prayer' : ''}`}>
      {panel.heading && (
        <p className="text-label mock-kicker">{panel.heading}</p>
      )}

      {panel.content.split('\n\n').map((paragraph, i) => {
        const isScripture =
          paragraph.trim().startsWith('\u201c') &&
          paragraph.trim().endsWith('\u201d')

        return (
          <p
            key={i}
            className={`mock-body ${isScripture ? 'mock-devotional-scripture' : ''}`}
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
