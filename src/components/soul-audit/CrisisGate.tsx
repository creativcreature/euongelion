'use client'

import { typographer } from '@/lib/typographer'
import { crisisResourceHref } from './helpers'
import type { CrisisRequirement } from '@/types/soul-audit'

interface CrisisGateProps {
  crisis: CrisisRequirement
  acknowledged: boolean
  onToggle: (checked: boolean) => void
}

export default function CrisisGate({
  crisis,
  acknowledged,
  onToggle,
}: CrisisGateProps) {
  if (!crisis.required) return null

  return (
    <section
      className="mb-6 rounded-none border p-6"
      style={{ borderColor: 'var(--color-border)' }}
    >
      <p className="text-label vw-small mb-2 text-gold">CRISIS SUPPORT</p>
      <p className="vw-small mb-2 text-secondary">
        {typographer(crisis.prompt)}
      </p>
      <div className="grid gap-2">
        {crisis.resources.map((resource) => {
          const href = crisisResourceHref(resource)
          return (
            <p key={resource.name} className="vw-small text-secondary">
              <span className="text-label vw-small text-gold">
                {resource.name}:
              </span>{' '}
              {href ? (
                <a href={href} className="link-highlight" rel="noreferrer">
                  {resource.contact}
                </a>
              ) : (
                resource.contact
              )}
            </p>
          )
        })}
      </div>
      <a
        href="tel:988"
        className="text-label vw-small link-highlight mt-3 inline-block"
      >
        I NEED IMMEDIATE HELP NOW
      </a>
      <label className="flex items-start gap-3">
        <input
          type="checkbox"
          checked={acknowledged}
          onChange={(e) => onToggle(e.target.checked)}
        />
        <span className="vw-small">
          I acknowledge the crisis resources above before continuing to
          devotional options.
        </span>
      </label>
    </section>
  )
}
