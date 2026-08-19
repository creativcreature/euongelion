/**
 * S1 — the middleware matcher must keep up with the pages that read auth.
 *
 * `src/middleware.ts` exists for exactly one job: refresh the Supabase
 * session with persistable cookies, because Server Components cannot write
 * cookies themselves. Its `config.matcher` is scoped to the routes whose
 * Server Components call `getUser()`. That scoping is the F-083 regression
 * class: add a new server page that reads auth, forget to widen the
 * matcher, and the page silently goes auth-blind roughly an hour after
 * sign-in (the access token expires, nothing rotates it, the RSC render
 * sees an anonymous reader). Nothing breaks loudly — it just quietly
 * forgets who you are.
 *
 * The only guard before this file was a comment in middleware.ts saying
 * "widen it if a new page starts reading auth server-side". This test is
 * that comment with teeth: it walks src/app and finds every server
 * component that reads auth — either by calling `getUser(` or by
 * importing '@/lib/supabase/server' / '@/lib/auth' (the two modules a
 * server component reads a session through; a page that imports one and
 * calls `supabase.auth.getUser()` inline must not slip past a literal
 * token match) — and fails by NAME when one is not covered.
 */
import { describe, expect, it } from 'vitest'
import fs from 'fs'
import path from 'path'

const ROOT = path.resolve(__dirname, '..')
const APP_DIR = path.join(ROOT, 'src/app')
const MIDDLEWARE_PATH = path.join(ROOT, 'src/middleware.ts')

/** Every quoted string inside `config.matcher: [ ... ]`. */
function readMatcherPatterns(): string[] {
  const source = fs.readFileSync(MIDDLEWARE_PATH, 'utf8')
  const block = source.match(/matcher:\s*\[([\s\S]*?)\]/)
  if (!block) {
    throw new Error(
      'Could not find `matcher: [...]` in src/middleware.ts. If the export ' +
        'moved or was renamed, update __tests__/middleware-matcher-invariant.test.ts ' +
        'so this invariant keeps being checked.',
    )
  }
  return Array.from(block[1].matchAll(/['"`]([^'"`]+)['"`]/g)).map((m) => m[1])
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

/**
 * Next matchers are path-to-regexp: `:param` is one segment, `:param*` is
 * zero-or-more, `:param+` is one-or-more, `:param?` is optional. That is
 * the whole grammar this repo uses.
 */
function matcherToRegExp(pattern: string): RegExp {
  let body = ''
  for (const segment of pattern.split('/')) {
    if (!segment) continue
    if (segment.startsWith(':')) {
      const modifier = segment.slice(-1)
      if (modifier === '*') body += '(?:/[^/]+)*'
      else if (modifier === '+') body += '(?:/[^/]+)+'
      else if (modifier === '?') body += '(?:/[^/]+)?'
      else body += '/[^/]+'
      continue
    }
    body += `/${escapeRegExp(segment)}`
  }
  return new RegExp(`^${body || '/'}/?$`)
}

function walk(dir: string): string[] {
  const found: string[] = []
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) {
      found.push(...walk(full))
      continue
    }
    if (/\.tsx?$/.test(entry.name)) found.push(full)
  }
  return found
}

/** `'use client'` as an actual top-of-file directive, not a mention. */
function isClientComponent(source: string): boolean {
  return /^\s*(?:\/\*[\s\S]*?\*\/\s*|\/\/[^\n]*\n\s*)*['"]use client['"]/.test(
    source,
  )
}

/**
 * The URL a file's route segment resolves to. Route groups `(marketing)`,
 * parallel slots `@modal`, and private folders `_lib` are not URL segments,
 * so they drop out; dynamic segments stand in as a concrete sample so the
 * result can be tested against a matcher regex.
 */
function routeForFile(relativePath: string): string {
  const segments = path
    .dirname(relativePath)
    .split(path.sep)
    .filter((segment) => segment && segment !== '.')

  const parts: string[] = []
  for (const segment of segments) {
    if (segment.startsWith('(') && segment.endsWith(')')) continue
    if (segment.startsWith('@')) continue
    if (segment.startsWith('_')) continue
    if (/^\[\[?\.\.\..+?\]\]?$/.test(segment)) {
      parts.push('sample', 'sample')
      continue
    }
    if (/^\[.+\]$/.test(segment)) {
      parts.push('sample')
      continue
    }
    parts.push(segment)
  }

  return `/${parts.join('/')}`
}

type AuthReadingPage = { file: string; route: string }

/**
 * Exact-specifier imports of the two server-side auth modules. The
 * specifier must END at the quote: '@/lib/auth/onboarding' and
 * '@/lib/auth/display-name' are client-safe pure helpers and must NOT
 * count as reading auth. Covers static `from '...'` and dynamic
 * `import('...')` forms, either quote style.
 */
const SERVER_AUTH_IMPORT_RE =
  /(?:from\s*|import\s*\(\s*)['"]@\/lib\/(?:supabase\/server|auth)['"]/

/**
 * Does this server-side source read the Supabase session? Either the
 * literal `getUser(` token, or an import of a module that only exists to
 * read auth server-side — a page doing `createClient()` +
 * `supabase.auth.getUser()` still imports '@/lib/supabase/server'.
 */
function readsAuthServerSide(source: string): boolean {
  return SERVER_AUTH_IMPORT_RE.test(source) || /\bgetUser\s*\(/.test(source)
}

function collectAuthReadingPages(): AuthReadingPage[] {
  const pages: AuthReadingPage[] = []

  for (const file of walk(APP_DIR)) {
    const relative = path.relative(APP_DIR, file)

    // Route Handlers — under /api or anywhere else — get a Request and
    // return a Response, so they can persist refreshed cookies on their
    // own. Middleware is not what keeps them signed in.
    if (relative.startsWith(`api${path.sep}`)) continue
    if (/^route\.tsx?$/.test(path.basename(file))) continue

    const source = fs.readFileSync(file, 'utf8')
    if (!readsAuthServerSide(source)) continue
    // Client components read auth in the browser, where supabase-js
    // refreshes its own tokens.
    if (isClientComponent(source)) continue

    pages.push({
      file: `src/app/${relative.split(path.sep).join('/')}`,
      route: routeForFile(relative),
    })
  }

  return pages.sort((a, b) => a.file.localeCompare(b.file))
}

describe('middleware matcher invariant (F-083)', () => {
  const patterns = readMatcherPatterns()
  const matchers = patterns.map(matcherToRegExp)
  const pages = collectAuthReadingPages()

  it('reads a non-empty matcher and finds pages that read auth server-side', () => {
    expect(patterns.length).toBeGreaterThan(0)
    expect(pages.length).toBeGreaterThan(0)
  })

  it('detects auth reads by import, not just the literal getUser( token', () => {
    // A page that builds its own client and calls supabase.auth.getUser()
    // inline is caught by the import alone…
    expect(
      readsAuthServerSide(
        "import { createClient } from '@/lib/supabase/server'\n" +
          'const supabase = await createClient()\n' +
          'const { data } = await supabase.auth.getUser()\n',
      ),
    ).toBe(true)
    // …and so is the bare import, even before any call is written.
    expect(
      readsAuthServerSide(
        'import { createClient } from "@/lib/supabase/server"',
      ),
    ).toBe(true)
    expect(readsAuthServerSide("import { getUser } from '@/lib/auth'")).toBe(
      true,
    )
    // Client-safe '@/lib/auth/*' submodules are NOT auth reads.
    expect(
      readsAuthServerSide(
        "import { readOnboardingStateFromMetadata } from '@/lib/auth/onboarding'",
      ),
    ).toBe(false)
    expect(
      readsAuthServerSide(
        "import { DISPLAY_NAME_MAX_LENGTH } from '@/lib/auth/display-name'",
      ),
    ).toBe(false)
    // A plain page reads nothing.
    expect(
      readsAuthServerSide('export default function Page() { return null }'),
    ).toBe(false)
  })

  it('finds the known auth-reading server pages by name', () => {
    // Non-vacuity for the walker itself: these four pages exist today and
    // read the session server-side — two via getUser() from '@/lib/auth',
    // two via createClient() from '@/lib/supabase/server' with an inline
    // supabase.auth.getUser(). If the walker stops seeing them, it has
    // gone blind, and the coverage assertion below proves nothing.
    const files = pages.map((page) => page.file)
    expect(files).toEqual(
      expect.arrayContaining([
        'src/app/admin/layout.tsx',
        'src/app/library/page.tsx',
        'src/app/onboarding/page.tsx',
        'src/app/today/page.tsx',
      ]),
    )
  })

  it('compiles the path-to-regexp forms the matcher uses', () => {
    const catchAll = matcherToRegExp('/library/:path*')
    expect(catchAll.test('/library')).toBe(true)
    expect(catchAll.test('/library/series/anointed')).toBe(true)
    expect(catchAll.test('/librarian')).toBe(false)

    const exact = matcherToRegExp('/today')
    expect(exact.test('/today')).toBe(true)
    expect(exact.test('/today/tomorrow')).toBe(false)
  })

  it('covers every server component under src/app that calls getUser()', () => {
    const uncovered = pages.filter(
      (page) => !matchers.some((matcher) => matcher.test(page.route)),
    )

    expect(
      uncovered.map((page) => `${page.file} (route ${page.route})`),
      'These pages read the Supabase session server-side, but src/middleware.ts ' +
        `does not refresh the session for their route. Current matcher: ${JSON.stringify(patterns)}. ` +
        'Add the route to `config.matcher` in src/middleware.ts, or the page goes ' +
        'auth-blind once the access token expires (F-083).',
    ).toEqual([])
  })

  it('reports an auth-reading page whose route the matcher misses', () => {
    // The guard has to actually bite: a page at an unmatched route must
    // come back uncovered, otherwise the assertion above is vacuous.
    const probeRoute = routeForFile(
      path.join('unmatched-route-probe', 'page.tsx'),
    )
    expect(probeRoute).toBe('/unmatched-route-probe')
    expect(matchers.some((matcher) => matcher.test(probeRoute))).toBe(false)
  })
})
