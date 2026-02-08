import type { Module } from '@/types'

export default function InsightModule({ module }: { module: Module }) {
  return (
    <div
      className="my-12 md:my-16"
      style={{
        borderLeft: '3px solid var(--color-gold)',
        paddingLeft: '1.5rem',
      }}
    >
      {module.heading && (
        <p className="text-label vw-small mb-4 text-gold">{module.heading}</p>
      )}
      <p className="pull-quote">{module.content}</p>
    </div>
  )
}
