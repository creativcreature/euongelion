import type { Module } from '@/types'

export default function ScriptureModule({ module }: { module: Module }) {
  if (!module.passage && !module.reference) return null

  return (
    <div className="my-12 md:my-16">
      {module.heading && (
        <p className="text-label vw-small mb-6 text-gold">{module.heading}</p>
      )}
      <blockquote className="scripture-block">
        <p className="text-serif-italic vw-body-lg">{module.passage}</p>
      </blockquote>
      {module.reference && (
        <p className="mt-4 text-label vw-small text-muted">
          {module.reference}
          {module.translation && ` (${module.translation})`}
        </p>
      )}
      {module.hebrewOriginal && (
        <p
          className="mt-4 text-muted"
          style={{
            fontFamily: 'var(--font-hebrew, serif)',
            fontSize: '1.1rem',
          }}
        >
          {module.hebrewOriginal}
        </p>
      )}
      {module.greekOriginal && (
        <p className="mt-3 text-serif-italic vw-small text-muted">
          {module.greekOriginal}
        </p>
      )}
      {module.emphasis && module.emphasis.length > 0 && (
        <div className="mt-6 flex flex-wrap gap-2">
          {module.emphasis.map((word, i) => (
            <span
              key={i}
              className="vw-small px-3 py-1"
              style={{
                border: '1px solid var(--color-gold)',
                color: 'var(--color-gold)',
              }}
            >
              {word}
            </span>
          ))}
        </div>
      )}
      {module.scriptureContext && (
        <p className="mt-6 vw-body leading-relaxed text-secondary">
          {module.scriptureContext}
        </p>
      )}
    </div>
  )
}
