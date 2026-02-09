import type { Module } from '@/types'

export default function InsightModule({ module }: { module: Module }) {
  if (!module.content && !module.historicalContext && !module.fascinatingFact)
    return null

  return (
    <div className="module-accent my-12 md:my-16">
      {module.heading && (
        <p className="text-label vw-small mb-4 text-gold">{module.heading}</p>
      )}
      {module.content && <p className="pull-quote">{module.content}</p>}
      {module.historicalContext && (
        <div className="mt-6">
          <p className="module-sublabel mb-2">HISTORICAL CONTEXT</p>
          <p className="vw-body leading-relaxed text-secondary">
            {module.historicalContext}
          </p>
        </div>
      )}
      {module.fascinatingFact && (
        <div className="module-callout mt-6">
          <p className="vw-body leading-relaxed text-secondary">
            {module.fascinatingFact}
          </p>
        </div>
      )}
    </div>
  )
}
