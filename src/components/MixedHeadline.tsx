import type { ReactNode } from 'react'

type HeadingTag = 'h1' | 'h2' | 'h3' | 'h4' | 'p' | 'span'
type HeadlineSize = 'xl' | 'lg' | 'md' | 'sm'

/**
 * Sizes are bound to the locked ratio-based type scale tokens
 * (design-system/typography-craft.css → --ts-*) so the headline cadence
 * matches the rest of the hierarchy instead of carrying its own clamps.
 * Line-heights use the shared --lh-* tokens for the same reason.
 */
const sizeStyles: Record<HeadlineSize, React.CSSProperties> = {
  xl: { fontSize: 'var(--ts-3xl)', lineHeight: 'var(--lh-display)' },
  lg: { fontSize: 'var(--ts-2xl)', lineHeight: 'var(--lh-display)' },
  md: { fontSize: 'var(--ts-xl)', lineHeight: 'var(--lh-heading)' },
  sm: { fontSize: 'var(--ts-lg)', lineHeight: 'var(--lh-heading)' },
}

/**
 * Emphasis-based mixed headline system.
 *
 * KEY/POWER words → <Serif> (Instrument Serif italic, larger feel)
 * STRUCTURAL words → <Sans> (Instrument Serif upright, caps, tighter)
 *
 * Usage:
 * <MixedHeadline as="h1" size="xl">
 *   <Sans>DAILY</Sans> <Serif>bread</Serif> for the <Serif>cluttered, hungry</Serif> <Sans>SOUL</Sans>
 * </MixedHeadline>
 */
export default function MixedHeadline({
  as: Tag = 'h2',
  size = 'md',
  className = '',
  style,
  children,
}: {
  as?: HeadingTag
  size?: HeadlineSize
  className?: string
  style?: React.CSSProperties
  children: ReactNode
}) {
  return (
    <Tag
      // .font-display token-enforces Instrument Serif (display role) so the
      // headline typeface no longer relies on an ambient serif cascade.
      className={`headline-mixed font-display ${className}`}
      style={{ ...sizeStyles[size], ...style }}
    >
      {children}
    </Tag>
  )
}

/** Upright fragment: Instrument Serif, bold, uppercase, tight tracking */
export function Sans({
  children,
  className = '',
}: {
  children: ReactNode
  className?: string
}) {
  return <span className={`headline-sans ${className}`}>{children}</span>
}

/** Serif fragment: Instrument Serif Italic, natural case, flowing */
export function Serif({
  children,
  className = '',
}: {
  children: ReactNode
  className?: string
}) {
  return <span className={`headline-serif ${className}`}>{children}</span>
}
