import type { Module } from '@/types'

export default function BridgeModule({ module }: { module: Module }) {
  if (!module.content) return null

  const paragraphs = module.content.split('\n\n')

  return (
    <div
      className="my-12 md:my-16"
      style={{
        borderLeft: '3px solid var(--color-gold)',
        paddingLeft: '1.5rem',
      }}
    >
      <p className="text-label vw-small mb-6 text-gold">
        {module.heading || 'BRIDGE TO CHRIST'}
      </p>
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
