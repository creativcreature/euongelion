// Render frames of a scene test in headless Chromium.
// node capture.mjs <html> <outDir> --w=1500 --aspect=3 --seed=4242 --times=0.2,1,2.2 | --fps=24 --from=0 --to=19.2
import { createRequire } from 'node:module'
import fs from 'node:fs'
import path from 'node:path'
import { pathToFileURL } from 'node:url'

const require = createRequire('/Users/jamesparker/Documents/app-projects/external/euangelion/.claude/worktrees/daily-bread-v2/package.json')
const { chromium } = require('playwright-core')

const [html, outDir, ...rest] = process.argv.slice(2)
const opt = Object.fromEntries(rest.map((a) => a.replace(/^--/, '').split('=')))
const w = Number(opt.w || 1500), aspect = Number(opt.aspect || 3), seed = Number(opt.seed || 4242)
let times
if (opt.times) times = opt.times.split(',').map(Number)
else {
  const fps = Number(opt.fps || 24), from = Number(opt.from || 0), to = Number(opt.to || 19.2)
  times = []
  for (let i = 0; from + i / fps < to - 1e-9; i++) times.push(from + i / fps)
}
fs.mkdirSync(outDir, { recursive: true })
const browser = await chromium.launch({ args: ['--use-angle=metal', '--enable-gpu', '--ignore-gpu-blocklist', '--allow-file-access-from-files'] })
const page = await browser.newPage({ viewport: { width: w, height: Math.round(w / aspect) } })
const errors = []
page.on('console', (m) => { if (m.type() === 'error' || m.type() === 'warning') errors.push(m.text()) })
page.on('pageerror', (e) => errors.push(String(e)))
await page.goto(`${pathToFileURL(path.resolve(html)).href}?capture=1&w=${w}&aspect=${aspect}&seed=${seed}`)
await page.waitForFunction(() => window.__ready === true, null, { timeout: 60000 }).catch(() => {})
if (errors.length) console.log('page errors:', errors.join('\n'))
const renderer = await page.evaluate(() => {
  const gl = document.createElement('canvas').getContext('webgl')
  const ext = gl && gl.getExtension('WEBGL_debug_renderer_info')
  return gl ? (ext ? gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) : 'webgl') : 'none'
})
console.log('renderer:', renderer)
const started = Date.now()
for (let i = 0; i < times.length; i++) {
  const t = times[i]
  const data = await page.evaluate((tt) => { window.__render(tt); return document.querySelector('canvas').toDataURL('image/png') }, t)
  const name = opt.times ? `t${String(t).replace('.', '_')}.png` : `f${String(i).padStart(4, '0')}.png`
  fs.writeFileSync(path.join(outDir, name), Buffer.from(data.split(',')[1], 'base64'))
}
console.log(`${times.length} frames in ${((Date.now() - started) / 1000).toFixed(1)} s`)
await browser.close()
