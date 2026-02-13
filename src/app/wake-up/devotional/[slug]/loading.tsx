import Skeleton from '@/components/ui/Skeleton'
import { SkeletonText } from '@/components/ui/Skeleton'
import EuangelionShellHeader from '@/components/EuangelionShellHeader'

export default function DevotionalLoading() {
  return (
    <div className="newspaper-reading min-h-screen">
      <EuangelionShellHeader />

      {/* Hero skeleton */}
      <header className="px-6 pb-16 pt-32 md:px-16 md:pb-24 md:pt-40 lg:px-24">
        <div style={{ maxWidth: '900px' }}>
          <Skeleton className="mb-6 h-4 w-40" />
          <Skeleton className="mb-8 h-12 w-3/4" />
          <Skeleton className="h-6 w-2/3 max-w-[640px]" />
        </div>
      </header>

      {/* Content skeleton — mimics module layout */}
      <div className="px-6 pb-32 pt-16 md:px-16 md:pb-48 md:pt-24 lg:px-24">
        <div style={{ maxWidth: '680px' }}>
          {/* Scripture block */}
          <Skeleton className="mb-16 h-40 w-full" />

          {/* Teaching paragraphs */}
          <SkeletonText lines={4} className="mb-12" />
          <SkeletonText lines={3} className="mb-12" />

          {/* Vocab block */}
          <Skeleton className="mb-4 h-8 w-48" />
          <SkeletonText lines={2} className="mb-12" />

          {/* Prayer block */}
          <Skeleton className="mb-4 h-4 w-32" />
          <SkeletonText lines={3} />
        </div>
      </div>
    </div>
  )
}
