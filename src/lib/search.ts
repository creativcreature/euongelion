'use client'

import type { Series, Devotional } from '@/types'

export interface SearchResult {
  type: 'series' | 'devotional'
  series: Series
  devotional?: Devotional
  matchedIn: ('title' | 'description' | 'content' | 'scripture')[]
  relevance: number
}

function normalizeText(text: string): string {
  return text.toLowerCase().trim()
}

function countOccurrences(text: string, query: string): number {
  const normalizedText = normalizeText(text)
  const normalizedQuery = normalizeText(query)
  let count = 0
  let pos = 0
  while ((pos = normalizedText.indexOf(normalizedQuery, pos)) !== -1) {
    count++
    pos += normalizedQuery.length
  }
  return count
}

function searchInText(text: string | undefined, query: string): boolean {
  if (!text) return false
  return normalizeText(text).includes(normalizeText(query))
}

export function searchSeries(series: Series[], query: string): SearchResult[] {
  if (!query.trim()) return []

  const results: SearchResult[] = []

  for (const s of series) {
    let relevance = 0
    const matchedIn: SearchResult['matchedIn'] = []

    // Search in series title (highest weight)
    if (searchInText(s.title, query)) {
      relevance += 10 * countOccurrences(s.title, query)
      matchedIn.push('title')
    }

    // Search in series description
    if (searchInText(s.description, query)) {
      relevance += 5 * countOccurrences(s.description || '', query)
      matchedIn.push('description')
    }

    if (relevance > 0) {
      results.push({
        type: 'series',
        series: s,
        matchedIn,
        relevance,
      })
    }

    // Search in devotionals
    for (const devotional of s.devotionals || []) {
      let devRelevance = 0
      const devMatchedIn: SearchResult['matchedIn'] = []

      // Search in devotional title
      if (searchInText(devotional.title, query)) {
        devRelevance += 8 * countOccurrences(devotional.title, query)
        devMatchedIn.push('title')
      }

      // Search in devotional content
      for (const module of devotional.modules || []) {
        if (module.type === 'scripture' && module.text && searchInText(module.text, query)) {
          devRelevance += 3 * countOccurrences(module.text, query)
          if (!devMatchedIn.includes('scripture')) devMatchedIn.push('scripture')
        }
        if (module.type === 'reflection' && module.content && searchInText(module.content, query)) {
          devRelevance += 2 * countOccurrences(module.content, query)
          if (!devMatchedIn.includes('content')) devMatchedIn.push('content')
        }
        if (module.type === 'teaching' && module.content && searchInText(module.content, query)) {
          devRelevance += 2 * countOccurrences(module.content, query)
          if (!devMatchedIn.includes('content')) devMatchedIn.push('content')
        }
      }

      if (devRelevance > 0) {
        results.push({
          type: 'devotional',
          series: s,
          devotional,
          matchedIn: devMatchedIn,
          relevance: devRelevance,
        })
      }
    }
  }

  // Sort by relevance (highest first)
  return results.sort((a, b) => b.relevance - a.relevance)
}

export function highlightMatch(text: string, query: string): string {
  if (!query.trim()) return text
  const regex = new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi')
  return text.replace(regex, '<mark>$1</mark>')
}

export function getExcerpt(text: string, query: string, contextLength: number = 100): string {
  const normalizedText = normalizeText(text)
  const normalizedQuery = normalizeText(query)
  const index = normalizedText.indexOf(normalizedQuery)

  if (index === -1) {
    return text.slice(0, contextLength * 2) + (text.length > contextLength * 2 ? '...' : '')
  }

  const start = Math.max(0, index - contextLength)
  const end = Math.min(text.length, index + query.length + contextLength)

  let excerpt = text.slice(start, end)
  if (start > 0) excerpt = '...' + excerpt
  if (end < text.length) excerpt = excerpt + '...'

  return excerpt
}
