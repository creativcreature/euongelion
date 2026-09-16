// Draw the sower's two plates large, composed as ink on paper without screening, for review.
import { createRequire } from 'node:module'
import fs from 'node:fs'
import path from 'node:path'
import { pathToFileURL } from 'node:url'
const require = createRequire('/Users/jamesparker/Documents/app-projects/external/euangelion/.claude/worktrees/daily-bread-v2/package.json')
const { chromium } = require('playwright-core')
const [html, out, mode] = process.argv.slice(2)
const browser = await chromium.launch()
const page = await browser.newPage({ viewport: { width: 400, height: 300 } })
const errors = []
page.on('pageerror', (e) => errors.push(String(e)))
await page.goto(`${pathToFileURL(path.resolve(html)).href}?capture=1&w=400&aspect=1.333`)
await page.waitForTimeout(300)
const data = await page.evaluate((mode) => {
  const W = mode === 'close' ? 1400 : 2400, H = mode === 'close' ? 1000 : 760
  const mk = () => { const c = document.createElement('canvas'); c.width = W; c.height = H; const x = c.getContext('2d'); x.fillStyle = '#000'; x.fillRect(0, 0, W, H); return [c, x] }
  const [tc, tx] = mk(), [lc, lx] = mk()
  lx.globalCompositeOperation = 'lighter'
  const rnd = (() => { const r = mulberry(4051); return Array.from({ length: 64 }, () => r()) })()
  const I = new Ink(tx, lx, 1, [.55, -.83], [-.3, -.95])
  if (mode === 'close') {
    const pose = sowerPose(10 * CYCLE, 1, .62)
    drawSower(I, pose, 560, 2150, 2200, rnd)
  } else {
    const fs = [0, .15, .3, .44, .58, .72, .86]
    fs.forEach((f, i) => drawSower(I, sowerPose(f * CYCLE), 170 + i * 330, 720, 640, rnd))
  }
  const out = document.createElement('canvas'); out.width = W; out.height = H
  const o = out.getContext('2d'); const img = o.createImageData(W, H)
  const T = tx.getImageData(0, 0, W, H).data, L = lx.getImageData(0, 0, W, H).data
  const paper = [235, 220, 178], ink = [26, 77, 152], gold = [239, 188, 63]
  for (let i = 0; i < W * H; i++) {
    const cover = T[i * 4 + 2] / 255
    const b = cover > .001 ? (T[i * 4] / 255) / cover * cover : 0, g = cover > .001 ? (T[i * 4 + 1] / 255) : 0
    const lb = L[i * 4] / 255, lg = L[i * 4 + 1] / 255
    for (let ch = 0; ch < 3; ch++) {
      let v = paper[ch] / 255
      v *= 1 - Math.max(g, lg) * (1 - Math.min(1, gold[ch] / paper[ch]))
      v *= 1 - b * .85 * (1 - ink[ch] / paper[ch])
      v *= 1 - lb * (1 - ink[ch] / paper[ch] * .92)
      img.data[i * 4 + ch] = v * 255
    }
    img.data[i * 4 + 3] = 255
  }
  o.putImageData(img, 0, 0)
  return out.toDataURL('image/png')
}, mode || 'walk')
if (errors.length) console.log('errors:', errors.join(' | '))
fs.writeFileSync(out, Buffer.from(data.split(',')[1], 'base64'))
await browser.close()
