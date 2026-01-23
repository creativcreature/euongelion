'use client';

import Link from 'next/link';
import { useEffect } from 'react';
import Navigation from '@/components/Navigation';

const DEVOTIONAL_SERIES = [
  {
    number: '01',
    question: 'When everything that defined you is shaken, who are you?',
    slug: 'identity-crisis',
    description: 'A 5-day journey exploring identity crisis, performance culture, and discovering your worth in who you are, not what you do.',
    framework: 'Matthew 6:33 - Seek first the kingdom',
  },
  {
    number: '02',
    question: "What if peace isn't found by controlling your circumstances?",
    slug: 'peace',
    description: 'A 5-day exploration of peace amid chaos, moving from the illusion of control to the gift of surrender.',
    framework: 'John 14:27 - Peace I give you',
  },
  {
    number: '03',
    question: 'Who are your people when systems fail?',
    slug: 'community',
    description: 'A 5-day journey from transactional networks to covenant community, discovering belonging that remains.',
    framework: 'Matthew 18:20 - Where two or three gather',
  },
  {
    number: '04',
    question: "What if the kingdom you're looking for is already here?",
    slug: 'kingdom',
    description: 'A 5-day pivot exploring the present reality of God\'s kingdom, moving from searching to surrendering.',
    framework: 'Luke 17:21 - The kingdom is in your midst',
    isCenter: true,
  },
  {
    number: '05',
    question: "What if provision isn't about having enough, but sharing what you have?",
    slug: 'provision',
    description: 'A 5-day journey from scarcity mindset to kingdom abundance, discovering mutual aid over hoarding.',
    framework: 'Matthew 6:33 - All these things will be added',
  },
  {
    number: '06',
    question: "How do you know what's real when misinformation is everywhere?",
    slug: 'truth',
    description: 'A 5-day exploration of truth in a post-truth world, moving from information overload to knowing the one who is true.',
    framework: 'John 14:6 - I am the truth',
  },
  {
    number: '07',
    question: "What if hope isn't optimism, but faithfulness in the dark?",
    slug: 'hope',
    description: 'A 5-day journey from toxic positivity to resurrection hope, discovering faithfulness when you can\'t see the outcome.',
    framework: 'Lamentations 3:22-23 - His mercies are new',
  },
];

export default function WakeUpPage() {
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
    <div className="min-h-screen bg-cream dark:bg-[#1a1a1a]">
      <Navigation />

      {/* Hero Section */}
      <header className="max-w-7xl mx-auto px-6 md:px-12 lg:px-20 py-20 md:py-32">
        <div className="grid md:grid-cols-12 gap-8 md:gap-16">
          <div className="md:col-span-10 md:col-start-2">
            <h1 className="text-display vw-heading-xl mb-8 md:mb-12 observe-fade">
              WAKE UP
            </h1>

            <div className="grid md:grid-cols-12 gap-8 md:gap-12">
              <div className="md:col-span-6">
                <p className="text-label vw-small mb-8 observe-fade fade-in-delay-1" style={{ color: '#B8860B' }}>
                  THE HAVEL AUDIT
                </p>

                <p className="text-serif-italic vw-body-lg mb-8 observe-fade fade-in-delay-2">
                  Seven questions for the spiritually curious in a world that feels apocalyptic.
                </p>

                <p className="vw-body text-gray-600 observe-fade fade-in-delay-3">
                  Each question leads to a 5-day devotional journey structured around Matthew 6:33:
                  "Seek first the kingdom of God and his righteousness, and all these things will be added to you."
                </p>
              </div>

              <div className="md:col-span-5 md:col-start-8">
                <div className="bg-gray-50 p-8 md:p-10 observe-fade fade-in-delay-4">
                  <p className="text-label vw-small mb-4" style={{ color: '#B8860B' }}>
                    THE CONTEXT
                  </p>
                  <p className="vw-body text-gray-700 leading-relaxed">
                    2026. Political violence at 1970s levels. 47.9M food insecure.
                    71% dissatisfied with democracy. 43% more anxious than last year.
                    It feels apocalyptic. And in the chaos, these questions matter.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Devotional Series */}
      <main className="max-w-7xl mx-auto px-6 md:px-12 lg:px-20 pb-32 md:pb-48">
        <div className="space-y-1 md:space-y-2">
          {DEVOTIONAL_SERIES.map((series, index) => (
            <SeriesCard key={series.slug} series={series} delay={index} />
          ))}
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-gray-200 py-20 md:py-32">
        <div className="max-w-7xl mx-auto px-6 md:px-12 lg:px-20">
          <div className="grid md:grid-cols-12 gap-8">
            <div className="md:col-span-6 md:col-start-4">
              <p className="text-label text-gray-400 vw-small observe-fade">
                VENERATE THE MIRACLE.<br />
                DISMANTLE THE HAVEL.
              </p>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}

function SeriesCard({ series, delay }: { series: typeof DEVOTIONAL_SERIES[0]; delay: number }) {
  const delayClass = delay > 0 ? `fade-in-delay-${Math.min(delay, 4)}` : '';

  return (
    <Link
      href={`/devotional/${series.slug}-day-1`}
      className={`block group observe-fade ${delayClass}`}
    >
      <div className={`grid md:grid-cols-12 gap-6 md:gap-12 py-10 md:py-12 border-b border-gray-200 hover:border-gray-400 transition-all duration-300 ${series.isCenter ? 'md:bg-gray-50' : ''}`}>
        <div className="md:col-span-1">
          <span className="text-gray-400 vw-small font-sans">{series.number}</span>
        </div>

        <div className="md:col-span-6">
          <h2 className="text-serif-italic vw-body-lg mb-4 transition-all duration-300 group-hover:translate-x-2" style={{ transitionProperty: 'color, transform' }}>
            <span className="group-hover:text-[#B8860B] transition-colors duration-300">
              {series.question}
            </span>
          </h2>
          <p className="vw-body text-gray-600 mb-3">
            {series.description}
          </p>
          <p className="text-label vw-small" style={{ color: '#B8860B' }}>
            {series.framework}
          </p>
        </div>

        <div className="md:col-span-3 md:col-start-10 flex items-center">
          <div className="text-label vw-small text-gray-400 group-hover:text-black transition-colors duration-300">
            BEGIN JOURNEY →
          </div>
        </div>
      </div>
    </Link>
  );
}
