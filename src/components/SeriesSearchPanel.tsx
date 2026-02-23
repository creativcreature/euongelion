'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { SERIES_DATA } from '@/data/series'
import {
  SERIES_RAILS,
  TOPIC_FILTERS,
  READING_TIME_FILTERS,
} from '@/data/series-rails'
import StaggerGrid from '@/components/motion/StaggerGrid'
import BrowseSeriesCard from '@/components/BrowseSeriesCard'

interface SeriesSearchPanelProps {
  isOpen: boolean
  onClose: () => void
  allSlugs: string[]
  progress?: Record<
    string,
    { completed: boolean; inProgress: boolean; currentDay?: number }
  >
}

export default function SeriesSearchPanel({
  isOpen,
  onClose,
  allSlugs,
  progress = {},
}: SeriesSearchPanelProps) {
  const [query, setQuery] = useState('')
  const [topicFilter, setTopicFilter] = useState<string | null>(null)
  const [readingTimeFilter, setReadingTimeFilter] = useState<string | null>(
    null,
  )
  const [progressFilter, setProgressFilter] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const [debouncedQuery, setDebouncedQuery] = useState('')

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQuery(query), 300)
    return () => clearTimeout(timer)
  }, [query])

  // Focus input when panel opens
  useEffect(() => {
    if (isOpen && inputRef.current) {
      setTimeout(() => inputRef.current?.focus(), 150)
    }
  }, [isOpen])

  const hasActiveFilters =
    debouncedQuery.length > 0 ||
    topicFilter ||
    readingTimeFilter ||
    progressFilter

  const clearAll = useCallback(() => {
    setQuery('')
    setDebouncedQuery('')
    setTopicFilter(null)
    setReadingTimeFilter(null)
    setProgressFilter(null)
  }, [])

  // Filter logic
  const filteredSlugs = allSlugs.filter((slug) => {
    const series = SERIES_DATA[slug]
    if (!series) return false

    // Text search
    if (debouncedQuery.length > 0) {
      const q = debouncedQuery.toLowerCase()
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

    // Progress filter
    if (progressFilter) {
      const p = progress[slug]
      if (progressFilter === 'completed' && !p?.completed) return false
      if (progressFilter === 'in-progress' && !p?.inProgress) return false
      if (progressFilter === 'not-started' && (p?.completed || p?.inProgress))
        return false
    }

    return true
  })

  if (!isOpen) return null

  return (
    <div className="series-search-panel" role="search">
      <div className="series-search-panel-inner">
        {/* Search input */}
        <div className="series-search-input-wrap">
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            className="series-search-icon"
          >
            <circle cx="11" cy="11" r="8" />
            <path d="m21 21-4.3-4.3" />
          </svg>
          <input
            ref={inputRef}
            type="search"
            placeholder="Search series..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="series-search-input"
            aria-label="Search series"
          />
          <button
            onClick={onClose}
            className="series-search-close"
            aria-label="Close search"
          >
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path d="M18 6 6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Filter chips */}
        <div className="series-filter-chips">
          {/* Topic */}
          <div className="series-filter-group">
            <span className="series-filter-label">Topic</span>
            <div className="series-filter-options">
              {TOPIC_FILTERS.map((f) => (
                <button
                  key={f.value}
                  onClick={() =>
                    setTopicFilter(topicFilter === f.value ? null : f.value)
                  }
                  className={`series-filter-chip ${topicFilter === f.value ? 'active' : ''}`}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>

          {/* Reading Time */}
          <div className="series-filter-group">
            <span className="series-filter-label">Length</span>
            <div className="series-filter-options">
              {READING_TIME_FILTERS.map((f) => (
                <button
                  key={f.value}
                  onClick={() =>
                    setReadingTimeFilter(
                      readingTimeFilter === f.value ? null : f.value,
                    )
                  }
                  className={`series-filter-chip ${readingTimeFilter === f.value ? 'active' : ''}`}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>

          {/* Progress */}
          <div className="series-filter-group">
            <span className="series-filter-label">Progress</span>
            <div className="series-filter-options">
              {[
                { value: 'not-started', label: 'Not Started' },
                { value: 'in-progress', label: 'In Progress' },
                { value: 'completed', label: 'Completed' },
              ].map((f) => (
                <button
                  key={f.value}
                  onClick={() =>
                    setProgressFilter(
                      progressFilter === f.value ? null : f.value,
                    )
                  }
                  className={`series-filter-chip ${progressFilter === f.value ? 'active' : ''}`}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>

          {hasActiveFilters && (
            <button onClick={clearAll} className="series-filter-clear">
              Clear all
            </button>
          )}
        </div>

        {/* Results count */}
        {hasActiveFilters && (
          <p className="series-search-count">
            <span className="oldstyle-nums">{filteredSlugs.length}</span>{' '}
            {filteredSlugs.length === 1 ? 'series' : 'series'} found
          </p>
        )}
      </div>

      {/* Results grid */}
      {hasActiveFilters && (
        <StaggerGrid className="series-search-results">
          {filteredSlugs.map((slug) => (
            <BrowseSeriesCard
              key={slug}
              slug={slug}
              progress={progress[slug]}
            />
          ))}
        </StaggerGrid>
      )}
    </div>
  )
}
