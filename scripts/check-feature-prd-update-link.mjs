#!/usr/bin/env node
import { execSync } from 'child_process'

function run(cmd) {
  return execSync(cmd, { encoding: 'utf8' })
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
}

function fail(message) {
  console.error(`\n[feature-prd-update-link] ${message}\n`)
  process.exit(1)
}

const staged = run('git diff --cached --name-only --diff-filter=ACMR')
if (staged.length === 0) process.exit(0)

const hasFeatureCode = staged.some((file) => /^src\/.+\.(ts|tsx)$/.test(file))
if (!hasFeatureCode) process.exit(0)

const hasFeaturePrd = staged.some((file) => /^docs\/feature-prds\/F-\d{3}\.md$/.test(file))
if (!hasFeaturePrd) {
  fail('Feature code is staged but no docs/feature-prds/F-xxx.md file is staged.')
}

console.log('[feature-prd-update-link] OK')
