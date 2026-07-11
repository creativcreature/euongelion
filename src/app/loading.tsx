import Skeleton from '@/components/ui/Skeleton'
import EuangelionShellHeader from '@/components/EuangelionShellHeader'
import SiteFooter from '@/components/SiteFooter'

/**
 * D-24 (F-074) — Root loading: a NEUTRAL app-frame shell.
 *
 * Every route without its own loading.tsx streams through this file
 * (/today, /daily-bread, /library, /settings, /saved, /soul-audit, …),
 * so it must not guess any one page's content shape (the previous
 * version mimicked a centered hero, which matched none of them).
 * It renders only what every page shares — the paper frame and the
 * masthead header — plus a quiet, generic placeholder in the content
 * well so the frame never looks dead.
 */
export default function RootLoading() {
  return (
    <div className="mock-home min-h-screen">
      <main className="mock-paper min-h-screen">
        <EuangelionShellHeader />
        <section className="mock-panel shell-content-pad">
          <div className="mx-auto w-full max-w-3xl py-16">
            <Skeleton className="mx-auto mb-6 h-4 w-32" />
            <Skeleton className="mx-auto mb-3 h-4 w-full max-w-xl" />
            <Skeleton className="mx-auto mb-3 h-4 w-5/6 max-w-lg" />
            <Skeleton className="mx-auto h-4 w-2/3 max-w-md" />
          </div>
        </section>
        <SiteFooter />
      </main>
    </div>
  )
}
