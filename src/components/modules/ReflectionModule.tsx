import type { Module } from '@/types'
import { typographer } from '@/lib/typographer'

export default function ReflectionModule({ module }: { module: Module }) {
  if (!module.prompt && !module.content) return null

  return (
    <div className="my-16 md:my-24">
      <p className="text-label vw-small mb-6 text-gold">
        {module.invitationType
          ? module.invitationType.toUpperCase()
          : 'REFLECT'}
      </p>
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
        <ul className="mt-8 space-y-4">
          {module.additionalQuestions.map((q, i) => (
            <li key={i} className="vw-body leading-relaxed text-secondary">
              {typographer(q)}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
