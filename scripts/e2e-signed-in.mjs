#!/usr/bin/env node
/**
 * Signed-in active-devotional continuity E2E (F-083 / SA-023 / SA-032).
 *
 * This is the one gate automated tests could not close: every unit test mocks
 * the repository, so nothing proved that a REAL signed-in session keeps its
 * active devotional across refreshes, day changes, and a sign-out/sign-in on a
 * different "device". That is the exact promise that was broken for six months.
 *
 * It drives the local Workers preview (the runtime that actually ships), not a
 * dev server, because the original bug only reproduced under Workers isolates.
 *
 * Safety: it creates ONE ephemeral user via the service-role key and deletes it
 * in a finally block. It never touches an existing account, and it refuses to
 * run against a non-localhost target so it can never mutate production state.
 *
 *   npm run preview          # terminal 1 (serves http://localhost:8787)
 *   npm run test:e2e:signed-in
 */
import { createClient } from '@supabase/supabase-js'
import { createServerClient } from '@supabase/ssr'
import { readFileSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const BASE = process.env.E2E_BASE_URL || 'http://localhost:8787'
const SERIES = process.env.E2E_SERIES || 'the-harvest'

if (!/^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(BASE)) {
  console.error(
    `[e2e] REFUSING to run against "${BASE}". This harness mutates devotional ` +
      'state and must only target a local preview.',
  )
  process.exit(2)
}

// .env.local is not auto-loaded for a bare node script.
function loadEnv() {
  let raw = ''
  try {
    raw = readFileSync(resolve(ROOT, '.env.local'), 'utf8')
  } catch {
    return
  }
  for (const line of raw.split('\n')) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/)
    if (!m) continue
    const value = m[2].replace(/^["']|["']$/g, '')
    if (!process.env[m[1]]) process.env[m[1]] = value
  }
}
loadEnv()

const URL_ = process.env.NEXT_PUBLIC_SUPABASE_URL
const ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
const SERVICE = process.env.SUPABASE_SERVICE_ROLE_KEY
if (!URL_ || !ANON || !SERVICE) {
  console.error('[e2e] Missing Supabase env (URL / ANON / SERVICE_ROLE).')
  process.exit(2)
}

let failures = 0
let checks = 0
function check(label, pass, detail = '') {
  checks++
  if (pass) {
    console.log(`  ✓ ${label}`)
  } else {
    failures++
    console.log(`  ✗ ${label}${detail ? ` — ${detail}` : ''}`)
  }
}

/**
 * Build the auth cookie header exactly as @supabase/ssr would write it, by
 * letting the library itself serialize the session into a fake cookie jar.
 * Hand-rolling the (chunked, base64-prefixed) format would be a guess.
 */
async function cookieHeaderForSession(session) {
  const jar = new Map()
  const client = createServerClient(URL_, ANON, {
    cookies: {
      getAll: () =>
        [...jar.entries()].map(([name, value]) => ({ name, value })),
      setAll: (list) => list.forEach(({ name, value }) => jar.set(name, value)),
    },
  })
  await client.auth.setSession({
    access_token: session.access_token,
    refresh_token: session.refresh_token,
  })
  if (jar.size === 0) throw new Error('ssr client wrote no auth cookies')
  return [...jar.entries()].map(([n, v]) => `${n}=${v}`).join('; ')
}

async function req(path, { cookie, method = 'GET', body } = {}) {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: {
      ...(cookie ? { cookie } : {}),
      ...(body ? { 'content-type': 'application/json' } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
    redirect: 'manual',
  })
  const text = await res.text()
  let json = null
  try {
    json = JSON.parse(text)
  } catch {
    /* html */
  }
  return { status: res.status, json, text }
}

const admin = createClient(URL_, SERVICE, {
  auth: { autoRefreshToken: false, persistSession: false },
})

async function signIn(email, password) {
  const anon = createClient(URL_, ANON, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
  const { data, error } = await anon.auth.signInWithPassword({
    email,
    password,
  })
  if (error) throw new Error(`sign-in failed: ${error.message}`)
  return cookieHeaderForSession(data.session)
}

async function main() {
  // Preview must be up before we create anything.
  try {
    const ping = await fetch(`${BASE}/api/soul-audit/current`)
    if (!ping.ok) throw new Error(`status ${ping.status}`)
  } catch (e) {
    console.error(
      `[e2e] No preview at ${BASE} (${e.message}). Run "npm run preview" first.`,
    )
    process.exit(2)
  }

  const stamp = `${Date.now()}-${process.pid}`
  const email = `e2e-active-devotional+${stamp}@euangelion.test`
  const password = `E2e!${stamp}aA1`
  let userId = null

  try {
    const { data: created, error: createErr } =
      await admin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
      })
    if (createErr) throw new Error(`createUser: ${createErr.message}`)
    userId = created.user.id
    console.log(`\n[e2e] ephemeral user ${email}\n`)

    let cookie = await signIn(email, password)

    console.log('1. fresh signed-in account')
    let r = await req('/api/devotionals/active', { cookie })
    check(
      'authenticated read is 200 (not 401)',
      r.status === 200,
      `got ${r.status}`,
    )
    check('no active devotional yet', r.json?.active == null)

    console.log('2. activate a series')
    r = await req('/api/devotionals/active', {
      cookie,
      method: 'PUT',
      body: { seriesSlug: SERIES, mode: 'replace_now', confirm: true },
    })
    check(
      'activation accepted',
      r.status === 200 && r.json?.ok === true,
      `status ${r.status} ${r.text.slice(0, 160)}`,
    )

    console.log('3. the badge endpoint agrees with the activation')
    r = await req('/api/soul-audit/current', { cookie })
    check('hasCurrent true', r.json?.hasCurrent === true)
    check(
      'is the series we activated',
      r.json?.seriesSlug === SERIES,
      `got ${r.json?.seriesSlug}`,
    )
    check('routes to /daily-bread', r.json?.route === '/daily-bread')
    check(
      'selectionType is active_series',
      r.json?.selectionType === 'active_series',
    )

    console.log('4. the reader renders it')
    r = await req('/daily-bread', { cookie })
    check('/daily-bread 200', r.status === 200)
    check(
      'reader shows the activated series',
      /the harvest/i.test(r.text),
      'series title absent from HTML',
    )
    check(
      'reader is NOT the empty-state fallback',
      !/a voice in the wilderness/i.test(r.text),
      'fell through to the empty state',
    )

    console.log('5. survives repeated reloads')
    for (let i = 1; i <= 3; i++) {
      const a = await req('/daily-bread', { cookie })
      const b = await req('/api/soul-audit/current', { cookie })
      check(
        `reload ${i} still shows the series`,
        /the harvest/i.test(a.text) && b.json?.seriesSlug === SERIES,
      )
    }

    console.log('6. day progress persists')
    r = await req('/api/devotionals/active', {
      cookie,
      method: 'PATCH',
      body: { currentDay: 3 },
    })
    check('day change accepted', r.status === 200, `status ${r.status}`)
    r = await req('/api/soul-audit/current', { cookie })
    check(
      'day 3 reported after refresh',
      r.json?.dayNumber === 3,
      `got ${r.json?.dayNumber}`,
    )

    console.log('7. signed out, the account state is not leaked')
    r = await req('/api/soul-audit/current')
    check('anonymous sees no current reading', r.json?.hasCurrent === false)
    r = await req('/api/devotionals/active')
    check('anonymous active read is 401', r.status === 401, `got ${r.status}`)

    console.log('8. sign back in on a NEW session (the cross-device case)')
    cookie = await signIn(email, password) // fresh tokens, fresh cookie jar
    r = await req('/api/soul-audit/current', { cookie })
    check(
      'resumes the same series',
      r.json?.seriesSlug === SERIES,
      `got ${r.json?.seriesSlug}`,
    )
    check(
      'resumes at day 3',
      r.json?.dayNumber === 3,
      `got ${r.json?.dayNumber}`,
    )
    r = await req('/daily-bread', { cookie })
    check('reader still renders it after re-auth', /the harvest/i.test(r.text))

    console.log('9. cleanup: clear the active devotional')
    r = await req('/api/devotionals/active', { cookie, method: 'DELETE' })
    check('clear accepted', r.status === 200, `status ${r.status}`)
    r = await req('/api/soul-audit/current', { cookie })
    check('now honestly empty', r.json?.hasCurrent === false)
  } finally {
    if (userId) {
      const { error } = await admin.auth.admin.deleteUser(userId)
      console.log(
        error
          ? `\n[e2e] WARNING: could not delete ${userId}: ${error.message}`
          : `\n[e2e] ephemeral user deleted`,
      )
    }
  }

  console.log(`\n[e2e] ${checks - failures}/${checks} checks passed`)
  if (failures) {
    console.error(`[e2e] FAIL — ${failures} check(s) failed`)
    process.exit(1)
  }
  console.log('[e2e] PASS — signed-in active-devotional continuity verified')
}

main().catch((err) => {
  console.error('[e2e] ERROR:', err)
  process.exit(1)
})
