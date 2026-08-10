import ReactMarkdown from 'react-markdown'
import type { Module } from '@/types'
import { typographer } from '@/lib/typographer'

export default function SabbathModule({ module }: { module: Module }) {
  // SA-034 (2026-08-10): this component only ever read scripture_anchor /
  // invitation / prayerText, so a sabbath module written in the CANONICAL flat
  // shape — `content` as the prose string, exactly as the Module type declares
  // and exactly as every other prose module uses — rendered as a silent empty
  // gap. It validated, it shipped over HTTP, and the whole body of the day was
  // missing in the browser. Same class of defect as the Jabez flat-`content`
  // regression; caught here by a rendered-DOM check, not by curl.
  const content = typeof module.content === 'string' ? module.content : ''

  if (
    !module.scripture_anchor &&
    !module.invitation &&
    !module.prayerText &&
    !content
  ) {
    return null
  }

  return (
    <div className="my-24 md:my-32">
      <p className="text-label vw-small mb-10 text-gold">
        {module.heading || 'STOP. BE STILL.'}
      </p>

      {content && (
        <div
          className="vw-body leading-relaxed text-secondary teaching-markdown"
          style={{ maxWidth: '34rem' }}
        >
          <ReactMarkdown>{content}</ReactMarkdown>
        </div>
      )}

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
          <p className="text-serif-italic vw-body leading-relaxed type-prose">
            {typographer(module.prayerText)}
          </p>
        </div>
      )}
    </div>
  )
}
