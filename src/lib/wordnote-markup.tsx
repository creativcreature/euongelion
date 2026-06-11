import { Fragment, type ReactNode } from 'react'
import WordNote from '@/components/WordNote'
import { typographer } from '@/lib/typographer'

// Inline WordNote marker syntax embedded in devotional prose:
//
//   {{wn:shalom|peace}}
//        └ bank id   └ surface text shown in the sentence
//
// A marker resolves to a crimson-underlined <WordNote>. Plain text between
// markers is passed through the existing typographer (smart quotes, etc.) so
// typography is unchanged where no markers exist. Content authors (and the
// grounded weave) opt in by emitting markers; nothing is auto-linked, so no
// word is ever annotated out of context.
const MARKER = /\{\{wn:([a-z0-9-]+)\|([^}]*)\}\}/g

/** Does this string contain any WordNote markers? Cheap guard for hot paths. */
export function hasWordNoteMarkup(text: string): boolean {
  return text.includes('{{wn:')
}

/**
 * Render a string, converting `{{wn:id|surface}}` markers into <WordNote>
 * elements and passing the remaining text through the typographer. When there
 * are no markers, returns the typographed string untouched.
 */
export function renderWithWordNotes(text: string): ReactNode {
  if (!text) return text
  if (!hasWordNoteMarkup(text)) return typographer(text)

  const nodes: ReactNode[] = []
  let lastIndex = 0
  let match: RegExpExecArray | null
  MARKER.lastIndex = 0
  let key = 0

  while ((match = MARKER.exec(text)) !== null) {
    const [full, id, surface] = match
    if (match.index > lastIndex) {
      nodes.push(
        <Fragment key={key++}>
          {typographer(text.slice(lastIndex, match.index))}
        </Fragment>,
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
    nodes.push(
      <Fragment key={key++}>{typographer(text.slice(lastIndex))}</Fragment>,
    )
  }

  return <>{nodes}</>
}
