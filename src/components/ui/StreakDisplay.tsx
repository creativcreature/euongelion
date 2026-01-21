'use client'

import { useStreaks } from '@/lib/use-streaks'
import { formatStreakMessage, getStreakMilestone } from '@/lib/streaks'

interface StreakDisplayProps {
  variant?: 'compact' | 'full' | 'minimal'
  className?: string
}

export function StreakDisplay({ variant = 'compact', className = '' }: StreakDisplayProps) {
  const { currentStreak, longestStreak, totalDaysRead, hasReadToday, loaded } = useStreaks()

  if (!loaded) {
    return (
      <div className={`animate-pulse ${className}`}>
        <div className="h-8 w-24 bg-[#1a1a1a] rounded"></div>
      </div>
    )
  }

  if (variant === 'minimal') {
    return (
      <div className={`flex items-center gap-2 ${className}`}>
        <span className="text-2xl">{hasReadToday ? '🔥' : '💨'}</span>
        <span className="text-[#c19a6b] font-bold">{currentStreak}</span>
      </div>
    )
  }

  if (variant === 'compact') {
    return (
      <div className={`flex items-center gap-3 px-4 py-2 bg-[#1a1a1a] rounded-lg ${className}`}>
        <div className="flex items-center gap-2">
          <span className="text-2xl">{currentStreak > 0 ? '🔥' : '💨'}</span>
          <div>
            <p className="text-[#c19a6b] font-bold">{currentStreak} day{currentStreak !== 1 ? 's' : ''}</p>
            <p className="text-xs text-gray-400">
              {hasReadToday ? 'Keep it up!' : 'Read today to continue'}
            </p>
          </div>
        </div>
      </div>
    )
  }

  // Full variant
  const milestone = getStreakMilestone(currentStreak)
  const progress = milestone && !milestone.reached
    ? Math.round((currentStreak / milestone.milestone) * 100)
    : 100

  return (
    <div className={`p-6 bg-[#1a1a1a] rounded-xl ${className}`}>
      {/* Current Streak */}
      <div className="text-center mb-6">
        <div className="text-6xl mb-2">{currentStreak > 0 ? '🔥' : '💨'}</div>
        <h3 className="text-3xl font-bold text-[#c19a6b]">{currentStreak}</h3>
        <p className="text-gray-400">{formatStreakMessage(currentStreak)}</p>
      </div>

      {/* Progress to next milestone */}
      {milestone && !milestone.reached && (
        <div className="mb-6">
          <div className="flex justify-between text-sm text-gray-400 mb-2">
            <span>Next milestone</span>
            <span>{milestone.milestone} days</span>
          </div>
          <div className="h-2 bg-[#333] rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-[#c19a6b] to-[#d4af37] transition-all duration-500"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4">
        <div className="text-center p-3 bg-[#0a0a0a] rounded-lg">
          <p className="text-2xl font-bold text-[#f7f3ed]">{longestStreak}</p>
          <p className="text-xs text-gray-400">Longest Streak</p>
        </div>
        <div className="text-center p-3 bg-[#0a0a0a] rounded-lg">
          <p className="text-2xl font-bold text-[#f7f3ed]">{totalDaysRead}</p>
          <p className="text-xs text-gray-400">Total Days</p>
        </div>
      </div>

      {/* Today's status */}
      <div className={`mt-4 text-center py-2 rounded-lg ${
        hasReadToday ? 'bg-green-900/30 text-green-400' : 'bg-amber-900/30 text-amber-400'
      }`}>
        {hasReadToday ? '✓ You\'ve read today!' : '○ Read today to extend your streak'}
      </div>
    </div>
  )
}

export function StreakBadge({ className = '' }: { className?: string }) {
  const { currentStreak, loaded } = useStreaks()

  if (!loaded || currentStreak === 0) return null

  return (
    <div className={`inline-flex items-center gap-1 px-2 py-1 bg-gradient-to-r from-orange-600/20 to-amber-600/20 border border-orange-500/30 rounded-full ${className}`}>
      <span className="text-sm">🔥</span>
      <span className="text-sm font-medium text-orange-400">{currentStreak}</span>
    </div>
  )
}
