// Upload the five-directions pitch media to edition-assets/pitch-media/<slug>/ and check each is served.
// Run from the daily-bread-v2 worktree (for @supabase/supabase-js) with the env helper.
import { createClient } from '@supabase/supabase-js'
import fs from 'node:fs'
import path from 'node:path'

const ROOT = '/private/tmp/claude-501/-Users-jamesparker/f0c13e66-1929-4032-92d6-e89d2d1d2c71/scratchpad/anim-tests/pitch-five'
const SLUG = 'daily-bread-sower-five-directions'
const s = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)
const wanted = /^(preview-3x1\.webp|still-3x1\.jpg|still-2x1\.jpg|test05-excerpt\.webp)$/
const base = `${process.env.NEXT_PUBLIC_SUPABASE_URL.replace(/\/$/, '')}/storage/v1/object/public/edition-assets/pitch-media/${SLUG}`
for (const dir of fs.readdirSync(ROOT).filter((d) => fs.statSync(path.join(ROOT, d)).isDirectory()).sort()) {
  for (const f of fs.readdirSync(path.join(ROOT, dir)).filter((f) => wanted.test(f))) {
    const key = `pitch-media/${SLUG}/${dir}-${f}`
    const type = f.endsWith('.webp') ? 'image/webp' : 'image/jpeg'
    const { error } = await s.storage.from('edition-assets').upload(key, fs.readFileSync(path.join(ROOT, dir, f)), { contentType: type, upsert: true, cacheControl: '300' })
    if (error) { console.log('FAILED', key, error.message); continue }
    const r = await fetch(`${base}/${dir}-${f}`, { method: 'HEAD' })
    console.log(r.status, r.headers.get('content-type'), r.headers.get('content-length'), `${dir}-${f}`)
  }
}
