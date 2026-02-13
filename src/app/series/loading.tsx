import Skeleton from '@/components/ui/Skeleton'
import EuangelionShellHeader from '@/components/EuangelionShellHeader'

export default function SeriesLoading() {
  return (
    <div className="newspaper-home min-h-screen">
      <EuangelionShellHeader />

      <div className="mx-auto max-w-7xl px-6 pb-32 pt-12 md:px-[60px] md:pb-48 md:pt-20 lg:px-20">
        {/* Header */}
        <div className="mb-16">
          <Skeleton className="mb-8 h-12 w-64" />
          <Skeleton className="h-6 w-96 max-w-full" />
        </div>

        {/* Section label */}
        <Skeleton className="mb-8 h-4 w-40" />

        {/* Series grid */}
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <div
              key={i}
              className="overflow-hidden"
              style={{ border: '1px solid var(--color-border)' }}
            >
              <Skeleton className="h-40 w-full" />
              <div className="p-6">
                <Skeleton className="mb-3 h-4 w-32" />
                <Skeleton className="mb-3 h-6 w-full" />
                <Skeleton className="mb-6 h-4 w-3/4" />
                <div className="flex items-center justify-between">
                  <Skeleton className="h-4 w-16" />
                  <Skeleton className="h-4 w-16" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
