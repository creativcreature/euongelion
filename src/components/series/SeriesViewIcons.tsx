import type { ViewId } from './SeriesLayouts'

/**
 * One glyph per layout (F-094).
 *
 * Each icon is a miniature of the layout it switches to — the Rack really is a
 * rail with papers over it, Spines really are bars of different widths, the
 * Index really has a dot leader. A reader can tell what they will get before
 * they press it, which a set of generic grid/list icons cannot do.
 *
 * Drawn on a 20x20 box with 1.2px hairlines in `currentColor`, so they sit in
 * the same weight as the rules and caps around them.
 */
const S = {
  width: 20,
  height: 20,
  viewBox: '0 0 20 20',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.2,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
  'aria-hidden': true,
}

export function ViewIcon({ id }: { id: ViewId }) {
  switch (id) {
    // One lead plate, smaller tiles around it.
    case 'feature':
      return (
        <svg {...S}>
          <rect x="2.5" y="2.5" width="9" height="9" rx="0.5" />
          <rect x="13.5" y="2.5" width="4" height="4" rx="0.5" />
          <rect x="13.5" y="8.5" width="4" height="3" rx="0.5" />
          <rect x="2.5" y="13.5" width="6" height="4" rx="0.5" />
          <rect x="10.5" y="13.5" width="7" height="4" rx="0.5" />
        </svg>
      )
    // A rail with papers folded over it.
    case 'rack':
      return (
        <svg {...S}>
          <path d="M2 7h16" />
          <path d="M4.5 7v8.5M9 7v9M13.5 7v8.5M18 7v8" />
          <path d="M3 4.5l2 2.5M7.5 4.5l1.5 2.5M12 4.5l1.5 2.5M16.5 4.5l1.5 2.5" />
        </svg>
      )
    // Uniform portrait plates.
    case 'covers':
      return (
        <svg {...S}>
          <rect x="2.5" y="2.5" width="6.5" height="15" rx="0.5" />
          <rect x="11" y="2.5" width="6.5" height="15" rx="0.5" />
        </svg>
      )
    // Shelf: bars of different widths on a board.
    case 'spines':
      return (
        <svg {...S}>
          <path d="M2 17h16" />
          <rect x="3" y="4" width="2.4" height="12" />
          <rect x="6.6" y="6" width="1.8" height="10" />
          <rect x="9.6" y="3" width="3" height="13" />
          <rect x="13.8" y="5.5" width="2.2" height="10.5" />
        </svg>
      )
    // Dense rows.
    case 'list':
      return (
        <svg {...S}>
          <path d="M2.5 5h15M2.5 8.5h15M2.5 12h15M2.5 15.5h15" />
        </svg>
      )
    // Hung by eye: unequal blocks.
    case 'mosaic':
      return (
        <svg {...S}>
          <rect x="2.5" y="2.5" width="6" height="7" />
          <rect x="10" y="2.5" width="7.5" height="4.5" />
          <rect x="10" y="8.5" width="7.5" height="9" />
          <rect x="2.5" y="11" width="6" height="6.5" />
        </svg>
      )
    // Numbered issues, stacked.
    case 'issues':
      return (
        <svg {...S}>
          <rect x="2.5" y="3" width="15" height="4" rx="0.5" />
          <rect x="2.5" y="8" width="15" height="4" rx="0.5" />
          <rect x="2.5" y="13" width="15" height="4" rx="0.5" />
          <path d="M5 5h1M5 10h1M5 15h1" />
        </svg>
      )
    default:
      return null
  }
}
