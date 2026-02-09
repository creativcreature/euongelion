import type { Module } from '@/types'

export default function ProfileModule({ module }: { module: Module }) {
  if (!module.bio && !module.description && !module.name) return null

  const bodyText = module.description || module.bio || ''
  const paragraphs = bodyText ? bodyText.split('\n\n') : []

  return (
    <div className="module-card my-12 p-8 md:my-16 md:p-10">
      <p className="text-label vw-small mb-4 text-gold">
        {module.heading || 'HISTORICAL FIGURE'}
      </p>
      <h3 className="text-display vw-heading-md mb-2">{module.name}</h3>
      {module.era && <p className="vw-small mb-6 text-muted">{module.era}</p>}
      {paragraphs.length > 0 && (
        <div className="space-y-6">
          {paragraphs.map((paragraph, i) => (
            <p key={i} className="vw-body leading-relaxed text-secondary">
              {paragraph}
            </p>
          ))}
        </div>
      )}
      {module.keyQuote && (
        <blockquote className="module-callout mt-6">
          <p className="text-serif-italic vw-body-lg leading-relaxed">
            &ldquo;{module.keyQuote}&rdquo;
          </p>
        </blockquote>
      )}
      {module.lessonForUs && (
        <div className="mt-6">
          <p className="module-sublabel mb-2">LESSON FOR US</p>
          <p className="vw-body leading-relaxed text-secondary">
            {module.lessonForUs}
          </p>
        </div>
      )}
    </div>
  )
}
