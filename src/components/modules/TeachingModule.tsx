import type { Module } from '@/types'

export default function TeachingModule({ module }: { module: Module }) {
  if (!module.content) return null

  const paragraphs = module.content.split('\n\n')

  return (
    <div className="my-12 md:my-16">
      {module.heading && (
        <h3 className="text-display vw-heading-md mb-8">{module.heading}</h3>
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
