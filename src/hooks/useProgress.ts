'use client'

import { useEffect, useState } from 'react'
import type { DevotionalProgress } from '@/types'
import {
  getProgress,
  isDevotionalRead,
  markDevotionalComplete,
  getSeriesProgress,
  getOverallProgress,
  canReadDevotional,
} from '@/lib/progress'

export function useProgress() {
  const [progress, setProgress] = useState<DevotionalProgress[]>(getProgress)

  useEffect(() => {
    const handleUpdate = () => {
      setProgress(getProgress())
    }

    window.addEventListener('progressUpdated', handleUpdate)
    return () => window.removeEventListener('progressUpdated', handleUpdate)
  }, [])

  return {
    progress,
    isRead: isDevotionalRead,
    markComplete: markDevotionalComplete,
    getSeriesProgress,
    getOverallProgress,
    canRead: canReadDevotional,
  }
}

export function useReadingTime() {
  const [startTime] = useState(() => Date.now())
  const [timeSpent, setTimeSpent] = useState(0)

  useEffect(() => {
    const interval = setInterval(() => {
      setTimeSpent(Math.floor((Date.now() - startTime) / 1000))
    }, 1000)

    return () => clearInterval(interval)
  }, [startTime])

  return timeSpent
}
