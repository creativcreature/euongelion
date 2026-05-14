import Image from 'next/image'
import { typographer } from '@/lib/typographer'

/**
 * Devotional headline hero (audit batch 2026-05-13).
 *
 * Mirrors the homepage featured-devotional layout (2fr image + 1fr
 * text) at the top of every devotional page. Founder direction:
 * "headline images on the devotional pages that feel similar to the
 * homepage's use."
 *
 * Image source preference order:
 *   1. Explicit `imageSrc` prop (e.g. headlineArt from JSON if shipped)
 *   2. Series hero image (already wired via getSeriesHero)
 *
 * Scale-back path: remove the <DevotionalHeadline/> element from
 * DevotionalPageClient. Self-contained component.
 */

interface DevotionalHeadlineProps {
  imageSrc: string
  imageAlt?: string
  /** SERIES eyebrow, e.g. "Too Busy for God · 5 Days" */
  eyebrow?: string
  /** Anchor scripture for the devotional day, e.g. "Ecclesiastes 1:2" */
  scripture?: string
  /** Day-level title — the headline */
  title: string
}

export default function DevotionalHeadline({
  imageSrc,
  imageAlt,
  eyebrow,
  scripture,
  title,
}: DevotionalHeadlineProps) {
  return (
    <section
      className="devotional-headline"
      aria-label={`Headline for ${title}`}
    >
      <div className="devotional-headline-art">
        <Image
          src={imageSrc}
          alt={imageAlt ?? `Illustration accompanying ${title}`}
          fill
          sizes="(max-width: 900px) 100vw, 66vw"
          priority
        />
      </div>
      <div className="devotional-headline-main">
        {eyebrow && <p className="devotional-headline-eyebrow">{eyebrow}</p>}
        {scripture && (
          <p className="devotional-headline-scripture">{scripture}</p>
        )}
        <h1 className="devotional-headline-title">{typographer(title)}</h1>
      </div>
    </section>
  )
}
