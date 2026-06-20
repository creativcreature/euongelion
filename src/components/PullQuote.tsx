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
          maxWidth: 'var(--measure-reading)',
          background: 'var(--color-gold)',
          opacity: 0.2,
        }}
      />

      <blockquote
        className="font-reading relative mx-auto"
        style={{ maxWidth: 'var(--measure-reading)', paddingLeft: '0.5em' }}
      >
        {/* Hanging quote mark */}
        <span
          className="font-display pointer-events-none absolute select-none"
          aria-hidden="true"
          style={{
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
            fontSize: 'var(--ts-xl)',
            fontWeight: 700,
            lineHeight: 'var(--lh-heading)',
          }}
        >
          {typographer(children)}
        </p>
      </blockquote>

      {attribution && (
        <figcaption
          className="font-reading mx-auto mt-4 text-right"
          style={{
            maxWidth: 'var(--measure-reading)',
            fontStyle: 'italic',
            fontSize: 'var(--ts-sm)',
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
          maxWidth: 'var(--measure-reading)',
          background: 'var(--color-gold)',
          opacity: 0.2,
        }}
      />
    </figure>
  )
}
