'use client'

import { useState, useCallback, useMemo } from 'react'
import { searchSeries, type SearchResult } from './search'
import type { Series } from '@/types'

export function useSearch(allSeries: Series[]) {
  const [query, setQuery] = useState('')
  const [isSearching, setIsSearching] = useState(false)

  const results = useMemo(() => {
    if (!query.trim()) return []
    return searchSeries(allSeries, query)
  }, [allSeries, query])

  const search = useCallback((newQuery: string) => {
    setIsSearching(true)
    setQuery(newQuery)
    // Small delay to show loading state for better UX
    setTimeout(() => setIsSearching(false), 100)
  }, [])

  const clearSearch = useCallback(() => {
    setQuery('')
    setIsSearching(false)
  }, [])

  return {
    query,
    results,
    isSearching,
    search,
    clearSearch,
    hasResults: results.length > 0,
    resultCount: results.length,
  }
}

export type { SearchResult }
