#!/usr/bin/env node
/**
 * Cut a release: one command, so the three numbers that must move together
 * cannot drift apart again.
 *
 *   node scripts/release.mjs patch|minor|major   cut a release
 *   node scripts/release.mjs --sync              realign the SW pair only
 *   node scripts/release.mjs <any> --dry-run     show, change nothing
 *
 * Three numbers, three jobs:
 *
 *   package.json version   the edition. What you cite.
 *   sw.js CACHE_NAME       the cache generation. Bumping it makes the browser
 *                          install a new worker, whose activate handler drops
 *                          every cache that is not the current one.
 *   SW_VERSION (client)    the RECOVERY path. The client compares it against
 *                          localStorage and, on a mismatch, unregisters every
 *                          worker and deletes every euangelion-* cache before
 *                          re-registering. It exists for readers whose worker
 *                          is wedged and who would otherwise never see a fix.
 *
 * sw.js carries a comment demanding the last two stay in sync. They did not:
 * found 2026-08-18 at v117 and v108 respectively, nine apart, meaning the
 * recovery path had been inert for nine releases. A returning reader's stored
 * 'v108' matched the shipped 'v108', so the clear never fired. Hand-editing two
 * files in two languages on every deploy was never going to hold — hence this.
 *
 * A git tag is created but NOT pushed; pushing is a deliberate act.
 */
import fs from 'node:fs'
import path from 'node:path'
import { execFileSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const args = process.argv.slice(2)
const DRY = args.includes('--dry-run')
const SYNC_ONLY = args.includes('--sync')
const bump = args.find((a) => ['patch', 'minor', 'major'].includes(a))

if (!bump && !SYNC_ONLY) {
  console.error('usage: release.mjs patch|minor|major [--dry-run]')
  console.error('       release.mjs --sync [--dry-run]')
  process.exit(2)
}

const PKG = path.join(REPO, 'package.json')
const SW = path.join(REPO, 'public/sw.js')
const REG = path.join(REPO, 'src/components/ServiceWorkerRegistration.tsx')

const read = (p) => fs.readFileSync(p, 'utf8')
const pkg = JSON.parse(read(PKG))
const swSrc = read(SW)
const regSrc = read(REG)

const swNum = Number(swSrc.match(/const CACHE_NAME = 'euangelion-v(\d+)'/)?.[1])
const regNum = Number(regSrc.match(/const SW_VERSION = 'v(\d+)'/)?.[1])
if (!Number.isFinite(swNum) || !Number.isFinite(regNum)) {
  console.error('release: could not read the SW version from one or both files.')
  process.exit(1)
}

// Never move backwards: take the highest seen, so a drift is healed upward and
// no reader is handed a version number they have already stored.
const nextSw = Math.max(swNum, regNum) + (SYNC_ONLY && swNum === regNum ? 0 : (SYNC_ONLY ? 0 : 1))
const targetSw = SYNC_ONLY ? Math.max(swNum, regNum) : nextSw

const [maj, min, pat] = pkg.version.split('.').map(Number)
const nextVersion = SYNC_ONLY ? pkg.version
  : bump === 'major' ? `${maj + 1}.0.0`
  : bump === 'minor' ? `${maj}.${min + 1}.0`
  : `${maj}.${min}.${pat + 1}`

console.log(`edition      ${pkg.version}  ->  ${nextVersion}`)
console.log(`sw.js        v${swNum}  ->  v${targetSw}`)
console.log(`SW_VERSION   v${regNum}  ->  v${targetSw}${regNum !== swNum ? '   (drift healed)' : ''}`)

if (DRY) { console.log('\n--dry-run: nothing written'); process.exit(0) }

if (!SYNC_ONLY) {
  pkg.version = nextVersion
  fs.writeFileSync(PKG, JSON.stringify(pkg, null, 2) + '\n')
}
fs.writeFileSync(SW, swSrc.replace(/const CACHE_NAME = 'euangelion-v\d+'/, `const CACHE_NAME = 'euangelion-v${targetSw}'`))
fs.writeFileSync(REG, regSrc.replace(/const SW_VERSION = 'v\d+'/, `const SW_VERSION = 'v${targetSw}'`))

if (!SYNC_ONLY) {
  // `verify:tracking` requires CHANGELOG's Current Status marker to match the
  // package version, so a release that skips it fails the commit gate. Moving
  // it here keeps the release one command rather than one command plus a
  // remembered edit — the same reason the two SW numbers live here.
  const CL = path.join(REPO, 'CHANGELOG.md')
  const cl = fs.readFileSync(CL, 'utf8')
  const marker = /^\*\*Version:\*\* .+$/m
  if (marker.test(cl)) {
    fs.writeFileSync(CL, cl.replace(marker, `**Version:** ${nextVersion}`))
    console.log(`CHANGELOG     Current Status marker -> ${nextVersion}`)
  } else {
    console.log('CHANGELOG     no "**Version:**" marker found — update it by hand')
  }

  try {
    execFileSync('git', ['tag', '-a', `v${nextVersion}`, '-m', `Euangelion v${nextVersion}`], { cwd: REPO })
    console.log(`\ntagged v${nextVersion} (local only — push with: git push origin v${nextVersion})`)
  } catch {
    console.log(`\ncould not tag v${nextVersion} — it may already exist.`)
  }
}
console.log('\nStage: package.json public/sw.js src/components/ServiceWorkerRegistration.tsx' + (SYNC_ONLY ? '' : ' CHANGELOG.md'))
