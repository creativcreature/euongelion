'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { SearchBar } from '@/components/ui/SearchBar'
import { SearchResults } from '@/components/ui/SearchResults'
import { useSearch } from '@/lib/use-search'
// import { getAllSeries } from '@/lib/content'
// import type { Series } from '@/types'

// Temporary stubs - page blocked by middleware anyway
const getAllSeries = async (): Promise<any[]> => []
type Series = any

export default function SearchPage() {
  const [allSeries, setAllSeries] = useState<Series[]>([])
  const [loading, setLoading] = useState(true)
  const { query, results, isSearching, search, clearSearch } = useSearch(allSeries)

  useEffect(() => {
    async function loadSeries() {
      try {
        const series = await getAllSeries()
        setAllSeries(series)
      } catch (error) {
        console.error('Failed to load series:', error)
      } finally {
        setLoading(false)
      }
    }
    loadSeries()
  }, [])

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-[#f7f3ed]">
      {/* Header */}
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
            <SearchBar
              value={query}
              onChange={search}
              onClear={clearSearch}
              autoFocus
              className="flex-1"
            />
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-2xl mx-auto px-4 py-6">
        {loading ? (
          <div className="py-8 text-center text-gray-400">
            <div className="animate-pulse">Loading content...</div>
          </div>
        ) : (
          <SearchResults
            results={results}
            query={query}
            isSearching={isSearching}
          />
        )}
      </main>
    </div>
  )
}
