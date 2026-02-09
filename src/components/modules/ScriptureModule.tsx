import type { Module } from '@/types'

export default function ScriptureModule({ module }: { module: Module }) {
  if (!module.passage && !module.reference) return null

  return (
    <div className="my-16 md:my-24">
      {module.heading && (
        <p className="text-label vw-small mb-6 text-gold">{module.heading}</p>
      )}
      <blockquote className="scripture-block">
        <p className="text-serif-italic vw-body-lg">{module.passage}</p>
      </blockquote>
      {module.reference && (
        <p className="mt-4 vw-small text-muted">
          {module.reference}
          {module.translation && ` (${module.translation})`}
        </p>
      )}
      {module.hebrewOriginal && (
        <p
          className="mt-4 vw-small text-muted"
          style={{ fontFamily: 'var(--font-hebrew, serif)' }}
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
        <div className="mt-6 flex flex-wrap gap-3">
          {module.emphasis.map((word, i) => (
            <span key={i} className="vw-small text-gold italic">
              {word}
            </span>
          ))}
        </div>
      )}
      {module.scriptureContext && (
        <p className="mt-8 vw-body leading-relaxed text-secondary">
          {module.scriptureContext}
        </p>
      )}
    </div>
  )
}
