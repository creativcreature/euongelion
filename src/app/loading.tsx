import Skeleton from '@/components/ui/Skeleton'
import EuangelionShellHeader from '@/components/EuangelionShellHeader'
import SiteFooter from '@/components/SiteFooter'

export default function RootLoading() {
  return (
    <div className="mock-home min-h-screen">
      <main className="mock-paper min-h-screen">
        <EuangelionShellHeader />
        <section className="mock-panel shell-content-pad">
          <div className="flex min-h-[40vh] flex-col items-center justify-center px-6 text-center">
            <Skeleton className="mb-4 h-16 w-3/4 max-w-lg" />
            <Skeleton className="mb-8 h-4 w-48" />
            <Skeleton className="mb-12 h-10 w-2/3 max-w-md" />
            <Skeleton className="h-12 w-64" />
          </div>
        </section>
        <SiteFooter />
      </main>
    </div>
  )
}
