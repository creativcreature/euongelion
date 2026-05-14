'use client'

import {
  Children,
  cloneElement,
  isValidElement,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactElement,
  type ReactNode,
} from 'react'
import Image from 'next/image'

/**
 * NYT-Magazine-style sticky-image reading rhythm (audit batch 2026-05-13).
 *
 * Pattern (stripped down from the NYT reference):
 * - Desktop: a sticky image rail occupies the left column; the
 *   module flow occupies the right column. As the reader scrolls
 *   past modules, an IntersectionObserver advances the active image
 *   on the rail (480ms crossfade). The "format shifts" the founder
 *   asked about happen at the image-swap boundaries.
 * - Mobile (≤900px): the rail collapses and the module flow renders
 *   single-column. Inline artwork in the stream (existing
 *   DevotionalArtwork breaks) takes over the visual rhythm there.
 *
 * Module → image mapping:
 *   Modules are bucketed evenly across the supplied images. With M
 *   modules and N images, module index i lands in bucket
 *   `Math.min(Math.floor(i * N / M), N - 1)`. So 6 modules + 3
 *   images → modules 0,1 → image 0 · modules 2,3 → image 1 · etc.
 *
 * Scale-back paths (in order of severity):
 *   1. Pass `enabled={false}` to render children as a plain flow with
 *      no rail and no observer.
 *   2. Remove the body-level `.rhythm-enabled` class — CSS no-ops.
 *   3. Force `grid-template-columns: 1fr` on .devotional-rhythm.
 *   4. Delete this wrapper from DevotionalPageClient JSX.
 */

export interface RhythmImage {
  src: string
  alt: string
  /** Optional caption shown over the sticky image bottom-edge */
  caption?: string
}

interface DevotionalRhythmProps {
  images: RhythmImage[]
  children: ReactNode
  /** Feature flag — when false, renders children only (no rail). */
  enabled?: boolean
}

export default function DevotionalRhythm({
  images,
  children,
  enabled = true,
}: DevotionalRhythmProps) {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const [activeIdx, setActiveIdx] = useState(0)

  // Bucket each child element into one image. `Children.toArray`
  // gives us a stable, indexed list we can tag with data-rhythm-index.
  const moduleList = useMemo(() => Children.toArray(children), [children])

  const imageCount = useMemo(() => images.length, [images])
  const moduleCount = useMemo(() => moduleList.length, [moduleList])

  // Bucket module index → image index. Even, monotonic distribution.
  function bucketFor(i: number, imgs: number, mods: number): number {
    if (imgs <= 1 || mods === 0) return 0
    return Math.min(imgs - 1, Math.floor((i * imgs) / mods))
  }

  useEffect(() => {
    if (!enabled || imageCount <= 1) return
    const root = containerRef.current
    if (!root) return
    const sections = Array.from(
      root.querySelectorAll<HTMLElement>('[data-rhythm-index]'),
    )
    if (sections.length === 0) return

    // Track visibility per section; on update, pick the section
    // closest to the top of the viewport (highest intersection ratio
    // *and* topmost is a useful tiebreaker for long modules).
    const ratios = new Map<HTMLElement, number>()

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          ratios.set(entry.target as HTMLElement, entry.intersectionRatio)
        }
        let bestEl: HTMLElement | null = null
        let bestRatio = 0
        ratios.forEach((r, el) => {
          if (r > bestRatio) {
            bestRatio = r
            bestEl = el
          }
        })
        if (bestEl) {
          const idx = parseInt(
            (bestEl as HTMLElement).dataset.rhythmIndex ?? '0',
            10,
          )
          if (!Number.isNaN(idx)) setActiveIdx(idx)
        }
      },
      {
        rootMargin: '-30% 0px -50% 0px',
        threshold: [0.15, 0.35, 0.55, 0.75, 0.95],
      },
    )

    sections.forEach((s) => observer.observe(s))
    return () => observer.disconnect()
  }, [enabled, imageCount, moduleCount])

  if (!enabled || images.length === 0) {
    return <>{children}</>
  }

  return (
    <div
      className="devotional-rhythm"
      ref={containerRef}
      data-rhythm-enabled="true"
    >
      <aside className="devotional-rhythm-rail" aria-hidden="true">
        <div className="devotional-rhythm-sticky">
          {images.map((img, i) => (
            <div
              key={`${img.src}-${i}`}
              className={`devotional-rhythm-img-wrap${
                i === activeIdx ? ' is-active' : ''
              }`}
            >
              <Image
                src={img.src}
                alt={img.alt}
                fill
                sizes="(max-width: 900px) 100vw, 50vw"
                loading={i === 0 ? 'eager' : 'lazy'}
              />
              {img.caption && (
                <p className="devotional-rhythm-caption">{img.caption}</p>
              )}
            </div>
          ))}
        </div>
      </aside>

      <div className="devotional-rhythm-text">
        {moduleList.map((child, i) => {
          if (!isValidElement(child)) {
            return (
              <div
                key={i}
                data-rhythm-index={bucketFor(i, imageCount, moduleCount)}
              >
                {child}
              </div>
            )
          }
          const el = child as ReactElement<{
            'data-rhythm-index'?: number
          }>
          // Wrap rather than clone so we don't fight whatever the
          // existing module element already has on it.
          return (
            <div
              key={i}
              data-rhythm-index={bucketFor(i, imageCount, moduleCount)}
            >
              {cloneElement(el)}
            </div>
          )
        })}
      </div>
    </div>
  )
}
