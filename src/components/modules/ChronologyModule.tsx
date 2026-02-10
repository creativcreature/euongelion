import type { Module } from '@/types'
import { typographer } from '@/lib/typographer'

export default function ChronologyModule({ module }: { module: Module }) {
  const hasEvents = module.events && module.events.length > 0
  if (!hasEvents && !module.content) return null

  return (
    <div className="my-16 md:my-24">
      <p className="text-label vw-small mb-8 text-gold">
        {module.heading || 'TIMELINE'}
      </p>

      {module.content && (
        <p className="vw-body leading-relaxed text-secondary mb-10">
          {typographer(module.content)}
        </p>
      )}

      {hasEvents && (
        <div
          className="relative pl-8"
          style={{ borderLeft: '2px solid var(--color-border)' }}
        >
          {module.events!.map((event, i) => (
            <div key={i} className="relative mb-10 last:mb-0">
              <div
                className="absolute -left-[calc(2rem+5px)] top-1 h-2.5 w-2.5 rounded-full"
                style={{ backgroundColor: 'var(--color-gold)' }}
              />
              {event.date && (
                <p className="text-label vw-small mb-2 text-gold">
                  {event.date}
                </p>
              )}
              <p className="vw-body leading-relaxed">
                {typographer(event.description)}
              </p>
              {event.significance && (
                <p className="vw-small mt-2 italic text-muted">
                  {typographer(event.significance)}
                </p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
