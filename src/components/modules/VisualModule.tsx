'use client'

import { useState } from 'react'
import Image from 'next/image'
import type { Module } from '@/types'
import { typographer } from '@/lib/typographer'

export default function VisualModule({ module }: { module: Module }) {
  const [imageError, setImageError] = useState(false)

  if (!module.imageUrl && !module.content) return null

  return (
    <div className="my-16 md:my-24">
      <p className="text-label vw-small mb-8 text-gold">
        {module.heading || 'VISUAL MEDITATION'}
      </p>

      {module.imageUrl && !imageError && (
        <div
          className="relative mb-8 overflow-hidden"
          style={{ maxWidth: '720px' }}
        >
          <div className="relative aspect-[4/3]">
            <Image
              src={module.imageUrl}
              alt={module.imageAlt || ''}
              fill
              className="object-cover"
              sizes="(max-width: 768px) 100vw, 720px"
              onError={() => setImageError(true)}
            />
          </div>
          {module.imageCaption && (
            <p className="mt-4 vw-small italic text-muted">
              {typographer(module.imageCaption)}
            </p>
          )}
        </div>
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
