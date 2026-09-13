/**
 * Output-side safety for Daily Bread V2: every URL and every string that came
 * from a generator, a provider or a database row passes through here before it
 * is frozen into an edition or rendered.
 *
 * Rendering rule: V2 never uses dangerouslySetInnerHTML for edition content.
 * Text is text. These helpers keep that text clean and the links honest.
 */

const CONTROL_CHARS = /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g
const TAGS = /<\/?[a-z][^>]*>/gi

/** Plain text: control characters and markup removed, whitespace collapsed. */
export function cleanText(value: unknown, maxLength: number): string {
  if (typeof value !== 'string') return ''
  return value
    .replace(CONTROL_CHARS, '')
    .replace(TAGS, '')
    .replace(/[ \t]+/g, ' ')
    .trim()
    .slice(0, maxLength)
}

/** Paragraph text (newlines kept, max length enforced). */
export function cleanParagraphs(value: unknown, maxLength: number): string {
  if (typeof value !== 'string') return ''
  return value
    .replace(CONTROL_CHARS, '')
    .replace(TAGS, '')
    .replace(/\r\n?/g, '\n')
    .replace(/[ \t]+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
    .slice(0, maxLength)
}

function isPrivateHost(hostname: string): boolean {
  const h = hostname.toLowerCase()
  if (h === 'localhost' || h.endsWith('.localhost') || h.endsWith('.local')) return true
  if (/^(\d{1,3}\.){3}\d{1,3}$/.test(h)) return true
  if (h.includes(':')) return true // bare IPv6 literal
  return false
}

/**
 * A link the reader may follow. Relative same-site paths, or public https
 * URLs. Everything else — javascript:, data:, protocol-relative, credentials
 * in the URL, IP literals, localhost — is refused (returns null).
 */
export function safeHref(value: unknown): string | null {
  if (typeof value !== 'string') return null
  const v = value.trim()
  if (v.length === 0 || v.length > 2048) return null
  if (v.startsWith('/') && !v.startsWith('//') && !v.includes('\\')) {
    return /^\/[A-Za-z0-9\-._~!$&'()*+,;=:@/%#?]*$/.test(v) ? v : null
  }
  let url: URL
  try {
    url = new URL(v)
  } catch {
    return null
  }
  if (url.protocol !== 'https:') return null
  if (url.username || url.password) return null
  if (isPrivateHost(url.hostname)) return null
  if (!url.hostname.includes('.')) return null
  return url.toString()
}

/**
 * An image the page may load. Same-origin paths under /images/, or the
 * project's Supabase public storage bucket. Never an arbitrary remote host:
 * a frozen edition must not become a tracking pixel.
 */
export function safeAssetSrc(value: unknown, supabaseUrl?: string): string | null {
  if (typeof value !== 'string') return null
  const v = value.trim()
  if (/^\/images\/[A-Za-z0-9\-._/]+\.(webp|png|jpe?g|svg)$/i.test(v) && !v.includes('..')) {
    return v
  }
  const base = supabaseUrl ?? process.env.NEXT_PUBLIC_SUPABASE_URL
  if (!base) return null
  let url: URL
  let root: URL
  try {
    url = new URL(v)
    root = new URL(base)
  } catch {
    return null
  }
  if (url.protocol !== 'https:' || url.host !== root.host) return null
  if (!url.pathname.startsWith('/storage/v1/object/public/edition-assets/')) return null
  if (url.pathname.includes('..')) return null
  return url.toString()
}

/** Split paragraph text into paragraphs for React rendering. */
export function paragraphs(text: string): string[] {
  return text
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean)
}

/**
 * Inline **bold** as React-safe segments: [{text, bold}]. Replaces the legacy
 * inlineMd + dangerouslySetInnerHTML path for V2 editions.
 */
export function boldSegments(text: string): { text: string; bold: boolean }[] {
  const out: { text: string; bold: boolean }[] = []
  const re = /\*\*(.+?)\*\*/g
  let last = 0
  let m: RegExpExecArray | null
  while ((m = re.exec(text)) !== null) {
    if (m.index > last) out.push({ text: text.slice(last, m.index), bold: false })
    out.push({ text: m[1], bold: true })
    last = m.index + m[0].length
  }
  if (last < text.length) out.push({ text: text.slice(last), bold: false })
  return out
}
