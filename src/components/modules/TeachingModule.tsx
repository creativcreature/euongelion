import type { Module } from '@/types'
import { typographer } from '@/lib/typographer'

export default function TeachingModule({ module }: { module: Module }) {
  if (!module.content && !module.keyInsight) return null

  const paragraphs = module.content ? module.content.split('\n\n') : []

  return (
    <div className="my-16 md:my-24">
      {module.heading && (
        <h3 className="text-display vw-heading-md mb-10">{module.heading}</h3>
      )}
      {module.keyInsight && (
        <p
          className="text-serif-italic vw-body-lg leading-relaxed mb-10 text-gold"
          style={{ maxWidth: '640px' }}
        >
          {typographer(module.keyInsight)}
        </p>
      )}
      <div className="space-y-6">
        {paragraphs.map((paragraph, i) => (
          <p
            key={i}
            className={`vw-body leading-relaxed text-secondary ${i === 0 ? 'drop-cap' : ''}`}
          >
            {typographer(paragraph)}
          </p>
        ))}
      </div>
    </div>
  )
}
