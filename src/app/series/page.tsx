'use client'

import EuangelionShellHeader from '@/components/EuangelionShellHeader'
import SiteFooter from '@/components/SiteFooter'
import FadeIn from '@/components/motion/FadeIn'
import ActivePlanBadge from '@/components/ActivePlanBadge'
import SeriesBrowser from '@/components/series/SeriesBrowser'

/**
 * Series — the library (F-090 / SA-043).
 *
 * Founder, 2026-08-14: "The series page needs revamp as series are hiding. I
 * want it to function like a library of magazines, be more interactive and
 * better searchable."
 *
 * This page is now a shell. Everything browsable lives in `SeriesBrowser`,
 * which owns the three views (Feature / Library / List), the sort, and the
 * phrase search.
 *
 * WHAT WAS REMOVED AND WHY. The previous page defaulted to a rails view built
 * from `SERIES_RAILS` + `FEATURED_SERIES_SLUGS` — a set of curated sideways
 * shelves. With 37 series and a handful of shelves, any series in no rail was
 * unreachable without switching views and knowing to look; that is the
 * "hiding" the founder reported. The curated rails are not deleted from the
 * data (`src/data/series-rails.ts` still holds them, and the topic definitions
 * are reused as keywords), they are simply no longer the default way in.
 * LIBRARY renders every slug in ALL_SERIES_ORDER, so coverage is structural
 * rather than editorial.
 */
export default function SeriesBrowsePage() {
  return (
    <div className="mock-home">
      <main id="main-content" className="mock-paper">
        <EuangelionShellHeader />

        <header className="series-page-header">
          <FadeIn>
            <h1 className="series-page-title">The Library</h1>
            <p className="series-page-subtitle">
              Every series we have. Browse the shelves, or say what you&rsquo;re
              carrying and we&rsquo;ll find the reading that meets it.
            </p>
          </FadeIn>
        </header>

        {/* Renders only when the reader has a current plan. */}
        <section
          aria-label="Continue reading"
          className="series-active-tile"
        >
          <ActivePlanBadge variant="tile" />
        </section>

        <SeriesBrowser />

        <SiteFooter />
      </main>
    </div>
  )
}
