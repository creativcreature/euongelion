import type { Module } from '@/types'
import { typographer } from '@/lib/typographer'

export default function InteractiveModule({ module }: { module: Module }) {
  if (!module.content && !module.steps) return null

  const hasSteps = module.steps && module.steps.length > 0

  return (
    <div className="my-16 md:my-24">
      <p className="text-label vw-small mb-8 text-gold">
        {module.heading || 'INTERACTIVE'}
      </p>

      {module.instruction && (
        <p className="vw-body leading-relaxed text-secondary mb-10">
          {typographer(module.instruction)}
        </p>
      )}

      {hasSteps && (
        <div className="space-y-8">
          {module.steps!.map((step, i) => (
            <div key={i} className="flex gap-6">
              <span
                className="flex-shrink-0 text-display"
                style={{
                  fontFamily: 'var(--font-family-display)',
                  fontSize: 'clamp(1.5rem, 3vw, 2.5rem)',
                  fontWeight: 300,
                  lineHeight: 1,
                  color: 'var(--color-gold)',
                  opacity: 0.4,
                }}
              >
                {i + 1}
              </span>
              <div>
                {step.title && (
                  <p className="vw-body mb-2" style={{ fontWeight: 600 }}>
                    {typographer(step.title)}
                  </p>
                )}
                <p className="vw-body leading-relaxed text-secondary">
                  {typographer(step.description)}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}

      {module.content && !hasSteps && (
        <div className="space-y-6">
          {module.content.split('\n\n').map((paragraph, i) => (
            <p key={i} className="vw-body leading-relaxed text-secondary">
              {typographer(paragraph)}
            </p>
          ))}
        </div>
      )}
    </div>
  )
}
