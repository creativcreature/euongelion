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
