/**
 * Crisis Safety Gate — client-side, deterministic, zero-network.
 *
 * Runs BEFORE any network call on Soul Audit submission. When triggered,
 * the caller shows a compassionate interstitial and DOES NOT transmit the
 * reflection text. Nothing is logged or sent.
 *
 * Pattern philosophy:
 * - Err toward safety on genuinely ambiguous language.
 * - Guard common false positives so normal devotional reflections are not
 *   blocked (e.g. "dying to know", "killed it at work", "abuse of power").
 * - Category labels are for internal routing only; they never appear in UI.
 */

export interface CrisisDetectionResult {
  triggered: boolean
  category?:
    | 'suicidal_ideation'
    | 'self_harm'
    | 'abuse_danger'
    | 'immediate_danger'
}

// ─── False-positive guard patterns ───────────────────────────────────────────
// If the text matches one of these patterns the crisis check is SHORT-CIRCUITED
// regardless of keyword matches — these are unambiguously non-crisis contexts.
const FALSE_POSITIVE_PATTERNS: RegExp[] = [
  // Hyperbolic enthusiasm
  /\b(killed|killing)\s+it\b/i,
  /\bdying\s+to\s+(see|try|know|go|hear|meet|visit|taste|read|watch|learn|get)\b/i,
  /\bdie\s+(laughing|of\s+laughter|of\s+embarrassment)\b/i,
  /\b(could\s+die|i'd\s+die)\s+(for|from|of)\s+(happiness|joy|excitement|laughter|fun)\b/i,
  /\bdead\s+(tired|serious|wrong|ringer|on\s+arrival|heat)\b/i,
  /\bkill\s+two\s+birds\b/i,
  /\bkill\s+time\b/i,
  /\bover\s+my\s+dead\s+body\b/i,
  /\bkilled\s+the\s+(vibe|mood|joke|moment)\b/i,

  // Theological / figurative death (e.g. "die to self", "dying to sin")
  /\bdie\s+to\s+(self|sin|the\s+flesh|my\s+old\s+self)\b/i,
  /\bdying\s+to\s+(self|sin|the\s+flesh)\b/i,
  /\bcrucified\s+(with\s+christ|to\s+the\s+world)\b/i,
  /\bmartyrdom\b/i,
  /\bjustice\s+abuse\b/i,
  /\babuse\s+of\s+(power|authority|trust|the\s+system|scripture)\b/i,
  /\bsubstance\s+abuse\b/i,
  /\bfighting\s+against\s+abuse\b/i,

  // Common idioms containing "not worth"
  /\bnot\s+worth\s+(the\s+(effort|time|money|wait|trouble|price|risk|argument))\b/i,
  /\bnot\s+worth\s+(it\s+for\s+(that|this|them|the\s+cost))\b/i,
]

// ─── Crisis patterns by category ─────────────────────────────────────────────

/** Suicidal ideation — specific, intent-bearing language */
const SUICIDAL_IDEATION_PATTERNS: RegExp[] = [
  /\bsuicid(e|al|ally)\b/i,
  /\bkill\s+(my|myself|myself\s+tonight|myself\s+today)\b/i,
  /\bend\s+(my\s+life|it\s+all|everything)\b/i,
  /\bwant\s+to\s+die\b/i,
  /\bwish\s+i\s+(was|were|could\s+be)\s+dead\b/i,
  /\bbetter\s+off\s+dead\b/i,
  /\bno\s+reason\s+to\s+live\b/i,
  /\b(don'?t|do\s+not)\s+want\s+to\s+(live|be\s+here|be\s+alive|exist)\s+anymore\b/i,
  /\b(don'?t|do\s+not)\s+want\s+to\s+be\s+here\s+(anymore|any\s+more)\b/i,
  /\b(thought|thinking)\s+about\s+(ending|taking)\s+my\s+(own\s+)?life\b/i,
  /\bplanning\s+to\s+(kill|end|take)\s+my(self|\s+own\s+life)\b/i,
  /\bgoing\s+to\s+kill\s+myself\b/i,
  /\bready\s+to\s+die\b/i,
  /\bwant\s+to\s+be\s+dead\b/i,
  /\bcontemplat(ing|ed)\s+(suicide|killing\s+myself|ending\s+my\s+life)\b/i,
  /\bnot\s+worth\s+living\b/i,
  /\blife\s+isn'?t\s+worth\s+(living|anything)\b/i,
  /\btoo\s+tired\s+to\s+(keep\s+going|live|continue|fight\s+(on|anymore))\b/i,
  /\bcan'?t\s+(go\s+on|do\s+this\s+anymore|keep\s+living)\b/i,
]

/** Self-harm — cutting, burning, hurting oneself */
const SELF_HARM_PATTERNS: RegExp[] = [
  /\bself[- ]?harm(ing|ed)?\b/i,
  /\bcutting\s+my(self|self\s+again)?\b/i,
  /\bcut\s+(my\s+)?myself\b/i,
  /\bhurt(ing)?\s+(my\s+)?myself\b/i,
  /\bburn(ing)?\s+(my\s+)?myself\b/i,
  /\bstarv(ing|e)\s+(my\s+)?myself\b/i,
  /\bpunish(ing)?\s+(my\s+)?myself\b/i,
  /\bscars\s+(on\s+my|from\s+cutting|from\s+hurting\s+myself)\b/i,
]

/** Abuse and domestic danger — first-person present danger */
const ABUSE_DANGER_PATTERNS: RegExp[] = [
  /\b(i\s+am|i'?m|i\s+get)\s+being\s+abused\b/i,
  /\bhe\s+(hits|beats|hurts|chokes|threatens|punches|kicks)\s+(me|us)\b/i,
  /\bshe\s+(hits|beats|hurts|chokes|threatens|punches|kicks)\s+(me|us)\b/i,
  /\bthey\s+(hit|beat|hurt|choke|threaten|punch|kick)\s+(me|us)\b/i,
  /\bdomestic\s+violence\b/i,
  /\bafraid\s+(of\s+my\s+(husband|wife|partner|boyfriend|girlfriend)|to\s+go\s+home)\b/i,
  /\bsexually\s+abused\b/i,
  /\bbeing\s+hit\b/i,
  /\bhe\s+hurts\s+me\b/i,
  /\bmy\s+(husband|partner|boyfriend|girlfriend)\s+(is\s+)?(hitting|hurting|beating|abusing)\s+me\b/i,
]

/** Immediate danger — calling for help, fleeing, locked in */
const IMMEDIATE_DANGER_PATTERNS: RegExp[] = [
  /\bsomeo(ne|body)\s+is\s+(trying\s+to\s+kill|going\s+to\s+kill|after)\s+me\b/i,
  /\bi\s+(need|want)\s+help\s+right\s+now\b/i,
  /\bi\s+am\s+in\s+danger\b/i,
  /\bcan'?t\s+leave\s+(the\s+house|home|safely)\b/i,
  /\btrapped\s+(at\s+home|in\s+my\s+house|with\s+(him|her|them))\b/i,
]

// ─── Main export ──────────────────────────────────────────────────────────────

/**
 * Deterministic client-side crisis detection.
 *
 * Returns `{ triggered: false }` for benign text including
 * theological idioms, hyperbole, and non-first-person references.
 *
 * Returns `{ triggered: true, category }` when intent-bearing crisis
 * language is found and no false-positive guard matches.
 */
export function detectCrisis(text: string): CrisisDetectionResult {
  if (!text || text.trim().length === 0) return { triggered: false }

  // Short-circuit on any false-positive pattern FIRST
  for (const fp of FALSE_POSITIVE_PATTERNS) {
    if (fp.test(text)) return { triggered: false }
  }

  if (SUICIDAL_IDEATION_PATTERNS.some((p) => p.test(text))) {
    return { triggered: true, category: 'suicidal_ideation' }
  }
  if (SELF_HARM_PATTERNS.some((p) => p.test(text))) {
    return { triggered: true, category: 'self_harm' }
  }
  if (ABUSE_DANGER_PATTERNS.some((p) => p.test(text))) {
    return { triggered: true, category: 'abuse_danger' }
  }
  if (IMMEDIATE_DANGER_PATTERNS.some((p) => p.test(text))) {
    return { triggered: true, category: 'immediate_danger' }
  }

  return { triggered: false }
}

// ─── Crisis resources ─────────────────────────────────────────────────────────

export interface CrisisResource {
  name: string
  /** Human-readable contact string displayed in the UI. */
  contact: string
  /** Anchor href — tel:, sms:, or https:// */
  href: string
}

export const CRISIS_RESOURCES: CrisisResource[] = [
  {
    name: '988 Suicide & Crisis Lifeline',
    contact: 'Call or text 988',
    href: 'tel:988',
  },
  {
    name: 'Crisis Text Line',
    contact: 'Text HOME to 741741',
    href: 'sms:741741?body=HOME',
  },
  {
    name: 'International resources',
    contact: 'findahelpline.com',
    href: 'https://findahelpline.com',
  },
]
