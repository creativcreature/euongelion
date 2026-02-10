import type { Module } from '@/types'
import { typographer } from '@/lib/typographer'

export default function VoiceModule({ module }: { module: Module }) {
  if (!module.content && !module.prompt) return null

  return (
    <div className="my-16 text-center md:my-24">
      <p className="text-label vw-small mb-8 text-gold">
        {module.heading || 'VOICE'}
      </p>

      {module.instruction && (
        <p
          className="mx-auto mb-8 vw-small italic text-muted"
          style={{ maxWidth: '480px' }}
        >
          {typographer(module.instruction)}
        </p>
      )}

      <div className="mx-auto" style={{ maxWidth: '540px' }}>
        {module.prompt && (
          <p className="text-serif-italic vw-body-lg leading-relaxed mb-8">
            {typographer(module.prompt)}
          </p>
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
      </div>

      {module.duration && (
        <p className="mt-8 vw-small text-muted">{module.duration}</p>
      )}
    </div>
  )
}
