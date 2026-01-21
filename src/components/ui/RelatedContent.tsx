'use client'

import Link from 'next/link'
import { getRelatedContent, type RelatedItem } from '@/lib/related-content'
import type { Series } from '@/types'

interface RelatedContentProps {
  currentSeries: Series
  currentDay?: number
  allSeries: Series[]
  className?: string
}

export function RelatedContent({
  currentSeries,
  currentDay,
  allSeries,
  className = '',
}: RelatedContentProps) {
  const related = getRelatedContent(currentSeries, currentDay, allSeries, 4)

  if (related.length === 0) return null

  return (
    <section className={`${className}`}>
      <h3 className="text-lg font-semibold text-[#f7f3ed] mb-4">Continue Your Journey</h3>
      <div className="grid gap-3">
        {related.map((item, index) => (
          <RelatedItemCard key={`${item.series.slug}-${item.devotional?.day || 'series'}-${index}`} item={item} />
        ))}
      </div>
    </section>
  )
}

function RelatedItemCard({ item }: { item: RelatedItem }) {
  const href =
    item.type === 'devotional'
      ? `/series/${item.series.slug}/${item.devotional?.day}`
      : `/series/${item.series.slug}`

  const title =
    item.type === 'devotional'
      ? item.devotional?.title || `Day ${item.devotional?.day}`
      : item.series.title

  const subtitle =
    item.type === 'devotional'
      ? `Day ${item.devotional?.day} of ${item.series.title}`
      : `${item.series.devotionals?.length || 0} days`

  return (
    <Link
      href={href}
      className="flex items-center gap-4 p-4 bg-[#1a1a1a] rounded-lg hover:bg-[#252525] transition-colors group"
    >
      <div
        className={`w-12 h-12 rounded-lg flex items-center justify-center flex-shrink-0 ${
          item.type === 'devotional'
            ? 'bg-gradient-to-br from-[#c19a6b] to-[#a17d50]'
            : 'bg-[#333]'
        }`}
      >
        {item.type === 'devotional' ? (
          <svg
            className="w-6 h-6 text-[#0a0a0a]"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M13 7l5 5m0 0l-5 5m5-5H6"
            />
          </svg>
        ) : (
          <svg
            className="w-6 h-6 text-[#c19a6b]"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
            />
          </svg>
        )}
      </div>
      <div className="flex-1 min-w-0">
        <h4 className="text-[#f7f3ed] font-medium truncate group-hover:text-[#c19a6b] transition-colors">
          {title}
        </h4>
        <p className="text-sm text-gray-400 truncate">{subtitle}</p>
        <p className="text-xs text-[#c19a6b] mt-1">{item.reason}</p>
      </div>
      <svg
        className="w-5 h-5 text-gray-500 group-hover:text-[#c19a6b] transition-colors flex-shrink-0"
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
  )
}

export function RelatedSeriesCompact({
  currentSeries,
  allSeries,
  className = '',
}: {
  currentSeries: Series
  allSeries: Series[]
  className?: string
}) {
  const related = getRelatedContent(currentSeries, undefined, allSeries, 2)
    .filter((item) => item.type === 'series')

  if (related.length === 0) return null

  return (
    <div className={`flex gap-2 ${className}`}>
      {related.map((item, index) => (
        <Link
          key={`${item.series.slug}-${index}`}
          href={`/series/${item.series.slug}`}
          className="text-sm px-3 py-1.5 bg-[#1a1a1a] rounded-full text-gray-400 hover:text-[#c19a6b] hover:bg-[#252525] transition-colors"
        >
          {item.series.title}
        </Link>
      ))}
    </div>
  )
}
