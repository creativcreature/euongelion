'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useEffect } from 'react';

export default function AboutPage() {
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

      {/* Content */}
      <main className="max-w-7xl mx-auto px-6 md:px-12 lg:px-20 py-20 md:py-32">
        <div className="grid md:grid-cols-12 gap-8 md:gap-16">
          <div className="md:col-span-8 md:col-start-3">
            <Link
              href="/"
              className="text-gray-400 hover:text-black transition-colors duration-300 vw-small mb-12 inline-block observe-fade"
            >
              ← Home
            </Link>

            <h1 className="text-display vw-heading-xl mb-12 observe-fade fade-in-delay-1">
              About Wake Up
            </h1>

            <div className="space-y-8 vw-body">
              <p className="text-serif-italic vw-body-lg observe-fade fade-in-delay-2">
                When the world is apocalyptic, where do you turn?
              </p>

              <p className="observe-fade fade-in-delay-3">
                Wake Up Zine is a 35-day devotional journey for people who can't ignore what's happening around them.
                Political violence. Climate crisis. Economic collapse. 29% of adults are frequently lonely.
                71% are dissatisfied with democracy. 57% are pessimistic about 2026.
              </p>

              <p className="observe-fade fade-in-delay-4">
                You're anxious. You're exhausted. You're looking for answers.
              </p>

              <p className="observe-fade fade-in-delay-5">
                Wake Up offers 7 series addressing the questions that keep you up at night:
                Identity. Peace. Community. Kingdom. Provision. Truth. Hope.
                Each series is 5 days, following a chiastic structure (A-B-C-B'-A') with Day 3 as the pivot.
              </p>

              <p className="observe-fade fade-in-delay-6">
                We're not offering toxic positivity or spiritual bypassing. We're offering honest engagement with Scripture
                that doesn't look away from the darkness.
              </p>

              <div className="pt-8 border-t border-gray-200 observe-fade fade-in-delay-7">
                <h2 className="text-display vw-heading-md mb-6">The Framework</h2>
                <p className="text-serif-italic vw-body-lg mb-4" style={{ color: '#B8860B' }}>
                  "Seek first the kingdom of God and his righteousness, and all these things will be added to you."<br />
                  — Matthew 6:33
                </p>
                <p>
                  Everything in Wake Up flows from this verse. When your identity, security, and provision are anchored in God's kingdom,
                  the collapse of earthly kingdoms becomes less terrifying. The apocalypse reveals what was always true:
                  only one kingdom endures.
                </p>
              </div>

              <div className="pt-8 border-t border-gray-200 observe-fade fade-in-delay-8">
                <h2 className="text-display vw-heading-md mb-6">How to Use Wake Up</h2>
                <ol className="space-y-4 list-decimal list-inside">
                  <li>Read one devotional per day, preferably in the morning.</li>
                  <li>Follow series in order: Identity → Peace → Community → Kingdom → Provision → Truth → Hope.</li>
                  <li>Pay special attention to Day 3 of each series (the pivot point).</li>
                  <li>Let the Scripture sit with you. Don't rush to the next thing.</li>
                  <li>Return when you need it. This isn't a one-time read.</li>
                </ol>
              </div>

              <div className="pt-8 border-t border-gray-200 observe-fade fade-in-delay-9">
                <h2 className="text-display vw-heading-md mb-6">What We Believe</h2>
                <p className="mb-4 font-sans text-label vw-small" style={{ color: '#B8860B' }}>
                  VENERATE THE MIRACLE.
                </p>
                <p className="mb-6">
                  The incarnation, death, and resurrection of Jesus is the hinge of history.
                  Everything before points to it. Everything after flows from it.
                  We don't minimize the miracle to make Christianity palatable.
                </p>

                <p className="mb-4 font-sans text-label vw-small" style={{ color: '#B8860B' }}>
                  DISMANTLE THE HAVEL.
                </p>
                <p>
                  Havel is everything we construct to avoid confronting reality.
                  The narratives, the distractions, the empire-building.
                  We dismantle what's false so we can see what's true.
                </p>
              </div>

              <div className="pt-8 observe-fade fade-in-delay-10">
                <p className="text-serif-italic">
                  Wake Up is a project of EUONGELION, a wokeGod initiative.
                </p>
              </div>
            </div>
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
