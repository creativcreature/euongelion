'use client'

import { useMemo, useState, useSyncExternalStore } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { ALL_SERIES_ORDER, SERIES_DATA } from '@/data/series'
import {
  SORT_OPTIONS,
  alphaBucket,
  dayCountLabel,
  sortSeries,
  type SortKey,
} from '@/lib/series/catalog'
import { latestEligibleSeries } from '@/lib/home/featured-rotation'
import { searchLibraryByPhrase } from '@/lib/global-search'
import { nextUnreadDay } from '@/lib/reading/active-day'
import { useProgressStore } from '@/stores/progressStore'

/**
 * The series library (F-090).
 *
 * Founder, 2026-08-14: "The series page needs revamp as series are hiding. I
 * want it to function like a library of magazines, be more interactive and
 * better searchable. I want 2 views, 1 is the full library alphabetical and
 * sortable in various ways, and 2 is a list. actually add a feature style as
 * well that shows it more bento box style… I also want the user to be able to
 * search by phrasing etc so they can find the most relevant devotionals — this
 * is NOT the soul audit."
 *
 * WHAT WAS HIDING THEM. The old page defaulted to a rails view: a handful of
 * curated shelves, each scrolling sideways, over a catalog of 37 series. A
 * series that sat in no rail was reachable only by switching to Grid and
 * knowing to look. FEATURE below is editorial, but LIBRARY is exhaustive by
 * construction — it renders every slug in ALL_SERIES_ORDER, prints the count,
 * and buckets A–Z so a gap is visible rather than invisible.
 *
 * THE THREE VIEWS
 *  - FEATURE  bento. Varied tile sizes, newest leading, in-progress promoted.
 *  - LIBRARY  the whole catalog, alphabetised and sortable six ways.
 *  - LIST     the same catalog dense enough to scan in one screen.
 *
 * SEARCH sits above the views and takes over when it has a query, because a
 * reader searching has stopped browsing. It is phrase-tolerant (see
 * `searchLibraryByPhrase`) and returns DEVOTIONALS as well as series — a
 * reader describing a feeling usually wants the one reading that meets it, not
 * a whole arc. It is explicitly not the Soul Audit: no consent gate, no plan
 * generation, no curation. It ranks what already exists and links into it.
 */

type ViewMode = 'feature' | 'library' | 'list'

/** Stable no-op subscribe for the hydration check — never notifies. */
const subscribeNever = () => () => {}

const VIEW_LABELS: Record<ViewMode, string> = {
  feature: 'Feature',
  library: 'Library',
  list: 'List',
}

/**
 * Bento tile sizes, as a repeating rhythm over the catalog.
 *
 * Deliberately a fixed pattern rather than anything random: the grid must be
 * identical on the server and after hydration, and an editorial page should
 * look composed rather than shuffled. The lead tile is handled separately.
 */
const BENTO_RHYTHM = [
  'tall',
  'small',
  'small',
  'wide',
  'small',
  'small',
  'tall',
  'small',
] as const

function bentoSize(index: number): (typeof BENTO_RHYTHM)[number] {
  return BENTO_RHYTHM[index % BENTO_RHYTHM.length]
}

interface SeriesProgress {
  completed: number
  total: number
}

function ProgressRail({ progress }: { progress: SeriesProgress | undefined }) {
  if (!progress || progress.completed === 0) return null
  const pct = Math.round((progress.completed / Math.max(progress.total, 1)) * 100)
  return (
    <span className="series-card-progress" aria-label={`${pct}% complete`}>
      <span className="series-card-progress-fill" style={{ width: `${pct}%` }} />
    </span>
  )
}

export default function SeriesBrowser() {
  const [view, setView] = useState<ViewMode>('feature')
  const [sort, setSort] = useState<SortKey>('az')
  const [query, setQuery] = useState('')
  const completions = useProgressStore((s) => s.completions)

  // Progress is localStorage-backed, so it only exists after hydration. Reading
  // it during render would mismatch the server pass. useSyncExternalStore is
  // the clean form of this check: the server snapshot is false, the client
  // snapshot is true, and nothing sets state inside an effect to get there.
  const hydrated = useSyncExternalStore(
    subscribeNever,
    () => true,
    () => false,
  )

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
      const completed = series.days.filter((d) =>
        completedSlugs.has(d.slug),
      ).length
      if (completed > 0) map.set(slug, { completed, total: series.days.length })
    }
    return map
  }, [hydrated, completedSlugs])

  const inProgress = useMemo(
    () =>
      [...progressBySeries.entries()]
        .filter(([, p]) => p.completed < p.total)
        .map(([slug]) => slug),
    [progressBySeries],
  )

  const trimmedQuery = query.trim()
  const results = useMemo(
    () =>
      trimmedQuery.length > 1
        ? searchLibraryByPhrase(trimmedQuery, { series: 12, devotionals: 30 })
        : null,
    [trimmedQuery],
  )

  const sortedSlugs = useMemo(
    () => sortSeries(ALL_SERIES_ORDER, sort),
    [sort],
  )

  /** Where a card should point: the reader's next unread day, else the series. */
  const cardHref = (slug: string) => {
    if (!hydrated) return `/series/${slug}`
    const next = nextUnreadDay(slug, completedSlugs)
    const started = progressBySeries.has(slug)
    return started && next ? `/devotional/${next.slug}` : `/series/${slug}`
  }

  return (
    <div className="series-browser">
      {/* ─── Search ─────────────────────────────────────────────────── */}
      <div className="series-search-shell">
        <label className="series-search-field">
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinecap="round"
            aria-hidden="true"
          >
            <circle cx="11" cy="11" r="8" />
            <path d="m21 21-4.3-4.3" />
          </svg>
          <input
            type="search"
            className="series-search-input"
            placeholder="Describe what you're carrying — “I feel anxious about money”"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            aria-label="Search the library by phrase"
          />
          {trimmedQuery.length > 0 && (
            <button
              type="button"
              className="series-search-clear text-label"
              onClick={() => setQuery('')}
            >
              Clear
            </button>
          )}
        </label>
        <p className="series-search-hint vw-small">
          Search in your own words. This is not the Soul Audit — it looks
          through every series and devotional we have.
        </p>
      </div>

      {/* ─── Results take over while searching ──────────────────────── */}
      {results ? (
        <section className="series-results" aria-live="polite">
          {results.series.length === 0 && results.devotionals.length === 0 ? (
            <div className="series-results-empty">
              <p className="vw-body">
                Nothing matched <strong>“{trimmedQuery}”</strong>.
              </p>
              <p className="vw-small text-secondary">
                Try fewer words, or a feeling rather than a title — “worn out”,
                “starting over”, “waiting on God”.
              </p>
            </div>
          ) : (
            <>
              {results.series.length > 0 && (
                <>
                  <h2 className="series-results-heading text-label">
                    Series · {results.series.length}
                  </h2>
                  <div className="series-results-grid">
                    {results.series.map((r) => (
                      <Link
                        key={r.slug}
                        href={`/series/${r.slug}`}
                        className="series-result-card"
                      >
                        <p className="series-result-title">{r.title}</p>
                        <p className="series-result-question vw-small">
                          {r.question}
                        </p>
                        <p className="series-result-meta text-label">
                          {dayCountLabel(r.slug)}
                        </p>
                      </Link>
                    ))}
                  </div>
                </>
              )}

              {results.devotionals.length > 0 && (
                <>
                  <h2 className="series-results-heading text-label">
                    Devotionals · {results.devotionals.length}
                  </h2>
                  <ul className="series-result-list">
                    {results.devotionals.map((r) => (
                      <li key={r.slug}>
                        <Link href={r.href} className="series-result-row">
                          <span className="series-result-row-main">
                            <span className="series-result-row-title">
                              {r.title}
                            </span>
                            {r.teaser && (
                              <span className="series-result-row-teaser vw-small">
                                {r.teaser}
                              </span>
                            )}
                          </span>
                          {r.seriesTitle && (
                            <span className="series-result-row-series text-label">
                              {r.seriesTitle}
                            </span>
                          )}
                        </Link>
                      </li>
                    ))}
                  </ul>
                </>
              )}
            </>
          )}
        </section>
      ) : (
        <>
          {/* ─── View toggle + sort ─────────────────────────────────── */}
          <div className="series-controls">
            <div className="series-view-toggle" role="tablist" aria-label="View">
              {(Object.keys(VIEW_LABELS) as ViewMode[]).map((mode) => (
                <button
                  key={mode}
                  type="button"
                  role="tab"
                  aria-selected={view === mode}
                  className={`series-view-btn text-label${view === mode ? ' active' : ''}`}
                  onClick={() => setView(mode)}
                >
                  {VIEW_LABELS[mode]}
                </button>
              ))}
            </div>

            {view !== 'feature' && (
              <div className="series-sort">
                <span className="text-label series-sort-label">Sort</span>
                {SORT_OPTIONS.map((opt) => (
                  <button
                    key={opt.key}
                    type="button"
                    className={`series-sort-btn text-label${sort === opt.key ? ' active' : ''}`}
                    onClick={() => setSort(opt.key)}
                    aria-pressed={sort === opt.key}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            )}

            <p className="series-count text-label">
              <span className="oldstyle-nums">{ALL_SERIES_ORDER.length}</span>{' '}
              series
            </p>
          </div>

          {view === 'feature' && (
            <FeatureView
              inProgress={inProgress}
              progressBySeries={progressBySeries}
              cardHref={cardHref}
            />
          )}

          {view === 'library' && (
            <LibraryGrid
              slugs={sortedSlugs}
              showBuckets={sort === 'az' || sort === 'za'}
              progressBySeries={progressBySeries}
              cardHref={cardHref}
            />
          )}

          {view === 'list' && (
            <ListView
              slugs={sortedSlugs}
              progressBySeries={progressBySeries}
              cardHref={cardHref}
            />
          )}
        </>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Feature (bento)
// ---------------------------------------------------------------------------

function FeatureView({
  inProgress,
  progressBySeries,
  cardHref,
}: {
  inProgress: string[]
  progressBySeries: Map<string, SeriesProgress>
  cardHref: (slug: string) => string
}) {
  // The lead is the newest ELIGIBLE series, not simply the newest: SA-036(4)
  // keeps a commissioned series out of feature slots, and the founder
  // reaffirmed it 2026-08-14 ("not looking at the sun — that's an exception").
  // It still appears in the bento body and in LIBRARY/LIST, because nothing
  // may hide; it just does not take the hero tile.
  const lead = latestEligibleSeries()
  const leadSeries = SERIES_DATA[lead]

  // The bento body: everything except the lead, in-progress promoted to the
  // front so a returning reader meets their own reading first.
  const body = useMemo(() => {
    const seen = new Set<string>([lead])
    const ordered: string[] = []
    for (const slug of inProgress) {
      if (!seen.has(slug) && SERIES_DATA[slug]) {
        ordered.push(slug)
        seen.add(slug)
      }
    }
    for (const slug of ALL_SERIES_ORDER) {
      if (!seen.has(slug) && SERIES_DATA[slug]) ordered.push(slug)
    }
    return ordered
  }, [lead, inProgress])

  return (
    <div className="series-bento">
      {leadSeries && (
        <Link
          href={cardHref(lead)}
          className="series-bento-tile series-bento-lead"
        >
          {leadSeries.heroImage && (
            <Image
              src={leadSeries.heroImage}
              alt=""
              fill
              sizes="(max-width: 900px) 100vw, 66vw"
              className="series-bento-img"
              priority
            />
          )}
          <span className="series-bento-scrim" />
          <span className="series-bento-body">
            <span className="text-label series-bento-kicker">
              Newest · {dayCountLabel(lead)}
            </span>
            <span className="series-bento-title series-bento-title--lead">
              {leadSeries.title}
            </span>
            <span className="series-bento-question">{leadSeries.question}</span>
          </span>
        </Link>
      )}

      {body.map((slug, i) => {
        const series = SERIES_DATA[slug]
        if (!series) return null
        const size = bentoSize(i)
        const progress = progressBySeries.get(slug)
        return (
          <Link
            key={slug}
            href={cardHref(slug)}
            className={`series-bento-tile series-bento-${size}`}
          >
            {series.heroImage && (
              <Image
                src={series.heroImage}
                alt=""
                fill
                sizes="(max-width: 900px) 50vw, 33vw"
                className="series-bento-img"
              />
            )}
            <span className="series-bento-scrim" />
            <span className="series-bento-body">
              <span className="text-label series-bento-kicker">
                {progress
                  ? `Day ${progress.completed + 1} of ${progress.total}`
                  : dayCountLabel(slug)}
              </span>
              <span className="series-bento-title">{series.title}</span>
              {size !== 'small' && (
                <span className="series-bento-question">{series.question}</span>
              )}
            </span>
            <ProgressRail progress={progress} />
          </Link>
        )
      })}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Library (full, alphabetical, sortable)
// ---------------------------------------------------------------------------

function LibraryGrid({
  slugs,
  showBuckets,
  progressBySeries,
  cardHref,
}: {
  slugs: string[]
  showBuckets: boolean
  progressBySeries: Map<string, SeriesProgress>
  cardHref: (slug: string) => string
}) {
  // ONE continuous grid, not a grid per letter.
  //
  // The first build bucketed each letter into its own full-width grid. With 37
  // series over ~20 initials most buckets held one or two covers, so the shelf
  // rendered as a column of near-empty rows — sparser than the rails it
  // replaced, which is the opposite of the point. A library is dense: every
  // cover adjacent to the next, with the alphabet as a way to JUMP rather than
  // as a set of section breaks.
  const firstOfLetter = useMemo(() => {
    const seen = new Map<string, string>()
    if (!showBuckets) return seen
    for (const slug of slugs) {
      const bucket = alphaBucket(slug)
      if (!seen.has(bucket)) seen.set(bucket, slug)
    }
    return seen
  }, [slugs, showBuckets])

  // slug -> the letter it opens, for the inline marker on that card.
  const opensLetter = useMemo(() => {
    const map = new Map<string, string>()
    for (const [letter, slug] of firstOfLetter) map.set(slug, letter)
    return map
  }, [firstOfLetter])

  return (
    <div className="series-library">
      {showBuckets && firstOfLetter.size > 1 && (
        <nav className="series-alpha-rail" aria-label="Jump to letter">
          {[...firstOfLetter.keys()].map((letter) => (
            <a
              key={letter}
              href={`#shelf-${letter}`}
              className="series-alpha-link text-label"
            >
              {letter}
            </a>
          ))}
        </nav>
      )}

      <div className="series-library-grid">
        {slugs.map((slug) => {
          const series = SERIES_DATA[slug]
          if (!series) return null
          const progress = progressBySeries.get(slug)
          const letter = opensLetter.get(slug)
          return (
            <Link
              key={slug}
              href={cardHref(slug)}
              className="series-lib-card"
              id={letter ? `shelf-${letter}` : undefined}
            >
              <span className="series-lib-thumb">
                {series.heroImage && (
                  <Image
                    src={series.heroImage}
                    alt=""
                    fill
                    sizes="(max-width: 560px) 45vw, (max-width: 1100px) 22vw, 15vw"
                    className="series-bento-img"
                  />
                )}
                {letter && (
                  <span className="series-lib-letter" aria-hidden="true">
                    {letter}
                  </span>
                )}
              </span>
              <span className="series-lib-meta">
                <span className="series-lib-title">{series.title}</span>
                <span className="series-lib-sub vw-small">
                  {dayCountLabel(slug)} · {series.pathway}
                </span>
                <ProgressRail progress={progress} />
              </span>
            </Link>
          )
        })}
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// List
// ---------------------------------------------------------------------------

function ListView({
  slugs,
  progressBySeries,
  cardHref,
}: {
  slugs: string[]
  progressBySeries: Map<string, SeriesProgress>
  cardHref: (slug: string) => string
}) {
  return (
    <ul className="series-listing">
      {slugs.map((slug) => {
        const series = SERIES_DATA[slug]
        if (!series) return null
        const progress = progressBySeries.get(slug)
        return (
          <li key={slug}>
            <Link href={cardHref(slug)} className="series-listing-row">
              <span className="series-listing-title">{series.title}</span>
              <span className="series-listing-question vw-small">
                {series.question}
              </span>
              <span className="series-listing-meta text-label">
                {progress
                  ? `Day ${progress.completed + 1}/${progress.total}`
                  : dayCountLabel(slug)}
              </span>
              <span className="series-listing-pathway text-label">
                {series.pathway}
              </span>
            </Link>
          </li>
        )
      })}
    </ul>
  )
}
