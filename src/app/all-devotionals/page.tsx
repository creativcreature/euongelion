'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useEffect } from 'react';

const ALL_SERIES = [
  {
    slug: 'identity',
    title: 'Identity Crisis',
    question: 'When everything that defined you is shaken, who are you?',
    days: [
      { day: 1, title: 'When everything shakes', slug: 'identity-crisis-day-1' },
      { day: 2, title: 'The narrative breaks', slug: 'identity-crisis-day-2' },
      { day: 3, title: 'You are whose you are', slug: 'identity-crisis-day-3' },
      { day: 4, title: 'Living from identity', slug: 'identity-crisis-day-4' },
      { day: 5, title: 'What remains', slug: 'identity-crisis-day-5' },
    ],
  },
  {
    slug: 'peace',
    title: 'Peace',
    question: "What if peace isn't found by controlling your circumstances?",
    days: [
      { day: 1, title: 'The illusion of control', slug: 'peace-day-1' },
      { day: 2, title: 'The exhaustion of managing', slug: 'peace-day-2' },
      { day: 3, title: 'Peace the world can\'t give', slug: 'peace-day-3' },
      { day: 4, title: 'Practicing surrender', slug: 'peace-day-4' },
      { day: 5, title: 'Peace as gift', slug: 'peace-day-5' },
    ],
  },
  {
    slug: 'community',
    title: 'Community',
    question: 'Who are your people when systems fail?',
    days: [
      { day: 1, title: 'When systems fail', slug: 'community-day-1' },
      { day: 2, title: 'The loneliness epidemic', slug: 'community-day-2' },
      { day: 3, title: 'You\'re not meant to be alone', slug: 'community-day-3' },
      { day: 4, title: 'Covenant in practice', slug: 'community-day-4' },
      { day: 5, title: 'Who remains', slug: 'community-day-5' },
    ],
  },
  {
    slug: 'kingdom',
    title: 'Kingdom',
    question: 'What if the kingdom you\'re looking for is already here?',
    days: [
      { day: 1, title: 'Searching in wrong places', slug: 'kingdom-day-1' },
      { day: 2, title: 'The exhaustion of empires', slug: 'kingdom-day-2' },
      { day: 3, title: 'The kingdom is here', slug: 'kingdom-day-3' },
      { day: 4, title: 'Seeking first', slug: 'kingdom-day-4' },
      { day: 5, title: 'Everything else added', slug: 'kingdom-day-5' },
    ],
  },
  {
    slug: 'provision',
    title: 'Provision',
    question: "What if provision isn't about having enough, but sharing what you have?",
    days: [
      { day: 1, title: 'The scarcity mindset', slug: 'provision-day-1' },
      { day: 2, title: 'Fear drives hoarding', slug: 'provision-day-2' },
      { day: 3, title: 'God\'s backwards economy', slug: 'provision-day-3' },
      { day: 4, title: 'Mutual aid in practice', slug: 'provision-day-4' },
      { day: 5, title: 'When you share, needs are met', slug: 'provision-day-5' },
    ],
  },
  {
    slug: 'truth',
    title: 'Truth',
    question: 'How do you know what\'s real when misinformation is everywhere?',
    days: [
      { day: 1, title: 'Drowning in information', slug: 'truth-day-1' },
      { day: 2, title: 'Can\'t trust yourself', slug: 'truth-day-2' },
      { day: 3, title: 'Truth is a person', slug: 'truth-day-3' },
      { day: 4, title: 'From information to wisdom', slug: 'truth-day-4' },
      { day: 5, title: 'Truth was searching for you', slug: 'truth-day-5' },
    ],
  },
  {
    slug: 'hope',
    title: 'Hope',
    question: "What if hope isn't optimism, but faithfulness in the dark?",
    days: [
      { day: 1, title: 'Optimism is dead', slug: 'hope-day-1' },
      { day: 2, title: 'Grief is holy', slug: 'hope-day-2' },
      { day: 3, title: 'Hope enters darkness', slug: 'hope-day-3' },
      { day: 4, title: 'Practicing faithfulness', slug: 'hope-day-4' },
      { day: 5, title: 'Resurrection promise', slug: 'hope-day-5' },
    ],
  },
];

export default function AllDevotionalsPage() {
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('fade-in');
          }
        });
      },
      { threshold: 0.1 }
    );

    const elements = document.querySelectorAll('.observe-fade');
    elements.forEach((el) => observer.observe(el));

    return () => observer.disconnect();
  }, []);

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#FAF9F6' }}>
      {/* Top Bar */}
      <nav className="flex items-center justify-center px-6 md:px-12 lg:px-20 py-8 relative">
        <Link href="/">
          <div className="relative w-40 h-10 cursor-pointer">
            <Image
              src="/logos/Logo-19.png"
              alt="wokeGod"
              fill
              className="object-contain"
              priority
            />
          </div>
        </Link>
        <Link
          href="/admin/unlock"
          className="absolute right-6 md:right-12 lg:right-20 text-gray-400 hover:text-black transition-colors duration-300 vw-small"
        >
          Sign In
        </Link>
      </nav>

      {/* Header */}
      <header className="max-w-7xl mx-auto px-6 md:px-12 lg:px-20 pt-12 md:pt-20 pb-16 md:pb-24">
        <div className="grid md:grid-cols-12 gap-8 md:gap-16">
          <div className="md:col-span-10 md:col-start-2">
            <Link
              href="/"
              className="text-gray-400 hover:text-black transition-colors duration-300 vw-small mb-12 inline-block observe-fade"
            >
              ← Home
            </Link>

            <h1 className="text-display vw-heading-xl mb-8 observe-fade fade-in-delay-1">
              All Devotionals
            </h1>

            <p className="text-serif-italic vw-body-lg mb-8 observe-fade fade-in-delay-2" style={{ maxWidth: '600px' }}>
              7 series. 35 days. A journey through the questions that keep you up at night.
            </p>

            <p className="vw-body text-gray-700 observe-fade fade-in-delay-3" style={{ maxWidth: '600px' }}>
              We recommend reading one devotional per day, following each series in order.
              Each series has a chiastic structure (A-B-C-B'-A') with Day 3 as the pivot point.
            </p>
          </div>
        </div>
      </header>

      {/* All Series */}
      <main className="max-w-7xl mx-auto px-6 md:px-12 lg:px-20 pb-32 md:pb-48">
        <div className="grid md:grid-cols-12 gap-8 md:gap-16">
          <div className="md:col-span-10 md:col-start-2 space-y-24 md:space-y-32">
            {ALL_SERIES.map((series, seriesIndex) => (
              <div key={series.slug} className="observe-fade">
                {/* Series Header */}
                <div className="mb-8 md:mb-12">
                  <h2 className="text-display vw-heading-lg mb-4">
                    {series.title}
                  </h2>
                  <p className="text-serif-italic vw-body-lg text-gray-700">
                    {series.question}
                  </p>
                  <Link
                    href={`/series/${series.slug}`}
                    className="text-label vw-small mt-4 inline-block"
                    style={{ color: '#B8860B' }}
                  >
                    View Series Overview →
                  </Link>
                </div>

                {/* Days */}
                <div className="space-y-1 md:space-y-2">
                  {series.days.map((day) => (
                    <Link
                      key={day.slug}
                      href={`/devotional/${day.slug}`}
                      className="block group"
                    >
                      <div className={`grid md:grid-cols-12 gap-6 md:gap-12 py-6 md:py-8 border-b border-gray-200 hover:border-gray-400 transition-all duration-300 ${day.day === 3 ? 'md:bg-gray-50 md:-mx-8 md:px-8' : ''}`}>
                        <div className="md:col-span-1">
                          <span className="text-label vw-small" style={{ color: day.day === 3 ? '#B8860B' : '#999' }}>
                            DAY {day.day}
                          </span>
                        </div>

                        <div className="md:col-span-9">
                          <p className="text-serif-italic vw-body transition-all duration-300 group-hover:translate-x-2">
                            <span className="group-hover:text-[#B8860B] transition-colors duration-300">
                              {day.title}
                            </span>
                          </p>
                        </div>

                        <div className="md:col-span-2 flex items-center justify-end">
                          <span className="text-label vw-small text-gray-400 group-hover:text-black transition-colors duration-300">
                            READ →
                          </span>
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-gray-200 py-16 md:py-24">
        <div className="max-w-7xl mx-auto px-6 md:px-12 lg:px-20">
          <div className="grid md:grid-cols-12 gap-8">
            <div className="md:col-span-6 md:col-start-4">
              <p className="text-label text-gray-400 vw-small leading-relaxed">
                VENERATE THE MIRACLE.<br />
                DISMANTLE THE HAVEL.
              </p>
              <p className="vw-small text-gray-400 mt-8">
                © 2026 EUONGELION · A wokeGod project
              </p>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
