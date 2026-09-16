import { createRequire } from 'node:module'
import path from 'node:path'
import { pathToFileURL } from 'node:url'
const require = createRequire('/Users/jamesparker/Documents/app-projects/external/euangelion/.claude/worktrees/daily-bread-v2/package.json')
const { chromium } = require('playwright-core')
const [html, out, width, height] = process.argv.slice(2)
const browser = await chromium.launch({ args: ['--use-angle=metal', '--enable-gpu', '--ignore-gpu-blocklist'] })
const page = await browser.newPage({ viewport: { width: Number(width), height: Number(height) }, deviceScaleFactor: 2 })
const errors = []
page.on('pageerror', (e) => errors.push(String(e)))
page.on('console', (m) => { if (m.type() !== 'log') errors.push(m.text()) })
await page.goto(pathToFileURL(path.resolve(html)).href)
await page.waitForTimeout(4000)
await page.screenshot({ path: out, fullPage: true })
const info = await page.evaluate(() => [...document.querySelectorAll('.band canvas')].map((c) => `${c.width}x${c.height}`).join(' '))
console.log('canvases', info, 'errors', errors.length ? errors.join(' | ') : 'none', 'overflow', await page.evaluate(() => document.documentElement.scrollWidth > innerWidth))
await browser.close()
