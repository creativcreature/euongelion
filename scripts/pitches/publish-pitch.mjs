#!/usr/bin/env node
/**
 * Publish a pitch to the founder's pitch site (SA-114 / F-158).
 *
 * Founder, 2026-08-20: "Im sick of having a million artifacts. I need a
 * site i can see things on respond on, that archives all the pitch pages
 * so I can see everything in one place, and its now the place ALL
 * euangelion pitches land from ANY session."
 *
 * THE CONTRACT (all sessions): pitches are NEVER Claude artifacts. Publish
 * here; the founder reads and responds at euangelion.app/admin/pitches.
 * Storage-backed — no deploy, no commit, visible within seconds.
 *
 * Usage:
 *   node scripts/pitches/publish-pitch.mjs <body.md|body.html> \
 *     --title="The pitch title" [--slug=custom-slug] [--tags=a,b] [--session=name]
 *
 * Markdown is rendered to HTML at publish time (marked). Re-publishing the
 * same slug REPLACES the pitch body and bumps updatedAt (revisions are the
 * norm — one pitch page per idea, updated in place).
 */
import { readFileSync } from 'node:fs'
import { marked } from 'marked'

const URL_ = process.env.NEXT_PUBLIC_SUPABASE_URL
const KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
if (!URL_ || !KEY) throw new Error('Supabase env missing — source .env.local first')
const H = { apikey: KEY, Authorization: `Bearer ${KEY}` }

const args = process.argv.slice(2)
const file = args.find((a) => !a.startsWith('--'))
const flag = (name, dflt = '') =>
  args.find((a) => a.startsWith(`--${name}=`))?.slice(name.length + 3) ?? dflt
const title = flag('title')
if (!file || !title) throw new Error('usage: publish-pitch.mjs <body.md|html> --title="..."')

const slug =
  flag('slug') ||
  title
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .slice(0, 64)

const raw = readFileSync(file, 'utf8')
const html = file.endsWith('.md') ? marked.parse(raw) : raw

// CONCURRENT-SAFE BY DESIGN (founder: "multiple agents can write to it
// simultaneously"): there is NO shared index file to race on. One object
// per pitch; the site derives its index by LISTING the bucket. Two
// sessions publishing at the same moment touch two different objects.
const now = new Date().toISOString()
let existing = null
{
  const r = await fetch(`${URL_}/storage/v1/object/pitches/items/${slug}.json`, { headers: H })
  if (r.ok) existing = await r.json()
}
const entry = {
  slug,
  title,
  tags: flag('tags') ? flag('tags').split(',').map((t) => t.trim()) : (existing?.tags ?? []),
  session: flag('session', existing?.session ?? 'unnamed-session'),
  createdAt: existing?.createdAt ?? now,
  updatedAt: now,
}

const put = async (path, body, type) => {
  const r = await fetch(`${URL_}/storage/v1/object/pitches/${path}`, {
    method: 'POST',
    headers: { ...H, 'Content-Type': type, 'x-upsert': 'true' },
    body,
  })
  if (!r.ok) throw new Error(`${path}: ${r.status} ${await r.text()}`)
}
await put(`items/${slug}.json`, JSON.stringify({ ...entry, html }), 'application/json')
console.log(`[pitch] ${existing ? 'updated' : 'published'}: ${title}`)
console.log(`        read + respond: https://euangelion.app/admin/pitches/${slug}`)
