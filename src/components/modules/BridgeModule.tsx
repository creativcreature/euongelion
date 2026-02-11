import type { Module } from '@/types'
import { typographer } from '@/lib/typographer'
import PullQuote from '@/components/PullQuote'

export default function BridgeModule({ module }: { module: Module }) {
  if (!module.content && !module.ancientTruth && !module.modernApplication)
    return null

  return (
    <div className="my-16 md:my-24">
      <p className="text-label vw-small mb-8 text-gold">
        {module.heading || 'BRIDGE TO CHRIST'}
      </p>

      {module.ancientTruth && (
        <div className="mb-10">
          <p className="module-sublabel mb-3">ANCIENT TRUTH</p>
          <p className="vw-body leading-relaxed text-secondary type-prose">
            {typographer(module.ancientTruth)}
          </p>
        </div>
      )}

      {module.connectionPoint && (
        <PullQuote>{module.connectionPoint}</PullQuote>
      )}

      {module.modernApplication && (
        <div className="mb-10">
          <p className="module-sublabel mb-3">MODERN APPLICATION</p>
          <p className="vw-body leading-relaxed text-secondary type-prose">
            {typographer(module.modernApplication)}
          </p>
        </div>
      )}

      {module.newTestamentEcho && (
        <div>
          <p className="module-sublabel mb-3">NEW TESTAMENT ECHO</p>
          <p className="vw-body leading-relaxed text-secondary type-prose">
            {typographer(module.newTestamentEcho)}
          </p>
        </div>
      )}

      {module.content && !module.ancientTruth && !module.modernApplication && (
        <div className="space-y-6 type-prose">
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
