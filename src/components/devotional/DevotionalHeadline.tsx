import Image from 'next/image'
import { typographer } from '@/lib/typographer'

/**
 * Devotional headline (audit batch 2026-05-13; slimmed 2026-07-27).
 *
 * Founder direction 2026-07-27 ("eliminate redundancy on page"): the
 * headline no longer repeats the series hero image at the top of
 * every day — the day's own inline artwork carries the visual. The
 * image variant remains supported via the optional `imageSrc` for
 * surfaces that still want it.
 *
 * Scale-back path: remove the <DevotionalHeadline/> element from
 * DevotionalPageClient. Self-contained component.
 */

interface DevotionalHeadlineProps {
  imageSrc?: string
  imageAlt?: string
  /** SERIES eyebrow, e.g. "Too Busy for God · 5 Days" */
  eyebrow?: string
  /** Anchor scripture for the devotional day, e.g. "Ecclesiastes 1:2" */
  scripture?: string
  /** Day-level title — the headline */
  title: string
  /**
   * Standfirst under the title — the day's teaser. `.devotional-headline-dek`
   * has been in globals.css since the 2026-05-13 audit but no prop ever fed
   * it; founder direction 2026-08-14 is that the title is followed by a short
   * summary that points at the scripture.
   */
  dek?: string
}

export default function DevotionalHeadline({
  imageSrc,
  imageAlt,
  eyebrow,
  scripture,
  title,
  dek,
}: DevotionalHeadlineProps) {
  return (
    <section
      className={`devotional-headline${imageSrc ? '' : ' devotional-headline--textonly'}`}
      aria-label={`Headline for ${title}`}
    >
      {imageSrc && (
        <div className="devotional-headline-art">
          <Image
            src={imageSrc}
            alt={imageAlt ?? `Illustration accompanying ${title}`}
            fill
            sizes="(max-width: 900px) 100vw, 66vw"
            priority
          />
        </div>
      )}
      {/* Founder direction 2026-08-14: nothing precedes the title. The eyebrow
          and scripture line used to sit above it; both now follow it, so the
          first thing read on the page is the devotional's own name. */}
      <div className="devotional-headline-main">
        <h1 className="devotional-headline-title">{typographer(title)}</h1>
        {dek && <p className="devotional-headline-dek">{typographer(dek)}</p>}
        {scripture && (
          <p className="devotional-headline-scripture">{scripture}</p>
        )}
        {eyebrow && <p className="devotional-headline-eyebrow">{eyebrow}</p>}
      </div>
    </section>
  )
}
