'use client'

import { useEffect, useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import Navigation from '@/components/Navigation'
import ScrollProgress from '@/components/ScrollProgress'
import { useProgress, useReadingTime } from '@/hooks/useProgress'
import ModuleRenderer from '@/components/ModuleRenderer'
import { startSeries } from '@/lib/progress'
import { getDevotionalImage } from '@/data/devotional-images'
import type { Devotional, Panel, Module } from '@/types'

function getSeriesSlugFromDevotional(slug: string): string | null {
  const match = slug.match(/^(.+)-day-\d+$/)
  if (!match) return null
  return match[1] === 'identity-crisis' ? 'identity' : match[1]
}

export default function DevotionalPageClient({ slug }: { slug: string }) {
  const [devotional, setDevotional] = useState<Devotional | null>(null)
  const [loading, setLoading] = useState(true)
  const router = useRouter()
  const moduleRefs = useRef<(HTMLDivElement | null)[]>([])

  const { isRead, markComplete } = useProgress()
  const timeSpent = useReadingTime()
  const [isCompleted, setIsCompleted] = useState(false)

  const seriesSlug = getSeriesSlugFromDevotional(slug)
  const devotionalImage = getDevotionalImage(slug)

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

        if (seriesSlug) {
          startSeries(seriesSlug)
        }
      } catch {
        setDevotional(null)
      } finally {
        setLoading(false)
      }
    }

    loadDevotional()
  }, [slug, seriesSlug])

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('gentle-rise')
          }
        })
      },
      { threshold: 0.1 },
    )

    moduleRefs.current.forEach((ref) => {
      if (ref) observer.observe(ref)
    })

    return () => observer.disconnect()
  }, [devotional])

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-page">
        <p className="text-serif-italic vw-body text-muted">Loading...</p>
      </div>
    )
  }

  if (!devotional) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-page">
        <div className="text-center">
          <h1 className="text-display vw-heading-lg mb-8">Not Found</h1>
          <button
            onClick={() => router.push('/series')}
            className="text-label vw-small text-gold transition-colors hover:text-[var(--color-text-primary)]"
          >
            Browse All Series &rarr;
          </button>
        </div>
      </div>
    )
  }

  const modules = (devotional as Devotional & { modules?: Module[] }).modules
  const panels = devotional.panels

  return (
    <div className="min-h-screen bg-page">
      <ScrollProgress />
      <Navigation />

      {/* Hero — full-bleed image or clean typography */}
      {devotionalImage ? (
        <div className="relative flex min-h-[50vh] items-end overflow-hidden md:min-h-[60vh]">
          <Image
            src={devotionalImage}
            alt=""
            fill
            className="object-cover"
            sizes="100vw"
            priority
          />
          <div
            className="absolute inset-0"
            style={{
              background:
                'linear-gradient(180deg, transparent 20%, rgba(26, 22, 18, 0.85) 100%)',
            }}
          />
          <div className="relative w-full px-6 pb-16 pt-32 md:px-16 md:pb-20 lg:px-24">
            <div style={{ maxWidth: '900px' }}>
              {devotional.scriptureReference && (
                <p className="text-label vw-small mb-4 text-gold">
                  {devotional.scriptureReference}
                </p>
              )}
              <h1 className="text-display vw-heading-lg mb-6 text-scroll">
                {devotional.title}
              </h1>
              {devotional.teaser && (
                <p
                  className="text-serif-italic vw-body-lg text-scroll"
                  style={{ opacity: 0.8, maxWidth: '640px' }}
                >
                  {devotional.teaser}
                </p>
              )}
            </div>
          </div>
        </div>
      ) : (
        <header className="px-6 pb-16 pt-32 md:px-16 md:pb-24 md:pt-40 lg:px-24">
          <div style={{ maxWidth: '900px' }}>
            {devotional.scriptureReference && (
              <p className="text-label vw-small mb-6 text-gold">
                {devotional.scriptureReference}
              </p>
            )}
            <h1 className="text-display vw-heading-xl mb-8">
              {devotional.title}
            </h1>
            {devotional.teaser && (
              <p
                className="text-serif-italic vw-body-lg text-secondary"
                style={{ maxWidth: '640px' }}
              >
                {devotional.teaser}
              </p>
            )}
          </div>
        </header>
      )}

      {/* Content — continuous scroll */}
      <main
        id="main-content"
        className="px-6 pb-32 pt-16 md:px-16 md:pb-48 md:pt-24 lg:px-24"
      >
        <div className="reading-flow">
          {modules
            ? modules.map((mod, index) => (
                <div
                  key={index}
                  ref={(el) => {
                    moduleRefs.current[index] = el
                  }}
                  className="observe-fade"
                >
                  <ModuleRenderer module={mod} />
                </div>
              ))
            : panels?.slice(1).map((panel, index) => (
                <div
                  key={panel.number}
                  ref={(el) => {
                    moduleRefs.current[index] = el
                  }}
                  className="observe-fade mb-20 md:mb-28"
                >
                  <PanelComponent panel={panel} />
                </div>
              ))}
        </div>
      </main>

      {/* Mark as Complete */}
      {!isCompleted && (
        <div
          className="px-6 pb-16 md:px-16 md:pb-24 lg:px-24"
          style={{ maxWidth: '900px' }}
        >
          <div
            className="pt-12"
            style={{ borderTop: '1px solid var(--color-border)' }}
          >
            <p className="text-serif-italic vw-body mb-8 text-secondary">
              Finished reading?
            </p>
            <button
              onClick={() => {
                markComplete(slug, timeSpent)
                setIsCompleted(true)
              }}
              className="text-label vw-small text-gold transition-colors hover:text-[var(--color-text-primary)]"
            >
              Mark as Complete &rarr;
            </button>
          </div>
        </div>
      )}

      {/* Footer */}
      <footer className="px-6 pb-24 pt-12 md:px-16 md:pb-32 lg:px-24">
        <button
          onClick={() => router.back()}
          className="text-label vw-small text-muted transition-colors duration-300 hover:text-[var(--color-text-primary)]"
        >
          &larr; Back
        </button>
      </footer>
    </div>
  )
}

function PanelComponent({ panel }: { panel: Panel }) {
  const isPrayer = panel.type === 'prayer'
  const hasImage = panel.type === 'text-with-image'
  const [imageError, setImageError] = useState(false)

  return (
    <div style={{ maxWidth: '900px' }}>
      {panel.heading && (
        <p className="text-label vw-small mb-6 text-gold">{panel.heading}</p>
      )}

      <div className={isPrayer ? 'module-accent' : ''}>
        <div className={`${isPrayer ? 'text-serif-italic' : ''} vw-body`}>
          {panel.content.split('\n\n').map((paragraph, i) => {
            const isScripture =
              paragraph.trim().startsWith('\u201c') &&
              paragraph.trim().endsWith('\u201d')

            return (
              <p
                key={i}
                className={`mb-6 leading-relaxed ${
                  isScripture ? 'scripture-block' : 'text-secondary'
                }`}
                style={{ whiteSpace: 'pre-line', maxWidth: '680px' }}
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

      {hasImage && panel.illustration && !imageError && (
        <div className="mt-8" style={{ maxWidth: '500px' }}>
          <div className="relative aspect-square overflow-hidden">
            <Image
              src={`/devotionals/${panel.illustration.file}`}
              alt={panel.illustration.description}
              fill
              className="object-cover"
              sizes="(max-width: 768px) 100vw, 500px"
              onError={() => setImageError(true)}
            />
          </div>
        </div>
      )}
    </div>
  )
}
