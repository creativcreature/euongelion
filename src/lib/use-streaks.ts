'use client'

import { useState, useEffect, useCallback } from 'react'
import { getStreaks, recordReading, type StreakData } from './streaks'

export function useStreaks() {
  const [streakData, setStreakData] = useState<StreakData>({
    currentStreak: 0,
    longestStreak: 0,
    lastReadDate: null,
    totalDaysRead: 0,
    startDate: null,
  })
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    const data = getStreaks()
    setStreakData(data)
    setLoaded(true)
  }, [])

  const markAsRead = useCallback(() => {
    const data = recordReading()
    setStreakData(data)
    return data
  }, [])

  const hasReadToday = streakData.lastReadDate === new Date().toISOString().split('T')[0]

  return {
    ...streakData,
    loaded,
    hasReadToday,
    markAsRead,
  }
}
