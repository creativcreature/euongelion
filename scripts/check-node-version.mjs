#!/usr/bin/env node

const [majorRaw, minorRaw] = process.versions.node.split('.')
const major = Number.parseInt(majorRaw, 10)
const minor = Number.parseInt(minorRaw, 10)

const supported =
  Number.isFinite(major) &&
  Number.isFinite(minor) &&
  major >= 20 &&
  major < 25 &&
  (major > 20 || minor >= 10)

if (!supported) {
  const range = '>=20.10 <25'
  console.error(
    `[node-version] Unsupported Node.js ${process.versions.node}. Expected ${range}.`,
  )
  console.error(
    '[node-version] Switch Node version (nvm/fnm/volta) before running build.',
  )
  process.exit(1)
}
