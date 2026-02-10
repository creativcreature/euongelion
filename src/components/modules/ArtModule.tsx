'use client'

import { useState } from 'react'
import Image from 'next/image'
import type { Module } from '@/types'
import { typographer } from '@/lib/typographer'

export default function ArtModule({ module }: { module: Module }) {
  const [imageError, setImageError] = useState(false)

  if (!module.artwork && !module.content) return null

  return (
    <div className="my-16 md:my-24">
      <p className="text-label vw-small mb-8 text-gold">
        {module.heading || 'ART & REFLECTION'}
      </p>

      {module.artwork && !imageError && (
        <div
          className="relative mb-8 overflow-hidden"
          style={{ maxWidth: '720px' }}
        >
          <div className="relative aspect-[4/3]">
            <Image
              src={module.artwork.url || ''}
              alt={module.artwork.description || ''}
              fill
              className="object-cover"
              sizes="(max-width: 768px) 100vw, 720px"
              onError={() => setImageError(true)}
            />
          </div>
          <div className="mt-4">
            {module.artwork.title && (
              <p className="text-serif-italic vw-body">
                {typographer(module.artwork.title)}
              </p>
            )}
            {module.artwork.artist && (
              <p className="vw-small text-muted">
                {module.artwork.artist}
                {module.artwork.year && `, ${module.artwork.year}`}
              </p>
            )}
          </div>
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
