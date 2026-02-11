import { typographer } from '@/lib/typographer'

/**
 * Sacred pull quote — hanging oversized quote mark in gold,
 * thin gold rules above and below, full-width reading break.
 */
export default function PullQuote({
  children,
  attribution,
}: {
  children: string
  attribution?: string
}) {
  return (
    <figure className="my-16 md:my-24">
      {/* Top rule */}
      <div
        className="mx-auto mb-8"
        style={{
          height: '1px',
          maxWidth: '800px',
          background: 'var(--color-gold)',
          opacity: 0.2,
        }}
      />

      <blockquote
        className="relative mx-auto"
        style={{ maxWidth: '800px', paddingLeft: '0.5em' }}
      >
        {/* Hanging quote mark */}
        <span
          className="pointer-events-none absolute select-none"
          aria-hidden="true"
          style={{
            fontFamily: 'var(--font-family-serif)',
            fontSize: 'clamp(6rem, 10vw, 8rem)',
            fontWeight: 400,
            lineHeight: 0.5,
            color: 'var(--color-gold)',
            opacity: 0.1,
            left: '-0.15em',
            top: '-0.15em',
          }}
        >
          &ldquo;
        </span>

        <p
          style={{
            fontFamily: 'var(--font-family-display)',
            fontSize: 'clamp(1.75rem, 3vw, 2.5rem)',
            fontWeight: 700,
            lineHeight: 1.3,
          }}
        >
          {typographer(children)}
        </p>
      </blockquote>

      {attribution && (
        <figcaption
          className="mx-auto mt-4 text-right"
          style={{
            maxWidth: '800px',
            fontFamily: 'var(--font-family-serif)',
            fontStyle: 'italic',
            fontSize: 'clamp(0.85rem, 1vw, 1rem)',
            color: 'var(--color-text-muted)',
          }}
        >
          &mdash; {attribution}
        </figcaption>
      )}

      {/* Bottom rule */}
      <div
        className="mx-auto mt-8"
        style={{
          height: '1px',
          maxWidth: '800px',
          background: 'var(--color-gold)',
          opacity: 0.2,
        }}
      />
    </figure>
  )
}
