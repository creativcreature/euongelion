'use client'

import Link from 'next/link'
import { highlightMatch, getExcerpt } from '@/lib/search'
import type { SearchResult } from '@/lib/use-search'

interface SearchResultsProps {
  results: SearchResult[]
  query: string
  isSearching?: boolean
  onResultClick?: () => void
}

export function SearchResults({
  results,
  query,
  isSearching = false,
  onResultClick,
}: SearchResultsProps) {
  if (isSearching) {
    return (
      <div className="py-8 text-center text-gray-400">
        <div className="animate-pulse">Searching...</div>
      </div>
    )
  }

  if (!query.trim()) {
    return (
      <div className="py-8 text-center text-gray-400">
        Enter a search term to find series and devotionals
      </div>
    )
  }

  if (results.length === 0) {
    return (
      <div className="py-8 text-center text-gray-400">
        No results found for "{query}"
      </div>
    )
  }

  const seriesResults = results.filter((r) => r.type === 'series')
  const devotionalResults = results.filter((r) => r.type === 'devotional')

  return (
    <div className="space-y-6">
      {seriesResults.length > 0 && (
        <section>
          <h3 className="text-sm font-medium text-gray-400 uppercase tracking-wide mb-3">
            Series ({seriesResults.length})
          </h3>
          <div className="space-y-2">
            {seriesResults.map((result) => (
              <SearchResultItem
                key={`series-${result.series.slug}`}
                result={result}
                query={query}
                onClick={onResultClick}
              />
            ))}
          </div>
        </section>
      )}

      {devotionalResults.length > 0 && (
        <section>
          <h3 className="text-sm font-medium text-gray-400 uppercase tracking-wide mb-3">
            Devotionals ({devotionalResults.length})
          </h3>
          <div className="space-y-2">
            {devotionalResults.slice(0, 20).map((result, index) => (
              <SearchResultItem
                key={`devotional-${result.series.slug}-${result.devotional?.day}-${index}`}
                result={result}
                query={query}
                onClick={onResultClick}
              />
            ))}
            {devotionalResults.length > 20 && (
              <p className="text-sm text-gray-400 text-center pt-2">
                And {devotionalResults.length - 20} more results...
              </p>
            )}
          </div>
        </section>
      )}
    </div>
  )
}

function SearchResultItem({
  result,
  query,
  onClick,
}: {
  result: SearchResult
  query: string
  onClick?: () => void
}) {
  const href =
    result.type === 'series'
      ? `/series/${result.series.slug}`
      : `/series/${result.series.slug}/${result.devotional?.day}`

  const title =
    result.type === 'series' ? result.series.title : result.devotional?.title || ''

  const subtitle =
    result.type === 'devotional'
      ? `${result.series.title} - Day ${result.devotional?.day}`
      : `${result.series.devotionals?.length || 0} days`

  // Get excerpt from content if available
  let excerpt = ''
  if (result.type === 'series' && result.series.description) {
    excerpt = getExcerpt(result.series.description, query, 80)
  } else if (result.type === 'devotional' && result.devotional?.modules) {
    for (const module of result.devotional.modules) {
      if (module.type === 'reflection' && module.content) {
        excerpt = getExcerpt(module.content, query, 80)
        break
      }
      if (module.type === 'teaching' && module.content) {
        excerpt = getExcerpt(module.content, query, 80)
        break
      }
    }
  }

  return (
    <Link
      href={href}
      onClick={onClick}
      className="block p-4 bg-[#1a1a1a] rounded-lg hover:bg-[#252525] transition-colors"
    >
      <div className="flex items-start gap-3">
        <div
          className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${
            result.type === 'series' ? 'bg-[#c19a6b]' : 'bg-[#333]'
          }`}
        >
          {result.type === 'series' ? (
            <svg className="w-5 h-5 text-[#0a0a0a]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
            </svg>
          ) : (
            <svg className="w-5 h-5 text-[#c19a6b]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
            </svg>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <h4
            className="text-[#f7f3ed] font-medium truncate"
            dangerouslySetInnerHTML={{ __html: highlightMatch(title, query) }}
          />
          <p className="text-sm text-gray-400">{subtitle}</p>
          {excerpt && (
            <p
              className="text-sm text-gray-500 mt-1 line-clamp-2"
              dangerouslySetInnerHTML={{ __html: highlightMatch(excerpt, query) }}
            />
          )}
          <div className="flex gap-2 mt-2">
            {result.matchedIn.map((match) => (
              <span
                key={match}
                className="text-xs px-2 py-0.5 bg-[#333] text-gray-400 rounded"
              >
                {match}
              </span>
            ))}
          </div>
        </div>
      </div>
    </Link>
  )
}
