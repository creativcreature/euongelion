#!/usr/bin/env node
import fs from 'node:fs'
import path from 'node:path'
import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'

const here = path.dirname(fileURLToPath(import.meta.url))
const repo = path.resolve(here, '../..')
const require = createRequire(path.join(repo, 'package.json'))
const sharp = require('sharp')
const orientation = process.argv[2]
if (!['landscape', 'portrait'].includes(orientation)) throw new Error('use landscape or portrait')
const dir = path.join(repo, 'imagery-staging/series-v2', orientation)
const out = path.join(repo, 'imagery-staging/series-v2/contact', `${orientation}.html`)
const subjects = JSON.parse(fs.readFileSync(path.join(repo, 'scripts/imagery/series-image-subjects.json'))).subjects
const files = fs.readdirSync(dir).filter((f) => f.endsWith('.png')).sort()
const band = (s) => s.startsWith('AIRY') ? ['airy', 20, 35] : s.startsWith('MID') ? ['mid', 36, 60] : ['dense', 61, 85]
const rows = []
for (const file of files) {
  const slug = file.slice(0, -4)
  const img = await sharp(path.join(dir, file)).resize(240, 240, { fit: 'fill' }).raw().toBuffer({ resolveWithObject: true })
  let ink = 0, n = 0
  for (let i = 0; i < img.data.length; i += img.info.channels) { n++; if (img.data[i + 2] - img.data[i] > 40) ink++ }
  const pct = 100 * ink / n
  const [name, lo, hi] = band(subjects[slug] || '')
  rows.push({ file, slug, pct, name, pass: pct >= lo && pct <= hi })
}
const vals = rows.map((r) => r.pct), mean = vals.reduce((a,b)=>a+b,0)/vals.length
const sd = Math.sqrt(vals.reduce((a,b)=>a+(b-mean)**2,0)/vals.length)
const rel = `../${orientation}/`
const crops = orientation === 'landscape' ? [['1:1','1/1'],['1408:768','1408/768']] : [['1:2','1/2'],['3:5','3/5']]
const cards = rows.map((r) => `<article><h2>${r.slug}</h2><div class="master"><img src="${rel}${r.file}"></div><div class="crops">${crops.map(([n,a])=>`<figure style="aspect-ratio:${a}"><img src="${rel}${r.file}"><figcaption>${n}</figcaption></figure>`).join('')}</div><p class="${r.pass?'pass':'fail'}">${r.name} · ${r.pct.toFixed(1)}% ink · ${r.pass?'in band':'OUT OF BAND'}</p></article>`).join('')
const approved = ['prayer-of-jabez.webp','he-cannot-deny-himself.webp','looking-at-the-sun.webp','the-harvest.webp'].map((f)=>`<figure><img src="../../../public/images/site/series/${f}"><figcaption>${f.replace('.webp','')}</figcaption></figure>`).join('')
const html = `<!doctype html><meta charset="utf-8"><title>${orientation} contact sheet</title><style>body{margin:0;background:#111;color:#eee;font:13px system-ui;padding:24px}h1{margin:0 0 8px}.stats{margin-bottom:20px;color:#ccc}.approved,.grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:16px}.approved{margin:16px 0 28px}.approved figure{margin:0}.approved img,.master img{width:100%;display:block}.approved figcaption{padding-top:5px}.grid article{border:1px solid #333;padding:10px;background:#181818}.grid h2{font-size:12px;margin:0 0 8px;overflow-wrap:anywhere}.master{aspect-ratio:${orientation==='landscape'?'3/2':'3/4'}}.master img,.crops img{width:100%;height:100%;object-fit:cover}.crops{display:flex;gap:8px;height:100px;margin-top:8px}.crops figure{margin:0;position:relative}.crops figcaption{position:absolute;bottom:2px;left:2px;background:#000b;padding:2px 4px}.pass{color:#83d18b}.fail{color:#ff7b72} @media(max-width:900px){.approved,.grid{grid-template-columns:repeat(2,1fr)}}</style><h1>${orientation} proof contact sheet</h1><div class="stats">${rows.length} plates · mean ${mean.toFixed(1)}% · SD ${sd.toFixed(1)} · range ${Math.min(...vals).toFixed(1)}–${Math.max(...vals).toFixed(1)}% · ${rows.filter(r=>!r.pass).length} outside assigned band · native review resolution (not installable masters)</div><h2>Approved style anchors</h2><section class="approved">${approved}</section><section class="grid">${cards}</section>`
fs.writeFileSync(out, html)
console.log(out)
