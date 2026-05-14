import type { Module } from '@/types'
import { typographer } from '@/lib/typographer'

export default function SabbathModule({ module }: { module: Module }) {
  if (!module.scripture_anchor && !module.invitation && !module.prayerText) {
    return null
  }

  return (
    <div className="my-24 md:my-32">
      <p className="text-label vw-small mb-10 text-gold">
        {module.heading || 'STOP. BE STILL.'}
      </p>

      {module.scripture_anchor && (
        <figure className="my-12">
          <blockquote
            className="text-serif vw-display leading-tight"
            style={{ fontStyle: 'italic' }}
          >
            {typographer(module.scripture_anchor.text)}
          </blockquote>
          <figcaption className="mt-6 vw-small text-tertiary type-prose">
            {module.scripture_anchor.reference}
            {module.scripture_anchor.translation
              ? ` — ${module.scripture_anchor.translation}`
              : ''}
          </figcaption>
        </figure>
      )}

      {module.invitation && (
        <p
          className="my-16 vw-body-lg leading-relaxed text-secondary type-prose"
          style={{ maxWidth: '34rem' }}
        >
          {typographer(module.invitation)}
        </p>
      )}

      {module.prayerText && (
        <div
          className="mt-16 pt-10"
          style={{ borderTop: '1px solid var(--color-border)' }}
        >
          <p
            className="module-sublabel mb-4"
            style={{ color: 'var(--color-gold)' }}
          >
            PRAYER
          </p>
          <p className="text-serif-quote vw-body leading-relaxed type-prose">
            {typographer(module.prayerText)}
          </p>
        </div>
      )}
    </div>
  )
}
