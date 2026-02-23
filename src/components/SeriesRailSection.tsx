'use client'

import PrintRail from '@/components/newspaper/PrintRail'
import BrowseSeriesCard from '@/components/BrowseSeriesCard'
import type { CardVariant } from '@/components/BrowseSeriesCard'
import FadeIn from '@/components/motion/FadeIn'
import { SERIES_DATA } from '@/data/series'
import type { RailLayout } from '@/data/series-rails'

interface SeriesRailSectionProps {
  label: string
  subtitle?: string
  slugs: string[]
  layout: RailLayout
  progress?: Record<
    string,
    { completed: boolean; inProgress: boolean; currentDay?: number }
  >
  className?: string
  cardVariant?: CardVariant
}

function progressWithTotal(
  slug: string,
  progress?: Record<
    string,
    { completed: boolean; inProgress: boolean; currentDay?: number }
  >,
) {
  const p = progress?.[slug]
  if (!p) return undefined
  const series = SERIES_DATA[slug]
  return { ...p, total: series?.days.length ?? 0 }
}

export default function SeriesRailSection({
  label,
  subtitle,
  slugs,
  layout,
  progress = {},
  className = '',
  cardVariant = 'medium',
}: SeriesRailSectionProps) {
  if (!slugs.length) return null

  return (
    <FadeIn as="section" className={`browse-rail-section ${className}`}>
      <div className="browse-rail-header">
        <h2 className="browse-rail-label">{label}</h2>
        {subtitle && <p className="browse-rail-subtitle">{subtitle}</p>}
      </div>

      {layout === 'rail' && (
        <PrintRail
          items={slugs.map((slug) => ({
            id: slug,
            content: (
              <BrowseSeriesCard
                slug={slug}
                progress={progressWithTotal(slug, progress)}
                variant={cardVariant}
              />
            ),
          }))}
          ariaLabel={label}
          className="browse-rail-viewport-wrap"
          viewportClassName="browse-rail-viewport"
          itemClassName="browse-rail-item"
          autoRotate={false}
          showControls={true}
        />
      )}

      {layout === 'grid' && (
        <div className="mock-featured-grid shell-content-pad mx-auto max-w-7xl">
          {slugs.map((slug) => (
            <BrowseSeriesCard
              key={slug}
              slug={slug}
              progress={progressWithTotal(slug, progress)}
              variant={cardVariant}
            />
          ))}
        </div>
      )}

      {layout === 'spotlight-rail' && (
        <div className="browse-spotlight-rail">
          {slugs[0] && (
            <div className="browse-spotlight-hero">
              <BrowseSeriesCard
                slug={slugs[0]}
                progress={progressWithTotal(slugs[0], progress)}
                variant="large"
              />
            </div>
          )}
          {slugs.length > 1 && (
            <PrintRail
              items={slugs.slice(1).map((slug) => ({
                id: slug,
                content: (
                  <BrowseSeriesCard
                    slug={slug}
                    progress={progressWithTotal(slug, progress)}
                    variant={cardVariant}
                  />
                ),
              }))}
              ariaLabel={`${label} — more series`}
              className="browse-rail-viewport-wrap"
              viewportClassName="browse-rail-viewport"
              itemClassName="browse-rail-item"
              autoRotate={false}
              showControls={true}
            />
          )}
        </div>
      )}

      {layout === 'centered-row' && (
        <div className="mock-featured-grid shell-content-pad mx-auto max-w-7xl">
          {slugs.map((slug) => (
            <BrowseSeriesCard
              key={slug}
              slug={slug}
              progress={progressWithTotal(slug, progress)}
              variant={cardVariant}
            />
          ))}
        </div>
      )}

      {layout === 'featured-grid' && (
        <div className="mock-featured-grid shell-content-pad mx-auto max-w-7xl">
          {slugs.map((slug) => (
            <BrowseSeriesCard
              key={slug}
              slug={slug}
              progress={progressWithTotal(slug, progress)}
              variant={cardVariant}
            />
          ))}
        </div>
      )}
    </FadeIn>
  )
}
