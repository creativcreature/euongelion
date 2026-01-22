'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useEffect } from 'react';

export default function ComingSoonPage() {
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
              Coming Soon
            </h1>

            <div className="space-y-8 vw-body">
              <p className="text-serif-italic vw-body-lg observe-fade fade-in-delay-2">
                Wake Up Zine is just the beginning.
              </p>

              <p className="observe-fade fade-in-delay-3">
                What you're experiencing now is the public entry point to EUONGELION—a comprehensive platform
                for spiritual formation in apocalyptic times.
              </p>

              <div className="pt-8 border-t border-gray-200 observe-fade fade-in-delay-4">
                <h2 className="text-display vw-heading-md mb-6">The Full EUONGELION Platform</h2>

                <div className="space-y-6">
                  <div>
                    <h3 className="text-label vw-small mb-2" style={{ color: '#B8860B' }}>AI-POWERED SPIRITUAL DIRECTION</h3>
                    <p>
                      Personalized devotional pathways that adapt to your spiritual journey. The AI acts as a spiritual companion,
                      helping you navigate Scripture, discern God's voice, and develop a rule of life.
                    </p>
                  </div>

                  <div>
                    <h3 className="text-label vw-small mb-2" style={{ color: '#B8860B' }}>SOUL AUDIT</h3>
                    <p>
                      An in-depth assessment that identifies where you are spiritually, what you're hungry for,
                      and what barriers are preventing growth. Creates a customized devotional plan.
                    </p>
                  </div>

                  <div>
                    <h3 className="text-label vw-small mb-2" style={{ color: '#B8860B' }}>COMMUNITY PRACTICES</h3>
                    <p>
                      Connect with others walking the same path. Share reflections, prayer requests, and insights.
                      Find or start local covenant communities practicing mutual aid and spiritual accountability.
                    </p>
                  </div>

                  <div>
                    <h3 className="text-label vw-small mb-2" style={{ color: '#B8860B' }}>SHEPHERD TOOLS</h3>
                    <p>
                      Resources for pastors, small group leaders, and spiritual directors. Curriculum development,
                      discussion guides, and AI-assisted sermon preparation grounded in the Matthew 6:33 framework.
                    </p>
                  </div>

                  <div>
                    <h3 className="text-label vw-small mb-2" style={{ color: '#B8860B' }}>THE ARCHIVE</h3>
                    <p>
                      A growing library of devotionals, theological reflections, and cultural analysis.
                      Searchable by topic, Scripture, or spiritual season. Bookmark, annotate, and build your own library.
                    </p>
                  </div>

                  <div>
                    <h3 className="text-label vw-small mb-2" style={{ color: '#B8860B' }}>COURSES & FORMATION TRACKS</h3>
                    <p>
                      Multi-week intensive courses on spiritual disciplines, theology, and Christian living.
                      Video teachings, reading assignments, reflection exercises, and community discussion.
                    </p>
                  </div>
                </div>
              </div>

              <div className="pt-8 border-t border-gray-200 observe-fade fade-in-delay-5">
                <h2 className="text-display vw-heading-md mb-6">Why AI?</h2>
                <p className="mb-4">
                  The church has always used technology to spread the gospel: the printing press, radio, television.
                  AI is this generation's tool. We're not replacing human spiritual direction—we're making it accessible
                  to the millions who don't have access to a pastor, spiritual director, or mature Christian community.
                </p>
                <p>
                  The AI is trained on Scripture, orthodox Christian theology, and the wisdom of church history.
                  It doesn't replace the Holy Spirit. It creates space for the Holy Spirit to work by removing barriers
                  to encounter God's Word.
                </p>
              </div>

              <div className="pt-8 border-t border-gray-200 observe-fade fade-in-delay-6">
                <h2 className="text-display vw-heading-md mb-6">When?</h2>
                <p className="mb-4">
                  We're building in public. The full platform is in development now.
                </p>
                <p className="mb-4">
                  For now, focus on Wake Up Zine. Read one devotional per day. Let the 35-day journey form you.
                  By the time you finish, the next layer will be ready.
                </p>
                <p className="text-serif-italic">
                  The lost are waiting. We're shipping as fast as we can.
                </p>
              </div>

              <div className="pt-8 observe-fade fade-in-delay-7">
                <p className="text-label vw-small text-gray-400">
                  Want early access? Enter the admin password to see what we're building.
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
