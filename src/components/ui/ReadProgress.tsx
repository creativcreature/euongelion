'use client'

import { useState, useEffect } from 'react'
import { getSeriesProgress } from '@/lib/db/progress'

interface ReadProgressProps {
  seriesSlug: string
  totalDays: number
  className?: string
}

export function ReadProgress({ seriesSlug, totalDays, className = '' }: ReadProgressProps) {
  const [readDays, setReadDays] = useState<number[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getSeriesProgress(seriesSlug).then((days) => {
      setReadDays(days)
      setLoading(false)
    })
  }, [seriesSlug])

  if (loading) {
    return (
      <div className={`animate-pulse ${className}`}>
        <div className="h-2 bg-[#1a1a1a] rounded-full" />
      </div>
    )
  }

  const progress = totalDays > 0 ? (readDays.length / totalDays) * 100 : 0

  return (
    <div className={className}>
      <div className="flex justify-between text-xs text-gray-400 mb-1">
        <span>{readDays.length} of {totalDays} days</span>
        <span>{Math.round(progress)}%</span>
      </div>
      <div className="h-2 bg-[#1a1a1a] rounded-full overflow-hidden">
        <div
          className="h-full bg-[#c19a6b] transition-all duration-300"
          style={{ width: `${progress}%` }}
        />
      </div>
    </div>
  )
}

interface DayProgressIndicatorProps {
  seriesSlug: string
  day: number
}

export function DayProgressIndicator({ seriesSlug, day }: DayProgressIndicatorProps) {
  const [isRead, setIsRead] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getSeriesProgress(seriesSlug).then((days) => {
      setIsRead(days.includes(day))
      setLoading(false)
    })
  }, [seriesSlug, day])

  if (loading) return null

  if (!isRead) return null

  return (
    <span className="inline-flex items-center gap-1 text-xs text-green-500">
      <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
        <path
          fillRule="evenodd"
          d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
          clipRule="evenodd"
        />
      </svg>
      Read
    </span>
  )
}
