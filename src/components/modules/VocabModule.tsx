import type { Module } from '@/types'

export default function VocabModule({ module }: { module: Module }) {
  if (!module.word && !module.definition) return null

  return (
    <div className="module-card my-12 p-8 md:my-16 md:p-10">
      <div className="mb-4 flex items-center gap-3">
        <p className="text-label vw-small text-gold">
          {module.language === 'greek'
            ? 'GREEK'
            : module.language === 'hebrew'
              ? 'HEBREW'
              : 'WORD STUDY'}
        </p>
        {module.strongsNumber && (
          <span className="vw-small text-muted">{module.strongsNumber}</span>
        )}
      </div>
      <p className="pull-quote mb-1">{module.word}</p>
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
          <span className="module-sublabel mr-2">MEANING:</span>
          {module.definition}
        </p>
      )}
      {module.usage && (
        <p className="vw-body mb-4 leading-relaxed text-secondary">
          {module.usage}
        </p>
      )}
      {module.usageNote && (
        <p className="vw-body mb-4 italic leading-relaxed text-muted">
          {module.usageNote}
        </p>
      )}
      {module.wordByWord && module.wordByWord.length > 0 && (
        <div className="mt-6">
          <p className="module-sublabel mb-3">WORD BY WORD</p>
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
          <p className="module-sublabel mb-3">RELATED</p>
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
