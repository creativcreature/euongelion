import ReactMarkdown from 'react-markdown'
import type { Module } from '@/types'
import { typographer } from '@/lib/typographer'
import JournalField from '@/components/reader/JournalField'

export default function RecapModule({
  module,
  moduleIndex,
}: {
  module: Module
  /** Position in the day's modules; enables the answer field (SA-059). */
  moduleIndex?: number
}) {
  // SA-034 (2026-08-10): this component required a `days` array and returned
  // null for everything else, so a recap written in the CANONICAL flat shape —
  // `content` as the prose string, like every other prose module — rendered as
  // a silent empty gap. On a recap day that is the whole reading, and the
  // DEEP DIVE cta pointed straight at the empty section. Same class of defect
  // as the Jabez flat-`content` regression and the SabbathModule one beside it.
  const content = typeof module.content === 'string' ? module.content : ''

  if ((!module.days || module.days.length === 0) && !content) return null

  if (!module.days || module.days.length === 0) {
    return (
      <div className="my-16 md:my-24">
        {module.heading && (
          <p className="text-label vw-small mb-6 text-gold">{module.heading}</p>
        )}
        <div className="vw-body leading-relaxed text-secondary teaching-markdown">
          <ReactMarkdown>{content}</ReactMarkdown>
        </div>
      </div>
    )
  }

  return (
    <div className="my-16 md:my-24">
      <p className="text-label vw-small mb-6 text-gold">
        {module.heading || 'WHAT WE&rsquo;VE WALKED THROUGH'}
      </p>

      {module.intro && (
        <p className="vw-body leading-relaxed type-prose mb-12">
          {typographer(module.intro)}
        </p>
      )}

      <ol className="space-y-10">
        {module.days.map((d) => (
          <li key={d.day}>
            <p className="module-sublabel mb-2">DAY {d.day}</p>
            <h3 className="text-serif vw-body-lg mb-3">{d.title}</h3>
            <p className="vw-body leading-relaxed text-secondary type-prose">
              {typographer(d.key_insight)}
            </p>
            {d.anchor_verse && (
              <p
                className="mt-3 vw-small text-tertiary type-prose"
                style={{ fontStyle: 'italic' }}
              >
                {d.anchor_verse}
              </p>
            )}
          </li>
        ))}
      </ol>

      {module.integration_question && (
        <div
          className="mt-16 pt-10"
          style={{ borderTop: '1px solid var(--color-border)' }}
        >
          <p
            className="module-sublabel mb-4"
            style={{ color: 'var(--color-gold)' }}
          >
            SIT WITH THIS
          </p>
          <p className="text-serif-italic vw-body-lg leading-relaxed type-prose">
            {typographer(module.integration_question)}
          </p>
          {typeof moduleIndex === 'number' && (
            <JournalField
              kind="reflection"
              anchorKey={`m${moduleIndex}:integration`}
              label="Your answer"
              placeholder="Sit with it, then write…"
            />
          )}
        </div>
      )}

      {module.transition_to_sabbath && (
        <p className="mt-10 vw-small text-tertiary type-prose">
          {typographer(module.transition_to_sabbath)}
        </p>
      )}
    </div>
  )
}
