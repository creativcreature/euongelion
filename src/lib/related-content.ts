'use client'

import type { Series, Devotional } from '@/types'

export interface RelatedItem {
  type: 'series' | 'devotional'
  series: Series
  devotional?: Devotional
  reason: string
  score: number
}

// Map series to pathways for better recommendations
const seriesPathways: Record<string, string[]> = {
  // Sleep pathway - new believers, foundational
  'what-is-the-gospel': ['sleep', 'foundation'],
  'why-jesus': ['sleep', 'foundation'],
  'what-does-it-mean-to-believe': ['sleep', 'foundation'],
  'in-the-beginning': ['sleep', 'foundation'],

  // Awake pathway - growing believers
  'too-busy-for-god': ['awake', 'growth'],
  'hearing-god-in-noise': ['awake', 'growth'],
  'abiding-in-his-presence': ['awake', 'growth'],
  'surrender-to-gods-will': ['awake', 'growth'],
  'what-is-carrying-a-cross': ['awake', 'growth'],

  // Shepherd pathway - mature believers, leaders
  'the-blueprint-of-community': ['shepherd', 'leadership'],
  'signs-boldness-opposition': ['shepherd', 'leadership'],
  'from-jerusalem-to-nations': ['shepherd', 'leadership'],
  'witness-under-pressure': ['shepherd', 'leadership'],

  // Doctrinal
  'once-saved-always-saved': ['doctrine', 'theology'],
  'the-nature-of-belief': ['doctrine', 'theology'],
  'what-happens-when-you-repeatedly-sin': ['doctrine', 'theology'],
  'the-work-of-god': ['doctrine', 'theology'],

  // Genesis/Creation
  'genesis-two-stories': ['foundation', 'genesis'],
  'the-word-before-words': ['foundation', 'genesis'],
}

function getSeriesTags(series: Series): string[] {
  return seriesPathways[series.slug] || ['general']
}

function calculateSimilarity(tags1: string[], tags2: string[]): number {
  let matches = 0
  for (const tag of tags1) {
    if (tags2.includes(tag)) {
      matches++
    }
  }
  return matches
}

export function getRelatedSeries(
  currentSeries: Series,
  allSeries: Series[],
  limit: number = 3
): RelatedItem[] {
  const currentTags = getSeriesTags(currentSeries)
  const related: RelatedItem[] = []

  for (const series of allSeries) {
    // Skip current series
    if (series.slug === currentSeries.slug) continue

    const seriesTags = getSeriesTags(series)
    const similarity = calculateSimilarity(currentTags, seriesTags)

    if (similarity > 0) {
      // Find the matching reason
      const sharedTags = currentTags.filter((t) => seriesTags.includes(t))
      let reason = 'Similar topic'
      if (sharedTags.includes('sleep')) reason = 'Also for new believers'
      else if (sharedTags.includes('awake')) reason = 'Also for growing faith'
      else if (sharedTags.includes('shepherd')) reason = 'Also for leaders'
      else if (sharedTags.includes('foundation')) reason = 'Foundational teaching'
      else if (sharedTags.includes('doctrine')) reason = 'Theological depth'
      else if (sharedTags.includes('genesis')) reason = 'Also explores Genesis'

      related.push({
        type: 'series',
        series,
        reason,
        score: similarity,
      })
    }
  }

  // Sort by score and return top results
  return related
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
}

export function getNextDevotional(
  currentSeries: Series,
  currentDay: number
): RelatedItem | null {
  const devotionals = currentSeries.devotionals || []
  const nextDevotional = devotionals.find((d) => d.day === currentDay + 1)

  if (nextDevotional) {
    return {
      type: 'devotional',
      series: currentSeries,
      devotional: nextDevotional,
      reason: 'Continue this series',
      score: 100,
    }
  }

  return null
}

export function getRelatedContent(
  currentSeries: Series,
  currentDay: number | undefined,
  allSeries: Series[],
  limit: number = 4
): RelatedItem[] {
  const results: RelatedItem[] = []

  // If viewing a specific day, suggest next day first
  if (currentDay !== undefined) {
    const next = getNextDevotional(currentSeries, currentDay)
    if (next) {
      results.push(next)
    }
  }

  // Add related series
  const relatedSeries = getRelatedSeries(
    currentSeries,
    allSeries,
    limit - results.length
  )
  results.push(...relatedSeries)

  return results.slice(0, limit)
}
