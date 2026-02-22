'use client'

import { useMemo, useState } from 'react'
import EuangelionShellHeader from '@/components/EuangelionShellHeader'
import SiteFooter from '@/components/SiteFooter'
import FadeIn from '@/components/motion/FadeIn'
import SeriesRailSection from '@/components/SeriesRailSection'
import SeriesSearchPanel from '@/components/SeriesSearchPanel'
import BrowseSeriesCard from '@/components/BrowseSeriesCard'
import { useProgress } from '@/hooks/useProgress'
import { ALL_SERIES_ORDER } from '@/data/series'
import {
  SERIES_RAILS,
  FEATURED_SERIES_SLUGS,
  WAKEUP_ORIGINALS_SLUGS,
} from '@/data/series-rails'

/**
 * Series Browse Page — Apple TV-style dynamic composition
 *
 * Layout: Featured grid → Continue Reading → Theme rails (varied layouts) →
 * Wake-Up Originals → Search/Filter panel (toggled).
 *
 * NO pathway labels. NO scroll-snap. Fully user-controlled scrolling.
 */
export default function SeriesBrowsePage() {
  const { getSeriesProgress } = useProgress()
  const [isSearchOpen, setIsSearchOpen] = useState(false)

  // Build progress map matching component interface
  const progressMap = useMemo(() => {
    const map: Record<
      string,
      { completed: boolean; inProgress: boolean; currentDay?: number }
    > = {}
    for (const slug of ALL_SERIES_ORDER) {
      const p = getSeriesProgress(slug)
      map[slug] = {
        completed: p.completed >= p.total && p.total > 0,
        inProgress: p.completed > 0 && p.completed < p.total,
        currentDay: p.completed > 0 ? p.completed + 1 : undefined,
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

  return (
    <div className="mock-home">
      <main id="main-content" className="mock-paper">
        <EuangelionShellHeader />

        {/* [A] Page Header — Series heading + search toggle */}
        <header className="shell-content-pad section-rule mx-auto max-w-7xl pb-10 md:pb-14">
          <FadeIn>
            <div className="flex items-start justify-between gap-4">
              <div>
                <h1 className="vw-heading-lg mb-4 series-page-heading">
                  Series
                </h1>
                <p className="vw-body text-secondary type-prose">
                  Scripture-first reading paths for wherever you are right now.
                </p>
              </div>
              <button
                onClick={() => setIsSearchOpen(!isSearchOpen)}
                className="browse-search-toggle"
                aria-label={isSearchOpen ? 'Close search' : 'Search series'}
                aria-expanded={isSearchOpen}
              >
                {isSearchOpen ? (
                  <svg
                    width="22"
                    height="22"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                  >
                    <path d="M18 6 6 18M6 6l12 12" />
                  </svg>
                ) : (
                  <svg
                    width="22"
                    height="22"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                  >
                    <circle cx="11" cy="11" r="8" />
                    <path d="m21 21-4.3-4.3" />
                  </svg>
                )}
              </button>
            </div>
          </FadeIn>
        </header>

        {/* [K] Search + Filter Panel (slides down when toggled) */}
        <SeriesSearchPanel
          isOpen={isSearchOpen}
          onClose={() => setIsSearchOpen(false)}
          allSlugs={[...ALL_SERIES_ORDER]}
          progress={progressMap}
        />

        {/* Dynamic composition — only visible when search is closed */}
        {!isSearchOpen && (
          <>
            {/* [B] Featured Editorial — asymmetric grid: 1 large + 2 stacked */}
            <section className="shell-content-pad mx-auto max-w-7xl pb-12 md:pb-16">
              <FadeIn>
                <div className="browse-featured-grid">
                  <div className="browse-featured-primary">
                    <BrowseSeriesCard
                      slug={FEATURED_SERIES_SLUGS[0]}
                      variant="spotlight"
                      progress={progressMap[FEATURED_SERIES_SLUGS[0]]}
                    />
                  </div>
                  <div className="browse-featured-secondary">
                    {FEATURED_SERIES_SLUGS.slice(1, 3).map((slug) => (
                      <BrowseSeriesCard
                        key={slug}
                        slug={slug}
                        variant="featured"
                        progress={progressMap[slug]}
                      />
                    ))}
                  </div>
                </div>
              </FadeIn>
            </section>

            {/* [C] Continue Reading — compact rail, only if in-progress */}
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

            {/* [D-I] Theme Rails — dynamic composition from SERIES_RAILS */}
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

            {/* [J] Wake-Up Originals — branded collection */}
            <SeriesRailSection
              label="Wake-Up Originals"
              subtitle="The founding collection that started it all"
              slugs={[...WAKEUP_ORIGINALS_SLUGS]}
              layout="rail"
              progress={progressMap}
              className="browse-originals-section"
            />

            {/* All Series footer count */}
            <FadeIn>
              <div className="shell-content-pad mx-auto max-w-7xl py-12 text-center">
                <p className="vw-small text-muted">
                  <span className="oldstyle-nums">
                    {ALL_SERIES_ORDER.length}
                  </span>{' '}
                  series available
                </p>
              </div>
            </FadeIn>
          </>
        )}

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
