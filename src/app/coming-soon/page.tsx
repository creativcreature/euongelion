'use client';

import Link from 'next/link';
import Image from 'next/image';
import Navigation from '@/components/Navigation';
import { useEffect, useState } from 'react';

export default function ComingSoonPage() {
  const [email, setEmail] = useState('');
  const [submitted, setSubmitted] = useState(false);

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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // TODO: Integrate with email service
    setSubmitted(true);
    setTimeout(() => setSubmitted(false), 5000);
  };

  return (
    <div className="min-h-screen bg-cream">
      <Navigation />

      {/* Hero Section */}
      <header id="main-content" className="max-w-7xl mx-auto px-6 md:px-12 lg:px-20 pt-12 md:pt-20 pb-20 md:pb-32">
        <div className="grid md:grid-cols-12 gap-8 md:gap-16">
          <div className="md:col-span-10 md:col-start-2 text-center">
            <p className="text-label vw-small mb-6 observe-fade text-gold">
              EUONGELION PLATFORM
            </p>

            <h1 className="text-display vw-heading-xl mb-8 observe-fade fade-in-delay-1">
              Spiritual Formation<br />for Apocalyptic Times
            </h1>

            <p className="text-serif-italic vw-body-lg max-w-3xl mx-auto mb-12 observe-fade fade-in-delay-2" style={{ maxWidth: '40ch' }}>
              Wake Up Zine is just the beginning. We're building a comprehensive AI-powered platform for discipleship, community, and spiritual direction.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center observe-fade fade-in-delay-3">
              <Link
                href="/"
                className="bg-black text-cream px-10 py-5 text-label vw-small hover:bg-gray-800 transition-all duration-300 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold"
              >
                Start with Wake Up Zine
              </Link>
              <Link
                href="/admin/unlock"
                className="border-2 border-black px-10 py-5 text-label vw-small hover:bg-black hover:text-cream transition-all duration-300 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold"
              >
                Admin Preview
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* Social Proof Section */}
      <section className="border-t border-subtle py-12 md:py-16">
        <div className="max-w-7xl mx-auto px-6 md:px-12 lg:px-20">
          <div className="grid md:grid-cols-3 gap-8 md:gap-12 text-center">
            <div className="observe-fade scale-in">
              <p className="text-display vw-heading-md mb-2 text-gold">35 Days</p>
              <p className="text-gray-600 vw-small text-label">Transformative Journey</p>
            </div>
            <div className="observe-fade scale-in fade-in-delay-1">
              <p className="text-display vw-heading-md mb-2 text-gold">Orthodox</p>
              <p className="text-gray-600 vw-small text-label">Theologically Grounded</p>
            </div>
            <div className="observe-fade scale-in fade-in-delay-2">
              <p className="text-display vw-heading-md mb-2 text-gold">7 Questions</p>
              <p className="text-gray-600 vw-small text-label">Seven Series Available</p>
            </div>
          </div>
        </div>
      </section>

      {/* What's Coming */}
      <section className="border-t border-subtle py-20 md:py-32 bg-cream-dark">
        <div className="max-w-7xl mx-auto px-6 md:px-12 lg:px-20">
          <div className="grid md:grid-cols-12 gap-8 md:gap-16">
            <div className="md:col-span-10 md:col-start-2">
              <h2 className="text-display vw-heading-lg mb-16 text-center observe-fade">
                What's Coming
              </h2>

              <div className="grid md:grid-cols-2 gap-8 md:gap-12">
                {/* Feature 1 */}
                <div className="bg-white p-8 md:p-10 border-l-4 border-gold observe-fade fade-in-delay-1">
                  <div className="flex items-center gap-3 mb-4">
                    <svg className="w-6 h-6 text-gold" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M9 4.804A7.968 7.968 0 005.5 4c-1.255 0-2.443.29-3.5.804v10A7.969 7.969 0 015.5 14c1.669 0 3.218.51 4.5 1.385A7.962 7.962 0 0114.5 14c1.255 0 2.443.29 3.5.804v-10A7.968 7.968 0 0014.5 4c-1.255 0-2.443.29-3.5.804V12a1 1 0 11-2 0V4.804z" />
                    </svg>
                    <h3 className="text-label vw-small text-gold">AI SPIRITUAL DIRECTION</h3>
                  </div>
                  <p className="vw-body text-gray-700 leading-relaxed">
                    Personalized devotional pathways that adapt to your spiritual journey. Scripture-grounded AI that helps you discern God's voice and develop a rule of life.
                  </p>
                </div>

                {/* Feature 2 */}
                <div className="bg-white p-8 md:p-10 border-l-4 border-gold observe-fade fade-in-delay-2">
                  <div className="flex items-center gap-3 mb-4">
                    <svg className="w-6 h-6 text-gold" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                    <h3 className="text-label vw-small text-gold">SOUL AUDIT</h3>
                  </div>
                  <p className="vw-body text-gray-700 leading-relaxed">
                    In-depth assessment that identifies where you are spiritually, what you're hungry for, and creates a customized formation plan.
                  </p>
                </div>

                {/* Feature 3 */}
                <div className="bg-white p-8 md:p-10 border-l-4 border-gold observe-fade fade-in-delay-3">
                  <div className="flex items-center gap-3 mb-4">
                    <svg className="w-6 h-6 text-gold" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M13 6a3 3 0 11-6 0 3 3 0 016 0zM18 8a2 2 0 11-4 0 2 2 0 014 0zM14 15a4 4 0 00-8 0v3h8v-3zM6 8a2 2 0 11-4 0 2 2 0 014 0zM16 18v-3a5.972 5.972 0 00-.75-2.906A3.005 3.005 0 0119 15v3h-3zM4.75 12.094A5.973 5.973 0 004 15v3H1v-3a3 3 0 013.75-2.906z" />
                    </svg>
                    <h3 className="text-label vw-small text-gold">COVENANT COMMUNITY</h3>
                  </div>
                  <p className="vw-body text-gray-700 leading-relaxed">
                    Find or start local groups practicing mutual aid and spiritual accountability. Share reflections, prayer requests, and wisdom.
                  </p>
                </div>

                {/* Feature 4 */}
                <div className="bg-white p-8 md:p-10 border-l-4 border-gold observe-fade fade-in-delay-4">
                  <div className="flex items-center gap-3 mb-4">
                    <svg className="w-6 h-6 text-gold" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M10.394 2.08a1 1 0 00-.788 0l-7 3a1 1 0 000 1.84L5.25 8.051a.999.999 0 01.356-.257l4-1.714a1 1 0 11.788 1.838L7.667 9.088l1.94.831a1 1 0 00.787 0l7-3a1 1 0 000-1.838l-7-3zM3.31 9.397L5 10.12v4.102a8.969 8.969 0 00-1.05-.174 1 1 0 01-.89-.89 11.115 11.115 0 01.25-3.762zM9.3 16.573A9.026 9.026 0 007 14.935v-3.957l1.818.78a3 3 0 002.364 0l5.508-2.361a11.026 11.026 0 01.25 3.762 1 1 0 01-.89.89 8.968 8.968 0 00-5.35 2.524 1 1 0 01-1.4 0zM6 18a1 1 0 001-1v-2.065a8.935 8.935 0 00-2-.712V17a1 1 0 001 1z" />
                    </svg>
                    <h3 className="text-label vw-small text-gold">SHEPHERD TOOLS</h3>
                  </div>
                  <p className="vw-body text-gray-700 leading-relaxed">
                    Resources for pastors and leaders. Curriculum development, discussion guides, and AI-assisted sermon prep grounded in Matthew 6:33.
                  </p>
                </div>

                {/* Feature 5 */}
                <div className="bg-white p-8 md:p-10 border-l-4 border-gold observe-fade fade-in-delay-5">
                  <div className="flex items-center gap-3 mb-4">
                    <svg className="w-6 h-6 text-gold" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M4 4a2 2 0 012-2h8a2 2 0 012 2v12a1 1 0 110 2h-3a1 1 0 01-1-1v-2a1 1 0 00-1-1H9a1 1 0 00-1 1v2a1 1 0 01-1 1H4a1 1 0 110-2V4zm3 1h2v2H7V5zm2 4H7v2h2V9zm2-4h2v2h-2V5zm2 4h-2v2h2V9z" clipRule="evenodd" />
                    </svg>
                    <h3 className="text-label vw-small text-gold">THE ARCHIVE</h3>
                  </div>
                  <p className="vw-body text-gray-700 leading-relaxed">
                    Growing library of devotionals and theological reflections. Searchable by topic, Scripture, or spiritual season. Build your own library.
                  </p>
                </div>

                {/* Feature 6 */}
                <div className="bg-white p-8 md:p-10 border-l-4 border-gold observe-fade fade-in-delay-6">
                  <div className="flex items-center gap-3 mb-4">
                    <svg className="w-6 h-6 text-gold" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M10.894 2.553a1 1 0 00-1.788 0l-7 14a1 1 0 001.169 1.409l5-1.429A1 1 0 009 15.571V11a1 1 0 112 0v4.571a1 1 0 00.725.962l5 1.428a1 1 0 001.17-1.408l-7-14z" />
                    </svg>
                    <h3 className="text-label vw-small text-gold">FORMATION TRACKS</h3>
                  </div>
                  <p className="vw-body text-gray-700 leading-relaxed">
                    Multi-week intensive courses on spiritual disciplines, theology, and Christian living. Video teachings, readings, and community discussion.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Why AI Section */}
      <section className="border-t border-gray-200 py-20 md:py-32">
        <div className="max-w-7xl mx-auto px-6 md:px-12 lg:px-20">
          <div className="grid md:grid-cols-12 gap-8 md:gap-16">
            <div className="md:col-span-8 md:col-start-3">
              <h2 className="text-display vw-heading-md mb-8 observe-fade">Why AI?</h2>
              <div className="space-y-6 vw-body text-gray-700">
                <p className="observe-fade fade-in-delay-1">
                  The church has always used technology to spread the gospel: the printing press, radio, television. AI is this generation's tool.
                </p>
                <p className="observe-fade fade-in-delay-2">
                  We're not replacing human spiritual direction—we're making it accessible to the <strong>millions who don't have access</strong> to a pastor, spiritual director, or mature Christian community.
                </p>
                <p className="observe-fade fade-in-delay-3">
                  The AI is trained on Scripture, orthodox Christian theology, and the wisdom of church history. It doesn't replace the Holy Spirit. It <strong>creates space for the Holy Spirit to work</strong> by removing barriers to encountering God's Word.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Email Signup CTA */}
      <section className="border-t border-subtle py-20 md:py-32 bg-accent">
        <div className="max-w-7xl mx-auto px-6 md:px-12 lg:px-20">
          <div className="grid md:grid-cols-12 gap-8 md:gap-16">
            <div className="md:col-span-8 md:col-start-3 text-center">
              <h2 className="text-display vw-heading-lg mb-6 observe-fade text-cream">
                Be the First to Know
              </h2>
              <p className="text-serif-italic vw-body-lg mb-12 observe-fade fade-in-delay-1 text-gold">
                The full platform launches soon. Get early access and updates.
              </p>

              {submitted ? (
                <div className="bg-green-600 p-6 mb-8 animate-fade-in" role="status">
                  <p className="text-white vw-body font-semibold">
                    ✓ You're on the list. We'll notify you when it's ready.
                  </p>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="max-w-md mx-auto observe-fade fade-in-delay-2">
                  <div className="flex flex-col sm:flex-row gap-4">
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="Your email"
                      required
                      className="flex-1 px-6 py-4 border-2 border-gray-600 bg-transparent text-white placeholder-gray-400 focus:border-[#B8860B] outline-none vw-body"
                      aria-label="Email address"
                    />
                    <button
                      type="submit"
                      className="bg-gold text-black px-10 py-4 text-label vw-small transition-all duration-300 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold"
                    >
                      Notify Me
                    </button>
                  </div>
                  <p className="text-gray-400 vw-small mt-4">
                    We'll email you once when we launch. No spam.
                  </p>
                </form>
              )}

              <div className="mt-12 observe-fade fade-in-delay-3">
                <p className="text-gray-400 vw-small mb-4">
                  Or unlock admin preview now:
                </p>
                <Link
                  href="/admin/unlock"
                  className="inline-block border-2 border-cream text-cream px-8 py-4 text-label vw-small transition-all duration-300 hover:bg-cream hover:text-black focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold"
                >
                  Admin Access
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Timeline */}
      <section className="border-t border-gray-200 py-20 md:py-32">
        <div className="max-w-7xl mx-auto px-6 md:px-12 lg:px-20">
          <div className="grid md:grid-cols-12 gap-8 md:gap-16">
            <div className="md:col-span-8 md:col-start-3">
              <h2 className="text-display vw-heading-md mb-8 observe-fade">When?</h2>
              <div className="space-y-6 vw-body text-gray-700">
                <p className="observe-fade fade-in-delay-1">
                  We're building in public. The full platform is in development now.
                </p>
                <p className="observe-fade fade-in-delay-2">
                  <strong>For now</strong>, focus on Wake Up Zine. Read one devotional per day. Let the 35-day journey form you. By the time you finish, the next layer will be ready.
                </p>
                <p className="text-serif-italic observe-fade fade-in-delay-3">
                  The lost are waiting. We're shipping as fast as we can.
                </p>
              </div>

              <div className="mt-12 pt-12 border-t border-subtle observe-fade fade-in-delay-4">
                <Link
                  href="/"
                  className="inline-block bg-black text-cream px-10 py-5 text-label vw-small hover:bg-gray-800 transition-all duration-300 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold"
                >
                  ← Back to Wake Up Zine
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-gray-200 py-16 md:py-24">
        <div className="max-w-7xl mx-auto px-6 md:px-12 lg:px-20">
          <div className="grid md:grid-cols-12 gap-8">
            <div className="md:col-span-6 md:col-start-4 text-center">
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
