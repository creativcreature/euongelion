import type { Module } from '@/types'

export default function StoryModule({ module }: { module: Module }) {
  if (!module.content) return null

  const paragraphs = module.content.split('\n\n')

  return (
    <div className="my-12 md:my-16">
      {module.heading && (
        <p className="text-label vw-small mb-6 text-gold">{module.heading}</p>
      )}
      <div className="space-y-6">
        {paragraphs.map((paragraph, i) => (
          <p key={i} className="text-serif-italic vw-body-lg leading-relaxed">
            {paragraph}
          </p>
        ))}
      </div>
      {module.connectionToTheme && (
        <p className="mt-8 vw-body leading-relaxed text-secondary">
          {module.connectionToTheme}
        </p>
      )}
    </div>
  )
}
