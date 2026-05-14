import type { Module } from '@/types'
import PullQuote from '@/components/PullQuote'

/**
 * R35: pull-quote as a first-class module. Renders the existing
 * `PullQuote` component (oversized gold-rule blockquote). Designed
 * to be dropped between teaching/reflection modules to break text
 * density per the 2026 editorial pattern.
 *
 * Authoring: `{ type: "pullquote", quote: "...", attribution?: "..." }`.
 * Accepts `content` or `text` as a fallback for the quote string so
 * legacy authoring shapes still render.
 */
export default function PullquoteModule({ module }: { module: Module }) {
  const quote =
    (module as Module & { quote?: string; text?: string }).quote ||
    (module as Module & { text?: string }).text ||
    module.content
  if (!quote) return null
  const attribution = (module as Module & { attribution?: string }).attribution
  return <PullQuote attribution={attribution}>{quote}</PullQuote>
}
