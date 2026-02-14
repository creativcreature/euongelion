#!/usr/bin/env node
import fs from 'fs'
import { execSync } from 'child_process'

const messageFile = process.argv[2]
if (!messageFile) process.exit(0)

const message = fs.readFileSync(messageFile, 'utf8').trim()

if (
  message.startsWith('Merge ') ||
  message.startsWith('Revert "') ||
  message.startsWith('fixup!') ||
  message.startsWith('squash!')
) {
  process.exit(0)
}

const staged = execSync('git diff --cached --name-only --diff-filter=ACMR', {
  encoding: 'utf8',
})
  .split('\n')
  .map((line) => line.trim())
  .filter(Boolean)

const hasFeatureChanges = staged.some((file) => /^src\/.+\.(ts|tsx)$/.test(file))
if (!hasFeatureChanges) {
  process.exit(0)
}

if (!/\bSA-\d{3}\b/.test(message)) {
  console.error(
    '\n⚠️  Feature commit messages must reference a production decision id (e.g., SA-001).\n',
  )
  process.exit(1)
}

const featureIds = Array.from(new Set(message.match(/\bF-\d{3}\b/g) || []))
if (featureIds.length === 0) {
  console.error(
    '\n⚠️  Feature commit messages must reference a feature PRD id (e.g., F-005).\n',
  )
  process.exit(1)
}

for (const featureId of featureIds) {
  const expectedPrdPath = `docs/feature-prds/${featureId}.md`
  if (!staged.includes(expectedPrdPath)) {
    console.error(
      `\n⚠️  Commit references ${featureId} but ${expectedPrdPath} is not staged.\n`,
    )
    process.exit(1)
  }
}
