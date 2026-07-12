'use client'

/**
 * turnstile-client — invisible Cloudflare Turnstile on the sign-in
 * email step (brief §12.4).
 *
 * Conditional by design: everything here is inert unless
 * `NEXT_PUBLIC_TURNSTILE_SITE_KEY` is set. With it set, the widget is
 * rendered in interaction-only appearance (invisible unless Cloudflare
 * decides a visible challenge is required — which must stay possible),
 * and `getTurnstileToken` resolves the token to send with the
 * magic-link request. Failures reject with honest, actionable messages —
 * never a silently missing token.
 *
 * CSP already allowlists challenges.cloudflare.com.
 */

const SCRIPT_SRC =
  'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit'
const TOKEN_TIMEOUT_MS = 20_000

interface TurnstileRenderOptions {
  sitekey: string
  callback: (token: string) => void
  'error-callback'?: () => void
  'expired-callback'?: () => void
  appearance?: 'always' | 'execute' | 'interaction-only'
  size?: 'normal' | 'flexible' | 'compact'
}

interface TurnstileApi {
  render: (
    container: HTMLElement,
    options: TurnstileRenderOptions,
  ) => string | undefined
  reset: (widgetId: string) => void
  remove: (widgetId: string) => void
}

declare global {
  interface Window {
    turnstile?: TurnstileApi
  }
}

export function turnstileSiteKey(): string | null {
  const key = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY?.trim()
  return key && key.length > 0 ? key : null
}

let scriptPromise: Promise<TurnstileApi> | null = null

function loadTurnstileScript(): Promise<TurnstileApi> {
  if (typeof window === 'undefined') {
    return Promise.reject(new Error('Turnstile requires a browser.'))
  }
  if (window.turnstile) return Promise.resolve(window.turnstile)
  if (scriptPromise) return scriptPromise

  scriptPromise = new Promise<TurnstileApi>((resolve, reject) => {
    const script = document.createElement('script')
    script.src = SCRIPT_SRC
    script.async = true
    script.defer = true
    script.onload = () => {
      if (window.turnstile) {
        resolve(window.turnstile)
      } else {
        scriptPromise = null
        reject(new Error('Verification script loaded but did not initialize.'))
      }
    }
    script.onerror = () => {
      scriptPromise = null
      reject(new Error('Could not load the verification script.'))
    }
    document.head.appendChild(script)
  })
  return scriptPromise
}

export interface TurnstileHandle {
  /** Resolve a fresh token for the next request. */
  getToken: () => Promise<string>
  /** Tear the widget down (component unmount). */
  destroy: () => void
}

/**
 * Mount an invisible (interaction-only) widget into `container` and
 * return a handle that yields one token per call. Each `getToken` resets
 * the widget so a resend gets a fresh token.
 */
export async function mountTurnstile(
  container: HTMLElement,
  siteKey: string,
): Promise<TurnstileHandle> {
  const api = await loadTurnstileScript()

  let resolveToken: ((token: string) => void) | null = null
  let rejectToken: ((error: Error) => void) | null = null
  let latestToken: string | null = null

  const widgetId = api.render(container, {
    sitekey: siteKey,
    appearance: 'interaction-only',
    size: 'flexible',
    callback: (token: string) => {
      latestToken = token
      if (resolveToken) {
        resolveToken(token)
        resolveToken = null
        rejectToken = null
      }
    },
    'error-callback': () => {
      if (rejectToken) {
        rejectToken(
          new Error(
            'We couldn’t verify your browser just now. Check your connection and try again.',
          ),
        )
        resolveToken = null
        rejectToken = null
      }
    },
    'expired-callback': () => {
      latestToken = null
    },
  })

  if (!widgetId) {
    throw new Error('The verification widget could not be created.')
  }

  return {
    getToken: () => {
      // A token from the initial render is valid until used/expired.
      if (latestToken) {
        const token = latestToken
        latestToken = null
        api.reset(widgetId)
        return Promise.resolve(token)
      }
      return new Promise<string>((resolve, reject) => {
        const timeout = window.setTimeout(() => {
          resolveToken = null
          rejectToken = null
          reject(
            new Error(
              'Verification timed out. Check your connection and try again.',
            ),
          )
        }, TOKEN_TIMEOUT_MS)
        resolveToken = (token) => {
          window.clearTimeout(timeout)
          latestToken = null
          api.reset(widgetId)
          resolve(token)
        }
        rejectToken = (error) => {
          window.clearTimeout(timeout)
          reject(error)
        }
      })
    },
    destroy: () => {
      try {
        api.remove(widgetId)
      } catch {
        // widget already gone — nothing to clean up
      }
    },
  }
}
