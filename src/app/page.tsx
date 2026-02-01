'use client';

import Link from 'next/link';
import { useEffect } from 'react';
import Navigation from '@/components/Navigation';

const PLATFORM_FEATURES = [
  {
    icon: (
      <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 20 20">
        <path d="M9 4.804A7.968 7.968 0 005.5 4c-1.255 0-2.443.29-3.5.804v10A7.969 7.969 0 015.5 14c1.669 0 3.218.51 4.5 1.385A7.962 7.962 0 0114.5 14c1.255 0 2.443.29 3.5.804v-10A7.968 7.968 0 0014.5 4c-1.255 0-2.443.29-3.5.804V12a1 1 0 11-2 0V4.804z" />
      </svg>
    ),
    title: 'AI Spiritual Direction',
    description: 'Personalized devotional pathways that adapt to your journey. Scripture-grounded guidance that helps you discern and grow.',
    href: '/daily-bread',
    cta: 'Start Your Journey',
  },
  {
    icon: (
      <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 20 20">
        <path fillRule="evenodd" d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
      </svg>
    ),
    title: 'Soul Audit',
    description: 'Discover where you are spiritually. 24 questions that reveal your pathway and create a personalized formation plan.',
    href: '/soul-audit',
    cta: 'Take the Audit',
  },
  {
    icon: (
      <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 20 20">
        <path d="M9 4.804A7.968 7.968 0 005.5 4c-1.255 0-2.443.29-3.5.804v10A7.969 7.969 0 015.5 14c1.669 0 3.218.51 4.5 1.385A7.962 7.962 0 0114.5 14c1.255 0 2.443.29 3.5.804v-10A7.968 7.968 0 0014.5 4c-1.255 0-2.443.29-3.5.804V12a1 1 0 11-2 0V4.804z" />
      </svg>
    ),
    title: 'Wake Up Zine',
    description: '35 devotionals across 7 series. The original content that started it all. Begin your journey through Matthew 6:33.',
    href: '/zine',
    cta: 'Read the Zine',
    featured: true,
  },
];

export default function PlatformHome() {
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
    <div className="min-h-screen bg-[#0a0a0a] text-[#f7f3ed]">
      <Navigation />

      {/* Hero Section */}
      <header className="max-w-7xl mx-auto px-6 md:px-12 lg:px-20 pt-16 md:pt-24 pb-20 md:pb-32">
        <div className="text-center max-w-4xl mx-auto">
          <p className="text-[#c19a6b] text-sm uppercase tracking-widest mb-6 observe-fade">
            SPIRITUAL FORMATION FOR APOCALYPTIC TIMES
          </p>
          
          <h1 className="text-5xl md:text-7xl font-bold mb-8 observe-fade fade-in-delay-1">
            EUONGELION
          </h1>
          
          <p className="text-sm text-gray-400 mb-8 observe-fade fade-in-delay-1">
            EU·ON·GE·LION (yoo-on-GEL-ee-on) · GREEK: "GOOD NEWS"
          </p>
          
          <p className="text-xl md:text-2xl text-gray-300 mb-12 observe-fade fade-in-delay-2 leading-relaxed" style={{ maxWidth: '40ch', margin: '0 auto 3rem' }}>
            Daily bread for the cluttered, hungry soul. AI-powered spiritual direction grounded in Scripture and orthodox theology.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center observe-fade fade-in-delay-3">
            <Link
              href="/soul-audit"
              className="px-8 py-4 bg-[#c19a6b] text-[#0a0a0a] font-semibold rounded-lg hover:bg-[#d4ad7e] transition"
            >
              Discover Your Pathway
            </Link>
            <Link
              href="/zine"
              className="px-8 py-4 border-2 border-[#c19a6b] text-[#c19a6b] font-semibold rounded-lg hover:bg-[#c19a6b] hover:text-[#0a0a0a] transition"
            >
              Read Wake Up Zine
            </Link>
          </div>
        </div>
      </header>

      {/* Stats Section */}
      <section className="border-t border-gray-800 py-16">
        <div className="max-w-7xl mx-auto px-6 md:px-12 lg:px-20">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
            <div className="observe-fade">
              <p className="text-4xl font-bold text-[#c19a6b] mb-2">35</p>
              <p className="text-sm text-gray-400">Devotionals</p>
            </div>
            <div className="observe-fade fade-in-delay-1">
              <p className="text-4xl font-bold text-[#c19a6b] mb-2">7</p>
              <p className="text-sm text-gray-400">Life Questions</p>
            </div>
            <div className="observe-fade fade-in-delay-2">
              <p className="text-4xl font-bold text-[#c19a6b] mb-2">3</p>
              <p className="text-sm text-gray-400">Pathways</p>
            </div>
            <div className="observe-fade fade-in-delay-3">
              <p className="text-4xl font-bold text-[#c19a6b] mb-2">∞</p>
              <p className="text-sm text-gray-400">AI Guidance</p>
            </div>
          </div>
        </div>
      </section>

      {/* Framework Section */}
      <section className="border-t border-gray-800 py-20 md:py-32 bg-[#111]">
        <div className="max-w-7xl mx-auto px-6 md:px-12 lg:px-20">
          <div className="max-w-3xl mx-auto text-center">
            <blockquote className="text-2xl md:text-3xl font-serif italic text-[#c19a6b] mb-6 observe-fade">
              "Seek first the kingdom of God and his righteousness, and all these things will be added to you."
            </blockquote>
            <p className="text-gray-400 observe-fade fade-in-delay-1">
              — Matthew 6:33
            </p>
            <p className="mt-8 text-gray-300 leading-relaxed observe-fade fade-in-delay-2">
              In apocalyptic times—political violence, economic collapse, epidemic loneliness—this ancient wisdom becomes urgent. 
              Everything in EUONGELION flows from this verse. When your identity, security, and provision are anchored in God's kingdom, 
              the collapse of earthly kingdoms becomes less terrifying.
            </p>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="border-t border-gray-800 py-20 md:py-32">
        <div className="max-w-7xl mx-auto px-6 md:px-12 lg:px-20">
          <h2 className="text-3xl md:text-4xl font-bold text-center mb-16 observe-fade">
            Your Spiritual Formation Journey
          </h2>

          <div className="grid md:grid-cols-3 gap-8">
            {PLATFORM_FEATURES.map((feature, index) => (
              <div
                key={feature.title}
                className={`p-8 rounded-2xl border observe-fade fade-in-delay-${index + 1} ${
                  feature.featured
                    ? 'bg-[#c19a6b]/10 border-[#c19a6b]'
                    : 'bg-[#1a1a1a] border-gray-800 hover:border-gray-700'
                } transition`}
              >
                <div className={`mb-4 ${feature.featured ? 'text-[#c19a6b]' : 'text-gray-400'}`}>
                  {feature.icon}
                </div>
                <h3 className="text-xl font-semibold mb-3">{feature.title}</h3>
                <p className="text-gray-400 mb-6 leading-relaxed">{feature.description}</p>
                <Link
                  href={feature.href}
                  className={`inline-block font-medium transition ${
                    feature.featured
                      ? 'text-[#c19a6b] hover:text-[#d4ad7e]'
                      : 'text-gray-300 hover:text-white'
                  }`}
                >
                  {feature.cta} →
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Three Pathways Section */}
      <section className="border-t border-gray-800 py-20 md:py-32 bg-[#111]">
        <div className="max-w-7xl mx-auto px-6 md:px-12 lg:px-20">
          <h2 className="text-3xl md:text-4xl font-bold text-center mb-6 observe-fade">
            Three Pathways
          </h2>
          <p className="text-center text-gray-400 mb-16 max-w-2xl mx-auto observe-fade fade-in-delay-1">
            The Soul Audit discovers where you are. Your pathway determines how we guide you.
          </p>

          <div className="grid md:grid-cols-3 gap-8">
            <div className="p-8 rounded-2xl bg-[#1a1a1a] border border-gray-800 observe-fade fade-in-delay-1">
              <p className="text-sm text-[#c19a6b] uppercase tracking-wider mb-3">Pathway 1</p>
              <h3 className="text-2xl font-bold mb-4">Seeker</h3>
              <p className="text-gray-400 leading-relaxed">
                For those exploring faith with fresh eyes. We'll guide you gently through foundational truths without assuming prior knowledge.
              </p>
            </div>

            <div className="p-8 rounded-2xl bg-[#1a1a1a] border border-gray-800 observe-fade fade-in-delay-2">
              <p className="text-sm text-[#c19a6b] uppercase tracking-wider mb-3">Pathway 2</p>
              <h3 className="text-2xl font-bold mb-4">Growing</h3>
              <p className="text-gray-400 leading-relaxed">
                For believers seeking depth. Deeper content with practical application for your daily walk with God.
              </p>
            </div>

            <div className="p-8 rounded-2xl bg-[#1a1a1a] border border-gray-800 observe-fade fade-in-delay-3">
              <p className="text-sm text-[#c19a6b] uppercase tracking-wider mb-3">Pathway 3</p>
              <h3 className="text-2xl font-bold mb-4">Mature</h3>
              <p className="text-gray-400 leading-relaxed">
                For those ready to go deeper. Rich theological content to equip you for teaching and leading others.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="border-t border-gray-800 py-20 md:py-32 bg-[#c19a6b]">
        <div className="max-w-7xl mx-auto px-6 md:px-12 lg:px-20 text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-[#0a0a0a] mb-6 observe-fade">
            Ready to Begin?
          </h2>
          <p className="text-[#0a0a0a]/80 mb-8 max-w-2xl mx-auto observe-fade fade-in-delay-1">
            Take the Soul Audit to discover your pathway, or dive straight into Wake Up Zine's 35 devotionals.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center observe-fade fade-in-delay-2">
            <Link
              href="/soul-audit"
              className="px-8 py-4 bg-[#0a0a0a] text-[#f7f3ed] font-semibold rounded-lg hover:bg-[#1a1a1a] transition"
            >
              Take the Soul Audit
            </Link>
            <Link
              href="/zine"
              className="px-8 py-4 border-2 border-[#0a0a0a] text-[#0a0a0a] font-semibold rounded-lg hover:bg-[#0a0a0a] hover:text-[#f7f3ed] transition"
            >
              Explore Wake Up Zine
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-gray-800 py-16 bg-[#0a0a0a]">
        <div className="max-w-7xl mx-auto px-6 md:px-12 lg:px-20">
          <div className="text-center">
            <p className="text-sm text-gray-500 mb-4">
              VENERATE THE MIRACLE. DISMANTLE THE HAVEL.
            </p>
            <p className="text-sm text-gray-600">
              © 2026 EUONGELION · A wokeGod project
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
