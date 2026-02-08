import type { Module } from '@/types'

export default function TakeawayModule({ module }: { module: Module }) {
  return (
    <div
      className="my-12 p-8 md:my-16 md:p-10"
      style={{
        backgroundColor: 'var(--color-surface-raised)',
        border: '1px solid var(--color-gold)',
      }}
    >
      <p className="text-label vw-small mb-4 text-gold">
        {module.heading || 'TAKEAWAY'}
      </p>
      <p className="vw-body-lg leading-relaxed">{module.content}</p>
    </div>
  )
}
