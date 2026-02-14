import type { SVGProps } from 'react'

type IconToken =
  | 'identity'
  | 'peace'
  | 'community'
  | 'kingdom'
  | 'provision'
  | 'truth'
  | 'hope'
  | 'clock'
  | 'hearing'
  | 'abide'
  | 'surrender'
  | 'genesis'
  | 'gospel'
  | 'cross'
  | 'belief'
  | 'sin'
  | 'work'
  | 'word'
  | 'blueprint'
  | 'witness'
  | 'fallback'

const SLUG_TO_ICON: Record<string, IconToken> = {
  identity: 'identity',
  peace: 'peace',
  community: 'community',
  kingdom: 'kingdom',
  provision: 'provision',
  truth: 'truth',
  hope: 'hope',
  'too-busy-for-god': 'clock',
  'hearing-god-in-the-noise': 'hearing',
  'abiding-in-his-presence': 'abide',
  'surrender-to-gods-will': 'surrender',
  'in-the-beginning-week-1': 'genesis',
  'what-is-the-gospel': 'gospel',
  'why-jesus': 'cross',
  'what-does-it-mean-to-believe': 'belief',
  'what-is-carrying-a-cross': 'cross',
  'once-saved-always-saved': 'belief',
  'what-happens-when-you-repeatedly-sin': 'sin',
  'the-nature-of-belief': 'belief',
  'the-work-of-god': 'work',
  'the-word-before-words': 'word',
  'genesis-two-stories-of-creation': 'genesis',
  'the-blueprint-of-community': 'blueprint',
  'signs-boldness-opposition-integrity': 'witness',
  'from-jerusalem-to-the-nations': 'witness',
  'witness-under-pressure-expansion': 'witness',
}

function resolveIconToken(slug: string): IconToken {
  if (SLUG_TO_ICON[slug]) {
    return SLUG_TO_ICON[slug]
  }

  if (slug.includes('cross')) return 'cross'
  if (slug.includes('truth') || slug.includes('word')) return 'word'
  if (slug.includes('belief') || slug.includes('saved')) return 'belief'
  if (slug.includes('community')) return 'community'
  if (slug.includes('hope')) return 'hope'

  return 'fallback'
}

function SeriesGlyph({
  token,
  ...props
}: { token: IconToken } & SVGProps<SVGSVGElement>) {
  switch (token) {
    case 'identity':
      return (
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
          {...props}
        >
          <circle cx="12" cy="8" r="3.25" />
          <path d="M5.5 18c1.5-2.5 3.7-3.8 6.5-3.8s5 1.3 6.5 3.8" />
        </svg>
      )
    case 'peace':
      return (
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
          {...props}
        >
          <path d="M7 16c5.5-.8 9.2-4.6 10.4-10.5" />
          <path d="M8.3 12.2c2.1.1 3.8-.5 5.1-1.8" />
          <path d="M10 15.8c1.6.1 3-.3 4.2-1.2" />
          <path d="M14.7 5.5c-.8 2.2-2.6 3.8-4.9 4.2.4-2.6 2.3-4.4 4.9-4.2Z" />
        </svg>
      )
    case 'community':
      return (
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
          {...props}
        >
          <circle cx="8.5" cy="9" r="2.4" />
          <circle cx="15.5" cy="10.2" r="2" />
          <path d="M4.5 18c1-2.3 2.5-3.5 4.1-3.5 2 0 3.8 1.2 4.9 3.5" />
          <path d="M13.4 17.8c.7-1.6 1.8-2.4 3.2-2.4 1 0 1.9.4 2.6 1.2" />
        </svg>
      )
    case 'kingdom':
      return (
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
          {...props}
        >
          <path d="M4 18h16" />
          <path d="m5 18 1.2-7.4 3.9 2.9L12 8l1.9 5.5 3.9-2.9L19 18" />
        </svg>
      )
    case 'provision':
      return (
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
          {...props}
        >
          <path d="M12 19v-7" />
          <path d="M12 12c-3.6 0-6-2.3-6-5.9 3.6 0 6 2.3 6 5.9Z" />
          <path d="M12 12c0-3.6 2.4-5.9 6-5.9 0 3.6-2.4 5.9-6 5.9Z" />
        </svg>
      )
    case 'truth':
      return (
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
          {...props}
        >
          <path d="M5 6c2-.8 4-.8 6 0v12c-2-.8-4-.8-6 0Z" />
          <path d="M19 6c-2-.8-4-.8-6 0v12c2-.8 4-.8 6 0Z" />
          <path d="M11 8h2" />
        </svg>
      )
    case 'hope':
      return (
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
          {...props}
        >
          <path d="M4 16h16" />
          <path d="M7 16a5 5 0 0 1 10 0" />
          <path d="M12 5v3" />
          <path d="m7.5 8.5 1.7 1.7" />
          <path d="m16.5 8.5-1.7 1.7" />
        </svg>
      )
    case 'clock':
      return (
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
          {...props}
        >
          <circle cx="12" cy="12" r="7" />
          <path d="M12 8v4l2.8 1.8" />
        </svg>
      )
    case 'hearing':
      return (
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
          {...props}
        >
          <path d="M12 4.5a5 5 0 0 1 5 5c0 2.1-1.1 3.3-2.4 4.4-.9.8-1.6 1.4-1.6 2.6" />
          <path d="M12 19.5h.01" />
          <path d="M8 10.5A4 4 0 0 1 12 6.5" />
        </svg>
      )
    case 'abide':
      return (
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
          {...props}
        >
          <path d="M6 18c5.6-1 9.4-4.9 10.6-10.8" />
          <path d="M7 13.2c2.2.2 4-.4 5.4-1.7" />
          <path d="M10 16.8c1.9.2 3.4-.2 4.8-1.1" />
        </svg>
      )
    case 'surrender':
      return (
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
          {...props}
        >
          <path d="M12 19V6" />
          <path d="m8.2 9.2 3.8-3.8 3.8 3.8" />
          <path d="M5 18h14" />
        </svg>
      )
    case 'genesis':
      return (
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
          {...props}
        >
          <circle cx="12" cy="12" r="7" />
          <path d="M12 5v14" />
          <path d="M5 12h14" />
        </svg>
      )
    case 'gospel':
      return (
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
          {...props}
        >
          <path d="M6 19V7l6-2 6 2v12" />
          <path d="M9 11h6" />
          <path d="M12 8v6" />
        </svg>
      )
    case 'cross':
      return (
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
          {...props}
        >
          <path d="M12 4v16" />
          <path d="M8 8h8" />
        </svg>
      )
    case 'belief':
      return (
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
          {...props}
        >
          <path d="M5 6c2-.8 4-.8 6 0v12c-2-.8-4-.8-6 0Z" />
          <path d="M19 6c-2-.8-4-.8-6 0v12c2-.8 4-.8 6 0Z" />
          <path d="M8 10h2" />
          <path d="M14 10h2" />
        </svg>
      )
    case 'sin':
      return (
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
          {...props}
        >
          <path d="M12 19a7 7 0 1 0 0-14" />
          <path d="m9.5 9.5 5 5" />
          <path d="m14.5 9.5-5 5" />
        </svg>
      )
    case 'work':
      return (
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
          {...props}
        >
          <path d="M5 18h14" />
          <path d="M7.5 18V8h9v10" />
          <path d="M10 8V6h4v2" />
        </svg>
      )
    case 'word':
      return (
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
          {...props}
        >
          <path d="M5 6c2-.8 4-.8 6 0v12c-2-.8-4-.8-6 0Z" />
          <path d="M11 6v12" />
          <path d="M16.5 8v8" />
          <path d="M14 8h5" />
          <path d="M14 16h5" />
        </svg>
      )
    case 'blueprint':
      return (
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
          {...props}
        >
          <rect x="5" y="5" width="14" height="14" />
          <path d="M10 5v14" />
          <path d="M5 10h14" />
        </svg>
      )
    case 'witness':
      return (
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
          {...props}
        >
          <path d="M12 4v16" />
          <path d="M8 8h8" />
          <path d="M7 16c1.6-1.7 3.2-2.5 5-2.5s3.4.8 5 2.5" />
        </svg>
      )
    case 'fallback':
      return (
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
          {...props}
        >
          <circle cx="12" cy="12" r="7" />
          <path d="m10 14 2-4 2 4h-4Z" />
        </svg>
      )
    default:
      return null
  }
}

export default function SeriesCardIcon({ slug }: { slug: string }) {
  const token = resolveIconToken(slug)

  return (
    <span className="mock-card-icon-wrap" aria-hidden="true">
      <SeriesGlyph token={token} className="mock-card-icon" />
    </span>
  )
}
