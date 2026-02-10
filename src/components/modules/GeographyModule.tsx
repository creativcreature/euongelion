import type { Module } from '@/types'
import { typographer } from '@/lib/typographer'

export default function GeographyModule({ module }: { module: Module }) {
  if (!module.location && !module.content) return null

  return (
    <div className="my-16 md:my-24">
      <p className="text-label vw-small mb-4 text-gold">
        {module.heading || 'GEOGRAPHY'}
      </p>

      {module.location && (
        <h3
          className="text-display vw-heading-md mb-2"
          style={{ fontWeight: 300 }}
        >
          {module.location}
        </h3>
      )}
      {module.region && (
        <p className="vw-small mb-8 text-muted">{module.region}</p>
      )}

      {module.content && (
        <div className="space-y-6">
          {module.content.split('\n\n').map((paragraph, i) => (
            <p key={i} className="vw-body leading-relaxed text-secondary">
              {typographer(paragraph)}
            </p>
          ))}
        </div>
      )}

      {module.significance && (
        <div className="module-accent mt-10">
          <p className="module-sublabel mb-3">BIBLICAL SIGNIFICANCE</p>
          <p className="vw-body leading-relaxed text-secondary">
            {typographer(module.significance)}
          </p>
        </div>
      )}

      {module.modernDay && (
        <p className="mt-8 vw-small text-muted">
          Today: {typographer(module.modernDay)}
        </p>
      )}
    </div>
  )
}
