/**
 * The Daily Bread V2 — the funnies, drawn deterministically (F-184).
 *
 * Server component. The strip is an SvgNode tree from the comic renderer,
 * checked by assertSafeSvgTree and mapped to React elements one by one — no
 * dangerouslySetInnerHTML, no markup strings. A wide three-panel SVG shows at
 * 700px and up; below that the stylesheet swaps in a stack of single panels.
 */
import { createElement, useId, type ReactElement } from 'react'
import type { ComicScript } from '@/lib/daily-bread/types'
import {
  renderComicPanelSvg,
  renderComicStrip,
} from '@/lib/daily-bread/comic/render'
import { assertSafeSvgTree, type SvgNode } from '@/lib/daily-bread/comic/svg'

type ComicLevel =
  | 'generated-script'
  | 'deterministic-script'
  | 'archive-reprint'

const REACT_ATTR_NAMES: Record<string, string> = {
  class: 'className',
  'stroke-width': 'strokeWidth',
  'stroke-linecap': 'strokeLinecap',
  'stroke-linejoin': 'strokeLinejoin',
}

/** Give the root's <title> an id so aria-labelledby can include it. */
function withTitleId(tree: SvgNode, id: string): SvgNode {
  return {
    ...tree,
    children: (tree.children ?? []).map((child) =>
      child.tag === 'title'
        ? { ...child, attrs: { ...child.attrs, id } }
        : child,
    ),
  }
}

function toReact(
  node: SvgNode,
  key: string | number,
  extraProps: Record<string, string> = {},
): ReactElement {
  const props: Record<string, string | number> = {}
  for (const [name, value] of Object.entries(node.attrs)) {
    props[REACT_ATTR_NAMES[name] ?? name] = value
  }
  const children: (ReactElement | string)[] = []
  if (node.text !== undefined) children.push(node.text)
  ;(node.children ?? []).forEach((child, index) => {
    children.push(toReact(child, index))
  })
  return createElement(node.tag, { ...props, ...extraProps, key }, ...children)
}

function safeSvg(
  tree: SvgNode,
  key: string | number,
  extraProps: Record<string, string>,
): ReactElement {
  assertSafeSvgTree(tree)
  return toReact(tree, key, extraProps)
}

export default function ComicStrip({
  script,
  caption,
  level,
  firstRan,
}: {
  script: ComicScript
  caption: string
  level: ComicLevel
  firstRan?: string
}) {
  const baseId = useId()
  const titleId = `${baseId}-title`
  const listId = `${baseId}-panels`
  const panelId = (index: number) => `${baseId}-panel-${index + 1}`

  const strip = safeSvg(
    withTitleId(renderComicStrip(script), titleId),
    'strip',
    {
      'aria-labelledby': `${titleId} ${listId}`,
    },
  )

  return (
    <figure className="db2-comic" data-comic-level={level}>
      {strip}
      <ol className="db2-comic-stack">
        {script.panels.map((_, index) => (
          <li key={index} className="db2-comic-stack-panel">
            {safeSvg(renderComicPanelSvg(script, index), 'panel', {
              'aria-labelledby': panelId(index),
            })}
          </li>
        ))}
      </ol>
      <ol className="sr-only" id={listId}>
        {script.panels.map((panel, index) => (
          <li key={index} id={panelId(index)}>
            {`Panel ${index + 1}: ${panel.description}`}
            {panel.caption ? ` “${panel.caption}”` : null}
          </li>
        ))}
      </ol>
      <figcaption className="db2-comic-caption">
        <span className="db2-comic-title">{script.title}</span>
        {caption ? <span className="db2-comic-line">{caption}</span> : null}
        <cite className="db2-comic-ref">{script.scriptureReference} (BSB)</cite>
        {level === 'archive-reprint' ? (
          <span className="db2-comic-archive">
            {firstRan
              ? `From the archive — first ran ${firstRan}`
              : 'From the archive'}
          </span>
        ) : null}
      </figcaption>
    </figure>
  )
}
