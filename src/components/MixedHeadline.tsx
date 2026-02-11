import type { ReactNode } from 'react'

type HeadingTag = 'h1' | 'h2' | 'h3' | 'h4' | 'p' | 'span'
type HeadlineSize = 'xl' | 'lg' | 'md' | 'sm'

const sizeStyles: Record<HeadlineSize, React.CSSProperties> = {
  xl: { fontSize: 'clamp(2.5rem, 6vw, 5rem)', lineHeight: 1.05 },
  lg: { fontSize: 'clamp(1.875rem, 4vw, 3.5rem)', lineHeight: 1.1 },
  md: { fontSize: 'clamp(1.5rem, 2.5vw, 2.5rem)', lineHeight: 1.2 },
  sm: { fontSize: 'clamp(1.125rem, 1.5vw, 1.375rem)', lineHeight: 1.3 },
}

/**
 * Emphasis-based mixed headline system.
 *
 * KEY/POWER words → <Serif> (Instrument Serif italic, larger feel)
 * STRUCTURAL words → <Sans> (Inter, caps, bold, tighter)
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
      className={`headline-mixed ${className}`}
      style={{ ...sizeStyles[size], ...style }}
    >
      {children}
    </Tag>
  )
}

/** Sans fragment: Inter, bold, uppercase, tight tracking */
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
