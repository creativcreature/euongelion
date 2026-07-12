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
