'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Navigation from '@/components/Navigation';

interface DevotionalPanel {
  number: number;
  type: string;
  heading?: string;
  content: string;
  image?: string;
  illustration?: {
    description: string;
    file: string;
  };
  wordCount?: number;
}

interface Devotional {
  day: number;
  title: string;
  teaser: string;
  framework?: string;
  panels: DevotionalPanel[];
  totalWords: number;
  jesusIntroduced?: number;
  scriptureReference: string;
  chiastic_position?: string;
}

export default function DevotionalPage({ params }: { params: { slug: string } }) {
  const [devotional, setDevotional] = useState<Devotional | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentPanel, setCurrentPanel] = useState(0);
  const router = useRouter();
  const panelRefs = useRef<(HTMLDivElement | null)[]>([]);

  useEffect(() => {
    async function loadDevotional() {
      try {
        const response = await fetch(`/devotionals/${params.slug}.json`);
        if (!response.ok) throw new Error('Devotional not found');
        const data = await response.json();
        setDevotional(data);
      } catch (error) {
        console.error('Error loading devotional:', error);
      } finally {
        setLoading(false);
      }
    }

    loadDevotional();
  }, [params.slug]);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('fade-in');
          }
        });
      },
      { threshold: 0.15 }
    );

    panelRefs.current.forEach((ref) => {
      if (ref) observer.observe(ref);
    });

    return () => observer.disconnect();
  }, [devotional]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#FAF9F6' }}>
        <div className="vw-body text-gray-400">Loading...</div>
      </div>
    );
  }

  if (!devotional) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#FAF9F6' }}>
        <div className="text-center">
          <h1 className="text-display vw-heading-lg mb-8">Not Found</h1>
          <button
            onClick={() => router.push('/')}
            className="bg-black px-10 py-5 text-label vw-small hover:bg-gray-800 transition-all duration-300"
            style={{ color: '#FAF9F6' }}
          >
            Return Home
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#FAF9F6' }}>
      <Navigation />

      {/* Hero Section */}
      <header className="max-w-7xl mx-auto px-6 md:px-12 lg:px-20 py-20 md:py-32">
        <div className="grid md:grid-cols-12 gap-8 md:gap-16">
          <div className="md:col-span-10 md:col-start-2">
            <h1 className="text-display vw-heading-lg mb-8 md:mb-12 observe-fade">
              {devotional.title}
            </h1>

            {devotional.framework && (
              <p className="text-label vw-small mb-6 observe-fade fade-in-delay-1" style={{ color: '#B8860B' }}>
                {devotional.framework}
              </p>
            )}

            <p className="text-serif-italic vw-body-lg mb-8 observe-fade fade-in-delay-2">
              {devotional.teaser}
            </p>

            <div className="flex items-center gap-8 vw-small text-gray-400 observe-fade fade-in-delay-3">
              <span>{devotional.totalWords} words</span>
              <span>•</span>
              <span>{devotional.scriptureReference}</span>
            </div>
          </div>
        </div>
      </header>

      {/* Devotional Panels */}
      <main className="max-w-7xl mx-auto px-6 md:px-12 lg:px-20 pb-32 md:pb-48">
        {devotional.panels.slice(1).map((panel, index) => (
          <div
            key={panel.number}
            ref={(el) => {
              panelRefs.current[index] = el;
            }}
            className="mb-24 md:mb-40 observe-fade"
          >
            <PanelComponent panel={panel} index={index} />
          </div>
        ))}
      </main>

      {/* Footer Navigation */}
      <footer className="border-t border-gray-200 py-12 md:py-16">
        <div className="max-w-7xl mx-auto px-6 md:px-12 lg:px-20">
          <div className="grid md:grid-cols-12 gap-8">
            <div className="md:col-span-6">
              <button
                onClick={() => router.push('/')}
                className="text-label vw-small text-gray-400 hover:text-black transition-colors duration-300"
              >
                ← Back to All Devotionals
              </button>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}

function PanelComponent({ panel, index }: { panel: DevotionalPanel; index: number }) {
  const isPrayer = panel.type === 'prayer';
  const hasImage = panel.type === 'text-with-image';

  return (
    <div className="grid md:grid-cols-12 gap-8 md:gap-16">
      {/* Panel Number & Heading */}
      <div className="md:col-span-2">
        <div className="sticky top-8">
          <span className="text-gray-400 vw-small font-sans block mb-4">
            {String(panel.number).padStart(2, '0')}
          </span>
          {panel.heading && (
            <h2 className="text-label vw-small" style={{ color: '#B8860B' }}>
              {panel.heading}
            </h2>
          )}
        </div>
      </div>

      {/* Panel Content */}
      <div className={`md:col-span-${hasImage ? '6' : '8'}`}>
        <div className={`${isPrayer ? 'text-serif-italic' : ''} vw-body prose-lg`}>
          {panel.content.split('\n\n').map((paragraph, i) => (
            <p
              key={i}
              className={`mb-6 ${isPrayer ? 'text-serif-italic' : ''}`}
              style={{
                whiteSpace: 'pre-line',
                lineHeight: '1.7'
              }}
            >
              {paragraph.split('**').map((part, j) =>
                j % 2 === 1 ? (
                  <strong key={j} style={{ fontWeight: 600 }}>
                    {part}
                  </strong>
                ) : (
                  part
                )
              )}
            </p>
          ))}
        </div>
      </div>

      {/* Illustration Space */}
      {hasImage && panel.illustration && (
        <div className="md:col-span-4">
          <div
            className="bg-gray-100 aspect-square flex items-center justify-center"
            style={{ minHeight: '300px' }}
          >
            <div className="text-center p-8">
              <p className="vw-small text-gray-400 italic">
                {panel.illustration.description}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
