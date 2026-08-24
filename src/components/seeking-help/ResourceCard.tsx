import type { Badge, Resource } from '@/data/georgia-help'

/**
 * One resource, as a card.
 *
 * Ordered the way a stressed person reads: what it is, what it does for them,
 * then the number — large and tappable, because most people who reach this
 * page are on a phone and the phone call IS the action. Everything else
 * (hours, coverage, caveats) sits below the number, not above it.
 */

const BADGE_TONE: Record<Badge, string> = {
  Free: 'gahelp-badge--good',
  '24/7': 'gahelp-badge--good',
  'Faith-based': 'gahelp-badge--faith',
  Español: 'gahelp-badge--neutral',
  'Text available': 'gahelp-badge--neutral',
  Statewide: 'gahelp-badge--neutral',
  'Metro Atlanta': 'gahelp-badge--neutral',
  Youth: 'gahelp-badge--neutral',
  'Sliding scale': 'gahelp-badge--neutral',
  'Walk-in': 'gahelp-badge--neutral',
  Government: 'gahelp-badge--neutral',
}

export default function ResourceCard({ resource }: { resource: Resource }) {
  const {
    name,
    what,
    phone,
    phoneDigits,
    altPhone,
    text,
    url,
    urlLabel,
    hours,
    coverage,
    badges,
    barrier,
    caution,
  } = resource

  return (
    <article className="gahelp-card">
      <h3 className="gahelp-card-name">{name}</h3>
      <p className="gahelp-card-what">{what}</p>

      {phone && phoneDigits && (
        <a
          href={`tel:${phoneDigits}`}
          className="gahelp-call"
          aria-label={`Call ${name} at ${phone}`}
        >
          <span aria-hidden="true" className="gahelp-call-icon">
            ☎
          </span>
          <span className="gahelp-call-number">{phone}</span>
        </a>
      )}

      {altPhone && (
        <a
          href={`tel:${altPhone.phoneDigits}`}
          className="gahelp-call gahelp-call--alt"
          aria-label={`${altPhone.label}: call ${altPhone.phone}`}
        >
          <span className="gahelp-call-alt-label">{altPhone.label}</span>
          <span className="gahelp-call-number">{altPhone.phone}</span>
        </a>
      )}

      {text && <p className="gahelp-card-text-line">{text}</p>}

      <dl className="gahelp-meta">
        {hours && (
          <div className="gahelp-meta-row">
            <dt>When</dt>
            <dd>{hours}</dd>
          </div>
        )}
        {coverage && (
          <div className="gahelp-meta-row">
            <dt>Where</dt>
            <dd>{coverage}</dd>
          </div>
        )}
        {url && (
          <div className="gahelp-meta-row">
            <dt>Online</dt>
            <dd>
              <a
                href={url}
                className="link-highlight"
                target="_blank"
                rel="noreferrer noopener"
              >
                {urlLabel ?? url}
              </a>
            </dd>
          </div>
        )}
      </dl>

      {badges.length > 0 && (
        <ul className="gahelp-badges" aria-label="Details">
          {badges.map((badge) => (
            <li key={badge} className={`gahelp-badge ${BADGE_TONE[badge]}`}>
              {badge}
            </li>
          ))}
        </ul>
      )}

      {barrier && (
        <p className="gahelp-note gahelp-note--barrier">
          <span className="gahelp-note-label">Good to know</span>
          {barrier}
        </p>
      )}

      {caution && (
        <p className="gahelp-note gahelp-note--caution">
          <span className="gahelp-note-label">Before you go</span>
          {caution}
        </p>
      )}
    </article>
  )
}
