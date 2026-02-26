/**
 * Pastoral messages for Soul Audit user-facing error states.
 *
 * All messages use warm, honest language. No technical codes are
 * exposed. Each message helps the user understand what happened
 * and what to do next.
 */

export const PASTORAL_MESSAGES = {
  ALL_PROVIDERS_DOWN:
    'We are working to restore devotional generation. Please return in a few minutes.',
  GENERATION_SLOW:
    'Your devotional is being carefully prepared. This is taking a moment longer than usual.',
  INPUT_EMPTY: 'Write what is real for you right now and try again.',
  INPUT_TOO_SHORT:
    'Write what is real for you right now. Even a sentence helps us find the right path.',
  INPUT_TOO_LONG: 'Please keep your response under 2000 characters.',
  RATE_LIMITED:
    "You\u2019ve explored deeply today. Please wait a moment before trying again.",
  AUDIT_LIMIT:
    'You have reached the audit limit for this cycle. Come back tomorrow for a fresh start.',
  OFFLINE:
    'It looks like you lost your connection. Reconnect and we will pick up where you left off.',
  TIMEOUT:
    'This is taking longer than expected. Please try again in a moment.',
  GENERIC_ERROR: 'Something went wrong on our end. Please try again.',
  OPTION_ASSEMBLY_FAILED:
    'We could not build your devotional options right now. Please try again in a moment.',
  OPTION_SPLIT_INVALID:
    'We could not assemble a complete set of options. Please try again shortly.',
  REROLL_MISMATCH:
    'Reroll can only use the original audit response. Start a new audit to use different input.',
  REROLL_VERIFY_FAILED: 'Reroll request could not be verified.',
  INVALID_REROLL_ID: 'Something went wrong with your reroll. Please start a new audit.',
  CLARIFIER_PROMPT:
    "Could you share a bit more about what you\u2019re going through? This helps us find the right path for you.",
  SOUL_AUDIT_DISABLED:
    'Soul Audit is temporarily offline for maintenance. Please check back soon.',
  BODY_TOO_LARGE: 'Your message is too long. Please shorten it and try again.',
} as const

export type PastoralMessageKey = keyof typeof PASTORAL_MESSAGES
