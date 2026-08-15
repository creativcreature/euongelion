/**
 * markdown-safe.ts — model-output markdown rendering with raw HTML
 * DISABLED (custom-generation brief §12.3: "no raw HTML from model —
 * render through a sanitizer or markdown renderer with HTML disabled";
 * OWASP self-audit M-1, 2026-07-11).
 *
 * LLM-generated fields (reflections, teachings, prayers) are markdown
 * by contract, but the model — or a prompt injection riding in the
 * user's reflection — could emit raw HTML. This renderer escapes every
 * raw HTML token (block and inline) so it displays as visible text
 * instead of executing, while all normal markdown formatting renders
 * exactly as before.
 *
 * Use this for ANY model-authored string that ends up in
 * dangerouslySetInnerHTML. Curated repository content (human-authored,
 * reviewed, committed) may keep its existing render path.
 */

import { Marked } from 'marked'

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

const safeMarked = new Marked()
safeMarked.use({
  renderer: {
    // marked v17 routes both block-level and inline raw-HTML tokens
    // through `html`. Escaping here disables HTML pass-through
    // entirely without touching markdown formatting.
    html({ text }: { text: string }): string {
      return escapeHtml(text)
    },
  },
})

/** Render model-authored markdown with raw HTML escaped, never executed. */
export function renderMarkdownSafe(md: string): string {
  return safeMarked.parse(md, { async: false }) as string
}

/**
 * Flatten markdown to plain prose for previews and excerpts (F-089).
 *
 * Chat excerpts sliced the raw answer, so a reply opening with a heading
 * showed up in the sidebar as "## Genesis 15 and the Covenant…". Previews are
 * read as sentences, not rendered as documents, so the syntax has to come off
 * rather than be styled.
 */
export function markdownToPlainText(md: string): string {
  return String(md ?? '')
    .replace(/```[\s\S]*?```/g, ' ') // fenced code
    .replace(/`([^`]*)`/g, '$1') // inline code
    .replace(/!\[[^\]]*\]\([^)]*\)/g, ' ') // images
    .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1') // links -> label
    .replace(/^\s{0,3}#{1,6}\s+/gm, '') // headings
    .replace(/^\s{0,3}>\s?/gm, '') // blockquotes
    .replace(/^\s{0,3}[-*+]\s+/gm, '') // bullets
    .replace(/^\s{0,3}\d+\.\s+/gm, '') // ordered lists
    .replace(/(\*\*|__)(.*?)\1/g, '$2') // bold
    .replace(/(\*|_)(.*?)\1/g, '$2') // italic
    .replace(/~~(.*?)~~/g, '$1') // strikethrough
    .replace(/^\s{0,3}([-*_]\s*){3,}$/gm, ' ') // rules
    .replace(/\s+/g, ' ')
    .trim()
}
