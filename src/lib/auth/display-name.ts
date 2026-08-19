/**
 * Display-name rules for `public.users.full_name` (M3).
 *
 * Lives in its own module — NOT in `src/lib/api-security.ts` — because
 * the settings page is a client component and needs the length limit for
 * its input's `maxLength`. api-security pulls in `node:crypto` and the
 * Upstash client, neither of which belongs in the browser bundle.
 */

/** Longest display name `sanitizeDisplayName` will accept. */
export const DISPLAY_NAME_MAX_LENGTH = 80

// Control + C1 characters. A display name is rendered verbatim in the
// settings avatar and profile header, so anything non-printable is
// rejected outright rather than stripped — silently mangling someone's
// name into a different name is worse than telling them it was refused.
const DISPLAY_NAME_CONTROL_RE = /[\u0000-\u001f\u007f-\u009f]/

/**
 * Collapses runs of whitespace to single spaces and trims, then REJECTS
 * (returns null) anything that is not 1-`DISPLAY_NAME_MAX_LENGTH`
 * printable characters. Unlike `sanitizeSingleLine` this never
 * truncates: an over-long name is a 400, not a quietly shortened one.
 */
export function sanitizeDisplayName(value: unknown): string | null {
  if (typeof value !== 'string') return null
  const collapsed = value.replace(/\s+/g, ' ').trim()
  if (collapsed.length < 1) return null
  if (collapsed.length > DISPLAY_NAME_MAX_LENGTH) return null
  if (DISPLAY_NAME_CONTROL_RE.test(collapsed)) return null
  return collapsed
}
