import type { Module } from '@/types'
import { typographer } from '@/lib/typographer'

export default function TakeawayModule({ module }: { module: Module }) {
  if (!module.content && !module.commitment) return null

  return (
    <div className="my-16 md:my-24">
      <p className="text-label vw-small mb-6 text-gold">
        {module.heading || 'TAKEAWAY'}
      </p>
      <p className="vw-body leading-relaxed">
        {typographer(module.commitment || module.content || '')}
      </p>

      {module.leavingAtCross && module.leavingAtCross.length > 0 && (
        <div className="mt-10">
          <p className="module-sublabel mb-4">LEAVING AT THE CROSS</p>
          <ul className="space-y-3">
            {module.leavingAtCross.map((item, i) => (
              <li
                key={i}
                className="vw-body leading-relaxed text-secondary pl-5"
                style={{ borderLeft: '2px solid var(--color-border)' }}
              >
                {typographer(item)}
              </li>
            ))}
          </ul>
        </div>
      )}

      {module.receivingFromCross && module.receivingFromCross.length > 0 && (
        <div className="mt-10">
          <p
            className="module-sublabel mb-4"
            style={{ color: 'var(--color-gold)' }}
          >
            RECEIVING FROM THE CROSS
          </p>
          <ul className="space-y-3">
            {module.receivingFromCross.map((item, i) => (
              <li
                key={i}
                className="vw-body leading-relaxed text-secondary pl-5"
                style={{ borderLeft: '2px solid var(--color-gold)' }}
              >
                {typographer(item)}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
