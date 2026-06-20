'use client'

import { Children, Fragment, isValidElement, type ReactNode } from 'react'
import ReactMarkdown from 'react-markdown'
import WordNote from '@/components/WordNote'

// Render grounded devotional prose (markdown) while converting inline
// `{{wn:id|surface}}` WordNote markers into interactive <WordNote> elements.
//
// Why this exists: the Daily Bread reader renders the grounded weave's woven
// body (content.textB / prayer / deep-dive) as markdown. The grounded weave now
// EMITS WordNote markers into that prose (see grounded-weave.ts), but markers
// are not markdown syntax — `marked`/`react-markdown` pass them through as plain
// text. This component renders the markdown normally, then replaces any marker
// found in a text node with a <WordNote> (which itself renders plain text for an
// unknown bank id, so a stray/unknown id can never fabricate a note).
const MARKER = /\{\{wn:([a-z0-9-]+)\|([^}]*)\}\}/g

/** Does this markdown carry any WordNote markers? Cheap guard for the hot path. */
export function hasWordNoteMarkers(text: string): boolean {
  return typeof text === 'string' && text.includes('{{wn:')
}

/** Convert marker substrings inside a plain string into text + <WordNote> nodes. */
function renderStringWithMarkers(text: string): ReactNode {
  if (!text.includes('{{wn:')) return text
  const nodes: ReactNode[] = []
  let lastIndex = 0
  let match: RegExpExecArray | null
  MARKER.lastIndex = 0
  let key = 0
  while ((match = MARKER.exec(text)) !== null) {
    const [full, id, surface] = match
    if (match.index > lastIndex) {
      nodes.push(
        <Fragment key={key++}>{text.slice(lastIndex, match.index)}</Fragment>,
      )
    }
    nodes.push(
      <WordNote key={key++} id={id}>
        {surface}
      </WordNote>,
    )
    lastIndex = match.index + full.length
  }
  if (lastIndex < text.length) {
    nodes.push(<Fragment key={key++}>{text.slice(lastIndex)}</Fragment>)
  }
  return <>{nodes}</>
}

/**
 * Recursively walk react-markdown children, replacing marker text inside string
 * leaves with WordNote nodes. Non-string children (already-rendered elements)
 * pass through; their string children are processed in turn via `processChildren`.
 */
function processChildren(children: ReactNode): ReactNode {
  return Children.map(children, (child) => {
    if (typeof child === 'string') return renderStringWithMarkers(child)
    if (
      isValidElement<{ children?: ReactNode }>(child) &&
      child.props.children
    ) {
      // Leave the element type/props intact; only transform its children.
      return child
    }
    return child
  })
}

export default function MarkdownWithWordNotes({
  markdown,
  className,
}: {
  markdown: string
  className?: string
}) {
  if (!markdown) return null

  // Fast path: no markers → plain markdown, no per-node walking.
  if (!hasWordNoteMarkers(markdown)) {
    return (
      <div className={className}>
        <ReactMarkdown>{markdown}</ReactMarkdown>
      </div>
    )
  }

  return (
    <div className={className}>
      <ReactMarkdown
        components={{
          p: ({ children }) => <p>{processChildren(children)}</p>,
          li: ({ children }) => <li>{processChildren(children)}</li>,
          em: ({ children }) => <em>{processChildren(children)}</em>,
          strong: ({ children }) => (
            <strong>{processChildren(children)}</strong>
          ),
          blockquote: ({ children }) => (
            // Verbatim Scripture lives here; the weave never marks blockquote
            // lines, but we still process for safety (no-op when clean).
            <blockquote>{processChildren(children)}</blockquote>
          ),
        }}
      >
        {markdown}
      </ReactMarkdown>
    </div>
  )
}
