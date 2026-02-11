'use client'

import type { Module } from '@/types'
import { typographer } from '@/lib/typographer'
import DropCap from '@/components/motion/DropCap'
import PullQuote from '@/components/PullQuote'

export default function TeachingModule({ module }: { module: Module }) {
  if (!module.content && !module.keyInsight) return null

  const paragraphs = module.content ? module.content.split('\n\n') : []
  const usColumns = paragraphs.length > 3

  return (
    <div className="my-16 md:my-24">
      {module.heading && (
        <h3 className="text-display vw-heading-md mb-10">{module.heading}</h3>
      )}
      {module.keyInsight && <PullQuote>{module.keyInsight}</PullQuote>}
      <div
        className={`space-y-6 type-prose ${usColumns ? 'columns-prose' : ''}`}
      >
        {paragraphs.map((paragraph, i) =>
          i === 0 ? (
            <DropCap key={i} className="vw-body leading-relaxed text-secondary">
              {typographer(paragraph)}
            </DropCap>
          ) : (
            <p key={i} className="vw-body leading-relaxed text-secondary">
              {typographer(paragraph)}
            </p>
          ),
        )}
      </div>
    </div>
  )
}
