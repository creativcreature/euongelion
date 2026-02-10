'use client'

import { useState } from 'react'
import type { Module } from '@/types'
import { typographer } from '@/lib/typographer'

export default function RevealModule({ module }: { module: Module }) {
  const reveals = module.reveals
  const [visibleCount, setVisibleCount] = useState(1)

  if (!reveals || reveals.length === 0) return null

  const allRevealed = visibleCount >= reveals.length

  return (
    <div className="my-16 md:my-24">
      <p className="text-label vw-small mb-8 text-gold">
        {module.heading || 'DISCOVER'}
      </p>

      {module.instruction && (
        <p className="vw-body leading-relaxed text-secondary mb-8">
          {typographer(module.instruction)}
        </p>
      )}

      <div className="space-y-8">
        {reveals.slice(0, visibleCount).map((reveal, i) => (
          <div
            key={i}
            className="transition-opacity duration-500"
            style={{ opacity: 1 }}
          >
            {reveal.label && (
              <p className="module-sublabel mb-3">{reveal.label}</p>
            )}
            <p className="vw-body leading-relaxed text-secondary">
              {typographer(reveal.text)}
            </p>
          </div>
        ))}
      </div>

      {!allRevealed && (
        <button
          onClick={() => setVisibleCount((prev) => prev + 1)}
          className="mt-8 text-label vw-small text-gold transition-colors hover:text-[var(--color-text-primary)]"
        >
          Reveal Next &rarr;
        </button>
      )}

      {allRevealed && module.summary && (
        <div className="module-accent mt-10">
          <p className="text-serif-italic vw-body-lg leading-relaxed">
            {typographer(module.summary)}
          </p>
        </div>
      )}
    </div>
  )
}
