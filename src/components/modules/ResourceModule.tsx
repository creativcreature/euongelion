import type { Module } from '@/types'
import { typographer } from '@/lib/typographer'

export default function ResourceModule({ module }: { module: Module }) {
  const hasResources = module.resources && module.resources.length > 0
  const hasRelatedScriptures =
    module.relatedScriptures && module.relatedScriptures.length > 0
  // forDeeperStudy is either a list of study items or a single prose blurb.
  // Narrow once so the JSX never calls .map() on a string.
  const forDeeperStudy = module.forDeeperStudy
  const deeperStudyList = Array.isArray(forDeeperStudy) ? forDeeperStudy : null
  const deeperStudyText =
    typeof forDeeperStudy === 'string' ? forDeeperStudy.trim() : ''
  const hasDeeperStudy =
    (deeperStudyList?.length ?? 0) > 0 || deeperStudyText.length > 0
  const hasGreekVocab =
    module.greekVocabulary && module.greekVocabulary.length > 0
  const hasWeeklyChallenge = !!module.weeklyChallenge
  // weeklyChallenge is either plain prose (a string) or a structured challenge
  // ({ title, description, reminders[] }). Narrow once so the JSX can render
  // each shape without passing an object into the typographer.
  const weeklyChallenge = module.weeklyChallenge

  if (
    !hasResources &&
    !hasRelatedScriptures &&
    !hasDeeperStudy &&
    !hasGreekVocab &&
    !hasWeeklyChallenge
  )
    return null

  return (
    <div className="my-16 md:my-24">
      <p className="text-label vw-small mb-8 text-gold">
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
                  {typographer(resource.description)}
                </p>
              )}
            </div>
          ))}
        </div>
      )}

      {hasRelatedScriptures && (
        <div className={hasResources ? 'mt-10' : ''}>
          <p className="module-sublabel mb-4">RELATED SCRIPTURES</p>
          <div className="space-y-4">
            {module.relatedScriptures!.map((s, i) => (
              <div key={i}>
                <p className="vw-small text-muted mb-1">{s.reference}</p>
                <p className="text-serif-italic vw-body leading-relaxed">
                  {typographer(s.text)}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {hasDeeperStudy && (
        <div className="mt-10">
          <p className="module-sublabel mb-4">FOR DEEPER STUDY</p>
          {deeperStudyList ? (
            <div className="space-y-3">
              {deeperStudyList.map((item, i) => (
                <div
                  key={i}
                  className="py-3"
                  style={{ borderBottom: '1px solid var(--color-border)' }}
                >
                  <div className="flex items-baseline gap-3">
                    <span className="vw-small text-muted uppercase">
                      {item.type}
                    </span>
                    {item.url ? (
                      <a
                        href={item.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="vw-body hover:text-gold transition-colors duration-300"
                      >
                        {item.title} &rarr;
                      </a>
                    ) : (
                      <span className="vw-body">{item.title}</span>
                    )}
                  </div>
                  {item.note && (
                    <p className="vw-small mt-1 text-secondary">
                      {typographer(item.note)}
                    </p>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <p className="vw-body leading-relaxed text-secondary">
              {typographer(deeperStudyText)}
            </p>
          )}
        </div>
      )}

      {hasGreekVocab && (
        <div className="mt-10">
          <p className="module-sublabel mb-4">GREEK VOCABULARY</p>
          <div className="space-y-3">
            {module.greekVocabulary!.map((entry, i) => (
              <div
                key={i}
                className="flex items-baseline gap-4 py-2"
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
        <div className="module-accent mt-10">
          <p
            className="module-sublabel mb-3"
            style={{ color: 'var(--color-gold)' }}
          >
            WEEKLY CHALLENGE
          </p>
          {typeof weeklyChallenge === 'string' ? (
            <p className="vw-body leading-relaxed">
              {typographer(weeklyChallenge)}
            </p>
          ) : weeklyChallenge ? (
            <div className="space-y-3">
              {weeklyChallenge.title && (
                <p className="vw-body leading-relaxed font-semibold">
                  {typographer(weeklyChallenge.title)}
                </p>
              )}
              {weeklyChallenge.description && (
                <p className="vw-body leading-relaxed">
                  {typographer(weeklyChallenge.description)}
                </p>
              )}
              {weeklyChallenge.reminders &&
                weeklyChallenge.reminders.length > 0 && (
                  <ul className="mt-2 space-y-2">
                    {weeklyChallenge.reminders.map((r, i) => (
                      <li key={i} className="vw-small text-secondary">
                        {r.time && (
                          <span className="text-muted uppercase">
                            {r.time}
                            {r.prompt ? ' — ' : ''}
                          </span>
                        )}
                        {r.prompt ? typographer(r.prompt) : ''}
                      </li>
                    ))}
                  </ul>
                )}
            </div>
          ) : null}
        </div>
      )}
    </div>
  )
}
