'use client';

import Link from 'next/link';
import { useEffect } from 'react';
import Image from 'next/image';
import Navigation from '@/components/Navigation';

const DEVOTIONAL_SERIES = [
  {
    number: '01',
    question: 'When everything that defined you is shaken, who are you?',
    slug: 'identity',
    theme: 'Identity',
  },
  {
    number: '02',
    question: "What if peace isn't found by controlling your circumstances?",
    slug: 'peace',
    theme: 'Peace',
  },
  {
    number: '03',
    question: 'Who are your people when systems fail?',
    slug: 'community',
    theme: 'Community',
  },
  {
    number: '04',
    question: "What if the kingdom you're looking for is already here?",
    slug: 'kingdom',
    theme: 'Kingdom',
    isCenter: true,
  },
  {
    number: '05',
    question: "What if provision isn't about having enough, but sharing what you have?",
    slug: 'provision',
    theme: 'Provision',
  },
  {
    number: '06',
    question: "How do you know what's real when misinformation is everywhere?",
    slug: 'truth',
    theme: 'Truth',
  },
  {
    number: '07',
    question: "What if hope isn't optimism, but faithfulness in the dark?",
    slug: 'hope',
    theme: 'Hope',
  },
];

export default function Home() {
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
    <div className="min-h-screen bg-cream">
      <Navigation />

      {/* Hero Section */}
      <header className="max-w-7xl mx-auto px-6 md:px-12 lg:px-20 pt-12 md:pt-20 pb-16 md:pb-24">
        <div className="grid md:grid-cols-12 gap-8 md:gap-16">
          <div className="md:col-span-10 md:col-start-2">
            {/* EUONGELION Heading */}
            <div className="mb-12 md:mb-16 text-center observe-fade">
              <h1 className="text-display vw-heading-xl mb-6">
                EUONGELION
              </h1>
              <p className="text-label vw-small mb-8 text-gold">
                EU·ON·GE·LION (yoo-on-GEL-ee-on) · GREEK: "GOOD NEWS"
              </p>
              <p className="text-serif-italic vw-body-lg max-w-3xl mx-auto mb-10" style={{ maxWidth: '50ch' }}>
                Daily bread for the cluttered, hungry soul. In a world drowning in noise, EUONGELION offers something rare: clarity, rest, and truth.
              </p>
              <Link
                href="/series/identity"
                className="inline-block bg-black text-cream px-10 py-5 text-label vw-small hover:bg-gray-800 transition-all duration-300 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold"
              >
                Start with Question 01
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* Problem Statement Section */}
      <section className="border-t border-subtle py-16 md:py-24 bg-cream-dark">
        <div className="max-w-7xl mx-auto px-6 md:px-12 lg:px-20">
          <div className="grid md:grid-cols-12 gap-8 md:gap-16">
            <div className="md:col-span-8 md:col-start-3 text-center">
              <p className="vw-body text-gray-700 mb-6 observe-fade">
                We live in apocalyptic times. Political violence. Economic collapse. 43% more anxious than last year. The ground beneath us is shaking.
              </p>
              <p className="text-serif-italic vw-body-lg observe-fade fade-in-delay-1">
                The seven questions below aren't easy. But they're honest. Each one invites you into a 5-day journey to seek first the kingdom—and discover that everything else gets added.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="border-t border-subtle py-16 md:py-24">
        <div className="max-w-7xl mx-auto px-6 md:px-12 lg:px-20">
          <div className="grid md:grid-cols-12 gap-8 md:gap-16">
            <div className="md:col-span-10 md:col-start-2">
              <h2 className="text-label vw-small mb-10 text-center text-gold observe-fade">
                HOW IT WORKS
              </h2>
              <div className="grid md:grid-cols-3 gap-8 md:gap-12 text-center">
                <div className="observe-fade fade-in-delay-1">
                  <div className="text-display vw-heading-md mb-4 text-gold">01</div>
                  <p className="vw-body text-gray-700">Pick a question that speaks to where you are.</p>
                </div>
                <div className="observe-fade fade-in-delay-2">
                  <div className="text-display vw-heading-md mb-4 text-gold">02</div>
                  <p className="vw-body text-gray-700">Read one devotional per day for 5 days.</p>
                </div>
                <div className="observe-fade fade-in-delay-3">
                  <div className="text-display vw-heading-md mb-4 text-gold">03</div>
                  <p className="vw-body text-gray-700">Reflect, journal, and let God reorder your heart.</p>
                </div>
              </div>
              <p className="text-center vw-body text-gray-600 mt-10 observe-fade fade-in-delay-4">
                Each series follows a chiastic arc—building toward a revelation, then reflecting back. Ancient structure. Modern questions.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Seven Questions */}
      <main id="main-content" className="border-t border-subtle py-20 md:py-32">
        <div className="max-w-7xl mx-auto px-6 md:px-12 lg:px-20">
          <div className="grid md:grid-cols-12 gap-8 md:gap-16">
            <div className="md:col-span-10 md:col-start-2">
              <h2 className="text-label vw-small mb-12 text-center md:text-left text-gold observe-fade">
                SEVEN QUESTIONS FOR THE SEARCHING
              </h2>

              <div className="space-y-1 md:space-y-2">
                {DEVOTIONAL_SERIES.map((series, index) => (
                  <Link
                    key={series.slug}
                    href={`/series/${series.slug}`}
                    className={`block group observe-fade ${index > 0 ? `fade-in-delay-${Math.min(index, 4)}` : ''}`}
                  >
                    <div className={`grid md:grid-cols-12 gap-6 md:gap-12 py-8 md:py-10 border-b border-subtle hover:border-gray-400 transition-all duration-300 ${series.isCenter ? 'md:bg-cream-dark md:-mx-8 md:px-8' : ''}`}>
                      <div className="md:col-span-1">
                        <span className="text-gray-400 vw-small font-sans">{series.number}</span>
                      </div>

                      <div className="md:col-span-9">
                        <p className="text-serif-italic vw-body-lg transition-all duration-300 group-hover:translate-x-2">
                          <span className="group-hover:text-gold transition-colors duration-300">
                            {series.question}
                          </span>
                        </p>
                      </div>

                      <div className="md:col-span-2 flex items-center justify-end">
                        <span className="text-label vw-small text-gray-400 group-hover:text-black transition-colors duration-300">
                          BEGIN →
                        </span>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-subtle py-16 md:py-24">
        <div className="max-w-7xl mx-auto px-6 md:px-12 lg:px-20">
          <div className="grid md:grid-cols-12 gap-8">
            <div className="md:col-span-6 md:col-start-4 text-center">
              <p className="text-label text-gray-400 vw-small observe-fade leading-relaxed">
                VENERATE THE MIRACLE.<br />
                DISMANTLE THE HAVEL.
              </p>
              <p className="vw-small text-gray-400 mt-8">
                © 2026 EUONGELION · A wokeGod project
              </p>
              <div className="mt-8">
                <Link
                  href="/coming-soon"
                  className="text-gold hover:text-dark-gold transition-colors duration-300 text-label vw-small"
                >
                  Learn About the Full Platform →
                </Link>
              </div>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
