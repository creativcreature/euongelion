import { promises as fs } from 'fs'
import path from 'path'
import StaticInfoPage from '@/components/StaticInfoPage'

export const metadata = {
  title: 'Cookie Policy | Euangelion',
  description: 'Cookie usage and consent controls.',
}

export default async function CookiePolicyPage() {
  const filePath = path.join(process.cwd(), 'content/legal/cookie-policy.md')
  let raw = ''
  try {
    raw = await fs.readFile(filePath, 'utf-8')
  } catch {
    raw = ''
  }

  const bodyLines = raw
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.length > 0 && !line.startsWith('#'))
    .slice(0, 16)

  return (
    <StaticInfoPage
      breadcrumb="COOKIE POLICY"
      kicker="LEGAL"
      title="Cookie Policy"
      sections={[
        {
          title: 'Cookie usage',
          body:
            bodyLines.length > 0
              ? bodyLines
              : [
                  'Euangelion uses essential cookies for session continuity and security.',
                  'Optional analytics cookies are disabled by default and require explicit opt-in.',
                ],
        },
      ]}
    />
  )
}
