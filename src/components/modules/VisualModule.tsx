'use client'

import type { Module } from '@/types'
import { typographer } from '@/lib/typographer'

export default function VisualModule({ module }: { module: Module }) {
  if (
    !module.imageUrl &&
    !module.content &&
    !module.imageCaption &&
    !module.meditationPrompt
  ) {
    return null
  }

  return (
    <div className="my-16 md:my-24">
      <p className="text-label vw-small mb-8 text-gold">
        {module.heading || 'VISUAL MEDITATION'}
      </p>

      {(module.imageCaption || module.imageAlt) && (
        <p
          className="text-serif-italic vw-small mb-8 text-muted"
          style={{ maxWidth: '720px' }}
        >
          {typographer(module.imageCaption || module.imageAlt || '')}
        </p>
      )}

      {module.content && (
        <div className="space-y-6" style={{ maxWidth: '640px' }}>
          {module.content.split('\n\n').map((paragraph, i) => (
            <p key={i} className="text-serif-italic vw-body-lg leading-relaxed">
              {typographer(paragraph)}
            </p>
          ))}
        </div>
      )}

      {module.meditationPrompt && (
        <p className="mt-10 text-serif-italic vw-body leading-relaxed text-gold">
          {typographer(module.meditationPrompt)}
        </p>
      )}
    </div>
  )
}
