interface SkeletonProps {
  className?: string
}

/**
 * Reusable skeleton loading placeholder.
 * Uses brand surface color with pulse animation.
 * Compose with className for sizing: h-4, h-8, w-full, etc.
 */
export default function Skeleton({ className = '' }: SkeletonProps) {
  return (
    <div
      className={`animate-pulse ${className}`}
      style={{ backgroundColor: 'var(--color-surface-raised)' }}
      aria-hidden="true"
    />
  )
}

export function SkeletonText({
  lines = 3,
  className = '',
}: {
  lines?: number
  className?: string
}) {
  return (
    <div className={`space-y-3 ${className}`} aria-hidden="true">
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton
          key={i}
          className={`h-4 ${i === lines - 1 ? 'w-3/4' : 'w-full'}`}
        />
      ))}
    </div>
  )
}
