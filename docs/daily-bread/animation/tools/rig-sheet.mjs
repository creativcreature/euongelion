import { createRequire } from 'node:module'
import fs from 'node:fs'
import path from 'node:path'
import { pathToFileURL } from 'node:url'
const require = createRequire('/Users/jamesparker/Documents/app-projects/external/euangelion/.claude/worktrees/daily-bread-v2/package.json')
const { chromium } = require('playwright-core')
const [html, out] = process.argv.slice(2)
const browser = await chromium.launch()
const page = await browser.newPage({ viewport: { width: 400, height: 300 } })
await page.goto(`${pathToFileURL(path.resolve(html)).href}?capture=1&w=400&aspect=1.333`)
await page.waitForTimeout(300)
const data = await page.evaluate(() => {
  const c = document.createElement('canvas'); c.width = 2400; c.height = 700
  const ctx = c.getContext('2d'); ctx.fillStyle = '#f4ecd6'; ctx.fillRect(0, 0, c.width, c.height)
  const fs = [0, .15, .3, .44, .58, .72, .86, .95]
  fs.forEach((f, i) => {
    const pose = sowerPose(f * CYCLE)
    drawSower(ctx, pose, 150 + i * 290, 650, 580, 1, '#1a3f80', '#6a86b8', '#27508f', '#3b64a3', '#f4ecd6')
    ctx.fillStyle = '#000'; ctx.font = '20px sans-serif'; ctx.fillText('f=' + f, 110 + i * 290, 690)
  })
  return c.toDataURL('image/png')
})
fs.writeFileSync(out, Buffer.from(data.split(',')[1], 'base64'))
await browser.close()
