import type { Module } from '@/types'

export default function BridgeModule({ module }: { module: Module }) {
  if (!module.content && !module.ancientTruth && !module.modernApplication)
    return null

  return (
    <div className="module-accent my-12 md:my-16">
      <p className="text-label vw-small mb-6 text-gold">
        {module.heading || 'BRIDGE TO CHRIST'}
      </p>

      {module.ancientTruth && (
        <div className="mb-6">
          <p className="module-sublabel mb-2">ANCIENT TRUTH</p>
          <p className="vw-body leading-relaxed text-secondary">
            {module.ancientTruth}
          </p>
        </div>
      )}

      {module.modernApplication && (
        <div className="mb-6">
          <p className="module-sublabel mb-2">MODERN APPLICATION</p>
          <p className="vw-body leading-relaxed text-secondary">
            {module.modernApplication}
          </p>
        </div>
      )}

      {module.connectionPoint && (
        <p className="mb-6 text-serif-italic vw-body-lg leading-relaxed">
          {module.connectionPoint}
        </p>
      )}

      {module.newTestamentEcho && (
        <div className="mt-4">
          <p className="module-sublabel mb-2">NEW TESTAMENT ECHO</p>
          <p className="vw-body leading-relaxed text-secondary">
            {module.newTestamentEcho}
          </p>
        </div>
      )}

      {module.content && !module.ancientTruth && !module.modernApplication && (
        <div className="space-y-6">
          {module.content.split('\n\n').map((paragraph, i) => (
            <p key={i} className="vw-body leading-relaxed text-secondary">
              {paragraph}
            </p>
          ))}
        </div>
      )}
    </div>
  )
}
