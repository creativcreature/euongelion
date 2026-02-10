import type { Module } from '@/types'
import { typographer } from '@/lib/typographer'

export default function PrayerModule({ module }: { module: Module }) {
  const text = module.prayerText || module.content || ''
  if (!text && !module.breathPrayer) return null

  const paragraphs = text ? text.split('\n\n') : []

  return (
    <div className="my-16 text-center md:my-24">
      <div className="mb-6 flex items-baseline justify-center gap-3">
        <p className="text-label vw-small text-gold">
          {module.heading || 'PRAYER'}
        </p>
        {module.prayerType && (
          <span className="vw-small text-muted">({module.prayerType})</span>
        )}
      </div>
      {module.posture && (
        <p className="mb-6 vw-small italic text-muted">
          Posture: {module.posture}
        </p>
      )}
      <div className="mx-auto space-y-6" style={{ maxWidth: '540px' }}>
        {paragraphs.map((paragraph, i) => (
          <p
            key={i}
            className="text-serif-italic vw-body-lg leading-relaxed"
            style={{ letterSpacing: '0.01em' }}
          >
            {typographer(paragraph)}
          </p>
        ))}
      </div>
      {module.breathPrayer && (
        <div className="mt-10">
          <p className="module-sublabel mb-3">BREATH PRAYER</p>
          <p className="text-serif-italic vw-body-lg text-gold">
            {typographer(module.breathPrayer)}
          </p>
        </div>
      )}
    </div>
  )
}
