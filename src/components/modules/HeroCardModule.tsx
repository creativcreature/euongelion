import Image from 'next/image'
import type { Module } from '@/types'
import { typographer } from '@/lib/typographer'

export default function HeroCardModule({ module }: { module: Module }) {
  if (!module.displayTitle && !module.heroImage) return null

  const variant = module.heroVariant || 'series'
  const eyebrow =
    module.eyebrow || (variant === 'deep-dive' ? 'DEEP DIVE' : 'DAILY READING')

  return (
    <figure
      className={`hero-card hero-card-${variant} my-12 md:my-16`}
      style={{
        position: 'relative',
        overflow: 'hidden',
        borderRadius: '2px',
        background: 'var(--color-paper-deep, #1c1612)',
        color: 'var(--color-paper, #fcfaf6)',
        minHeight: '18rem',
      }}
    >
      {module.heroImage && (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            opacity: 0.55,
          }}
        >
          <Image
            src={module.heroImage}
            alt={module.heroImageAlt || ''}
            fill
            sizes="(max-width: 768px) 100vw, 1024px"
            style={{ objectFit: 'cover', objectPosition: 'center' }}
            priority={variant !== 'storytime'}
          />
        </div>
      )}

      <figcaption
        className="px-8 py-14 md:px-14 md:py-20"
        style={{ position: 'relative' }}
      >
        <p
          className="text-label vw-small mb-3"
          style={{
            color: 'var(--color-gold, #b9a76b)',
            letterSpacing: '0.18em',
          }}
        >
          {eyebrow}
        </p>

        {module.dayLabel && (
          <p
            className="text-label vw-small mb-5"
            style={{ opacity: 0.7, letterSpacing: '0.12em' }}
          >
            {module.dayLabel}
          </p>
        )}

        <h2
          className="text-serif vw-heading-md leading-tight"
          style={{ fontStyle: 'italic', maxWidth: '34ch' }}
        >
          {typographer(module.displayTitle || '')}
        </h2>
      </figcaption>
    </figure>
  )
}
