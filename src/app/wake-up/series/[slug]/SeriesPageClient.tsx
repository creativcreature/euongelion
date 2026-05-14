'use client'

import Image from 'next/image'
import Link from 'next/link'
import EuangelionShellHeader from '@/components/EuangelionShellHeader'
import Breadcrumbs from '@/components/Breadcrumbs'
import ShareButton from '@/components/ShareButton'
import SiteFooter from '@/components/SiteFooter'
import ResumeSeriesPill from '@/components/ResumeSeriesPill'
import SeriesActions from '@/components/devotional/SeriesActions'
import { typographer } from '@/lib/typographer'
import { useProgress } from '@/hooks/useProgress'
import { SERIES_HERO } from '@/data/artwork-manifest'
import type { SeriesInfo } from '@/data/series'
import type { DayScriptureByDayNumber } from '@/lib/soul-audit/series-day-scripture'

export default function SeriesPageClient({
  slug,
  series,
  silo = 'wake',
  dayScriptureByDayNumber = {},
}: {
  slug: string
  series: SeriesInfo
  silo?: 'wake' | 'euangelion'
  dayScriptureByDayNumber?: DayScriptureByDayNumber
}) {
  const { isRead, getSeriesProgress, canRead } = useProgress()
  const seriesProgress = getSeriesProgress(slug)
  const dayCount = series.days.length
  // Prefer the new generated hero from series.heroImage (populated by Stage 2
  // of the 2026-05-07 image migration). Fall back to the legacy artist-print
  // entry from SERIES_HERO if no heroImage is set on the series.
  const generatedHero = series.heroImage
    ? {
        src: series.heroImage,
        rawSrc: series.heroImage,
        title: series.title,
        artist: 'Generated',
      }
    : null
  const manifestHero = SERIES_HERO[slug]
  const hero = generatedHero ?? manifestHero
  const isWake = silo === 'wake'
  const brandWord = isWake ? 'WAKE UP' : 'EUANGELION'
  const headerTone = isWake ? 'wake' : 'default'
  const parentHref = isWake ? '/wake-up' : '/series'
  const dayHrefPrefix = isWake ? '/wake-up/devotional' : '/devotional'
  const parentLabel = isWake ? 'WAKE-UP' : 'SERIES'
  const browseLabel = isWake ? 'ALL WAKE UP SERIES' : 'ALL SERIES'

  return (
    <div className="mock-home">
      <main id="main-content" className="mock-paper">
        <EuangelionShellHeader brandWord={brandWord} tone={headerTone} />
        <Breadcrumbs
          className="mock-breadcrumb-row"
          items={[
            { label: 'HOME', href: '/' },
            { label: parentLabel, href: parentHref },
            { label: series.title.toUpperCase() },
          ]}
        />

        {/* Audit H7: surface the resume cue for returning users. */}
        <div className="mock-breadcrumb-row">
          <ResumeSeriesPill seriesSlug={slug} />
        </div>

        {/* Founder direction 2026-05-14: start the series from the
            series page itself, not just from inside a day. Matches
            the DevotionalActions pattern. Routes through the same
            active-series API; reaches sign-in modal on auth gate. */}
        <div className="mock-breadcrumb-row">
          <SeriesActions
            seriesSlug={slug}
            seriesTitle={series.title}
            redirectPath={
              isWake ? `/wake-up/series/${slug}` : `/series/${slug}`
            }
          />
        </div>

        <section className="mock-series-hero-grid">
          <article className="mock-panel mock-series-copy">
            <p className="text-label mock-kicker">SERIES</p>
            <p className="mock-series-scripture-lead">
              {typographer(series.framework)}
            </p>
            <h1 className="mock-title">{typographer(series.question)}</h1>
            <div className="mock-rule" />
            <p className="mock-body">{typographer(series.introduction)}</p>
            <p className="mock-subcopy">{typographer(series.context)}</p>
          </article>

          <aside className="mock-panel mock-series-meta">
            {hero && (
              <div className="mock-series-meta-hero">
                <Image
                  src={hero.rawSrc}
                  alt={`${hero.title} by ${hero.artist}`}
                  width={600}
                  height={450}
                  className="series-card-thumbnail-img"
                  loading="eager"
                  sizes="(max-width: 767px) 100vw, 38vw"
                />
              </div>
            )}
            <p className="text-label mock-kicker">
              {series.title.toUpperCase()}
            </p>

            <div className="mock-series-progress-head">
              <p className="text-label">{dayCount} DAY JOURNEY</p>
              <p className="text-label">
                {seriesProgress.completed}/{seriesProgress.total} COMPLETE
              </p>
            </div>
            <div className="mock-series-progress" aria-hidden="true">
              <div
                className="mock-series-progress-fill"
                style={{ width: `${seriesProgress.percentage}%` }}
              />
            </div>

            <div className="mock-series-meta-actions">
              <Link href={parentHref} className="mock-btn text-label">
                {browseLabel}
              </Link>
              <ShareButton
                title={series.title}
                text={`${series.title} — ${series.question}`}
                className="mock-series-share"
              />
            </div>
          </aside>
        </section>

        <section className="mock-section-center">
          <p className="text-label mock-kicker">DAILY READINGS</p>
          <h2 className="mock-title-center">{dayCount} Day Path</h2>
          <p className="mock-subcopy-center">
            Read in order. Return daily. Keep your rhythm.
          </p>
        </section>

        <section className="mock-series-days-grid">
          {series.days.map((day) => {
            const readingCheck = canRead(day.slug)
            const isLocked = !readingCheck.canRead
            const dayIsRead = isRead(day.slug)
            const dayScripture = dayScriptureByDayNumber[day.day] ?? {
              reference: 'Scripture',
              snippet: '',
            }
            const lockMessage =
              (readingCheck as { message?: string }).message ||
              'Unlocks in sequence as you continue.'

            const card = (
              <article
                className={`mock-series-day-card ${isLocked ? 'is-locked' : ''}`}
              >
                <p className="text-label mock-series-day-number">
                  DAY {day.day}
                </p>
                <p className="mock-series-day-scripture-reference">
                  {typographer(dayScripture.reference || 'Scripture')}
                </p>
                {dayScripture.snippet && (
                  <p className="mock-series-day-scripture-snippet">
                    {typographer(dayScripture.snippet)}
                  </p>
                )}
                <h3>{day.title}</h3>
                <p className="mock-series-day-status">
                  {isLocked ? 'LOCKED' : dayIsRead ? 'READ AGAIN' : 'READ NOW'}
                </p>
                {isLocked && (
                  <p className="mock-series-day-lock">
                    {typographer(lockMessage)}
                  </p>
                )}
              </article>
            )

            if (isLocked) {
              return <div key={day.slug}>{card}</div>
            }

            return (
              <Link
                key={day.slug}
                href={`${dayHrefPrefix}/${day.slug}`}
                className="mock-series-day-link"
              >
                {card}
              </Link>
            )
          })}
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
