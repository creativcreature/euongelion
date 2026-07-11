import Skeleton from '@/components/ui/Skeleton'
import EuangelionShellHeader from '@/components/EuangelionShellHeader'

/**
 * D-24 (F-074) — Layout-accurate skeleton for /series.
 *
 * Mirrors the real first paint (default rails view): centered page header
 * (serif title + subtitle), the bordered toolbar row (view toggle), then
 * horizontal rail sections — each an editorial rail header (serif label +
 * subtitle) over a row of large browse cards. The previous skeleton showed
 * a left-aligned header and a 3-column grid, which matched none of it.
 * Real layout containers (.series-page-header, .series-toolbar,
 * .browse-rail-*) are reused so geometry stays in lockstep with the page.
 */
export default function SeriesLoading() {
  return (
    <div className="mock-home">
      <main className="mock-paper">
        <EuangelionShellHeader />

        {/* Centered page header: title + subtitle */}
        <header className="series-page-header">
          <Skeleton className="mx-auto mb-3 h-8 w-40" />
          <Skeleton className="mx-auto h-4 w-72 max-w-full" />
        </header>

        {/* Toolbar: RAILS / GRID / LIST view toggle */}
        <div className="series-toolbar">
          <Skeleton className="h-8 w-44" />
        </div>

        {/* Two rail sections — enough to fill the fold without waste */}
        {[0, 1].map((rail) => (
          <section key={rail} className="browse-rail-section">
            <div className="browse-rail-header">
              <Skeleton className="mb-2 h-7 w-48" />
              <Skeleton className="h-4 w-64 max-w-full" />
            </div>
            <div className="flex gap-4 overflow-hidden px-[var(--mock-pad-x,1rem)]">
              {[0, 1, 2].map((card) => (
                <Skeleton
                  key={card}
                  className="h-[clamp(220px,30vw,400px)] w-[84vw] flex-none md:w-[31%]"
                />
              ))}
            </div>
          </section>
        ))}
      </main>
    </div>
  )
}
