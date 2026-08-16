import Skeleton from '@/components/ui/Skeleton'
import EuangelionShellHeader from '@/components/EuangelionShellHeader'
import SiteBottom from '@/components/SiteBottom'

/**
 * Layout-accurate skeleton for the Soul Audit results page.
 *
 * Mirrors the real first paint: a stacked max-w-3xl column with breadcrumbs,
 * a centered header (label + heading + two support paragraphs), ONE
 * recommended card (guided reveal starts with only the recommended path),
 * and the "Explore another direction" reveal-button placeholder.
 */
export default function SoulAuditResultsLoading() {
  return (
    <div className="mock-home">
      <main className="mock-paper">
        <EuangelionShellHeader />
        <section className="mock-panel">
          <div className="mx-auto w-full max-w-3xl shell-content-pad">
            {/* Breadcrumbs */}
            <Skeleton className="mb-7 h-4 w-56" />

            {/* Centered header: label + h1 + two paragraphs */}
            <div className="mb-10 text-center">
              <Skeleton className="mx-auto mb-4 h-4 w-24" />
              <Skeleton className="mx-auto h-9 w-2/3 max-w-md" />
              <Skeleton className="mx-auto mt-3 h-4 w-5/6 max-w-lg" />
              <Skeleton className="mx-auto mt-2 h-4 w-4/6 max-w-md" />
            </div>

            {/* Recommended path: section label + one text-first option card */}
            <div className="mb-8">
              <Skeleton className="mb-3 h-4 w-32" />
              <div
                className="overflow-hidden"
                style={{ border: '1px solid var(--color-border)' }}
              >
                <div className="p-5">
                  {/* Title + question */}
                  <Skeleton className="mb-3 h-7 w-5/6" />
                  <Skeleton className="mb-2 h-4 w-full" />
                  <Skeleton className="mb-4 h-4 w-2/3" />
                  {/* Matched-keyword chips */}
                  <div className="mb-5 flex flex-wrap gap-2">
                    <Skeleton className="h-6 w-20" />
                    <Skeleton className="h-6 w-24" />
                    <Skeleton className="h-6 w-16" />
                  </div>
                  {/* Weekly Scripture focus block */}
                  <Skeleton className="mb-2 h-4 w-44" />
                  <Skeleton className="mb-2 h-4 w-28" />
                  <Skeleton className="mb-2 h-5 w-full" />
                  <Skeleton className="mb-4 h-5 w-3/4" />
                  {/* Actions row: BUILD THIS PATH + day count */}
                  <div className="flex items-center justify-between">
                    <Skeleton className="h-8 w-36" />
                    <Skeleton className="h-4 w-16" />
                  </div>
                </div>
                {/* Meta row: save-for-later + reasoning toggle */}
                <div
                  className="flex gap-4 px-5 py-3"
                  style={{ borderTop: '1px solid var(--color-border)' }}
                >
                  <Skeleton className="h-4 w-28" />
                  <Skeleton className="h-4 w-24" />
                </div>
              </div>
            </div>

            {/* "Explore another direction" reveal-button placeholder */}
            <div className="mb-8 text-center">
              <Skeleton className="mx-auto h-11 w-64" />
            </div>
          </div>
        </section>
        <SiteBottom />
      </main>
    </div>
  )
}
