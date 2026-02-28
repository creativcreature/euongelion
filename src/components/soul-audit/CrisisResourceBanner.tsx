'use client'

import FadeIn from '@/components/motion/FadeIn'
import { typographer } from '@/lib/typographer'
import type { CrisisResource } from '@/types/soul-audit'

type CrisisResourceBannerProps = {
  prompt: string
  resources: CrisisResource[]
  acknowledged: boolean
  onAcknowledgeChange: (acknowledged: boolean) => void
}

function crisisResourceHref(resource: CrisisResource): string | null {
  const normalized = resource.contact.toLowerCase()
  if (normalized.includes('741741')) return 'sms:741741?body=HOME'
  if (normalized.includes('988')) return 'tel:988'
  return null
}

export default function CrisisResourceBanner({
  prompt,
  resources,
  acknowledged,
  onAcknowledgeChange,
}: CrisisResourceBannerProps) {
  return (
    <FadeIn>
      <section
        className="mb-6 rounded-none border p-6"
        style={{ borderColor: 'var(--color-border)' }}
      >
        <div>
          <p className="text-label vw-small mb-2 text-gold">CRISIS SUPPORT</p>
          <p className="vw-small mb-2 text-secondary">{typographer(prompt)}</p>
          <div className="grid gap-2">
            {resources.map((resource) => {
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
              onChange={(e) => onAcknowledgeChange(e.target.checked)}
            />
            <span className="vw-small">
              I acknowledge the crisis resources above before continuing to
              devotional options.
            </span>
          </label>
        </div>
      </section>
    </FadeIn>
  )
}
