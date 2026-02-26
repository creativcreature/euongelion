import type { CustomPlanDay } from '@/types/soul-audit'

/**
 * Runtime type guard for CustomPlanDay objects.
 *
 * Used when deserializing plan days from sessionStorage, API responses,
 * or progressive generation payloads. Validates the minimum fields
 * required for a complete (non-pending) plan day.
 */
export function isFullPlanDay(day: unknown): day is CustomPlanDay {
  if (!day || typeof day !== 'object') return false
  const candidate = day as Record<string, unknown>
  return (
    typeof candidate.day === 'number' &&
    typeof candidate.title === 'string' &&
    typeof candidate.reflection === 'string'
  )
}
