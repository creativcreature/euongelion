'use client';

import { useState } from 'react';
import Link from 'next/link';

interface DevotionalDay {
  day: number;
  title: string;
  slug: string;
}

interface SeriesInfo {
  slug: string;
  title: string;
  days: DevotionalDay[];
}

const ALL_SERIES: Record<string, SeriesInfo> = {
  identity: {
    slug: 'identity',
    title: 'Identity Crisis',
    days: [
      { day: 1, title: 'When everything shakes', slug: 'identity-crisis-day-1' },
      { day: 2, title: 'The narrative breaks', slug: 'identity-crisis-day-2' },
      { day: 3, title: 'You are whose you are', slug: 'identity-crisis-day-3' },
      { day: 4, title: 'Living from identity', slug: 'identity-crisis-day-4' },
      { day: 5, title: 'What remains', slug: 'identity-crisis-day-5' },
    ],
  },
  peace: {
    slug: 'peace',
    title: 'Peace',
    days: [
      { day: 1, title: 'The illusion of control', slug: 'peace-day-1' },
      { day: 2, title: 'The exhaustion of managing', slug: 'peace-day-2' },
      { day: 3, title: 'Peace the world can\'t give', slug: 'peace-day-3' },
      { day: 4, title: 'Practicing surrender', slug: 'peace-day-4' },
      { day: 5, title: 'Peace as gift', slug: 'peace-day-5' },
    ],
  },
  community: {
    slug: 'community',
    title: 'Community',
    days: [
      { day: 1, title: 'When systems fail', slug: 'community-day-1' },
      { day: 2, title: 'The loneliness epidemic', slug: 'community-day-2' },
      { day: 3, title: 'You\'re not meant to be alone', slug: 'community-day-3' },
      { day: 4, title: 'Covenant in practice', slug: 'community-day-4' },
      { day: 5, title: 'Who remains', slug: 'community-day-5' },
    ],
  },
  kingdom: {
    slug: 'kingdom',
    title: 'Kingdom',
    days: [
      { day: 1, title: 'Searching in wrong places', slug: 'kingdom-day-1' },
      { day: 2, title: 'The exhaustion of empires', slug: 'kingdom-day-2' },
      { day: 3, title: 'The kingdom is here', slug: 'kingdom-day-3' },
      { day: 4, title: 'Seeking first', slug: 'kingdom-day-4' },
      { day: 5, title: 'Everything else added', slug: 'kingdom-day-5' },
    ],
  },
  provision: {
    slug: 'provision',
    title: 'Provision',
    days: [
      { day: 1, title: 'The scarcity mindset', slug: 'provision-day-1' },
      { day: 2, title: 'Fear drives hoarding', slug: 'provision-day-2' },
      { day: 3, title: 'God\'s backwards economy', slug: 'provision-day-3' },
      { day: 4, title: 'Mutual aid in practice', slug: 'provision-day-4' },
      { day: 5, title: 'When you share, needs are met', slug: 'provision-day-5' },
    ],
  },
  truth: {
    slug: 'truth',
    title: 'Truth',
    days: [
      { day: 1, title: 'Drowning in information', slug: 'truth-day-1' },
      { day: 2, title: 'Can\'t trust yourself', slug: 'truth-day-2' },
      { day: 3, title: 'Truth is a person', slug: 'truth-day-3' },
      { day: 4, title: 'From information to wisdom', slug: 'truth-day-4' },
      { day: 5, title: 'Truth was searching for you', slug: 'truth-day-5' },
    ],
  },
  hope: {
    slug: 'hope',
    title: 'Hope',
    days: [
      { day: 1, title: 'Optimism is dead', slug: 'hope-day-1' },
      { day: 2, title: 'Grief is holy', slug: 'hope-day-2' },
      { day: 3, title: 'Hope enters darkness', slug: 'hope-day-3' },
      { day: 4, title: 'Practicing faithfulness', slug: 'hope-day-4' },
      { day: 5, title: 'Resurrection promise', slug: 'hope-day-5' },
    ],
  },
};

interface SeriesNavigationProps {
  currentSlug: string;
}

export default function SeriesNavigation({ currentSlug }: SeriesNavigationProps) {
  const [showSeriesPicker, setShowSeriesPicker] = useState(false);

  // Find which series this devotional belongs to
  const currentSeries = Object.values(ALL_SERIES).find((series) =>
    series.days.some((day) => day.slug === currentSlug)
  );

  if (!currentSeries) return null;

  const currentDayIndex = currentSeries.days.findIndex((day) => day.slug === currentSlug);
  const prevDay = currentDayIndex > 0 ? currentSeries.days[currentDayIndex - 1] : null;
  const nextDay = currentDayIndex < currentSeries.days.length - 1 ? currentSeries.days[currentDayIndex + 1] : null;

  return (
    <>
      {/* Sticky Bottom Navigation Bar */}
      <div className="fixed bottom-0 left-0 right-0 border-t border-gray-200 py-4 md:py-6 z-30" style={{ backgroundColor: '#FAF9F6' }}>
        <div className="max-w-7xl mx-auto px-6 md:px-12 lg:px-20">
          <div className="flex items-center justify-between gap-4">
            {/* Left: Series Switcher */}
            <div className="flex items-center gap-4">
              <button
                onClick={() => setShowSeriesPicker(!showSeriesPicker)}
                className="text-label vw-small text-gray-400 hover:text-black transition-colors duration-300 flex items-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
                {currentSeries.title}
              </button>
              <Link
                href={`/series/${currentSeries.slug}`}
                className="text-label vw-small text-gray-400 hover:text-black transition-colors duration-300"
              >
                ← Series
              </Link>
            </div>

            {/* Center: Day Progress */}
            <div className="hidden md:flex items-center gap-2">
              {currentSeries.days.map((day) => (
                <Link
                  key={day.slug}
                  href={`/devotional/${day.slug}`}
                  className={`w-8 h-8 flex items-center justify-center rounded-full text-xs transition-all duration-300 ${
                    day.slug === currentSlug
                      ? 'bg-black text-white'
                      : 'bg-gray-100 text-gray-400 hover:bg-gray-200 hover:text-black'
                  }`}
                  style={day.day === 3 ? { backgroundColor: day.slug === currentSlug ? '#B8860B' : undefined } : {}}
                >
                  {day.day}
                </Link>
              ))}
            </div>

            {/* Right: Prev/Next */}
            <div className="flex items-center gap-4">
              {prevDay ? (
                <Link
                  href={`/devotional/${prevDay.slug}`}
                  className="text-label vw-small text-gray-400 hover:text-black transition-colors duration-300"
                >
                  ← Prev
                </Link>
              ) : (
                <span className="text-label vw-small text-gray-200">← Prev</span>
              )}
              {nextDay ? (
                <Link
                  href={`/devotional/${nextDay.slug}`}
                  className="text-label vw-small text-gray-400 hover:text-black transition-colors duration-300"
                >
                  Next →
                </Link>
              ) : (
                <span className="text-label vw-small text-gray-200">Next →</span>
              )}
            </div>
          </div>

          {/* Mobile: Day Progress */}
          <div className="flex md:hidden items-center justify-center gap-2 mt-4">
            {currentSeries.days.map((day) => (
              <Link
                key={day.slug}
                href={`/devotional/${day.slug}`}
                className={`w-8 h-8 flex items-center justify-center rounded-full text-xs transition-all duration-300 ${
                  day.slug === currentSlug
                    ? 'bg-black text-white'
                    : 'bg-gray-100 text-gray-400'
                }`}
                style={day.day === 3 && day.slug === currentSlug ? { backgroundColor: '#B8860B' } : {}}
              >
                {day.day}
              </Link>
            ))}
          </div>
        </div>
      </div>

      {/* Series Picker Overlay */}
      {showSeriesPicker && (
        <div
          className="fixed inset-0 bg-black z-40"
          style={{ backgroundColor: 'rgba(0, 0, 0, 0.5)' }}
          onClick={() => setShowSeriesPicker(false)}
        >
          <div
            className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-2xl p-8 shadow-2xl"
            style={{ backgroundColor: '#FAF9F6' }}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setShowSeriesPicker(false)}
              className="absolute top-4 right-4 text-gray-400 hover:text-black"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>

            <h3 className="text-display vw-heading-md mb-8">Jump to Series</h3>

            <div className="space-y-4">
              {Object.values(ALL_SERIES).map((series) => (
                <Link
                  key={series.slug}
                  href={`/series/${series.slug}`}
                  className="block p-4 hover:bg-gray-50 transition-colors duration-300"
                  onClick={() => setShowSeriesPicker(false)}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-serif-italic vw-body-lg">{series.title}</span>
                    <span className="text-gray-400 vw-small">5 days</span>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
