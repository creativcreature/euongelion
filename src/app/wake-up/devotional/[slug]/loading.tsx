import Skeleton from '@/components/ui/Skeleton'
import EuangelionShellHeader from '@/components/EuangelionShellHeader'

/**
 * D-24 (F-074) — Layout-accurate skeleton for the Wake-Up devotional
 * reader. Same first-paint geometry as /devotional/[slug]/loading.tsx
 * (both routes render DevotionalPageClient); only the masthead brand
 * word/tone differs. Replaces the centered "Opening this day's reading."
 * text card that shared no geometry with the reader.
 */
export default function DevotionalLoading() {
  return (
    <div className="mock-home">
      <main className="mock-paper">
        <EuangelionShellHeader brandWord="WAKE UP" tone="wake" />
        <section className="devotional-shell-main shell-content-pad mx-auto max-w-6xl">
          {/* Breadcrumbs */}
          <Skeleton className="mb-7 h-4 w-64 max-w-full" />

          {/* Header panel: meta row + headline + teaser + action row */}
          <header
            className="mb-8 border px-6 py-6"
            style={{ borderColor: 'var(--color-border)' }}
          >
            <div className="mb-3 flex flex-wrap items-center gap-3">
              <Skeleton className="h-4 w-28" />
              <Skeleton className="h-4 w-24" />
            </div>
            <Skeleton className="mb-3 h-9 w-4/5" />
            <Skeleton className="mb-2 h-4 w-full" />
            <Skeleton className="h-4 w-2/3" />
            <div className="mt-5 flex flex-wrap gap-x-5 gap-y-2">
              <Skeleton className="h-4 w-28" />
              <Skeleton className="h-4 w-16" />
            </div>
          </header>

          {/* Save / clip actions row */}
          <div className="mb-6 flex flex-wrap gap-4">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-4 w-24" />
          </div>

          {/* Day-nav pill (44px target, full width) */}
          <Skeleton className="mb-8 h-11 w-full" />

          {/* Reading copy */}
          <div className="mx-auto max-w-2xl">
            <Skeleton className="mb-3 h-4 w-full" />
            <Skeleton className="mb-3 h-4 w-full" />
            <Skeleton className="mb-3 h-4 w-11/12" />
            <Skeleton className="mb-8 h-4 w-3/4" />
            {/* Scripture block */}
            <Skeleton className="mb-8 h-28 w-full" />
            <Skeleton className="mb-3 h-4 w-full" />
            <Skeleton className="mb-3 h-4 w-10/12" />
            <Skeleton className="h-4 w-2/3" />
          </div>
        </section>
      </main>
    </div>
  )
}
