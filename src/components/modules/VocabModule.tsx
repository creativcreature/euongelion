import type { Module } from '@/types'

export default function VocabModule({ module }: { module: Module }) {
  if (!module.word && !module.definition) return null

  return (
    <div
      className="my-12 p-8 md:my-16 md:p-10"
      style={{
        backgroundColor: 'var(--color-surface-raised)',
        border: '1px solid var(--color-border)',
      }}
    >
      <div className="mb-4 flex items-center gap-3">
        <p className="text-label vw-small text-gold">
          {module.language === 'greek'
            ? 'GREEK'
            : module.language === 'hebrew'
              ? 'HEBREW'
              : 'WORD STUDY'}
        </p>
        {module.strongsNumber && (
          <span
            className="vw-small px-2 py-0.5"
            style={{
              border: '1px solid var(--color-border)',
              color: 'var(--color-muted)',
              fontSize: '0.7rem',
            }}
          >
            {module.strongsNumber}
          </span>
        )}
      </div>
      <p
        className="text-serif-italic mb-1"
        style={{ fontSize: 'clamp(1.75rem, 3vw, 2.5rem)', lineHeight: 1.3 }}
      >
        {module.word}
      </p>
      {(module.transliteration || module.pronunciation) && (
        <p className="vw-small mb-6 text-muted">
          {module.transliteration && <>/{module.transliteration}/</>}
          {module.pronunciation && (
            <span className="ml-2">({module.pronunciation})</span>
          )}
        </p>
      )}
      {module.definition && (
        <p className="vw-body mb-4 leading-relaxed text-secondary">
          <span className="text-label vw-small text-muted">MEANING: </span>
          {module.definition}
        </p>
      )}
      {module.usage && (
        <p className="vw-body mb-4 leading-relaxed text-secondary">
          {module.usage}
        </p>
      )}
      {module.usageNote && (
        <p className="vw-body mb-4 leading-relaxed text-muted italic">
          {module.usageNote}
        </p>
      )}
      {module.wordByWord && module.wordByWord.length > 0 && (
        <div className="mt-6">
          <p className="text-label vw-small mb-3 text-muted">WORD BY WORD</p>
          <div className="space-y-2">
            {module.wordByWord.map((entry, i) => (
              <div
                key={i}
                className="flex items-baseline gap-3 py-2"
                style={{ borderBottom: '1px solid var(--color-border)' }}
              >
                <span
                  className="text-serif-italic"
                  style={{ minWidth: '4rem' }}
                >
                  {entry.word}
                </span>
                <span className="vw-small text-muted">
                  {entry.transliteration}
                </span>
                <span className="vw-small text-secondary">{entry.meaning}</span>
              </div>
            ))}
          </div>
        </div>
      )}
      {module.relatedWords && module.relatedWords.length > 0 && (
        <div className="mt-6">
          <p className="text-label vw-small mb-3 text-muted">RELATED</p>
          <div className="flex flex-wrap gap-3">
            {module.relatedWords.map((rw, i) => (
              <span key={i} className="vw-small text-secondary">
                <span className="text-serif-italic">{rw.word}</span>
                {rw.meaning && (
                  <span className="text-muted"> — {rw.meaning}</span>
                )}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
