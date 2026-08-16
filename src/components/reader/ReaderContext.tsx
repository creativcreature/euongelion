'use client'

import { createContext, useContext, useEffect, useMemo } from 'react'
import { useAuthStore } from '@/stores/authStore'

export interface ReaderValue {
  devotionalSlug: string | null
  /** True only once the session probe has answered affirmatively. */
  signedIn: boolean
  /** False until the probe returns. Consumers must fail closed while false. */
  authKnown: boolean
}

const ReaderCtx = createContext<ReaderValue>({
  devotionalSlug: null,
  signedIn: false,
  authKnown: false,
})

/**
 * One in-flight session probe per page, shared by every module that asks.
 *
 * Without this, a devotional with a reflection module carrying five questions
 * would fire five identical requests on mount.
 */
let sessionProbe: Promise<boolean> | null = null

function probeSession(): Promise<boolean> {
  if (!sessionProbe) {
    sessionProbe = fetch('/api/auth/session', { cache: 'no-store' })
      .then((response) => (response.ok ? response.json() : null))
      .then((payload) => Boolean(payload?.authenticated))
      .catch(() => false)
  }
  return sessionProbe
}

/** Test seam — the probe is module-level, so it outlives a render. */
export function __resetSessionProbe(): void {
  sessionProbe = null
}

/**
 * Reader identity for any module that wants it.
 *
 * WHY AUTH IS RESOLVED HERE AND NOT ON THE SERVER: `/devotional/[slug]` is
 * statically generated — `generateStaticParams()` with `revalidate = 3600`.
 * Calling `getUser()` in the server component would force all ~568 devotional
 * pages dynamic, and those pages are exactly what SA-060 keeps open to
 * signed-out readers for SEO and sharing. A client probe costs one request and
 * keeps the catalog cacheable.
 *
 * The cost is that auth is briefly unknown. Consumers must treat that as
 * signed-out (`authKnown === false`) rather than optimistically offering an
 * input, because a field that appears and then cannot save is worse than one
 * that arrives a moment late.
 */
export function ReaderProvider({
  devotionalSlug,
  children,
}: {
  devotionalSlug: string
  children: React.ReactNode
}) {
  // The store was already defined and had no writer anywhere in the app. It is
  // the natural cache for this, so a second devotional opened in the same
  // session does not re-probe.
  const userId = useAuthStore((s) => s.userId)
  const initialized = useAuthStore((s) => s.initialized)
  const setUser = useAuthStore((s) => s.setUser)

  // No local mirror of `initialized`. Keeping one meant writing it back
  // synchronously inside the effect whenever the store was already resolved,
  // which is a cascading render (react-hooks/set-state-in-effect). The store
  // IS the resolved flag — `setUser` sets `initialized: true` — so the async
  // callback below is the only writer, and that one is not synchronous.
  useEffect(() => {
    if (initialized) return
    let cancelled = false
    void probeSession().then((authenticated) => {
      if (cancelled) return
      setUser(authenticated ? 'signed-in' : null, null)
    })
    return () => {
      cancelled = true
    }
  }, [initialized, setUser])

  const value = useMemo(
    () => ({
      devotionalSlug,
      signedIn: initialized && Boolean(userId),
      authKnown: initialized,
    }),
    [devotionalSlug, initialized, userId],
  )

  return <ReaderCtx.Provider value={value}>{children}</ReaderCtx.Provider>
}

/**
 * Returns nulls outside a provider rather than throwing: modules render in
 * tests and in archive views without one, and a module that explodes because
 * nobody wrapped it is worse than one that quietly offers no field.
 */
export function useReader(): ReaderValue {
  return useContext(ReaderCtx)
}
