import type { Module } from '@/types'

export default function InsightModule({ module }: { module: Module }) {
  if (!module.content && !module.historicalContext && !module.fascinatingFact)
    return null

  return (
    <div
      className="my-12 md:my-16"
      style={{
        borderLeft: '3px solid var(--color-gold)',
        paddingLeft: '1.5rem',
      }}
    >
      {module.heading && (
        <p className="text-label vw-small mb-4 text-gold">{module.heading}</p>
      )}
      {module.content && <p className="pull-quote">{module.content}</p>}
      {module.historicalContext && (
        <div className="mt-6">
          <p className="text-label vw-small mb-2 text-muted">
            HISTORICAL CONTEXT
          </p>
          <p className="vw-body leading-relaxed text-secondary">
            {module.historicalContext}
          </p>
        </div>
      )}
      {module.fascinatingFact && (
        <div
          className="mt-6 p-4"
          style={{ backgroundColor: 'rgba(191, 155, 48, 0.05)' }}
        >
          <p className="vw-body leading-relaxed text-secondary">
            {module.fascinatingFact}
          </p>
        </div>
      )}
    </div>
  )
}
