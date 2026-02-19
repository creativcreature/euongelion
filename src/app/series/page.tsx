'use client'

import Link from 'next/link'
import { useMemo, useState } from 'react'
import EuangelionShellHeader from '@/components/EuangelionShellHeader'
import SiteFooter from '@/components/SiteFooter'
import FadeIn from '@/components/motion/FadeIn'
import StaggerGrid from '@/components/motion/StaggerGrid'
import { scriptureLeadFromFramework } from '@/lib/scripture-reference'
import { typographer } from '@/lib/typographer'
import { useProgress } from '@/hooks/useProgress'
import {
  SERIES_DATA,
  ALL_SERIES_ORDER,
  WAKEUP_SERIES_ORDER,
} from '@/data/series'

type ProgressFilter = 'all' | 'not-started' | 'in-progress' | 'complete'
type SourceFilter = 'all' | 'wake-up' | 'euangelion'
type ReadingTimeFilter = 'all' | 'short' | 'medium' | 'long'

export default function SeriesBrowsePage() {
  const { getSeriesProgress } = useProgress()
  const [pathway, setPathway] = useState<
    'all' | 'Sleep' | 'Awake' | 'Shepherd'
  >('all')
  const [topic, setTopic] = useState('all')
  const [progressFilter, setProgressFilter] = useState<ProgressFilter>('all')
  const [sourceFilter, setSourceFilter] = useState<SourceFilter>('all')
  const [readingTimeFilter, setReadingTimeFilter] =
    useState<ReadingTimeFilter>('all')
  const [query, setQuery] = useState('')

  const availableTopics = useMemo(() => {
    const topics = new Set<string>()
    for (const slug of ALL_SERIES_ORDER) {
      const series = SERIES_DATA[slug]
      if (!series) continue
      for (const keyword of series.keywords.slice(0, 3)) {
        topics.add(keyword)
      }
    }
    return ['all', ...Array.from(topics).sort((a, b) => a.localeCompare(b))]
  }, [])

  const seriesCards = useMemo(() => {
    const q = query.trim().toLowerCase()
    const wakeupSlugSet = new Set<string>(WAKEUP_SERIES_ORDER)
    return ALL_SERIES_ORDER.map((slug) => {
      const series = SERIES_DATA[slug]
      const progress = getSeriesProgress(slug)
      const isWake = wakeupSlugSet.has(slug)
      return {
        slug,
        series,
        progress,
        source: isWake ? 'wake-up' : 'euangelion',
      }
    })
      .filter((entry) => Boolean(entry.series))
      .filter((entry) =>
        pathway === 'all' ? true : entry.series.pathway === pathway,
      )
      .filter((entry) =>
        sourceFilter === 'all' ? true : entry.source === sourceFilter,
      )
      .filter((entry) =>
        topic === 'all'
          ? true
          : entry.series.keywords.some((keyword) => keyword === topic),
      )
      .filter((entry) => {
        if (readingTimeFilter === 'all') return true
        const dayCount = entry.series.days.length
        if (readingTimeFilter === 'short') return dayCount <= 5
        if (readingTimeFilter === 'medium')
          return dayCount >= 6 && dayCount <= 7
        return dayCount >= 8
      })
      .filter((entry) => {
        if (progressFilter === 'all') return true
        if (progressFilter === 'not-started')
          return entry.progress.completed === 0
        if (progressFilter === 'complete') {
          return entry.progress.completed >= entry.progress.total
        }
        return (
          entry.progress.completed > 0 &&
          entry.progress.completed < entry.progress.total
        )
      })
      .filter((entry) => {
        if (!q) return true
        return (
          entry.series.title.toLowerCase().includes(q) ||
          entry.series.question.toLowerCase().includes(q) ||
          entry.series.introduction.toLowerCase().includes(q) ||
          entry.series.keywords.some((keyword) =>
            keyword.toLowerCase().includes(q),
          )
        )
      })
      .sort((a, b) => a.series.title.localeCompare(b.series.title))
  }, [
    getSeriesProgress,
    pathway,
    sourceFilter,
    topic,
    readingTimeFilter,
    progressFilter,
    query,
  ])

  return (
    <div className="mock-home">
      <main id="main-content" className="mock-paper">
        <EuangelionShellHeader />

        <header className="shell-content-pad section-rule mx-auto max-w-7xl pb-12 md:pb-16">
          <FadeIn>
            <h1 className="vw-heading-lg mb-6 series-page-heading">
              All Series
            </h1>
            <p className="vw-body text-secondary type-prose">
              Scripture-first reading paths, ordered for focus and consistency.
            </p>
          </FadeIn>
        </header>

        <section className="shell-content-pad mx-auto max-w-7xl pb-8">
          <div className="series-filter-grid">
            <label className="series-filter-item">
              <span className="text-label vw-small">Pathway</span>
              <select
                value={pathway}
                onChange={(event) =>
                  setPathway(event.target.value as typeof pathway)
                }
              >
                <option value="all">All</option>
                <option value="Sleep">Sleep</option>
                <option value="Awake">Awake</option>
                <option value="Shepherd">Shepherd</option>
              </select>
            </label>

            <label className="series-filter-item">
              <span className="text-label vw-small">Topic</span>
              <select
                value={topic}
                onChange={(event) => setTopic(event.target.value)}
              >
                {availableTopics.map((item) => (
                  <option key={item} value={item}>
                    {item === 'all' ? 'All' : item}
                  </option>
                ))}
              </select>
            </label>

            <label className="series-filter-item">
              <span className="text-label vw-small">Progress</span>
              <select
                value={progressFilter}
                onChange={(event) =>
                  setProgressFilter(event.target.value as ProgressFilter)
                }
              >
                <option value="all">All</option>
                <option value="not-started">Not started</option>
                <option value="in-progress">In progress</option>
                <option value="complete">Complete</option>
              </select>
            </label>

            <label className="series-filter-item">
              <span className="text-label vw-small">Source</span>
              <select
                value={sourceFilter}
                onChange={(event) =>
                  setSourceFilter(event.target.value as SourceFilter)
                }
              >
                <option value="all">All</option>
                <option value="euangelion">Euangelion</option>
                <option value="wake-up">Wake-Up</option>
              </select>
            </label>

            <label className="series-filter-item">
              <span className="text-label vw-small">Reading time</span>
              <select
                value={readingTimeFilter}
                onChange={(event) =>
                  setReadingTimeFilter(event.target.value as ReadingTimeFilter)
                }
              >
                <option value="all">All</option>
                <option value="short">Short</option>
                <option value="medium">Medium</option>
                <option value="long">Long</option>
              </select>
            </label>

            <label className="series-filter-item series-filter-search">
              <span className="text-label vw-small">Search</span>
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search series..."
              />
            </label>
          </div>
        </section>

        <section className="shell-content-pad mx-auto max-w-7xl pb-16">
          <StaggerGrid className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {seriesCards.map(({ slug, series, progress }) => (
              <SeriesCard
                key={slug}
                slug={slug}
                progress={progress}
                series={series}
              />
            ))}
          </StaggerGrid>
          {seriesCards.length === 0 && (
            <p className="vw-body mt-8 text-secondary">
              No series matched your current filters.
            </p>
          )}
        </section>

        <SiteFooter />
      </main>
    </div>
  )
}

function SeriesCard({
  slug,
  progress,
  series,
}: {
  slug: string
  progress: { completed: number; total: number; percentage: number }
  series: (typeof SERIES_DATA)[keyof typeof SERIES_DATA]
}) {
  return (
    <Link href={`/series/${slug}`} className="group block">
      <div className="newspaper-card flex h-full flex-col overflow-hidden">
        <div
          className="mx-6 mt-6 border border-[var(--color-border)] p-4 md:mx-8 md:mt-8 md:p-5"
          style={{ minHeight: '132px' }}
        >
          <p className="series-card-scripture">
            {typographer(scriptureLeadFromFramework(series.framework))}
          </p>
        </div>

        <div className="flex flex-1 flex-col p-6 md:p-8">
          <p className="text-label vw-small mb-2 text-gold">{series.title}</p>
          <h2 className="series-card-question vw-body mb-3">
            {series.question}
          </h2>
          <p className="vw-small mb-6 flex-1 text-secondary type-prose">
            {typographer(series.introduction).split(' ').slice(0, 30).join(' ')}
            ...
          </p>

          <div className="flex items-center justify-between">
            <span className="text-label vw-small text-muted oldstyle-nums">
              {series.days.length} {series.days.length === 1 ? 'DAY' : 'DAYS'}
            </span>
            {progress.completed > 0 ? (
              <span
                className="text-label vw-small oldstyle-nums"
                style={{ color: 'var(--color-success)' }}
              >
                {progress.completed}/{progress.total}
              </span>
            ) : (
              <span className="text-label vw-small text-muted">BEGIN →</span>
            )}
          </div>
        </div>
      </div>
    </Link>
  )
}
