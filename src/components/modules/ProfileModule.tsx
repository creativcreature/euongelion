import type { Module } from '@/types'

export default function ProfileModule({ module }: { module: Module }) {
  if (!module.bio) return null

  const paragraphs = module.bio.split('\n\n')

  return (
    <div
      className="my-12 p-8 md:my-16 md:p-10"
      style={{
        backgroundColor: 'var(--color-surface-raised)',
        border: '1px solid var(--color-border)',
      }}
    >
      <p className="text-label vw-small mb-4 text-gold">
        {module.heading || 'HISTORICAL FIGURE'}
      </p>
      <h3 className="text-display vw-heading-md mb-2">{module.name}</h3>
      {module.era && <p className="vw-small mb-6 text-muted">{module.era}</p>}
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
