import type { Module } from '@/types'
import { typographer } from '@/lib/typographer'
import JournalField from '@/components/reader/JournalField'

/**
 * A reflection prompt, and somewhere to answer it.
 *
 * The catalog ships 545 of these carrying 1,517 additional questions — 2,062
 * prompts in all, every one already written, and until SA-059 not one of them
 * had anywhere to write an answer. The reader has been asked 2,062 questions
 * and handed no paper.
 *
 * `anchorKey` is `m{moduleIndex}:q{n}`, with the primary prompt as q0 and each
 * additional question as q1..qN. It MUST stay stable: it is the only thing
 * connecting a saved answer back to the question it answers.
 */
export default function ReflectionModule({
  module,
  moduleIndex,
}: {
  module: Module
  moduleIndex?: number
}) {
  if (!module.prompt && !module.content) return null

  const prompt = module.prompt || module.content || ''
  // Without an index there is no stable anchor, so the prompt renders exactly
  // as it always did. Archive views and isolated tests take this path.
  const canAnswer = typeof moduleIndex === 'number'

  return (
    <div className="my-16 md:my-24">
      {/* `invitationType` ("quiet", "examen", …) is authoring metadata. Shouting
          it as the section label printed a bare "QUIET" above the prompt and
          read like a system tag rather than an invitation. */}
      <p className="text-label vw-small mb-6 text-gold">REFLECT</p>
      {module.heading && (
        <h2 className="text-display vw-heading-md mb-8">{module.heading}</h2>
      )}
      <p
        className="text-serif-italic vw-body-lg leading-relaxed type-prose"
        style={{ maxWidth: '640px' }}
      >
        {typographer(prompt)}
      </p>

      {canAnswer && (
        <div style={{ maxWidth: '640px' }}>
          <JournalField
            kind="reflection"
            anchorKey={`m${moduleIndex}:q0`}
            label={`Your answer to: ${prompt.slice(0, 80)}`}
            placeholder="Write what comes…"
            showNote
          />
        </div>
      )}

      {module.additionalQuestions && module.additionalQuestions.length > 0 && (
        <ol
          className="mt-8 space-y-4 oldstyle-nums"
          style={{ paddingLeft: '1.5em' }}
        >
          {module.additionalQuestions.map((q, i) => (
            <li
              key={i}
              className="text-serif-italic vw-body leading-relaxed text-secondary"
              style={{ paddingLeft: '0.5em' }}
            >
              {typographer(q)}
              {canAnswer && (
                <JournalField
                  kind="reflection"
                  anchorKey={`m${moduleIndex}:q${i + 1}`}
                  label={`Your answer to: ${q.slice(0, 80)}`}
                  placeholder="Write what comes…"
                  rows={2}
                />
              )}
            </li>
          ))}
        </ol>
      )}
    </div>
  )
}
