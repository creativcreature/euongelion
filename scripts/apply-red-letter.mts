import fs from 'node:fs'
import { withRedLetter } from '../src/lib/red-letter-resolve'

const files = process.argv.slice(2)
for (const file of files) {
  const json = JSON.parse(fs.readFileSync(file, 'utf8'))
  let changed = false
  json.modules = json.modules.map((m: any) => {
    if (m && m.type === 'scripture') {
      const before = JSON.stringify(m.redLetter || [])
      const after = withRedLetter(m)
      if (JSON.stringify(after.redLetter || []) !== before) changed = true
      return after
    }
    return m
  })
  fs.writeFileSync(file, JSON.stringify(json, null, 2) + '\n')
  console.log(`${file}: ${changed ? 'redLetter applied/updated' : 'no change'}`)
}
