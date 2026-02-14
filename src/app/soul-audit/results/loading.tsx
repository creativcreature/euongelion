import Skeleton from '@/components/ui/Skeleton'
import EuangelionShellHeader from '@/components/EuangelionShellHeader'

export default function SoulAuditResultsLoading() {
  return (
    <div className="newspaper-home min-h-screen">
      <EuangelionShellHeader />

      <div className="shell-content-pad mx-auto max-w-7xl lg:px-20">
        {/* Header */}
        <div className="mb-12 text-center">
          <Skeleton className="mx-auto mb-6 h-4 w-48" />
          <Skeleton className="mx-auto h-8 w-2/3 max-w-md" />
        </div>

        {/* 3 result cards */}
        <div className="grid gap-6 md:grid-cols-3">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="overflow-hidden"
              style={{ border: '1px solid var(--color-border)' }}
            >
              <Skeleton className="h-32 w-full" />
              <div className="p-6">
                <Skeleton className="mb-3 h-4 w-24" />
                <Skeleton className="mb-3 h-6 w-full" />
                <Skeleton className="mb-4 h-4 w-3/4" />
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
