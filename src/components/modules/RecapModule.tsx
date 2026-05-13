import type { Module } from '@/types'
import { typographer } from '@/lib/typographer'

export default function RecapModule({ module }: { module: Module }) {
  if (!module.days || module.days.length === 0) return null

  return (
    <div className="my-16 md:my-24">
      <p className="text-label vw-small mb-6 text-gold">
        {module.heading || 'WHAT WE&rsquo;VE WALKED THROUGH'}
      </p>

      {module.intro && (
        <p className="vw-body leading-relaxed type-prose mb-12">
          {typographer(module.intro)}
        </p>
      )}

      <ol className="space-y-10">
        {module.days.map((d) => (
          <li key={d.day}>
            <p className="module-sublabel mb-2">DAY {d.day}</p>
            <h3 className="text-serif vw-body-lg mb-3">{d.title}</h3>
            <p className="vw-body leading-relaxed text-secondary type-prose">
              {typographer(d.key_insight)}
            </p>
            {d.anchor_verse && (
              <p
                className="mt-3 vw-small text-tertiary type-prose"
                style={{ fontStyle: 'italic' }}
              >
                {d.anchor_verse}
              </p>
            )}
          </li>
        ))}
      </ol>

      {module.integration_question && (
        <div
          className="mt-16 pt-10"
          style={{ borderTop: '1px solid var(--color-border)' }}
        >
          <p
            className="module-sublabel mb-4"
            style={{ color: 'var(--color-gold)' }}
          >
            SIT WITH THIS
          </p>
          <p className="text-serif-italic vw-body-lg leading-relaxed type-prose">
            {typographer(module.integration_question)}
          </p>
        </div>
      )}

      {module.transition_to_sabbath && (
        <p className="mt-10 vw-small text-tertiary type-prose">
          {typographer(module.transition_to_sabbath)}
        </p>
      )}
    </div>
  )
}
