/**
 * Clippings — a local-first "commonplace book" of saved passages.
 *
 * Everything here lives in the browser's IndexedDB and NEVER leaves the
 * device. Clippings are personal reading marginalia; there is no server,
 * no account, and no sync. That is a deliberate privacy guarantee, not a
 * missing feature.
 *
 * No external IDB wrapper library — a tiny promise shim over the native
 * API keeps the bundle clean.
 */

export const CLIPPINGS_DB_NAME = 'euangelion-clippings'
export const CLIPPINGS_DB_VERSION = 1
export const CLIPPINGS_STORE = 'clippings'

export interface Clipping {
  /** Stable local id. */
  id: string
  /** The exact text the reader selected / saved. */
  text: string
  /** Human-readable source ("Too Busy for God — Day 3", a day title…). */
  sourceTitle: string
  /** Catalog devotional slug, when the clip came from a catalog reader. */
  sourceSlug?: string
  /** Soul-Audit plan token, when the clip came from a generated plan day. */
  planToken?: string
  /** Generated-plan day number, paired with planToken. */
  day?: number
  /** Optional deep-link back to where the clip was taken. */
  sourceHref?: string
  /** Epoch millis. */
  createdAt: number
}

export type NewClipping = Omit<Clipping, 'id' | 'createdAt'> &
  Partial<Pick<Clipping, 'id' | 'createdAt'>>

function isBrowser(): boolean {
  return typeof window !== 'undefined' && 'indexedDB' in window
}

function makeId(): string {
  if (
    typeof crypto !== 'undefined' &&
    typeof crypto.randomUUID === 'function'
  ) {
    return crypto.randomUUID()
  }
  return `clip-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`
}

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (!isBrowser()) {
      reject(new Error('IndexedDB is not available in this environment.'))
      return
    }
    const request = window.indexedDB.open(
      CLIPPINGS_DB_NAME,
      CLIPPINGS_DB_VERSION,
    )
    request.onupgradeneeded = () => {
      const db = request.result
      if (!db.objectStoreNames.contains(CLIPPINGS_STORE)) {
        const store = db.createObjectStore(CLIPPINGS_STORE, { keyPath: 'id' })
        store.createIndex('createdAt', 'createdAt', { unique: false })
        store.createIndex('sourceSlug', 'sourceSlug', { unique: false })
      }
    }
    request.onsuccess = () => resolve(request.result)
    request.onerror = () =>
      reject(request.error ?? new Error('Could not open the clippings store.'))
  })
}

function withStore<T>(
  mode: IDBTransactionMode,
  fn: (store: IDBObjectStore) => IDBRequest<T> | void,
): Promise<T | undefined> {
  return openDb().then(
    (db) =>
      new Promise<T | undefined>((resolve, reject) => {
        const tx = db.transaction(CLIPPINGS_STORE, mode)
        const store = tx.objectStore(CLIPPINGS_STORE)
        let request: IDBRequest<T> | void
        try {
          request = fn(store)
        } catch (err) {
          db.close()
          reject(err)
          return
        }
        tx.oncomplete = () => {
          db.close()
          resolve(request ? request.result : undefined)
        }
        tx.onabort = () => {
          db.close()
          reject(tx.error ?? new Error('Clippings transaction aborted.'))
        }
        tx.onerror = () => {
          db.close()
          reject(tx.error ?? new Error('Clippings transaction failed.'))
        }
      }),
  )
}

/** True only when this runtime can persist clippings. */
export function isClippingsSupported(): boolean {
  return isBrowser()
}

/** Add a clipping. Returns the stored record (with id + createdAt filled). */
export async function addClipping(input: NewClipping): Promise<Clipping> {
  const text = input.text.trim()
  if (!text) {
    throw new Error('Cannot save an empty clipping.')
  }
  const record: Clipping = {
    id: input.id ?? makeId(),
    text,
    sourceTitle: input.sourceTitle,
    sourceSlug: input.sourceSlug,
    planToken: input.planToken,
    day: input.day,
    sourceHref: input.sourceHref,
    createdAt: input.createdAt ?? Date.now(),
  }
  await withStore('readwrite', (store) => store.put(record))
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('clippingsUpdated'))
  }
  return record
}

/** List all clippings, newest first. */
export async function listClippings(): Promise<Clipping[]> {
  const result = await withStore<Clipping[]>('readonly', (store) =>
    store.getAll(),
  )
  const items = (result ?? []) as Clipping[]
  return items.sort((a, b) => b.createdAt - a.createdAt)
}

/** Remove a single clipping by id. */
export async function removeClipping(id: string): Promise<void> {
  await withStore('readwrite', (store) => store.delete(id))
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('clippingsUpdated'))
  }
}

/** Clear every clipping (e.g. an explicit "remove all"). */
export async function clearClippings(): Promise<void> {
  await withStore('readwrite', (store) => store.clear())
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('clippingsUpdated'))
  }
}
