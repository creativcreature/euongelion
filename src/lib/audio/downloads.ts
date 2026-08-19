import { useDownloadsStore } from '@/stores/downloadsStore'

/**
 * Talking to the service worker about downloads.
 *
 * All of it is best-effort by design: no service worker, or a browser that
 * evicted the cache, means listening still works online. A download is a
 * convenience, and a convenience that throws is worse than one that quietly
 * is not there — but the UI must still reflect the truth, which is why the
 * list is re-asked rather than assumed.
 */

function worker(): ServiceWorker | null {
  if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) {
    return null
  }
  return navigator.serviceWorker.controller
}

export function downloadsAvailable(): boolean {
  return worker() !== null
}

export function requestDownload(slug: string, src: string): void {
  const sw = worker()
  if (!sw) return
  useDownloadsStore.getState().setState(src, 'downloading')
  sw.postMessage({ type: 'DOWNLOAD_AUDIO', slug, src })
}

export function requestRemove(slug: string, src: string): void {
  const sw = worker()
  if (!sw) return
  sw.postMessage({ type: 'REMOVE_AUDIO', slug, src })
}

export function requestList(): void {
  worker()?.postMessage({ type: 'LIST_AUDIO' })
}

/**
 * Wire the worker's replies into the store. Called once, from the audio host.
 * Returns an unsubscribe.
 */
export function listenForDownloadEvents(): () => void {
  if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) {
    return () => {}
  }
  const onMessage = (event: MessageEvent) => {
    const data = event.data as
      | { type: 'DOWNLOAD_DONE'; src: string }
      | { type: 'DOWNLOAD_FAILED'; src: string }
      | { type: 'DOWNLOAD_REMOVED'; src: string }
      | { type: 'DOWNLOAD_LIST'; srcs: string[] }
      | undefined
    if (!data) return
    const store = useDownloadsStore.getState()
    if (data.type === 'DOWNLOAD_DONE') store.setState(data.src, 'done')
    else if (data.type === 'DOWNLOAD_FAILED') store.setState(data.src, 'failed')
    else if (data.type === 'DOWNLOAD_REMOVED') store.remove(data.src)
    else if (data.type === 'DOWNLOAD_LIST') {
      // The worker stores absolute URLs; the app speaks relative ones.
      store.setAll(
        data.srcs.map((url) => {
          try {
            return new URL(url).pathname + new URL(url).search
          } catch {
            return url
          }
        }),
      )
    }
  }
  navigator.serviceWorker.addEventListener('message', onMessage)
  return () => navigator.serviceWorker.removeEventListener('message', onMessage)
}
