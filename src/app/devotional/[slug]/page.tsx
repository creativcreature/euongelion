'use client';

import { useEffect, useState, useRef, use } from 'react';

// Required for static export
export function generateStaticParams() {
  return [
    { slug: 'community-day-1' }, { slug: 'community-day-2' }, { slug: 'community-day-3' }, { slug: 'community-day-4' }, { slug: 'community-day-5' },
    { slug: 'day-1' }, { slug: 'day-2' }, { slug: 'day-3' }, { slug: 'day-4' }, { slug: 'day-5' }, { slug: 'day-6' }, { slug: 'day-7' },
    { slug: 'hope-day-1' }, { slug: 'hope-day-2' }, { slug: 'hope-day-3' }, { slug: 'hope-day-4' }, { slug: 'hope-day-5' },
    { slug: 'identity-crisis-day-1' }, { slug: 'identity-crisis-day-2' }, { slug: 'identity-crisis-day-3' }, { slug: 'identity-crisis-day-4' }, { slug: 'identity-crisis-day-5' },
    { slug: 'kingdom-day-1' }, { slug: 'kingdom-day-2' }, { slug: 'kingdom-day-3' }, { slug: 'kingdom-day-4' }, { slug: 'kingdom-day-5' },
    { slug: 'peace-day-1' }, { slug: 'peace-day-2' }, { slug: 'peace-day-3' }, { slug: 'peace-day-4' }, { slug: 'peace-day-5' },
    { slug: 'provision-day-1' }, { slug: 'provision-day-2' }, { slug: 'provision-day-3' }, { slug: 'provision-day-4' }, { slug: 'provision-day-5' },
    { slug: 'truth-day-1' }, { slug: 'truth-day-2' }, { slug: 'truth-day-3' }, { slug: 'truth-day-4' }, { slug: 'truth-day-5' },
  ];
}
import { useRouter } from 'next/navigation';
import Navigation from '@/components/Navigation';
import SeriesNavigation from '@/components/SeriesNavigation';
import HighlightToolbar from '@/components/HighlightToolbar';
import ReflectionPrompt from '@/components/ReflectionPrompt';
import DevotionalActions from '@/components/DevotionalActions';
import ScrollProgress from '@/components/ScrollProgress';
import { useProgress, useReadingTime } from '@/hooks/useProgress';
import { useHighlights } from '@/hooks/useHighlights';
import { addHighlight as saveHighlight } from '@/lib/highlights';

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

export default function DevotionalPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = use(params);
  const [devotional, setDevotional] = useState<Devotional | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentPanel, setCurrentPanel] = useState(0);
  const router = useRouter();
  const panelRefs = useRef<(HTMLDivElement | null)[]>([]);

  // Progress tracking
  const { isRead, markComplete, canRead } = useProgress();
  const timeSpent = useReadingTime();
  const [showCompleteButton, setShowCompleteButton] = useState(false);
  const [isCompleted, setIsCompleted] = useState(false);
  const readingCheck = canRead(slug);

  // Highlighting
  const { highlights } = useHighlights(slug);
  const handleHighlight = (text: string, color: string) => {
    saveHighlight(slug, text, color);
  };

  useEffect(() => {
    setIsCompleted(isRead(slug));
  }, [slug, isRead]);

  useEffect(() => {
    async function loadDevotional() {
      try {
        const response = await fetch(`/devotionals/${slug}.json`);
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
  }, [slug]);

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
      <div className="min-h-screen flex items-center justify-center bg-cream dark:bg-[#1a1a1a]">
        <div className="vw-body text-gray-400">Loading...</div>
      </div>
    );
  }

  if (!devotional) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-cream dark:bg-[#1a1a1a]">
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
    <div className="min-h-screen bg-cream dark:bg-[#1a1a1a] text-black dark:text-cream">
      <ScrollProgress />
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

            <div className="flex flex-col md:flex-row md:items-center gap-6 md:gap-8 observe-fade fade-in-delay-3">
              <div className="flex items-center gap-8 vw-small text-gray-400">
                <span>{devotional.totalWords} words</span>
                <span>•</span>
                <span>{devotional.scriptureReference}</span>
                {isCompleted && (
                  <>
                    <span>•</span>
                    <span className="text-green-600 flex items-center gap-1">
                      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                      </svg>
                      Completed
                    </span>
                  </>
                )}
              </div>

              {/* Bookmark & Share Actions */}
              <DevotionalActions
                slug={slug}
                title={devotional.title}
                seriesTitle={devotional.framework || 'Wake Up Zine'}
              />
            </div>
          </div>
        </div>
      </header>

      {/* Devotional Panels */}
      <main id="main-content" className="max-w-7xl mx-auto px-6 md:px-12 lg:px-20 pb-32 md:pb-48">
        <div className="grid md:grid-cols-12 gap-8 md:gap-16">
          <div className="md:col-span-10 md:col-start-2">
            {devotional.panels.slice(1).map((panel, index) => (
              <div key={panel.number}>
                <div
                  ref={(el) => {
                    panelRefs.current[index] = el;
                  }}
                  className="mb-24 md:mb-40 observe-fade"
                >
                  <PanelComponent panel={panel} index={index} />
                </div>

                {/* Add reflection prompts after key panels */}
                {index === 1 && (
                  <ReflectionPrompt
                    question="What resonates with you most so far? Where do you see yourself in this narrative?"
                    index={1}
                    devotionalSlug={slug}
                  />
                )}
                {index === devotional.panels.length - 3 && (
                  <ReflectionPrompt
                    question="How is God inviting you to respond? What might faithful obedience look like today?"
                    index={2}
                    devotionalSlug={slug}
                  />
                )}
              </div>
            ))}
          </div>
        </div>
      </main>

      {/* Text Highlighting Toolbar */}
      <HighlightToolbar devotionalSlug={slug} onHighlight={handleHighlight} />

      {/* Mark as Complete Section */}
      {!isCompleted && (
        <div className="max-w-7xl mx-auto px-6 md:px-12 lg:px-20 pb-16 md:pb-24">
          <div className="grid md:grid-cols-12 gap-8 md:gap-16">
            <div className="md:col-span-8 md:col-start-3 text-center">
              <div className="border-t border-gray-200 pt-12 md:pt-16">
                <p className="text-serif-italic vw-body-lg mb-8 text-gray-700">
                  Finished reading? Mark this devotional as complete to track your progress.
                </p>
                <button
                  onClick={() => {
                    markComplete(slug, timeSpent);
                    setIsCompleted(true);
                  }}
                  className="bg-black px-12 py-5 text-label vw-small hover:bg-gray-800 transition-all duration-300 inline-flex items-center gap-2"
                  style={{ color: '#FAF9F6' }}
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  Mark as Complete
                </button>
                <p className="vw-small text-gray-400 mt-4">
                  {Math.floor(timeSpent / 60) > 0 ? `${Math.floor(timeSpent / 60)} min ` : ''}
                  {timeSpent % 60}s reading time
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Footer Navigation */}
      <footer className="border-t border-gray-200 py-12 md:py-16 mb-24 md:mb-32">
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

      {/* Series Navigation - Sticky Bottom Bar */}
      <SeriesNavigation currentSlug={slug} />
    </div>
  );
}

function PanelComponent({ panel, index }: { panel: DevotionalPanel; index: number }) {
  const isPrayer = panel.type === 'prayer';
  const hasImage = panel.type === 'text-with-image';
  const isScripture = panel.type === 'scripture' || panel.content.includes('"') || /\d+:\d+/.test(panel.content);

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
          {isScripture && (
            <div className="mt-2 flex items-center gap-1" style={{ color: '#B8860B' }}>
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path d="M9 4.804A7.968 7.968 0 005.5 4c-1.255 0-2.443.29-3.5.804v10A7.969 7.969 0 015.5 14c1.669 0 3.218.51 4.5 1.385A7.962 7.962 0 0114.5 14c1.255 0 2.443.29 3.5.804v-10A7.968 7.968 0 0014.5 4c-1.255 0-2.443.29-3.5.804V12a1 1 0 11-2 0V4.804z" />
              </svg>
              <span className="text-label vw-small">Scripture</span>
            </div>
          )}
        </div>
      </div>

      {/* Panel Content */}
      <div className={hasImage ? 'md:col-span-6' : 'md:col-span-8'}>
        <div className={`${isPrayer ? 'text-serif-italic' : ''} vw-body prose-lg`}>
          {panel.content.split('\n\n').map((paragraph, i) => {
            // Only treat as scripture if it's actually a quoted passage (starts with quotes)
            const paragraphIsScripture = paragraph.trim().startsWith('"') && paragraph.trim().endsWith('"');
            const hasVerseReference = /\d+:\d+/.test(paragraph) && paragraph.trim().length < 100;

            return (
              <p
                key={i}
                className={`mb-6 ${isPrayer ? 'text-serif-italic' : ''} ${
                  (paragraphIsScripture || hasVerseReference) ? 'border-l-4 pl-6 py-3 text-serif-italic' : ''
                }`}
                style={{
                  whiteSpace: 'pre-line',
                  lineHeight: (paragraphIsScripture || hasVerseReference) ? '1.75' : '1.7',
                  borderColor: (paragraphIsScripture || hasVerseReference) ? '#B8860B' : 'transparent',
                  fontSize: (paragraphIsScripture || hasVerseReference) ? 'clamp(1.0625rem, 1.2vw, 1.25rem)' : undefined,
                  maxWidth: (paragraphIsScripture || hasVerseReference) ? '65ch' : '75ch',
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
            );
          })}
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
