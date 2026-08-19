import { describe, expect, it } from 'vitest'
import {
  ACTIVITIES,
  BUDGETS,
  budgetLabel,
  buildOccasionQueue,
  type Activity,
} from '@/lib/audio/occasion'
import type { QueueItem } from '@/stores/audioStore'

/**
 * SA-101 — discovery on listening's own terms.
 *
 * Reading is organised by need; listening is organised by occasion. This is the
 * listening equivalent of the Soul Audit, and the contracts worth pinning are
 * the ones a listener would notice being broken: it must not overshoot the time
 * they said they had, and it must not hand back the same answer shuffled.
 */
const pool: QueueItem[] = [
  ...Array.from({ length: 6 }, (_, i) => ({
    slug: `a-day-${i + 1}`,
    title: `A ${i + 1}`,
    src: `/audio/a-${i}.m4a`,
    duration: 480,
    href: `/devotional/a-day-${i + 1}`,
    context: 'Series A',
  })),
  ...Array.from({ length: 6 }, (_, i) => ({
    slug: `b-day-${i + 1}`,
    title: `B ${i + 1}`,
    src: `/audio/b-${i}.m4a`,
    duration: 480,
    href: `/devotional/b-day-${i + 1}`,
    context: 'Series B',
  })),
  {
    slug: 'long-1',
    title: 'A long one',
    src: '/audio/long.m4a',
    duration: 2700,
    href: '/devotional/long-1',
    context: 'Series C',
  },
]

const NOW = new Date('2026-08-19T09:00:00Z')

describe('the occasion picker', () => {
  it('never overshoots the time someone said they had', () => {
    for (const minutes of BUDGETS) {
      for (const activity of ACTIVITIES) {
        const queue = buildOccasionQueue({ minutes, activity }, NOW, pool)
        const total = queue.reduce((sum, i) => sum + i.duration, 0)
        // `fill` lets working run slightly over, but never by more than its
        // own allowance — arriving mid-sentence is the failure mode.
        expect(total).toBeLessThanOrEqual(minutes * 60 * 1.15)
      }
    }
  })

  it('gives the same answer all day for the same occasion', () => {
    const a = buildOccasionQueue(
      { minutes: 20, activity: 'walking' },
      NOW,
      pool,
    )
    const b = buildOccasionQueue(
      { minutes: 20, activity: 'walking' },
      NOW,
      pool,
    )
    expect(a.map((i) => i.slug)).toEqual(b.map((i) => i.slug))
  })

  it('gives a different answer for a different occasion', () => {
    const walk = buildOccasionQueue(
      { minutes: 20, activity: 'walking' },
      NOW,
      pool,
    )
    const rest = buildOccasionQueue(
      { minutes: 20, activity: 'resting' },
      NOW,
      pool,
    )
    expect(walk.map((i) => i.slug)).not.toEqual(rest.map((i) => i.slug))
  })

  it('spreads across series before repeating one', () => {
    const queue = buildOccasionQueue(
      { minutes: 20, activity: 'walking' },
      NOW,
      pool,
    )
    const contexts = queue.slice(0, 2).map((i) => i.context)
    // A 20-minute session is not two days of the same arc.
    expect(new Set(contexts).size).toBe(contexts.length)
  })

  it('excludes anything longer than the activity allows', () => {
    // `resting` caps a single piece at 20 minutes; the 45-minute one is out.
    const queue = buildOccasionQueue(
      { minutes: 60, activity: 'resting' },
      NOW,
      pool,
    )
    expect(queue.some((i) => i.slug === 'long-1')).toBe(false)
  })

  it('returns nothing rather than something too long', () => {
    const onlyLong = [pool[pool.length - 1]]
    const queue = buildOccasionQueue(
      { minutes: 5, activity: 'commuting' },
      NOW,
      onlyLong,
    )
    expect(queue).toHaveLength(0)
  })

  it('labels the budget the way a person would say it', () => {
    expect(budgetLabel(5)).toBe('Under 5 minutes')
    expect(budgetLabel(10)).toBe('About 10 minutes')
    expect(budgetLabel(60)).toBe('An hour or more')
  })
})
