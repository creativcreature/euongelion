import type { Module } from '@/types'

export default function ResourceModule({ module }: { module: Module }) {
  if (!module.resources || module.resources.length === 0) return null

  return (
    <div className="my-12 md:my-16">
      <p className="text-label vw-small mb-6 text-gold">
        {module.heading || 'FURTHER READING'}
      </p>
      <div className="space-y-4">
        {module.resources.map((resource, i) => (
          <div
            key={i}
            className="py-4"
            style={{ borderBottom: '1px solid var(--color-border)' }}
          >
            {resource.url ? (
              <a
                href={resource.url}
                target="_blank"
                rel="noopener noreferrer"
                className="vw-body transition-colors duration-300 hover:text-gold"
              >
                {resource.title} &rarr;
              </a>
            ) : (
              <p className="vw-body">{resource.title}</p>
            )}
            {resource.description && (
              <p className="vw-small mt-2 text-secondary">
                {resource.description}
              </p>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
