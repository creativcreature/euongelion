#!/usr/bin/env node
/**
 * Headless master-size upscaling (SA-100 / F-146).
 *
 * Founder question 2026-08-19: can the Photoshop upscale run without the
 * Mac? Answer: Real-ESRGAN's GENERAL model (realesrgan-x4plus). Validated
 * on a real riso plate: the Ben-Day halftone grid survives 4x intact —
 * the anime variant was rejected because it vectorizes the hatching, and
 * dot density IS the brand ("every shadow is dot density"). The founder's
 * Photoshop/Topaz pass remains the optional premium finish for print.
 *
 * Pipeline: native-size generation (per the standing 2026-08-16 ruling)
 * → 4x Real-ESRGAN → exact-master downsample (Lanczos via sips on macOS,
 * ImageMagick on linux CI).
 *
 * Usage: node scripts/imagery/upscale-ci.mjs <in> <out> <W> <H>
 * The binary auto-downloads per-platform to .cache/realesrgan/ on first run.
 */
import { execFileSync } from 'node:child_process'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const HERE = path.dirname(fileURLToPath(import.meta.url))
const REPO = path.resolve(HERE, '../..')
const CACHE = path.join(REPO, '.cache/realesrgan')
const RELEASE =
  'https://github.com/xinntao/Real-ESRGAN/releases/download/v0.2.5.0'

const [, , input, output, wStr, hStr] = process.argv
if (!input || !output || !wStr || !hStr) {
  console.error('usage: upscale-ci.mjs <in> <out> <W> <H>')
  process.exit(2)
}
const W = Number(wStr)
const H = Number(hStr)
const absIn = path.resolve(input)
const absOut = path.resolve(output)

function binary() {
  const plat = os.platform()
  const zipName =
    plat === 'darwin'
      ? 'realesrgan-ncnn-vulkan-20220424-macos.zip'
      : 'realesrgan-ncnn-vulkan-20220424-ubuntu.zip'
  const bin = path.join(CACHE, 'realesrgan-ncnn-vulkan')
  if (!fs.existsSync(bin)) {
    fs.mkdirSync(CACHE, { recursive: true })
    const zip = path.join(CACHE, zipName)
    execFileSync('curl', ['-sL', '-o', zip, `${RELEASE}/${zipName}`])
    execFileSync('unzip', ['-oq', zip, '-d', CACHE])
    fs.chmodSync(bin, 0o755)
    if (plat === 'darwin') {
      // Gatekeeper quarantines the downloaded binary; strip it or execFile
      // dies with a bare non-zero.
      execFileSync('xattr', ['-dr', 'com.apple.quarantine', CACHE])
    }
  }
  return bin
}

const up4x = path.join(os.tmpdir(), `up4x-${Date.now()}.png`)
// GENERAL model — preserves halftone dot texture (validated 2026-08-19).
// The ncnn binary loads ./models relative to CWD — run from the cache dir.
execFileSync(binary(), ['-i', absIn, '-o', up4x, '-n', 'realesrgan-x4plus'], {
  stdio: 'inherit',
  cwd: CACHE,
})

// Exact-master downsample, Lanczos.
if (os.platform() === 'darwin') {
  execFileSync('sips', ['-z', String(H), String(W), up4x, '--out', absOut], {
    stdio: 'ignore',
  })
} else {
  execFileSync('convert', [up4x, '-resize', `${W}x${H}!`, '-filter', 'Lanczos', absOut], {
    stdio: 'inherit',
  })
}
fs.unlinkSync(up4x)
console.log(`[upscale] ${path.basename(absIn)} → ${W}x${H} (${absOut})`)
