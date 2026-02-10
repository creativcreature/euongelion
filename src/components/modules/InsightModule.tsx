import type { Module } from '@/types'
import { typographer } from '@/lib/typographer'

export default function InsightModule({ module }: { module: Module }) {
  if (!module.content && !module.historicalContext && !module.fascinatingFact)
    return null

  return (
    <div className="my-16 md:my-24">
      {module.heading && (
        <p className="text-label vw-small mb-6 text-gold">{module.heading}</p>
      )}
      {module.content && (
        <p className="text-serif-italic vw-body-lg leading-relaxed mb-8 type-prose">
          {typographer(module.content)}
        </p>
      )}
      {module.historicalContext && (
        <div className="mt-8">
          <p className="module-sublabel mb-3">HISTORICAL CONTEXT</p>
          <p className="vw-body leading-relaxed text-secondary type-prose">
            {typographer(module.historicalContext)}
          </p>
        </div>
      )}
      {module.fascinatingFact && (
        <div className="module-accent mt-8">
          <p className="vw-body leading-relaxed text-secondary type-prose">
            {typographer(module.fascinatingFact)}
          </p>
        </div>
      )}
    </div>
  )
}
