import type { Module } from '@/types'
import { typographer } from '@/lib/typographer'

export default function ReflectionModule({ module }: { module: Module }) {
  if (!module.prompt && !module.content) return null

  return (
    <div className="my-16 md:my-24">
      {/* `invitationType` ("quiet", "examen", …) is authoring metadata. Shouting
          it as the section label printed a bare "QUIET" above the prompt and
          read like a system tag rather than an invitation. */}
      <p className="text-label vw-small mb-6 text-gold">REFLECT</p>
      {module.heading && (
        <h3 className="text-display vw-heading-md mb-8">{module.heading}</h3>
      )}
      <p
        className="text-serif-italic vw-body-lg leading-relaxed type-prose"
        style={{ maxWidth: '640px' }}
      >
        {typographer(module.prompt || module.content || '')}
      </p>
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
            </li>
          ))}
        </ol>
      )}
    </div>
  )
}
