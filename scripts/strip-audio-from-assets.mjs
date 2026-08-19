#!/usr/bin/env node
/**
 * Remove narration audio from the Cloudflare asset bundle before deploy.
 *
 * Audio is served from R2 by `src/app/audio/[file]/route.ts`, which is the only
 * way seeking works: Cloudflare's static-asset layer does not implement 206
 * Partial Content, so a Range request returns the whole file and every scrub in
 * a 20-minute reading refetches all of it.
 *
 * But the asset layer answers BEFORE the Worker whenever a matching file
 * exists. `assets.run_worker_first` is supposed to override that and, measured
 * on wrangler 4.110, does not — a request for a track that exists as an asset
 * never reaches the route, while a request for one that does not reach it fine.
 * Deleting the files is what actually hands `/audio/*` to the Worker.
 *
 * Two things fall out of this beyond seeking:
 *   - deploys stop uploading 3.7 GB of audio every time, and
 *   - Cloudflare's hard 25 MiB per-asset limit stops applying to tracks at all,
 *     which was going to block any scored re-render.
 *
 * Safe to run when the directory is already absent. `public/audio/` is
 * untouched, so `next dev` still serves audio locally from disk.
 */
import { existsSync, rmSync, readdirSync, statSync } from 'node:fs'
import path from 'node:path'

const dir = path.join(process.cwd(), '.open-next', 'assets', 'audio')

if (!existsSync(dir)) {
  console.log('[strip-audio] nothing to strip — .open-next/assets/audio absent')
  process.exit(0)
}

let files = 0
let bytes = 0
for (const name of readdirSync(dir)) {
  const full = path.join(dir, name)
  try {
    bytes += statSync(full).size
    files += 1
  } catch {
    // A file that vanished between listing and stat is not worth failing over.
  }
}

rmSync(dir, { recursive: true, force: true })
console.log(
  `[strip-audio] removed ${files} tracks (${(bytes / 1024 ** 3).toFixed(2)} GiB) from the asset bundle — served from R2 instead`,
)
