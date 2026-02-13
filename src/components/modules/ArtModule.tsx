'use client'

import type { Module } from '@/types'
import { typographer } from '@/lib/typographer'

export default function ArtModule({ module }: { module: Module }) {
  if (!module.artwork && !module.content && !module.reflectionPrompt)
    return null

  return (
    <div className="my-16 md:my-24">
      <p className="text-label vw-small mb-8 text-gold">
        {module.heading || 'ART & REFLECTION'}
      </p>

      {module.artwork && (
        <div
          className="mb-8 border-l-2 border-[var(--color-border-strong)] pl-5"
          style={{ maxWidth: '720px' }}
        >
          {module.artwork.title && (
            <p className="text-serif-italic vw-body">
              {typographer(module.artwork.title)}
            </p>
          )}
          {(module.artwork.artist || module.artwork.year) && (
            <p className="vw-small mt-2 text-muted">
              {[module.artwork.artist, module.artwork.year]
                .filter(Boolean)
                .join(', ')}
            </p>
          )}
        </div>
      )}

      {module.content && (
        <div className="space-y-6" style={{ maxWidth: '640px' }}>
          {module.content.split('\n\n').map((paragraph, i) => (
            <p key={i} className="vw-body leading-relaxed text-secondary">
              {typographer(paragraph)}
            </p>
          ))}
        </div>
      )}

      {module.reflectionPrompt && (
        <p
          className="mt-10 text-serif-italic vw-body-lg leading-relaxed"
          style={{ maxWidth: '640px' }}
        >
          {typographer(module.reflectionPrompt)}
        </p>
      )}
    </div>
  )
}
