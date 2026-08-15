'use client'

import { useMemo, useState, useSyncExternalStore } from 'react'
import Link from 'next/link'
import { ALL_SERIES_ORDER, SERIES_DATA } from '@/data/series'
import {
  SORT_OPTIONS,
  dayCountLabel,
  sortSeries,
  type SortKey,
} from '@/lib/series/catalog'
import { searchLibraryByPhrase } from '@/lib/global-search'
import { nextUnreadDay } from '@/lib/reading/active-day'
import { latestEligibleSeries } from '@/lib/home/featured-rotation'
import { useProgressStore } from '@/stores/progressStore'
import { LAYOUTS, VIEWS, type SeriesProgress, type ViewId } from './SeriesLayouts'
import { ViewIcon } from './SeriesViewIcons'

/**
 * The reading room (F-094).
 *
 * Ten ways to look at the same catalog, each drawn from a real form of
 * displaying print — see `SeriesLayouts.tsx` for the reasoning. This file owns
 * only the furniture around them: the search, the icon switcher, the sort, and
 * the four states the page can actually be in.
 *
 * THE FOUR STATES, each designed rather than defaulted:
 *   searching + hits     the views step aside; results take the page
 *   searching + nothing  names what was searched and offers real next words
 *   browsing, cold       the full catalog, no progress rail anywhere
 *   browsing, returning  in-progress readings carry "Day n of m" and a rail
 *
 * A fifth, pre-hydration, is deliberately NOT a spinner: the catalog is static
 * and renders on the server, so the only thing missing before hydration is the
 * reader's own progress. The page arrives complete and progress fills in.
 */

const STORAGE_VIEW = 'euangelion-series-view'
const STORAGE_SORT = 'euangelion-series-sort'

/** Stable no-op subscribe for the hydration check — never notifies. */
const subscribeNever = () => () => {}

function readStored<T extends string>(key: string, allowed: readonly T[], fallback: T): T {
  if (typeof window === 'undefined') return fallback
  try {
    const raw = window.localStorage.getItem(key)
    return raw && (allowed as readonly string[]).includes(raw) ? (raw as T) : fallback
  } catch {
    return fallback
  }
}

export default function SeriesBrowser() {
  const hydrated = useSyncExternalStore(
    subscribeNever,
    () => true,
    () => false,
  )

  const [view, setView] = useState<ViewId>('feature')
  const [sort, setSort] = useState<SortKey>('az')
  const [query, setQuery] = useState('')
  const completions = useProgressStore((s) => s.completions)

  // Remember the reader's chosen view between visits — with ten of them, being
  // dropped back into Feature every time would be a small insult. Read after
  // hydration so the server pass stays deterministic.
  const [restored, setRestored] = useState(false)
  if (hydrated && !restored) {
    setView(readStored(STORAGE_VIEW, VIEWS.map((v) => v.id), 'feature'))
    setSort(readStored(STORAGE_SORT, SORT_OPTIONS.map((s) => s.key), 'az'))
    setRestored(true)
  }

  const chooseView = (id: ViewId) => {
    setView(id)
    try {
      window.localStorage.setItem(STORAGE_VIEW, id)
    } catch {
      // Private mode: the choice just does not persist.
    }
  }
  const chooseSort = (key: SortKey) => {
    setSort(key)
    try {
      window.localStorage.setItem(STORAGE_SORT, key)
    } catch {
      /* as above */
    }
  }

  const completedSlugs = useMemo(
    () => new Set(completions.map((c) => c.slug)),
    [completions],
  )

  const progressBySeries = useMemo(() => {
    const map = new Map<string, SeriesProgress>()
    if (!hydrated) return map
    for (const slug of ALL_SERIES_ORDER) {
      const series = SERIES_DATA[slug]
      if (!series) continue
      const completed = series.days.filter((d) => completedSlugs.has(d.slug)).length
      if (completed > 0) map.set(slug, { completed, total: series.days.length })
    }
    return map
  }, [hydrated, completedSlugs])

  const trimmed = query.trim()
  const results = useMemo(
    () =>
      trimmed.length > 1
        ? searchLibraryByPhrase(trimmed, { series: 12, devotionals: 30 })
        : null,
    [trimmed],
  )

  const sortedSlugs = useMemo(() => sortSeries(ALL_SERIES_ORDER, sort), [sort])

  const cardHref = (slug: string) => {
    if (!hydrated) return `/series/${slug}`
    const next = nextUnreadDay(slug, completedSlugs)
    return progressBySeries.has(slug) && next ? `/devotional/${next.slug}` : `/series/${slug}`
  }

  const Layout = LAYOUTS[view]
  const activeView = VIEWS.find((v) => v.id === view)
  const lead = latestEligibleSeries()

  return (
    <div className="series-browser">
      {/* ── Search ─────────────────────────────────────────────── */}
      <div className="rr-search-shell">
        <label className="rr-search">
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            aria-hidden="true"
          >
            <circle cx="11" cy="11" r="7.5" />
            <path d="m20.5 20.5-4-4" />
          </svg>
          <input
            type="search"
            className="rr-search-input"
            placeholder="Say what you&rsquo;re carrying — &ldquo;I feel anxious about money&rdquo;"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            aria-label="Search the library by phrase"
          />
          {trimmed.length > 0 && (
            <button type="button" className="rr-search-clear" onClick={() => setQuery('')}>
              Clear
            </button>
          )}
        </label>
      </div>

      {results ? (
        <SearchResults query={trimmed} results={results} onClear={() => setQuery('')} />
      ) : (
        <>
          {/* ── Switcher ─────────────────────────────────────────── */}
          <div className="rr-bar">
            <div className="rr-views" role="tablist" aria-label="Layout">
              {VIEWS.map((v) => (
                <button
                  key={v.id}
                  type="button"
                  role="tab"
                  aria-selected={view === v.id}
                  aria-label={v.label}
                  title={v.label}
                  className={`rr-view${view === v.id ? ' is-active' : ''}`}
                  onClick={() => chooseView(v.id)}
                >
                  <ViewIcon id={v.id} />
                  <span className="rr-view-label">{v.label}</span>
                </button>
              ))}
            </div>

            <div className="rr-sorts">
              <span className="rr-sort-label">Sort</span>
              {SORT_OPTIONS.map((opt) => (
                <button
                  key={opt.key}
                  type="button"
                  className={`rr-sort${sort === opt.key ? ' is-active' : ''}`}
                  aria-pressed={sort === opt.key}
                  onClick={() => chooseSort(opt.key)}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* The blurb is the one place the page explains itself. It changes
              with the view, so the switcher never needs a legend. */}
          <p className="rr-blurb">
            <span className="rr-blurb-text">{activeView?.blurb}</span>
            <span className="rr-count">
              <span className="oldstyle-nums">{ALL_SERIES_ORDER.length}</span> series
            </span>
          </p>

          <div className="rr-stage" data-view={view}>
            <Layout
              slugs={sortedSlugs}
              progressBySeries={progressBySeries}
              cardHref={cardHref}
              lead={lead}
            />
          </div>
        </>
      )}
    </div>
  )
}

/* ── Search results ───────────────────────────────────────────────── */

function SearchResults({
  query,
  results,
  onClear,
}: {
  query: string
  results: ReturnType<typeof searchLibraryByPhrase>
  onClear: () => void
}) {
  const nothing = results.series.length === 0 && results.devotionals.length === 0

  if (nothing) {
    return (
      <section className="rr-results" aria-live="polite">
        <div className="rr-empty">
          <p className="rr-empty-lead">
            Nothing in the library matches <em>{query}</em>.
          </p>
          <p className="rr-empty-help">
            Try a feeling rather than a title — these all find something:
          </p>
          <p className="rr-empty-seeds">
            {['worn out', 'starting over', 'waiting on God', 'too busy', 'grief'].map((seed) => (
              <span key={seed} className="rr-seed">
                {seed}
              </span>
            ))}
          </p>
          <button type="button" className="rr-empty-back" onClick={onClear}>
            Back to the shelves
          </button>
        </div>
      </section>
    )
  }

  return (
    <section className="rr-results" aria-live="polite">
      {results.series.length > 0 && (
        <>
          <h2 className="rr-results-head">
            Series <span className="oldstyle-nums">{results.series.length}</span>
          </h2>
          <div className="rr-result-grid">
            {results.series.map((r) => (
              <Link key={r.slug} href={`/series/${r.slug}`} className="rr-result-card">
                <span className="rr-result-title">{r.title}</span>
                <span className="rr-result-question">{r.question}</span>
                <span className="rr-result-meta">{dayCountLabel(r.slug)}</span>
              </Link>
            ))}
          </div>
        </>
      )}

      {results.devotionals.length > 0 && (
        <>
          <h2 className="rr-results-head">
            Readings <span className="oldstyle-nums">{results.devotionals.length}</span>
          </h2>
          <ul className="rr-result-list">
            {results.devotionals.map((r) => (
              <li key={r.slug}>
                <Link href={r.href} className="rr-result-row">
                  <span className="rr-result-row-main">
                    <span className="rr-result-row-title">{r.title}</span>
                    {r.teaser && <span className="rr-result-row-teaser">{r.teaser}</span>}
                  </span>
                  {r.seriesTitle && (
                    <span className="rr-result-row-series">{r.seriesTitle}</span>
                  )}
                </Link>
              </li>
            ))}
          </ul>
        </>
      )}
    </section>
  )
}
