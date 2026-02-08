import type { Module } from '@/types'

export default function VocabModule({ module }: { module: Module }) {
  return (
    <div
      className="my-12 p-8 md:my-16 md:p-10"
      style={{
        backgroundColor: 'var(--color-surface-raised)',
        border: '1px solid var(--color-border)',
      }}
    >
      <p className="text-label vw-small mb-4 text-gold">
        {module.language === 'greek'
          ? 'GREEK'
          : module.language === 'hebrew'
            ? 'HEBREW'
            : 'WORD STUDY'}
      </p>
      <p
        className="text-serif-italic mb-2"
        style={{ fontSize: 'clamp(1.75rem, 3vw, 2.5rem)', lineHeight: 1.3 }}
      >
        {module.word}
      </p>
      {module.transliteration && (
        <p className="vw-small mb-6 text-muted">/{module.transliteration}/</p>
      )}
      {module.definition && (
        <p className="vw-body mb-4 leading-relaxed text-secondary">
          <span className="text-label vw-small text-muted">MEANING: </span>
          {module.definition}
        </p>
      )}
      {module.usage && (
        <p className="vw-body leading-relaxed text-secondary">{module.usage}</p>
      )}
    </div>
  )
}
