import Image from 'next/image'
import type { Module } from '@/types'
import { typographer } from '@/lib/typographer'

export default function InlineImageModule({ module }: { module: Module }) {
  if (!module.inlineImageSrc) return null

  const width = module.inlineImageWidth || 'wide'

  const widthStyle: React.CSSProperties =
    width === 'narrow'
      ? { maxWidth: '34rem', margin: '2.5rem auto' }
      : width === 'bleed'
        ? { width: '100%', margin: '2.5rem 0' }
        : { width: '100%', margin: '2.5rem 0' }

  return (
    <figure
      className={`inline-image-module inline-image-${width}`}
      style={widthStyle}
    >
      <div
        style={{
          position: 'relative',
          width: '100%',
          aspectRatio: '16 / 10',
          background: 'var(--color-paper-deep, #1c1612)',
          borderRadius: '2px',
          overflow: 'hidden',
        }}
      >
        <Image
          src={module.inlineImageSrc}
          alt={module.inlineImageAlt || ''}
          fill
          sizes={
            width === 'narrow' ? '34rem' : '(max-width: 768px) 100vw, 60rem'
          }
          style={{ objectFit: 'cover' }}
        />

        {/* SA-075 (F-119): motion stills. The plate is composed so exactly one
            element animates; the clip loops silently over the still. The still
            renders underneath and stays visible as the poster, so a failed or
            blocked video degrades to the image rather than to an empty box.
            `.motion-still` is hidden under prefers-reduced-motion in
            globals.css, which the video element cannot honour on its own. */}
        {module.inlineImageMotionSrc && (
          <video
            className="motion-still"
            src={module.inlineImageMotionSrc}
            poster={module.inlineImageSrc}
            autoPlay
            loop
            muted
            playsInline
            preload="metadata"
            aria-hidden="true"
            tabIndex={-1}
            style={{
              position: 'absolute',
              inset: 0,
              width: '100%',
              height: '100%',
              objectFit: 'cover',
            }}
          />
        )}
      </div>

      {module.inlineImageCaption && (
        <figcaption
          className="mt-3 vw-small text-tertiary type-prose"
          style={{ fontStyle: 'italic', textAlign: 'center' }}
        >
          {typographer(module.inlineImageCaption)}
        </figcaption>
      )}
    </figure>
  )
}
