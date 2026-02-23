'use client'

import { useMemo, useState } from 'react'
import EuangelionShellHeader from '@/components/EuangelionShellHeader'
import SiteFooter from '@/components/SiteFooter'
import FadeIn from '@/components/motion/FadeIn'
import SeriesRailSection from '@/components/SeriesRailSection'
import BrowseSeriesCard from '@/components/BrowseSeriesCard'
import { useProgress } from '@/hooks/useProgress'
import { ALL_SERIES_ORDER, SERIES_DATA } from '@/data/series'
import {
  SERIES_RAILS,
  FEATURED_SERIES_SLUGS,
  WAKEUP_ORIGINALS_SLUGS,
  TOPIC_FILTERS,
  READING_TIME_FILTERS,
} from '@/data/series-rails'

type ViewMode = 'rails' | 'grid' | 'list'

/**
 * Series Browse Page — 3-view system
 *
 * Rails (default): Featured rail → Continue Reading → Theme rails → Wake-Up Originals
 * Grid: Filterable grid with medium cards (thumbnails)
 * List: Filterable compact list with small cards (no thumbnails)
 */
export default function SeriesBrowsePage() {
  const { getSeriesProgress } = useProgress()
  const [viewMode, setViewMode] = useState<ViewMode>('rails')
  const [searchQuery, setSearchQuery] = useState('')
  const [topicFilter, setTopicFilter] = useState<string | null>(null)
  const [readingTimeFilter, setReadingTimeFilter] = useState<string | null>(
    null,
  )

  // Build progress map with total for progress bar
  const progressMap = useMemo(() => {
    const map: Record<
      string,
      {
        completed: boolean
        inProgress: boolean
        currentDay?: number
        total?: number
      }
    > = {}
    for (const slug of ALL_SERIES_ORDER) {
      const p = getSeriesProgress(slug)
      const series = SERIES_DATA[slug]
      map[slug] = {
        completed: p.completed >= p.total && p.total > 0,
        inProgress: p.completed > 0 && p.completed < p.total,
        currentDay: p.completed > 0 ? p.completed + 1 : undefined,
        total: series?.days.length ?? p.total,
      }
    }
    return map
  }, [getSeriesProgress])

  // Continue Reading — only in-progress series
  const continueReadingSlugs = useMemo(() => {
    return ALL_SERIES_ORDER.filter((slug) => {
      const p = progressMap[slug]
      return p?.inProgress && !p?.completed
    })
  }, [progressMap])

  // Filtered slugs for grid/list views
  const filteredSlugs = useMemo(() => {
    return ALL_SERIES_ORDER.filter((slug) => {
      const series = SERIES_DATA[slug]
      if (!series) return false

      // Text search
      if (searchQuery.length > 0) {
        const q = searchQuery.toLowerCase()
        const searchable = [
          series.title,
          series.question,
          series.introduction,
          ...series.keywords,
        ]
          .join(' ')
          .toLowerCase()
        if (!searchable.includes(q)) return false
      }

      // Topic filter
      if (topicFilter) {
        const rail = SERIES_RAILS.find((r) => r.id === topicFilter)
        if (rail && !rail.slugs.includes(slug)) return false
      }

      // Reading time filter
      if (readingTimeFilter) {
        const filter = READING_TIME_FILTERS.find(
          (f) => f.value === readingTimeFilter,
        )
        if (filter) {
          const days = series.days.length
          if (days < filter.min || days > filter.max) return false
        }
      }

      return true
    })
  }, [searchQuery, topicFilter, readingTimeFilter])

  const hasActiveFilters =
    searchQuery.length > 0 || topicFilter || readingTimeFilter

  return (
    <div className="mock-home">
      <main id="main-content" className="mock-paper">
        <EuangelionShellHeader />

        {/* Compact centered header */}
        <header className="series-page-header">
          <FadeIn>
            <h1 className="series-page-title">Series</h1>
            <p className="series-page-subtitle">
              Scripture-first reading paths for wherever you are right now.
            </p>
          </FadeIn>
        </header>

        {/* View toggle + search bar */}
        <div className="series-toolbar">
          <div className="series-view-toggle">
            {(['rails', 'grid', 'list'] as const).map((mode) => (
              <button
                key={mode}
                type="button"
                className={`series-view-btn text-label${viewMode === mode ? ' active' : ''}`}
                onClick={() => setViewMode(mode)}
                aria-pressed={viewMode === mode}
              >
                {mode === 'rails'
                  ? 'Browse'
                  : mode === 'grid'
                    ? 'Grid'
                    : 'List'}
              </button>
            ))}
          </div>

          {/* Search input — visible in grid/list modes */}
          {viewMode !== 'rails' && (
            <div className="series-toolbar-search">
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                aria-hidden="true"
              >
                <circle cx="11" cy="11" r="8" />
                <path d="m21 21-4.3-4.3" />
              </svg>
              <input
                type="search"
                placeholder="Search series..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="series-toolbar-input"
                aria-label="Search series"
              />
            </div>
          )}
        </div>

        {/* Filter chips — visible in grid/list modes */}
        {viewMode !== 'rails' && (
          <div className="series-filter-bar">
            <div className="series-filter-group-inline">
              {TOPIC_FILTERS.map((f) => (
                <button
                  key={f.value}
                  onClick={() =>
                    setTopicFilter(topicFilter === f.value ? null : f.value)
                  }
                  className={`series-filter-chip${topicFilter === f.value ? ' active' : ''}`}
                >
                  {f.label}
                </button>
              ))}
              <span className="series-filter-divider" />
              {READING_TIME_FILTERS.map((f) => (
                <button
                  key={f.value}
                  onClick={() =>
                    setReadingTimeFilter(
                      readingTimeFilter === f.value ? null : f.value,
                    )
                  }
                  className={`series-filter-chip${readingTimeFilter === f.value ? ' active' : ''}`}
                >
                  {f.label}
                </button>
              ))}
              {hasActiveFilters && (
                <button
                  onClick={() => {
                    setSearchQuery('')
                    setTopicFilter(null)
                    setReadingTimeFilter(null)
                  }}
                  className="series-filter-clear"
                >
                  Clear
                </button>
              )}
            </div>
            {hasActiveFilters && (
              <p className="series-filter-count">
                <span className="oldstyle-nums">{filteredSlugs.length}</span>{' '}
                series
              </p>
            )}
          </div>
        )}

        {/* ─── Rails view (default) ─────────────────────────────────── */}
        {viewMode === 'rails' && (
          <>
            {/* Featured editorial — horizontal rail with large cards */}
            <SeriesRailSection
              label="Featured"
              subtitle="Curated highlights to start with"
              slugs={[...FEATURED_SERIES_SLUGS]}
              layout="rail"
              progress={progressMap}
              cardVariant="large"
            />

            {/* Continue Reading — only if in-progress */}
            {continueReadingSlugs.length > 0 && (
              <SeriesRailSection
                label="Continue Reading"
                subtitle="Pick up where you left off"
                slugs={continueReadingSlugs}
                layout="rail"
                progress={progressMap}
                className="browse-continue-section"
              />
            )}

            {/* Theme Rails — dynamic composition from SERIES_RAILS */}
            {SERIES_RAILS.map((rail) => (
              <SeriesRailSection
                key={rail.id}
                label={rail.label}
                subtitle={rail.subtitle}
                slugs={rail.slugs}
                layout={rail.layout}
                progress={progressMap}
              />
            ))}

            {/* Wake-Up Originals */}
            <SeriesRailSection
              label="Wake-Up Originals"
              subtitle="The founding collection that started it all"
              slugs={[...WAKEUP_ORIGINALS_SLUGS]}
              layout="rail"
              progress={progressMap}
              className="browse-originals-section"
            />
          </>
        )}

        {/* ─── Grid view — filterable, medium cards ────────────────── */}
        {viewMode === 'grid' && (
          <section className="series-grid-view">
            <div className="series-grid-results">
              {filteredSlugs.map((slug) => (
                <BrowseSeriesCard
                  key={slug}
                  slug={slug}
                  progress={progressMap[slug]}
                  variant="medium"
                />
              ))}
            </div>
            {filteredSlugs.length === 0 && (
              <p className="series-empty-state">
                No series match your filters. Try adjusting your search.
              </p>
            )}
          </section>
        )}

        {/* ─── List view — filterable, small cards (no images) ────── */}
        {viewMode === 'list' && (
          <section className="series-list-view">
            <div className="series-list-results">
              {filteredSlugs.map((slug) => (
                <BrowseSeriesCard
                  key={slug}
                  slug={slug}
                  progress={progressMap[slug]}
                  variant="small"
                />
              ))}
            </div>
            {filteredSlugs.length === 0 && (
              <p className="series-empty-state">
                No series match your filters. Try adjusting your search.
              </p>
            )}
          </section>
        )}

        {/* All Series count */}
        <FadeIn>
          <div className="shell-content-pad mx-auto max-w-7xl py-12 text-center">
            <p className="vw-small text-muted">
              <span className="oldstyle-nums">{ALL_SERIES_ORDER.length}</span>{' '}
              series available
            </p>
          </div>
        </FadeIn>

        <SiteFooter />
        <section className="mock-bottom-brand">
          <h2 className="text-masthead mock-masthead-word">
            <span className="js-shell-masthead-fit mock-masthead-text">
              EUANGELION
            </span>
          </h2>
        </section>
      </main>
    </div>
  )
}
