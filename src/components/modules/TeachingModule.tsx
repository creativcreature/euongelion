import type { Module } from '@/types'

export default function TeachingModule({ module }: { module: Module }) {
  if (!module.content && !module.keyInsight) return null

  const paragraphs = module.content ? module.content.split('\n\n') : []

  return (
    <div className="my-12 md:my-16">
      {module.heading && (
        <h3 className="text-display vw-heading-md mb-8">{module.heading}</h3>
      )}
      {module.keyInsight && (
        <div
          className="mb-8 p-6"
          style={{
            borderLeft: '3px solid var(--color-gold)',
            backgroundColor: 'rgba(191, 155, 48, 0.05)',
          }}
        >
          <p className="text-label vw-small mb-2 text-gold">KEY INSIGHT</p>
          <p className="text-serif-italic vw-body-lg leading-relaxed">
            {module.keyInsight}
          </p>
        </div>
      )}
      <div className="space-y-6">
        {paragraphs.map((paragraph, i) => (
          <p key={i} className="vw-body leading-relaxed text-secondary">
            {paragraph}
          </p>
        ))}
      </div>
    </div>
  )
}
