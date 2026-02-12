'use client'

import { useEffect, useState, Fragment } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import Navigation from '@/components/Navigation'
import ScrollProgress from '@/components/ScrollProgress'
import Link from 'next/link'
import OrnamentDivider from '@/components/OrnamentDivider'
import { useProgress, useReadingTime } from '@/hooks/useProgress'
import ModuleRenderer from '@/components/ModuleRenderer'
import ShareButton from '@/components/ShareButton'
import { typographer } from '@/lib/typographer'
import { startSeries } from '@/lib/progress'
import { isDayUnlocked } from '@/lib/day-gating'
import { useProgressStore } from '@/stores/progressStore'
import { useSettingsStore } from '@/stores/settingsStore'
import DevotionalChat from '@/components/DevotionalChat'
import TextHighlightTrigger from '@/components/TextHighlightTrigger'
import DevotionalMilestoneReveal from '@/components/newspaper/DevotionalMilestoneReveal'
import IllustrationFrame from '@/components/newspaper/IllustrationFrame'
import { getDevotionalImage } from '@/data/devotional-images'
import { SERIES_DATA } from '@/data/series'
import type { Devotional, Panel, Module } from '@/types'

function getSeriesSlugFromDevotional(slug: string): string | null {
  const match = slug.match(/^(.+)-day-\d+$/)
  if (!match) return null
  return match[1] === 'identity-crisis' ? 'identity' : match[1]
}

function getDayIndexFromSlug(slug: string): number {
  const match = slug.match(/-day-(\d+)$/)
  return match ? parseInt(match[1], 10) - 1 : 0
}

export default function DevotionalPageClient({ slug }: { slug: string }) {
  const [devotional, setDevotional] = useState<Devotional | null>(null)
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  const { isRead, markComplete } = useProgress()
  const timeSpent = useReadingTime()
  const [isCompleted, setIsCompleted] = useState(false)

  const seriesSlug = getSeriesSlugFromDevotional(slug)
  const devotionalImage = getDevotionalImage(slug)
  const dayIndex = getDayIndexFromSlug(slug)
  const sabbathDay = useSettingsStore((s) => s.sabbathDay)
  const seriesStartDate = useProgressStore((s) =>
    seriesSlug ? s.seriesStartDates[seriesSlug] || null : null,
  )
  const zustandStartSeries = useProgressStore((s) => s.startSeries)
  const dayGate = isDayUnlocked(dayIndex, seriesStartDate, sabbathDay)

  // Series navigation: next/prev days
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
  }, [slug, isRead])

  useEffect(() => {
    async function loadDevotional() {
      try {
        const response = await fetch(`/devotionals/${slug}.json`)
        if (!response.ok) throw new Error('Devotional not found')
        const data = await response.json()
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

    loadDevotional()
  }, [slug, seriesSlug, zustandStartSeries])

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-page">
        <p className="text-serif-italic vw-body text-muted">Loading...</p>
      </div>
    )
  }

  if (!devotional) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-page">
        <div className="text-center">
          <h1 className="text-display vw-heading-lg mb-8">Not Found</h1>
          <button
            onClick={() => router.push('/series')}
            className="animated-underline text-label vw-small text-gold transition-colors hover:text-[var(--color-text-primary)]"
          >
            Browse All Series &rarr;
          </button>
        </div>
      </div>
    )
  }

  const modules = (devotional as Devotional & { modules?: Module[] }).modules
  const panels = devotional.panels

  return (
    <div className="newspaper-reading min-h-screen bg-page">
      <ScrollProgress />
      <Navigation variant="newspaper" />

      {/* Hero — full-bleed image or clean typography with day ornament */}
      {devotionalImage ? (
        <DevotionalMilestoneReveal
          variant="cinematic"
          as="div"
          className="section-rule border-subtle relative flex min-h-[34vh] items-end overflow-hidden border-b md:min-h-[42vh]"
        >
          <Image
            src={devotionalImage}
            alt=""
            fill
            className="object-cover"
            sizes="100vw"
            priority
          />
          <div
            className="absolute inset-0"
            style={{
              background:
                'linear-gradient(180deg, transparent 20%, rgba(11, 20, 32, 0.88) 100%)',
            }}
          />
          <div className="relative w-full px-6 pb-12 pt-28 md:px-10 md:pb-16 lg:px-16">
            <div className="mx-auto w-full max-w-[1040px]">
              <div className="mb-4 flex items-center gap-4">
                {devotional.scriptureReference && (
                  <p className="type-micro text-gold">
                    {devotional.scriptureReference}
                  </p>
                )}
                {totalDays > 0 && (
                  <p
                    className="type-micro text-muted oldstyle-nums"
                    style={{ opacity: 0.6 }}
                  >
                    DAY {currentDayNum} OF {totalDays}
                  </p>
                )}
              </div>
              <h1 className="text-display vw-heading-lg mb-6 text-scroll">
                {typographer(devotional.title)}
              </h1>
              {devotional.teaser && (
                <p
                  className="text-serif-italic vw-body-lg text-scroll"
                  style={{ opacity: 0.8, maxWidth: '640px' }}
                >
                  {typographer(devotional.teaser)}
                </p>
              )}
            </div>
          </div>
        </DevotionalMilestoneReveal>
      ) : (
        <DevotionalMilestoneReveal
          variant="cinematic"
          as="header"
          className="section-rule border-subtle relative border-b px-6 pb-12 pt-16 md:px-10 md:pb-16 md:pt-20 lg:px-16"
        >
          {/* Massive ornamental day number behind title */}
          {currentDayNum > 0 && (
            <div
              className="type-day-ornament"
              aria-hidden="true"
              style={{ top: '1rem', left: '-0.5rem' }}
            >
              {currentDayNum}
            </div>
          )}
          <div
            className="mx-auto w-full max-w-[1040px]"
            style={{ position: 'relative' }}
          >
            <div className="mb-6 flex items-center gap-4">
              {devotional.scriptureReference && (
                <p className="type-micro text-gold">
                  {devotional.scriptureReference}
                </p>
              )}
              {totalDays > 0 && (
                <p className="type-micro text-muted oldstyle-nums">
                  DAY {currentDayNum} OF {totalDays}
                </p>
              )}
            </div>
            <h1 className="text-display vw-heading-lg mb-8 max-w-[20ch]">
              {typographer(devotional.title)}
            </h1>
            {devotional.teaser && (
              <p
                className="text-serif-italic vw-body-lg text-secondary"
                style={{ maxWidth: '640px' }}
              >
                {typographer(devotional.teaser)}
              </p>
            )}
            <div className="mt-8 max-w-[240px]">
              <IllustrationFrame
                src="/images/illustrations/generated/devotional-milestone-generated.png"
                alt="Devotional engraving motif"
                effect="ink"
                aspect="square"
                decorative
              />
            </div>
          </div>
        </DevotionalMilestoneReveal>
      )}

      {/* Content — day-gated */}
      {!dayGate.unlocked ? (
        <main
          id="main-content"
          className="px-6 pb-24 pt-12 md:px-10 md:pb-32 md:pt-16 lg:px-16"
        >
          <div className="mx-auto max-w-xl py-16 text-center">
            <p className="text-serif-italic vw-body-lg mb-8 text-secondary">
              {typographer(dayGate.message)}
            </p>
            <button
              onClick={() => router.back()}
              className="animated-underline text-label vw-small text-gold transition-colors hover:text-[var(--color-text-primary)]"
            >
              &larr; Back to Series
            </button>
          </div>
        </main>
      ) : (
        <>
          {/* Content — continuous scroll with ornament dividers */}
          <main
            id="main-content"
            className="newspaper-reading-main px-6 pb-24 pt-12 md:px-10 md:pb-32 md:pt-16 lg:px-16"
          >
            <div className="reading-flow type-prose baseline-grid mx-auto">
              {modules
                ? modules.map((mod, index) => (
                    <Fragment key={index}>
                      {index > 0 && <OrnamentDivider />}
                      <ModuleRenderer module={mod} />
                    </Fragment>
                  ))
                : panels?.slice(1).map((panel, index) => (
                    <Fragment key={panel.number}>
                      {index > 0 && <OrnamentDivider />}
                      <div className="mb-20 md:mb-24">
                        <PanelComponent panel={panel} />
                      </div>
                    </Fragment>
                  ))}
            </div>
          </main>

          {/* Mark as Complete */}
          {!isCompleted && (
            <DevotionalMilestoneReveal
              as="div"
              variant="cinematic"
              className="px-6 pb-12 md:px-10 md:pb-16 lg:px-16"
            >
              <div
                className="mx-auto max-w-[1040px] pt-10"
                style={{ borderTop: '2px solid var(--color-border-strong)' }}
              >
                <p className="text-serif-italic vw-body mb-8 text-secondary">
                  Finished reading?
                </p>
                <button
                  onClick={() => {
                    markComplete(slug, timeSpent)
                    setIsCompleted(true)
                  }}
                  className="cta-major text-label vw-small px-8 py-3"
                >
                  Mark as Complete &rarr;
                </button>
              </div>
            </DevotionalMilestoneReveal>
          )}
        </>
      )}

      {/* Next/Prev Navigation — Mixed Headline style */}
      {(prevDay || nextDay) && (
        <nav
          className="px-6 md:px-10 lg:px-16"
          style={{ borderTop: '2px solid var(--color-border-strong)' }}
          aria-label="Devotional navigation"
        >
          <div className="mx-auto flex max-w-[1040px] items-stretch">
            {prevDay ? (
              <Link
                href={`/wake-up/devotional/${prevDay.slug}`}
                className="group link-highlight flex-1 py-8 pr-4 transition-colors duration-300"
              >
                <p className="type-micro mb-2 text-muted">&larr; PREVIOUS</p>
                <p className="text-serif-italic vw-body transition-colors duration-300 group-hover:text-gold">
                  {prevDay.title}
                </p>
              </Link>
            ) : (
              <div className="flex-1" />
            )}
            {nextDay && (
              <Link
                href={`/wake-up/devotional/${nextDay.slug}`}
                className="group link-highlight flex-1 py-8 pl-4 text-right transition-colors duration-300"
                style={{ borderLeft: '2px solid var(--color-border-strong)' }}
              >
                <p className="type-micro mb-2 text-muted">NEXT &rarr;</p>
                <p className="text-serif-italic vw-body transition-colors duration-300 group-hover:text-gold">
                  {nextDay.title}
                </p>
              </Link>
            )}
          </div>
        </nav>
      )}

      {/* Footer */}
      <footer className="px-6 pb-24 pt-12 md:px-16 md:pb-32 lg:px-24">
        <div className="mx-auto flex max-w-[1040px] items-center justify-between">
          <button
            onClick={() => router.back()}
            className="animated-underline text-label vw-small text-muted transition-colors duration-300 hover:text-[var(--color-text-primary)]"
          >
            &larr; Back
          </button>
          {dayGate.unlocked && (
            <ShareButton
              title={devotional.title}
              text={`${devotional.title} — Euangelion`}
            />
          )}
        </div>
      </footer>

      {/* AI Research Chat */}
      {dayGate.unlocked && (
        <>
          <TextHighlightTrigger />
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
  const isPrayer = panel.type === 'prayer'
  const hasImage = panel.type === 'text-with-image'
  const [imageError, setImageError] = useState(false)

  return (
    <div className="mx-auto w-full max-w-[980px]">
      {panel.heading && (
        <p className="text-label vw-small mb-6 text-gold">{panel.heading}</p>
      )}

      <div className={isPrayer ? 'module-accent' : ''}>
        <div
          className={`${isPrayer ? 'text-serif-italic' : ''} vw-body type-prose`}
        >
          {panel.content.split('\n\n').map((paragraph, i) => {
            const isScripture =
              paragraph.trim().startsWith('\u201c') &&
              paragraph.trim().endsWith('\u201d')

            return (
              <p
                key={i}
                className={`mb-6 leading-relaxed ${
                  isScripture ? 'scripture-block' : 'text-secondary'
                }`}
                style={{
                  whiteSpace: 'pre-line',
                  maxWidth: '74ch',
                  marginInline: 'auto',
                }}
              >
                {paragraph.split('**').map((part, j) =>
                  j % 2 === 1 ? (
                    <strong key={j} style={{ fontWeight: 600 }}>
                      {part}
                    </strong>
                  ) : (
                    part
                  ),
                )}
              </p>
            )
          })}
        </div>
      </div>

      {hasImage && panel.illustration && !imageError && (
        <div className="mt-8" style={{ maxWidth: '500px' }}>
          <div className="relative aspect-square overflow-hidden">
            <Image
              src={`/devotionals/${panel.illustration.file}`}
              alt={panel.illustration.description}
              fill
              className="object-cover"
              sizes="(max-width: 768px) 100vw, 500px"
              onError={() => setImageError(true)}
            />
          </div>
        </div>
      )}
    </div>
  )
}
