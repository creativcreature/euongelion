import type { Module } from '@/types'

export default function BridgeModule({ module }: { module: Module }) {
  if (!module.content && !module.ancientTruth && !module.modernApplication)
    return null

  return (
    <div
      className="my-12 md:my-16"
      style={{
        borderLeft: '3px solid var(--color-gold)',
        paddingLeft: '1.5rem',
      }}
    >
      <p className="text-label vw-small mb-6 text-gold">
        {module.heading || 'BRIDGE TO CHRIST'}
      </p>

      {module.ancientTruth && (
        <div className="mb-6">
          <p className="text-label vw-small mb-2 text-muted">ANCIENT TRUTH</p>
          <p className="vw-body leading-relaxed text-secondary">
            {module.ancientTruth}
          </p>
        </div>
      )}

      {module.modernApplication && (
        <div className="mb-6">
          <p className="text-label vw-small mb-2 text-muted">
            MODERN APPLICATION
          </p>
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
          <p className="text-label vw-small mb-2 text-muted">
            NEW TESTAMENT ECHO
          </p>
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
