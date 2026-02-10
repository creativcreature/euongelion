import type { Module } from '@/types'
import { typographer } from '@/lib/typographer'

export default function StoryModule({ module }: { module: Module }) {
  if (!module.content) return null

  const paragraphs = module.content.split('\n\n')

  return (
    <div className="my-16 md:my-24">
      {module.heading && (
        <p className="text-label vw-small mb-8 text-gold">{module.heading}</p>
      )}
      <div className="space-y-6">
        {paragraphs.map((paragraph, i) => (
          <p key={i} className="text-serif-italic vw-body-lg leading-relaxed">
            {typographer(paragraph)}
          </p>
        ))}
      </div>
      {module.connectionToTheme && (
        <p className="mt-10 vw-body leading-relaxed text-secondary">
          {typographer(module.connectionToTheme)}
        </p>
      )}
    </div>
  )
}
