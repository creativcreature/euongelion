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
  unmarkDevotionalComplete,
} from '@/lib/progress'
import { READING_PROGRESS_MERGED } from '@/lib/reading/reading-progress-sync'

export function useProgress() {
  const [progress, setProgress] = useState<DevotionalProgress[]>(getProgress)

  useEffect(() => {
    const handleUpdate = () => {
      setProgress(getProgress())
    }

    window.addEventListener('progressUpdated', handleUpdate)
    // Progress arriving from the account is just as real as progress made on
    // this device. Without this listener a reader who finished a series on
    // their phone would open their laptop and still see it unread until a
    // reload.
    window.addEventListener(READING_PROGRESS_MERGED, handleUpdate)
    return () => {
      window.removeEventListener('progressUpdated', handleUpdate)
      window.removeEventListener(READING_PROGRESS_MERGED, handleUpdate)
    }
  }, [])

  return {
    progress,
    isRead: isDevotionalRead,
    markComplete: markDevotionalComplete,
    unmarkComplete: unmarkDevotionalComplete,
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
