'use client'

import { useState, useEffect } from 'react'
import { isBookmarked, toggleBookmark } from '@/lib/db/bookmarks'

interface BookmarkButtonProps {
  seriesSlug: string
  day: number
  className?: string
}

export function BookmarkButton({ seriesSlug, day, className = '' }: BookmarkButtonProps) {
  const [bookmarked, setBookmarked] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    isBookmarked(seriesSlug, day).then((result) => {
      setBookmarked(result)
      setLoading(false)
    })
  }, [seriesSlug, day])

  const handleToggle = async () => {
    setLoading(true)
    const newState = await toggleBookmark(seriesSlug, day)
    setBookmarked(newState)
    setLoading(false)
  }

  return (
    <button
      onClick={handleToggle}
      disabled={loading}
      className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-colors ${
        bookmarked
          ? 'bg-[#c19a6b]/20 text-[#c19a6b]'
          : 'bg-[#1a1a1a] text-gray-400 hover:text-[#f7f3ed] hover:bg-[#252525]'
      } ${loading ? 'opacity-50' : ''} ${className}`}
      aria-label={bookmarked ? 'Remove bookmark' : 'Add bookmark'}
    >
      <svg
        className="w-5 h-5"
        fill={bookmarked ? 'currentColor' : 'none'}
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z"
        />
      </svg>
      <span className="text-sm">{bookmarked ? 'Saved' : 'Save'}</span>
    </button>
  )
}
