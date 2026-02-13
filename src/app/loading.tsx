import Skeleton from '@/components/ui/Skeleton'
import EuangelionShellHeader from '@/components/EuangelionShellHeader'

export default function RootLoading() {
  return (
    <div className="newspaper-home min-h-screen">
      <EuangelionShellHeader />

      {/* Hero skeleton */}
      <div className="flex min-h-[calc(100vh-57px)] flex-col items-center justify-center px-6 text-center">
        <Skeleton className="mb-4 h-16 w-3/4 max-w-lg" />
        <Skeleton className="mb-8 h-4 w-48" />
        <Skeleton className="mb-12 h-10 w-2/3 max-w-md" />
        <Skeleton className="h-12 w-64" />
      </div>
    </div>
  )
}
