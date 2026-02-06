'use client'

import Link from 'next/link'
import { useEffect } from 'react'
import Navigation from '@/components/Navigation'
import { DEVOTIONAL_SERIES } from '@/data/series'

export default function WakeUpPage() {
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('fade-in')
          }
        })
      },
      { threshold: 0.1 },
    )

    const elements = document.querySelectorAll('.observe-fade')
    elements.forEach((el) => observer.observe(el))

    return () => observer.disconnect()
  }, [])

  return (
    <div className="min-h-screen bg-cream dark:bg-[#1a1a1a]">
      <Navigation />

      {/* Hero Section */}
      <header className="mx-auto max-w-7xl px-6 pb-16 pt-12 md:px-12 md:pb-24 md:pt-20 lg:px-20">
        <div className="grid gap-8 md:grid-cols-12 md:gap-16">
          <div className="md:col-span-10 md:col-start-2">
            <div className="observe-fade mb-12 text-center md:mb-16">
              <h1 className="text-display vw-heading-xl mb-6">WAKE UP</h1>
              <p className="text-label vw-small mb-8 text-gold">
                7 SERIES · 35 DEVOTIONALS · 5 DAYS EACH
              </p>
              <p
                className="text-serif-italic vw-body-lg mx-auto mb-10"
                style={{ maxWidth: '50ch' }}
              >
                In a world drowning in noise, Wake Up offers something rare:
                clarity, rest, and truth. Seven questions for the searching.
                Five days per question. Ancient structure. Modern urgency.
              </p>
              <Link
                href="/wake-up/series/identity"
                className="inline-block bg-black px-10 py-5 text-label vw-small text-cream transition-all duration-300 hover:bg-gray-800 dark:bg-cream dark:text-black dark:hover:bg-gray-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold"
              >
                Start with Question 01
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* Problem Statement */}
      <section className="border-t border-subtle bg-cream-dark py-16 md:py-24">
        <div className="mx-auto max-w-7xl px-6 md:px-12 lg:px-20">
          <div className="grid gap-8 md:grid-cols-12 md:gap-16">
            <div className="text-center md:col-span-8 md:col-start-3">
              <p className="observe-fade vw-body mb-6 text-gray-700 dark:text-gray-300">
                We live in apocalyptic times. Political violence. Economic
                collapse. 43% more anxious than last year. The ground beneath us
                is shaking.
              </p>
              <p className="observe-fade text-serif-italic vw-body-lg fade-in-delay-1">
                The seven questions below aren&apos;t easy. But they&apos;re
                honest. Each one invites you into a 5-day journey to seek first
                the kingdom—and discover that everything else gets added.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="border-t border-subtle py-16 md:py-24">
        <div className="mx-auto max-w-7xl px-6 md:px-12 lg:px-20">
          <div className="grid gap-8 md:grid-cols-12 md:gap-16">
            <div className="md:col-span-10 md:col-start-2">
              <h2 className="observe-fade text-label vw-small mb-10 text-center text-gold">
                HOW IT WORKS
              </h2>
              <div className="grid gap-8 text-center md:grid-cols-3 md:gap-12">
                <div className="observe-fade slide-in-left fade-in-delay-1">
                  <div className="text-display vw-heading-md mb-4 text-gold">
                    01
                  </div>
                  <p className="vw-body text-gray-700 dark:text-gray-300">
                    Pick a question that speaks to where you are.
                  </p>
                </div>
                <div className="observe-fade scale-in fade-in-delay-2">
                  <div className="text-display vw-heading-md mb-4 text-gold">
                    02
                  </div>
                  <p className="vw-body text-gray-700 dark:text-gray-300">
                    Read one devotional per day for 5 days.
                  </p>
                </div>
                <div className="observe-fade slide-in-right fade-in-delay-3">
                  <div className="text-display vw-heading-md mb-4 text-gold">
                    03
                  </div>
                  <p className="vw-body text-gray-700 dark:text-gray-300">
                    Reflect, journal, and let God reorder your heart.
                  </p>
                </div>
              </div>
              <p className="observe-fade vw-body mt-10 text-center text-gray-600 fade-in-delay-4 dark:text-gray-400">
                Each series follows a chiastic arc—building toward a revelation,
                then reflecting back. Ancient structure. Modern questions.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Seven Questions */}
      <main id="main-content" className="border-t border-subtle py-20 md:py-32">
        <div className="mx-auto max-w-7xl px-6 md:px-12 lg:px-20">
          <div className="grid gap-8 md:grid-cols-12 md:gap-16">
            <div className="md:col-span-10 md:col-start-2">
              <h2 className="observe-fade text-label vw-small mb-12 text-center text-gold md:text-left">
                SEVEN QUESTIONS FOR THE SEARCHING
              </h2>

              <div className="space-y-1 md:space-y-2">
                {DEVOTIONAL_SERIES.map((series, index) => (
                  <Link
                    key={series.slug}
                    href={`/wake-up/series/${series.slug}`}
                    className={`observe-fade block ${index > 0 ? `fade-in-delay-${Math.min(index, 4)}` : ''}`}
                  >
                    <div
                      className={`group grid gap-6 border-b border-subtle py-8 transition-all duration-300 hover:border-gray-400 md:grid-cols-12 md:gap-12 md:py-10 ${series.isCenter ? 'md:-mx-8 md:bg-cream-dark md:px-8' : ''}`}
                    >
                      <div className="md:col-span-1">
                        <span className="vw-small font-sans text-gray-400">
                          {series.number}
                        </span>
                      </div>

                      <div className="md:col-span-9">
                        <p className="text-serif-italic vw-body-lg transition-all duration-300 group-hover:translate-x-2">
                          <span className="transition-colors duration-300 group-hover:text-gold">
                            {series.question}
                          </span>
                        </p>
                      </div>

                      <div className="flex items-center justify-end md:col-span-2">
                        <span className="text-label vw-small text-gray-400 transition-colors duration-300 group-hover:text-black dark:text-gray-500 dark:group-hover:text-cream">
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
        <div className="mx-auto max-w-7xl px-6 md:px-12 lg:px-20">
          <div className="grid gap-8 md:grid-cols-12">
            <div className="text-center md:col-span-6 md:col-start-4">
              <p className="observe-fade text-label vw-small leading-relaxed text-gray-400">
                VENERATE THE MIRACLE.
                <br />
                DISMANTLE THE HAVEL.
              </p>
              <p className="vw-small mt-8 text-gray-400">
                &copy; 2026 EUANGELION
              </p>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}
