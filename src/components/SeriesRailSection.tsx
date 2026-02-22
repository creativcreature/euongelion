'use client'

import PrintRail from '@/components/newspaper/PrintRail'
import BrowseSeriesCard from '@/components/BrowseSeriesCard'
import FadeIn from '@/components/motion/FadeIn'
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
}

export default function SeriesRailSection({
  label,
  subtitle,
  slugs,
  layout,
  progress = {},
  className = '',
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
                variant="standard"
                progress={progress[slug]}
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
        <div className="browse-editorial-grid">
          {slugs.map((slug) => (
            <BrowseSeriesCard
              key={slug}
              slug={slug}
              variant="standard"
              progress={progress[slug]}
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
                variant="spotlight"
                progress={progress[slugs[0]]}
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
                    variant="standard"
                    progress={progress[slug]}
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
        <div className="browse-centered-row">
          {slugs.map((slug) => (
            <BrowseSeriesCard
              key={slug}
              slug={slug}
              variant="standard"
              progress={progress[slug]}
            />
          ))}
        </div>
      )}

      {layout === 'featured-grid' && (
        <div className="browse-featured-grid">
          {slugs[0] && (
            <div className="browse-featured-primary">
              <BrowseSeriesCard
                slug={slugs[0]}
                variant="spotlight"
                progress={progress[slugs[0]]}
              />
            </div>
          )}
          <div className="browse-featured-secondary">
            {slugs.slice(1, 3).map((slug) => (
              <BrowseSeriesCard
                key={slug}
                slug={slug}
                variant="featured"
                progress={progress[slug]}
              />
            ))}
          </div>
        </div>
      )}
    </FadeIn>
  )
}
