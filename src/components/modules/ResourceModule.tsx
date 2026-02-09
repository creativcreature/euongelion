import type { Module } from '@/types'

export default function ResourceModule({ module }: { module: Module }) {
  const hasResources = module.resources && module.resources.length > 0
  const hasRelatedScriptures =
    module.relatedScriptures && module.relatedScriptures.length > 0
  const hasDeeperStudy =
    module.forDeeperStudy && module.forDeeperStudy.length > 0
  const hasGreekVocab =
    module.greekVocabulary && module.greekVocabulary.length > 0
  const hasWeeklyChallenge = !!module.weeklyChallenge

  if (
    !hasResources &&
    !hasRelatedScriptures &&
    !hasDeeperStudy &&
    !hasGreekVocab &&
    !hasWeeklyChallenge
  )
    return null

  return (
    <div className="my-12 md:my-16">
      <p className="text-label vw-small mb-6 text-gold">
        {module.heading || 'FURTHER READING'}
      </p>

      {hasResources && (
        <div className="space-y-4">
          {module.resources!.map((resource, i) => (
            <div
              key={i}
              className="py-4"
              style={{ borderBottom: '1px solid var(--color-border)' }}
            >
              {resource.url ? (
                <a
                  href={resource.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="vw-body transition-colors duration-300 hover:text-gold"
                >
                  {resource.title} &rarr;
                </a>
              ) : (
                <p className="vw-body">{resource.title}</p>
              )}
              {resource.description && (
                <p className="vw-small mt-2 text-secondary">
                  {resource.description}
                </p>
              )}
            </div>
          ))}
        </div>
      )}

      {hasRelatedScriptures && (
        <div className={hasResources ? 'mt-8' : ''}>
          <p className="module-sublabel mb-3">RELATED SCRIPTURES</p>
          <div className="space-y-3">
            {module.relatedScriptures!.map((s, i) => (
              <div key={i}>
                <p className="vw-small text-muted mb-1">{s.reference}</p>
                <p className="text-serif-italic vw-body leading-relaxed">
                  {s.text}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {hasDeeperStudy && (
        <div className="mt-8">
          <p className="module-sublabel mb-3">FOR DEEPER STUDY</p>
          <div className="space-y-3">
            {module.forDeeperStudy!.map((item, i) => (
              <div
                key={i}
                className="py-3"
                style={{ borderBottom: '1px solid var(--color-border)' }}
              >
                <div className="flex items-baseline gap-2">
                  <span className="vw-small text-muted uppercase">
                    {item.type}
                  </span>
                  {item.url ? (
                    <a
                      href={item.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="vw-body hover:text-gold"
                    >
                      {item.title} &rarr;
                    </a>
                  ) : (
                    <span className="vw-body">{item.title}</span>
                  )}
                </div>
                {item.note && (
                  <p className="vw-small mt-1 text-secondary">{item.note}</p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {hasGreekVocab && (
        <div className="mt-8">
          <p className="module-sublabel mb-3">GREEK VOCABULARY</p>
          <div className="space-y-2">
            {module.greekVocabulary!.map((entry, i) => (
              <div
                key={i}
                className="flex items-baseline gap-3 py-2"
                style={{ borderBottom: '1px solid var(--color-border)' }}
              >
                <span className="text-serif-italic">{entry.word}</span>
                <span className="vw-small text-muted">
                  {entry.transliteration}
                </span>
                <span className="vw-small text-secondary">{entry.meaning}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {hasWeeklyChallenge && (
        <div className="module-callout mt-8">
          <p
            className="module-sublabel mb-2"
            style={{ color: 'var(--color-gold)' }}
          >
            WEEKLY CHALLENGE
          </p>
          <p className="vw-body leading-relaxed">{module.weeklyChallenge}</p>
        </div>
      )}
    </div>
  )
}
