'use client'

import { Children, useMemo, type ReactNode } from 'react'
import Image from 'next/image'

/**
 * NYT-Magazine-style reading rhythm — alternating column blocks.
 *
 * Founder direction 2026-05-14 (revised): match the Diane-Keaton
 * NYT Magazine pattern exactly. Images appear on EITHER side; the
 * page reads as a sequence of two-column blocks where the image
 * slot flips left ↔ right per block. Each block has its own image,
 * sticky within the block while the block's text scrolls past.
 *
 * Layout:
 *   Block 1: [Image left]  [Text right]
 *   Block 2: [Text left]   [Image right]
 *   Block 3: [Image left]  [Text right]
 *   ...
 *
 * No IntersectionObserver. No global rail. Each block is fully
 * static — much simpler than the original implementation, and the
 * image-position alternation is the "format shifts" the founder
 * asked for.
 *
 * Module → block mapping:
 *   Children are chunked into N blocks where N = images.length.
 *   Modules are distributed evenly (with any remainder added to the
 *   last block).
 *
 * Mobile (≤1023px):
 *   Each block collapses to a single column. Image stacks above its
 *   text. The alternating layout is desktop-only — on mobile the
 *   reading order is image-then-text regardless of side.
 *
 * Scale-back paths:
 *   1. Pass enabled={false} → children render as a flat flow with
 *      no blocks and no images on the side.
 *   2. Drop body.rhythm-enabled class → CSS no-op.
 *   3. Delete this wrapper from DevotionalPageClient JSX.
 */

export interface RhythmImage {
  src: string
  alt: string
  /** Optional caption shown under the image */
  caption?: string
}

interface DevotionalRhythmProps {
  images: RhythmImage[]
  children: ReactNode
  enabled?: boolean
}

function chunkInto<T>(arr: T[], n: number): T[][] {
  if (n <= 0) return [arr]
  const out: T[][] = Array.from({ length: n }, () => [])
  const base = Math.floor(arr.length / n)
  const remainder = arr.length % n
  let i = 0
  for (let b = 0; b < n; b++) {
    const size = base + (b === n - 1 ? remainder : 0)
    for (let s = 0; s < size && i < arr.length; s++) {
      out[b].push(arr[i++])
    }
  }
  return out
}

export default function DevotionalRhythm({
  images,
  children,
  enabled = true,
}: DevotionalRhythmProps) {
  const moduleList = useMemo(() => Children.toArray(children), [children])

  const blocks = useMemo(() => {
    if (!enabled || images.length === 0 || moduleList.length === 0) return null
    return chunkInto(moduleList, images.length).map((chunk, i) => ({
      image: images[i] ?? images[images.length - 1],
      modules: chunk,
      // Founder direction 2026-05-14: text-left / image-right on
      // every block (no alternation). The reading column stays in
      // a consistent position so the eye doesn't reset between
      // chapters.
      side: 'right' as 'left' | 'right',
    }))
  }, [enabled, images, moduleList])

  if (!enabled || !blocks || blocks.length === 0) {
    return <>{children}</>
  }

  return (
    <div className="devotional-rhythm" data-rhythm-enabled="true">
      {blocks.map((block, i) => (
        <section
          key={`block-${i}`}
          className="rhythm-block"
          data-image-side={block.side}
          aria-label={`Reading block ${i + 1} of ${blocks.length}`}
        >
          <figure className="rhythm-block-image">
            <div className="rhythm-block-image-frame">
              <Image
                src={block.image.src}
                alt={block.image.alt}
                fill
                sizes="(max-width: 1023px) 100vw, 45vw"
                loading={i === 0 ? 'eager' : 'lazy'}
              />
            </div>
            {block.image.caption && (
              <figcaption className="rhythm-block-caption">
                {block.image.caption}
              </figcaption>
            )}
          </figure>
          <div className="rhythm-block-text">{block.modules}</div>
        </section>
      ))}
    </div>
  )
}
