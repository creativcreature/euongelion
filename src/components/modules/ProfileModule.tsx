import type { Module } from '@/types'
import { typographer } from '@/lib/typographer'
import PullQuote from '@/components/PullQuote'

export default function ProfileModule({ module }: { module: Module }) {
  if (!module.bio && !module.description && !module.name) return null

  const bodyText = module.description || module.bio || ''
  const paragraphs = bodyText ? bodyText.split('\n\n') : []

  return (
    <div className="my-16 md:my-24">
      <p className="text-label vw-small mb-4 text-gold">
        {module.heading || 'HISTORICAL FIGURE'}
      </p>
      <h3 className="text-display vw-heading-md mb-2">{module.name}</h3>
      {module.era && (
        <p className="vw-small mb-8 text-muted oldstyle-nums">{module.era}</p>
      )}
      {paragraphs.length > 0 && (
        <div className="space-y-6 type-prose">
          {paragraphs.map((paragraph, i) => (
            <p key={i} className="vw-body leading-relaxed text-secondary">
              {typographer(paragraph)}
            </p>
          ))}
        </div>
      )}
      {module.keyQuote && (
        <PullQuote attribution={module.name}>{module.keyQuote}</PullQuote>
      )}
      {module.lessonForUs && (
        <div className="mt-10">
          <p className="module-sublabel mb-3">LESSON FOR US</p>
          <p className="vw-body leading-relaxed text-secondary type-prose">
            {typographer(module.lessonForUs)}
          </p>
        </div>
      )}
    </div>
  )
}
