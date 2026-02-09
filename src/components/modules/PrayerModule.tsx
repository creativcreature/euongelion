import type { Module } from '@/types'

export default function PrayerModule({ module }: { module: Module }) {
  const text = module.prayerText || module.content || ''
  if (!text && !module.breathPrayer) return null

  const paragraphs = text ? text.split('\n\n') : []

  return (
    <div
      className="my-12 md:my-16"
      style={{
        borderTop: '2px solid var(--color-gold)',
        paddingTop: '2rem',
      }}
    >
      <div className="mb-6 flex items-center gap-3">
        <p className="text-label vw-small text-gold">
          {module.heading || 'PRAYER'}
        </p>
        {module.prayerType && (
          <span className="vw-small text-muted">({module.prayerType})</span>
        )}
      </div>
      {module.posture && (
        <p className="mb-4 vw-small text-muted italic">
          Posture: {module.posture}
        </p>
      )}
      <div className="space-y-6">
        {paragraphs.map((paragraph, i) => (
          <p key={i} className="text-serif-italic vw-body-lg leading-relaxed">
            {paragraph}
          </p>
        ))}
      </div>
      {module.breathPrayer && (
        <div className="mt-8">
          <p className="text-label vw-small mb-3 text-muted">BREATH PRAYER</p>
          <p className="text-serif-italic vw-body-lg text-gold">
            {module.breathPrayer}
          </p>
        </div>
      )}
    </div>
  )
}
