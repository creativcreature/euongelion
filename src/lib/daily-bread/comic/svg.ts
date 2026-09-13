/**
 * The Daily Bread V2 comic — a tiny, safe SVG tree.
 *
 * The strip renderer never concatenates markup. It builds SvgNode trees from a
 * closed vocabulary of tags and attributes, and every tree is checked by
 * assertSafeSvgTree before it is serialised (svgToString) or mapped to React
 * elements. No href, no style, no event handlers, no external url().
 */

export type SvgTag =
  | 'svg'
  | 'g'
  | 'path'
  | 'circle'
  | 'ellipse'
  | 'rect'
  | 'line'
  | 'polyline'
  | 'polygon'
  | 'defs'
  | 'pattern'
  | 'title'

export interface SvgNode {
  tag: SvgTag
  attrs: Record<string, string | number>
  children?: SvgNode[]
  /** Text content — allowed on 'title' only. */
  text?: string
}

export const ALLOWED_TAGS: ReadonlySet<string> = new Set<SvgTag>([
  'svg',
  'g',
  'path',
  'circle',
  'ellipse',
  'rect',
  'line',
  'polyline',
  'polygon',
  'defs',
  'pattern',
  'title',
])

export const ALLOWED_ATTRS: ReadonlySet<string> = new Set([
  'viewBox',
  'xmlns',
  'width',
  'height',
  'd',
  'cx',
  'cy',
  'r',
  'rx',
  'ry',
  'x',
  'y',
  'x1',
  'y1',
  'x2',
  'y2',
  'points',
  'transform',
  'class',
  'fill',
  'stroke',
  'stroke-width',
  'stroke-linecap',
  'stroke-linejoin',
  'opacity',
  'id',
  'patternUnits',
  'role',
  'aria-hidden',
  'focusable',
  'preserveAspectRatio',
])

export const SVG_MAX_DEPTH = 12
export const SVG_MAX_NODES = 4000

const PAINT_ATTRS = new Set(['fill', 'stroke'])
const HEX_COLOR =
  /^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{4}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/
const LOCAL_URL = /url\(#[A-Za-z0-9_-]+\)/g
const LOCAL_URL_ONLY = /^url\(#[A-Za-z0-9_-]+\)$/
const CONTROL_CHARS = /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/

function fail(message: string): never {
  throw new Error(`Unsafe SVG tree: ${message}`)
}

function checkValue(tag: string, name: string, value: unknown): void {
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) {
      fail(`<${tag}> ${name} is not a finite number`)
    }
    return
  }
  if (typeof value !== 'string') {
    fail(`<${tag}> ${name} must be a string or number`)
  }
  if (CONTROL_CHARS.test(value)) {
    fail(`<${tag}> ${name} contains a control character`)
  }
  if (/javascript\s*:/i.test(value)) {
    fail(`<${tag}> ${name} contains a javascript: url`)
  }
  if (value.includes('<') || value.includes('>')) {
    fail(`<${tag}> ${name} contains markup characters`)
  }
  if (/url\s*\(/i.test(value.replace(LOCAL_URL, ''))) {
    fail(`<${tag}> ${name} references a non-local url()`)
  }
  if (PAINT_ATTRS.has(name)) {
    const ok =
      value === 'none' ||
      value === 'currentColor' ||
      HEX_COLOR.test(value) ||
      LOCAL_URL_ONLY.test(value)
    if (!ok) fail(`<${tag}> ${name}="${value}" is not an allowed paint`)
  }
}

/** Throws when the tree steps outside the closed SVG vocabulary. */
export function assertSafeSvgTree(node: SvgNode): void {
  let count = 0

  const visit = (current: SvgNode, depth: number): void => {
    if (depth > SVG_MAX_DEPTH) fail(`depth exceeds ${SVG_MAX_DEPTH}`)
    count += 1
    if (count > SVG_MAX_NODES) fail(`more than ${SVG_MAX_NODES} nodes`)

    if (!current || typeof current !== 'object') fail('node is not an object')
    const tag: unknown = current.tag
    if (typeof tag !== 'string' || !ALLOWED_TAGS.has(tag)) {
      fail(`tag <${String(tag)}> is not allowed`)
    }

    const attrs: unknown = current.attrs
    if (!attrs || typeof attrs !== 'object' || Array.isArray(attrs)) {
      fail(`<${tag}> attrs must be an object`)
    }
    for (const [name, value] of Object.entries(attrs)) {
      if (!ALLOWED_ATTRS.has(name)) {
        fail(`<${tag}> attribute "${name}" is not allowed`)
      }
      checkValue(tag, name, value)
    }

    if (current.text !== undefined) {
      if (tag !== 'title') fail(`<${tag}> may not carry text`)
      if (typeof current.text !== 'string') fail('title text must be a string')
      if (CONTROL_CHARS.test(current.text)) {
        fail('title text contains a control character')
      }
    }

    if (current.children !== undefined) {
      if (!Array.isArray(current.children)) {
        fail(`<${tag}> children must be an array`)
      }
      if (tag === 'title' && current.children.length > 0) {
        fail('<title> may not have child elements')
      }
      for (const child of current.children) visit(child, depth + 1)
    }
  }

  visit(node, 1)
}

function escapeAttr(value: string | number): string {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
}

function escapeText(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
}

function serialise(node: SvgNode): string {
  const attrs = Object.entries(node.attrs)
    .map(([name, value]) => ` ${name}="${escapeAttr(value)}"`)
    .join('')
  const inner =
    (node.text !== undefined ? escapeText(node.text) : '') +
    (node.children ?? []).map(serialise).join('')
  if (inner === '') return `<${node.tag}${attrs}/>`
  return `<${node.tag}${attrs}>${inner}</${node.tag}>`
}

/** Serialise a (checked) tree to SVG markup with escaped values. */
export function svgToString(node: SvgNode): string {
  assertSafeSvgTree(node)
  return serialise(node)
}
