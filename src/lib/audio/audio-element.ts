/**
 * The one audio element on the site.
 *
 * There is exactly one, it lives in the root layout, and it outlives every
 * route. That is the whole reason audio survives navigation: a media element
 * rendered inside a page is destroyed when Next swaps routes, and playback
 * dies with it. Two elements would be worse than one in the wrong place —
 * both would play.
 *
 * This is a module singleton rather than store state on purpose. The element
 * is an imperative handle, not data; putting it in a zustand slice would make
 * every consumer re-render whenever it was registered, and would tempt callers
 * to read it during render, when it may not be attached yet.
 */
type Listener = () => void

let element: HTMLAudioElement | null = null
const listeners = new Set<Listener>()

export function registerAudioElement(el: HTMLAudioElement | null): void {
  element = el
  listeners.forEach((fn) => fn())
}

export function getAudioElement(): HTMLAudioElement | null {
  return element
}

/** Notifies when the element appears or goes away. Returns an unsubscribe. */
export function subscribeAudioElement(fn: Listener): () => void {
  listeners.add(fn)
  return () => {
    listeners.delete(fn)
  }
}
