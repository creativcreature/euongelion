'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
// import { getAllBookmarks } from '@/lib/db/bookmarks'
// import { getAllSeries } from '@/lib/content'
// import type { Series } from '@/types'

// Temporary stubs - page blocked by middleware anyway
const getAllBookmarks = async (): Promise<any[]> => []
const getAllSeries = async (): Promise<Array<{ slug: string; title?: string; devotionals?: any[] }>> => []
type Series = { slug: string; title?: string; devotionals?: any[] }

interface BookmarkWithSeries {
  series_slug: string
  day: number
  created_at: string
  series?: Series
  devotionalTitle?: string
}

export default function BookmarksPage() {
  const [bookmarks, setBookmarks] = useState<BookmarkWithSeries[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function loadBookmarks() {
      const [allBookmarks, allSeries] = await Promise.all([
        getAllBookmarks(),
        getAllSeries(),
      ])

      const enriched = allBookmarks.map((bookmark) => {
        const series = allSeries.find((s) => s.slug === bookmark.series_slug)
        const devotional = series?.devotionals?.find((d) => d.day === bookmark.day)
        return {
          ...bookmark,
          series,
          devotionalTitle: devotional?.title,
        }
      })

      setBookmarks(enriched)
      setLoading(false)
    }

    loadBookmarks()
  }, [])

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-[#f7f3ed]">
      <header className="sticky top-0 z-10 bg-[#0a0a0a]/95 backdrop-blur border-b border-[#1a1a1a]">
        <div className="max-w-2xl mx-auto px-4 py-4">
          <div className="flex items-center gap-4">
            <Link
              href="/"
              className="p-2 rounded-lg hover:bg-[#1a1a1a] transition-colors"
              aria-label="Back to home"
            >
              <svg
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 19l-7-7 7-7"
                />
              </svg>
            </Link>
            <h1 className="text-xl font-semibold">Bookmarks</h1>
          </div>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-6">
        {loading ? (
          <div className="py-8 text-center text-gray-400">
            <div className="animate-pulse">Loading bookmarks...</div>
          </div>
        ) : bookmarks.length === 0 ? (
          <div className="py-12 text-center">
            <div className="text-4xl mb-4">📖</div>
            <h2 className="text-xl font-semibold mb-2">No bookmarks yet</h2>
            <p className="text-gray-400 mb-6">
              Save devotionals to revisit them later
            </p>
            <Link
              href="/"
              className="inline-block px-6 py-3 bg-[#c19a6b] text-[#0a0a0a] rounded-lg font-medium hover:bg-[#d4ad7e] transition"
            >
              Browse Series
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {bookmarks.map((bookmark) => (
              <Link
                key={`${bookmark.series_slug}-${bookmark.day}`}
                href={`/series/${bookmark.series_slug}/${bookmark.day}`}
                className="flex items-center gap-4 p-4 bg-[#1a1a1a] rounded-lg hover:bg-[#252525] transition-colors"
              >
                <div className="w-12 h-12 rounded-lg bg-[#c19a6b]/20 flex items-center justify-center flex-shrink-0">
                  <svg
                    className="w-6 h-6 text-[#c19a6b]"
                    fill="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
                  </svg>
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-medium truncate">
                    {bookmark.devotionalTitle || `Day ${bookmark.day}`}
                  </h3>
                  <p className="text-sm text-gray-400 truncate">
                    {bookmark.series?.title || bookmark.series_slug}
                  </p>
                </div>
                <svg
                  className="w-5 h-5 text-gray-500 flex-shrink-0"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 5l7 7-7 7"
                  />
                </svg>
              </Link>
            ))}
          </div>
        )}
      </main>
    </div>
  )
}
