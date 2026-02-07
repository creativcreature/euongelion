'use client'

import { useEffect, useState, useRef, use } from 'react'
import { useRouter } from 'next/navigation'
import Navigation from '@/components/Navigation'
import ScrollProgress from '@/components/ScrollProgress'
import { useProgress, useReadingTime } from '@/hooks/useProgress'
import type { Devotional, Panel } from '@/types'

export default function DevotionalPage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = use(params)
  const [devotional, setDevotional] = useState<Devotional | null>(null)
  const [loading, setLoading] = useState(true)
  const router = useRouter()
  const panelRefs = useRef<(HTMLDivElement | null)[]>([])

  const { isRead, markComplete } = useProgress()
  const timeSpent = useReadingTime()
  const [isCompleted, setIsCompleted] = useState(false)

  useEffect(() => {
    setIsCompleted(isRead(slug))
  }, [slug, isRead])

  useEffect(() => {
    async function loadDevotional() {
      try {
        const response = await fetch(`/devotionals/${slug}.json`)
        if (!response.ok) throw new Error('Devotional not found')
        const data = await response.json()
        setDevotional(data)
      } catch {
        setDevotional(null)
      } finally {
        setLoading(false)
      }
    }

    loadDevotional()
  }, [slug])

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('gentle-rise')
          }
        })
      },
      { threshold: 0.15 },
    )

    panelRefs.current.forEach((ref) => {
      if (ref) observer.observe(ref)
    })

    return () => observer.disconnect()
  }, [devotional])

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-page">
        <div
          className="vw-body text-muted"
          style={{
            animation: 'fadeIn 2s ease-in-out infinite alternate',
          }}
        >
          Loading...
        </div>
      </div>
    )
  }

  if (!devotional) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-page">
        <div className="text-center">
          <h1 className="text-display vw-heading-lg mb-8">Not Found</h1>
          <button
            onClick={() => router.push('/wake-up')}
            className="bg-[var(--color-fg)] px-10 py-5 text-label vw-small text-[var(--color-bg)] transition-all duration-300 hover:bg-gold hover:text-tehom"
          >
            Return to Wake Up
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-page">
      <ScrollProgress />
      <Navigation />

      {/* Hero Section */}
      <header className="mx-auto max-w-7xl px-6 py-20 md:px-[60px] md:py-32 lg:px-20">
        <div className="grid gap-8 md:grid-cols-12 md:gap-16">
          <div className="md:col-span-10 md:col-start-2">
            <h1 className="observe-fade text-display vw-heading-lg mb-8 md:mb-12">
              {devotional.title}
            </h1>

            {devotional.framework && (
              <p className="observe-fade text-label vw-small mb-6 text-gold fade-in-delay-1">
                {devotional.framework}
              </p>
            )}

            <p className="observe-fade text-serif-italic vw-body-lg mb-8 text-secondary fade-in-delay-2">
              {devotional.teaser}
            </p>

            <div className="observe-fade flex flex-col gap-6 fade-in-delay-3 md:flex-row md:items-center md:gap-8">
              <div className="vw-small flex items-center gap-8 text-muted">
                <span>{devotional.totalWords} words</span>
                <span>&middot;</span>
                <span>{devotional.scriptureReference}</span>
                {isCompleted && (
                  <>
                    <span>&middot;</span>
                    <span
                      className="flex items-center gap-1"
                      style={{ color: 'var(--color-success)' }}
                    >
                      <svg
                        className="h-4 w-4"
                        fill="currentColor"
                        viewBox="0 0 20 20"
                      >
                        <path
                          fillRule="evenodd"
                          d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                          clipRule="evenodd"
                        />
                      </svg>
                      Completed
                    </span>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Devotional Panels */}
      <main
        id="main-content"
        className="mx-auto max-w-7xl px-6 pb-32 md:px-[60px] md:pb-48 lg:px-20"
      >
        <div className="grid gap-8 md:grid-cols-12 md:gap-16">
          <div className="md:col-span-10 md:col-start-2">
            {devotional.panels.slice(1).map((panel, index) => (
              <div
                key={panel.number}
                ref={(el) => {
                  panelRefs.current[index] = el
                }}
                className="observe-fade mb-24 md:mb-40"
              >
                <PanelComponent panel={panel} />
              </div>
            ))}
          </div>
        </div>
      </main>

      {/* Mark as Complete */}
      {!isCompleted && (
        <div className="mx-auto max-w-7xl px-6 pb-16 md:px-[60px] md:pb-24 lg:px-20">
          <div className="grid gap-8 md:grid-cols-12 md:gap-16">
            <div className="text-center md:col-span-8 md:col-start-3">
              <div
                className="pt-12 md:pt-16"
                style={{ borderTop: '1px solid var(--color-border)' }}
              >
                <p className="text-serif-italic vw-body-lg mb-8 text-secondary">
                  Finished reading? Mark this devotional as complete to track
                  your progress.
                </p>
                <button
                  onClick={() => {
                    markComplete(slug, timeSpent)
                    setIsCompleted(true)
                  }}
                  className="inline-flex items-center gap-2 bg-[var(--color-fg)] px-12 py-5 text-label vw-small text-[var(--color-bg)] transition-all duration-300 hover:bg-gold hover:text-tehom"
                >
                  <svg
                    className="h-5 w-5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                  Mark as Complete
                </button>
                <p className="vw-small mt-4 text-muted">
                  {Math.floor(timeSpent / 60) > 0
                    ? `${Math.floor(timeSpent / 60)} min `
                    : ''}
                  {timeSpent % 60}s reading time
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Footer */}
      <footer
        className="mb-24 py-12 md:mb-32 md:py-16"
        style={{ borderTop: '1px solid var(--color-border)' }}
      >
        <div className="mx-auto max-w-7xl px-6 md:px-[60px] lg:px-20">
          <div className="grid gap-8 md:grid-cols-12">
            <div className="md:col-span-6">
              <button
                onClick={() => router.back()}
                className="text-label vw-small text-muted transition-colors duration-300 hover:text-[var(--color-text-primary)]"
              >
                &larr; Back
              </button>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}

function PanelComponent({ panel }: { panel: Panel }) {
  const isPrayer = panel.type === 'prayer'
  const hasImage = panel.type === 'text-with-image'

  return (
    <div className="grid gap-8 md:grid-cols-12 md:gap-16">
      {/* Panel Number & Heading */}
      <div className="md:col-span-2">
        <div className="sticky top-8">
          <span className="vw-small mb-4 block font-sans text-muted">
            {String(panel.number).padStart(2, '0')}
          </span>
          {panel.heading && (
            <h2 className="text-label vw-small text-gold">{panel.heading}</h2>
          )}
        </div>
      </div>

      {/* Panel Content */}
      <div
        className={hasImage ? 'md:col-span-6' : 'md:col-span-8'}
        style={{ maxWidth: '680px' }}
      >
        <div className={`${isPrayer ? 'text-serif-italic' : ''} vw-body`}>
          {panel.content.split('\n\n').map((paragraph, i) => {
            const isScripture =
              paragraph.trim().startsWith('\u201c') &&
              paragraph.trim().endsWith('\u201d')
            const hasVerseRef =
              /\d+:\d+/.test(paragraph) && paragraph.trim().length < 100

            return (
              <p
                key={i}
                className={`mb-6 ${isPrayer ? 'text-serif-italic' : ''} ${
                  isScripture || hasVerseRef ? 'scripture-block' : ''
                }`}
                style={{
                  whiteSpace: 'pre-line',
                  lineHeight: isScripture || hasVerseRef ? '1.75' : '1.7',
                  fontSize:
                    isScripture || hasVerseRef
                      ? 'clamp(1.0625rem, 1.2vw, 1.25rem)'
                      : undefined,
                  maxWidth: '680px',
                }}
              >
                {paragraph.split('**').map((part, j) =>
                  j % 2 === 1 ? (
                    <strong key={j} style={{ fontWeight: 600 }}>
                      {part}
                    </strong>
                  ) : (
                    part
                  ),
                )}
              </p>
            )
          })}
        </div>
      </div>

      {/* Illustration */}
      {hasImage && panel.illustration && (
        <div className="md:col-span-4">
          <div
            className="flex aspect-square items-center justify-center bg-surface-raised"
            style={{ minHeight: '300px' }}
          >
            <div className="p-8 text-center">
              <p className="vw-small italic text-muted">
                {panel.illustration.description}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
