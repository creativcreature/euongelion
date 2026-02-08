import type { Module } from '@/types'

export default function ReflectionModule({ module }: { module: Module }) {
  return (
    <div
      className="my-12 p-8 md:my-16 md:p-10"
      style={{
        backgroundColor: 'var(--color-surface)',
        border: '1px solid var(--color-border)',
      }}
    >
      <p className="text-label vw-small mb-6 text-gold">REFLECT</p>
      {module.heading && (
        <h3 className="text-display vw-heading-md mb-6">{module.heading}</h3>
      )}
      <p className="text-serif-italic vw-body-lg leading-relaxed">
        {module.prompt || module.content}
      </p>
    </div>
  )
}
