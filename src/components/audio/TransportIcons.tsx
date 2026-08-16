/**
 * Transport glyphs for the Audio Edition.
 *
 * Every icon is a pure function of `size`, paints with `currentColor`, and is
 * `aria-hidden`. Those three rules are what let one set serve the in-page panel
 * and the mini bar, in light mode and dark, with the accessible name living on
 * the button rather than the drawing.
 *
 * `currentColor` in particular is load-bearing rather than tidy: `--color-gold`
 * resolves to COBALT #1f2a8d in light mode (the alias is historical), so any
 * glyph that hardcoded a fill would go invisible in one theme. That trap has
 * shipped twice already — SA-044 and SA-047.
 */

interface IconProps {
  size?: number
}

interface SkipIconProps extends IconProps {
  /** Drawn inside the arc, because an unlabelled arrow never says how far. */
  seconds?: number
}

const DEFAULT_SIZE = 22

/** Shared attributes. Keeping them here stops one icon drifting from the rest. */
function svgProps(size: number) {
  return {
    width: size,
    height: size,
    viewBox: '0 0 24 24',
    'aria-hidden': true as const,
    focusable: 'false' as const,
  }
}

export function PlayIcon({ size = DEFAULT_SIZE }: IconProps) {
  return (
    <svg {...svgProps(size)}>
      <path d="M8 5.2v13.6L19 12z" fill="currentColor" />
    </svg>
  )
}

export function PauseIcon({ size = DEFAULT_SIZE }: IconProps) {
  return (
    <svg {...svgProps(size)}>
      <rect x="7" y="5" width="3.4" height="14" fill="currentColor" />
      <rect x="13.6" y="5" width="3.4" height="14" fill="currentColor" />
    </svg>
  )
}

/**
 * Back-by-N. A counter-clockwise arc with the interval centred inside it —
 * the Audible idiom, and legible at 22px in a way a bare chevron is not.
 */
export function SkipBackIcon({
  size = DEFAULT_SIZE,
  seconds = 15,
}: SkipIconProps) {
  return (
    <svg {...svgProps(size)}>
      <path
        d="M12 4.6a7.4 7.4 0 1 1-7.4 7.4"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      <path d="M12 1.6 8.6 4.6 12 7.6z" fill="currentColor" />
      <text
        x="12.4"
        y="15.4"
        textAnchor="middle"
        fontSize="7.6"
        fontWeight="500"
        fill="currentColor"
      >
        {seconds}
      </text>
    </svg>
  )
}

/** Forward-by-N — the mirror of {@link SkipBackIcon}, so the pair reads at a glance. */
export function SkipForwardIcon({
  size = DEFAULT_SIZE,
  seconds = 15,
}: SkipIconProps) {
  return (
    <svg {...svgProps(size)}>
      <path
        d="M12 4.6a7.4 7.4 0 1 0 7.4 7.4"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      <path d="M12 1.6 15.4 4.6 12 7.6z" fill="currentColor" />
      <text
        x="11.6"
        y="15.4"
        textAnchor="middle"
        fontSize="7.6"
        fontWeight="500"
        fill="currentColor"
      >
        {seconds}
      </text>
    </svg>
  )
}

export function ChapterPrevIcon({ size = DEFAULT_SIZE }: IconProps) {
  return (
    <svg {...svgProps(size)}>
      <rect x="6" y="6" width="2.2" height="12" fill="currentColor" />
      <path d="M18.4 6.4v11.2L10 12z" fill="currentColor" />
    </svg>
  )
}

export function ChapterNextIcon({ size = DEFAULT_SIZE }: IconProps) {
  return (
    <svg {...svgProps(size)}>
      <rect x="15.8" y="6" width="2.2" height="12" fill="currentColor" />
      <path d="M5.6 6.4v11.2L14 12z" fill="currentColor" />
    </svg>
  )
}

/** Chapter list — three rules with leading marks, a table of contents in miniature. */
export function ChaptersIcon({ size = DEFAULT_SIZE }: IconProps) {
  return (
    <svg {...svgProps(size)}>
      <g fill="currentColor">
        <rect x="4" y="6" width="2" height="2" />
        <rect x="8" y="6.4" width="12" height="1.3" />
        <rect x="4" y="11" width="2" height="2" />
        <rect x="8" y="11.4" width="12" height="1.3" />
        <rect x="4" y="16" width="2" height="2" />
        <rect x="8" y="16.4" width="12" height="1.3" />
      </g>
    </svg>
  )
}

/** Sleep timer — a crescent, drawn as a difference of two arcs. */
export function SleepIcon({ size = DEFAULT_SIZE }: IconProps) {
  return (
    <svg {...svgProps(size)}>
      <path
        d="M19.2 14.8A8 8 0 0 1 9.2 4.8a8 8 0 1 0 10 10z"
        fill="currentColor"
      />
    </svg>
  )
}

/**
 * Clip this moment — a bookmark pennant.
 *
 * Deliberately NOT a pen: the control captures a timestamp first and only then
 * offers a note, so the glyph should promise a mark rather than an essay.
 */
export function ClipIcon({ size = DEFAULT_SIZE }: IconProps) {
  return (
    <svg {...svgProps(size)}>
      <path
        d="M7 4h10v16l-5-4.4L7 20z"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
    </svg>
  )
}
