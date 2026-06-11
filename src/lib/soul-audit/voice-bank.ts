/**
 * voice-bank.ts — server-only loader for the curated historic voice bank.
 *
 * The voice bank is a pre-built JSON file (content/voices/voice-bank.json,
 * also copied to public/voice-bank.json at build time by the `build:voice-bank`
 * npm script) containing 450+ verbatim quotes from the public-domain corpus,
 * organised by 9 soul-audit themes: grief, anxiety, doubt, sin, hope,
 * busyness, identity, suffering, joy.
 *
 * Every quote has been verified as a verbatim substring of its source chunk
 * in public/reference-index.json. The build script that produced it
 * (scripts/build-voice-bank.mjs) is the single source of truth; this module
 * only loads and queries the pre-built bank.
 *
 * Load strategy (mirrors reference-index-loader.ts):
 *   1. Cloudflare ASSETS binding — reads public/voice-bank.json via the
 *      Workers ASSETS fetch API (fastest; no fs available in production).
 *   2. fs.readFileSync — reads from public/voice-bank.json on local dev.
 *   3. Self-fetch via NEXT_PUBLIC_APP_URL — universal fallback.
 *
 * If the file cannot be found (e.g. `build:voice-bank` has never been run),
 * the functions return empty results rather than throwing, so callers degrade
 * gracefully. The bank is supplementary; the grounded-weave orchestrator
 * continues to use the full reference-index for its own retrieval.
 */

import fs from 'fs'
import path from 'path'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type VoiceBankTheme =
  | 'grief'
  | 'anxiety'
  | 'doubt'
  | 'sin'
  | 'hope'
  | 'busyness'
  | 'identity'
  | 'suffering'
  | 'joy'

export interface VoiceBankEntry {
  /** Stable identifier: "voice-bank:<theme>:<n>" */
  id: string
  theme: VoiceBankTheme
  /** Verbatim substring of the source corpus chunk */
  quote: string
  /** Display name of the author */
  author: string
  /** Display name of the work */
  work: string
  /** ID of the source chunk in public/reference-index.json */
  sourceChunkId: string
}

// ---------------------------------------------------------------------------
// Module-level cache
// ---------------------------------------------------------------------------

let cachedBank: VoiceBankEntry[] | null = null
let loadPromise: Promise<VoiceBankEntry[]> | null = null

// ---------------------------------------------------------------------------
// Loader (three-strategy, mirrors reference-index-loader.ts)
// ---------------------------------------------------------------------------

const ASSET_NAME = 'voice-bank.json'

async function loadVoiceBank(): Promise<VoiceBankEntry[]> {
  if (cachedBank) return cachedBank
  if (loadPromise) return loadPromise

  loadPromise = (async (): Promise<VoiceBankEntry[]> => {
    // Strategy 1: Cloudflare ASSETS binding (production)
    try {
      const { getCloudflareContext } = await import('@opennextjs/cloudflare')
      const { env } = await getCloudflareContext({ async: true })
      if (env?.ASSETS) {
        const res = await env.ASSETS.fetch(
          new Request(`https://assets.local/${ASSET_NAME}`),
        )
        if (res.ok) {
          const data = (await res.json()) as VoiceBankEntry[]
          if (Array.isArray(data) && data.length > 0) {
            cachedBank = data
            return cachedBank
          }
        }
      }
    } catch {
      // Not on Cloudflare or ASSETS unavailable — fall through
    }

    // Strategy 2: fs (local dev — try public/ first, then content/voices/)
    const fsPaths = [
      path.join(process.cwd(), 'public', ASSET_NAME),
      path.join(process.cwd(), 'content', 'voices', ASSET_NAME),
    ]
    for (const filePath of fsPaths) {
      try {
        if (fs.existsSync(filePath)) {
          const raw = fs.readFileSync(filePath, 'utf8')
          const data = JSON.parse(raw) as VoiceBankEntry[]
          if (Array.isArray(data) && data.length > 0) {
            cachedBank = data
            return cachedBank
          }
        }
      } catch {
        // File unreadable — try next path
      }
    }

    // Strategy 3: self-fetch (universal fallback)
    try {
      const baseUrl =
        process.env.NEXT_PUBLIC_APP_URL || 'https://euangelion.app'
      const res = await fetch(`${baseUrl}/${ASSET_NAME}`)
      if (res.ok) {
        const data = (await res.json()) as VoiceBankEntry[]
        if (Array.isArray(data) && data.length > 0) {
          cachedBank = data
          return cachedBank
        }
      }
    } catch {
      // Network unavailable — fall through
    }

    // No source available — return empty rather than throwing.
    // The grounded-weave continues to work without the curated bank.
    console.warn(
      '[voice-bank] voice-bank.json not found. Run `npm run build:voice-bank` to generate it.',
    )
    cachedBank = []
    return cachedBank
  })()

  try {
    return await loadPromise
  } finally {
    loadPromise = null
  }
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Return up to `max` voice-bank entries for a given theme, in declaration
 * order (the build script emits them highest-relevance-first within each theme).
 *
 * Returns an empty array if the bank file is unavailable or if the theme has
 * no entries.
 */
export async function getVoicesByTheme(
  theme: VoiceBankTheme,
  max = 5,
): Promise<Pick<VoiceBankEntry, 'quote' | 'author' | 'work'>[]> {
  const bank = await loadVoiceBank()
  return bank
    .filter((e) => e.theme === theme)
    .slice(0, max)
    .map(({ quote, author, work }) => ({ quote, author, work }))
}

/**
 * Return the voice-bank entry for a given id, or null if not found.
 * The id form is "voice-bank:<theme>:<n>".
 */
export async function getVoiceById(
  id: string,
): Promise<Pick<VoiceBankEntry, 'quote' | 'author' | 'work'> | null> {
  const bank = await loadVoiceBank()
  const entry = bank.find((e) => e.id === id)
  if (!entry) return null
  return { quote: entry.quote, author: entry.author, work: entry.work }
}

/**
 * Return all available theme names that have at least one entry in the bank.
 */
export async function getAvailableThemes(): Promise<VoiceBankTheme[]> {
  const bank = await loadVoiceBank()
  const seen = new Set<VoiceBankTheme>()
  for (const e of bank) seen.add(e.theme)
  return [...seen]
}

/** Clear cached bank (for testing). */
export function clearVoiceBankCache(): void {
  cachedBank = null
}
