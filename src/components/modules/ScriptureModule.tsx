import type { Module } from '@/types'

export default function ScriptureModule({ module }: { module: Module }) {
  return (
    <div className="my-12 md:my-16">
      {module.heading && (
        <p className="text-label vw-small mb-6 text-gold">{module.heading}</p>
      )}
      <blockquote className="scripture-block">
        <p className="text-serif-italic vw-body-lg">{module.passage}</p>
      </blockquote>
      {module.reference && (
        <p className="mt-4 text-label vw-small text-muted">
          {module.reference}
          {module.translation && ` (${module.translation})`}
        </p>
      )}
    </div>
  )
}
