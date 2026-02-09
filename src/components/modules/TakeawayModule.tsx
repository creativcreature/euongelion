import type { Module } from '@/types'

export default function TakeawayModule({ module }: { module: Module }) {
  if (!module.content && !module.commitment) return null

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
      <p className="vw-body-lg leading-relaxed">
        {module.commitment || module.content}
      </p>

      {module.leavingAtCross && module.leavingAtCross.length > 0 && (
        <div className="mt-6">
          <p className="text-label vw-small mb-3 text-muted">
            LEAVING AT THE CROSS
          </p>
          <ul className="space-y-2">
            {module.leavingAtCross.map((item, i) => (
              <li
                key={i}
                className="vw-body leading-relaxed text-secondary pl-4"
                style={{ borderLeft: '2px solid var(--color-border)' }}
              >
                {item}
              </li>
            ))}
          </ul>
        </div>
      )}

      {module.receivingFromCross && module.receivingFromCross.length > 0 && (
        <div className="mt-6">
          <p className="text-label vw-small mb-3 text-gold">
            RECEIVING FROM THE CROSS
          </p>
          <ul className="space-y-2">
            {module.receivingFromCross.map((item, i) => (
              <li
                key={i}
                className="vw-body leading-relaxed text-secondary pl-4"
                style={{ borderLeft: '2px solid var(--color-gold)' }}
              >
                {item}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
