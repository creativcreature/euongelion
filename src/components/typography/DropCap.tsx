import { type ReactNode } from 'react'

/**
 * Drop cap component. Wraps the first character of a paragraph in a
 * span so the editorial drop cap renders reliably across content —
 * the CSS `::first-letter` pseudo-element used previously broke on
 * paragraphs starting with quotation marks, em-dashes, or any
 * non-letter Unicode (audit §04 finding #1).
 *
 * Usage:
 *
 *   <p className="lead">
 *     <DropCap>I</DropCap>n the beginning was the Word...
 *   </p>
 *
 *   <DropCap text="In the beginning was the Word..." />
 *
 * The span gets `.dropcap` class — styled in globals.css.
 */
export default function DropCap({
  text,
  children,
  className = 'dropcap',
}: {
  text?: string
  children?: ReactNode
  className?: string
}) {
  // If `children` is a string, split first grapheme.
  // If `text` prop is provided, use it.
  // If `children` is a single character (e.g., <DropCap>I</DropCap>),
  // wrap it directly.
  if (typeof children === 'string') {
    const first = Array.from(children)[0] ?? ''
    const rest = children.slice(first.length)
    return (
      <>
        <span className={className} aria-hidden="false">
          {first}
        </span>
        {rest}
      </>
    )
  }
  if (text) {
    const first = Array.from(text)[0] ?? ''
    const rest = text.slice(first.length)
    return (
      <>
        <span className={className} aria-hidden="false">
          {first}
        </span>
        {rest}
      </>
    )
  }
  return <span className={className}>{children}</span>
}
