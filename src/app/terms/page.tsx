import { promises as fs } from 'fs'
import path from 'path'
import Breadcrumbs from '@/components/Breadcrumbs'
import EuangelionShellHeader from '@/components/EuangelionShellHeader'
import SiteFooter from '@/components/SiteFooter'

export const metadata = {
  title: 'Terms of Service | Euangelion',
  description: 'Terms of service for using the Euangelion platform.',
}

export default async function TermsPage() {
  const filePath = path.join(process.cwd(), 'content/legal/terms-of-service.md')
  const [content, stat] = await Promise.all([
    fs.readFile(filePath, 'utf-8'),
    fs.stat(filePath),
  ])
  const lastUpdated = stat.mtime.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })

  const html = markdownToHtml(content)

  return (
    <div className="newspaper-home min-h-screen">
      <EuangelionShellHeader />

      <main id="main-content" className="shell-content-pad mx-auto max-w-3xl">
        <Breadcrumbs
          className="mb-7"
          items={[{ label: 'HOME', href: '/' }, { label: 'TERMS' }]}
        />
        <p className="vw-small mb-8 text-muted">Last updated: {lastUpdated}</p>
        <div
          className="prose-legal"
          dangerouslySetInnerHTML={{ __html: html }}
        />
      </main>
      <SiteFooter />
    </div>
  )
}

function markdownToHtml(md: string): string {
  return md
    .split('\n\n')
    .map((block) => {
      const trimmed = block.trim()
      if (trimmed.startsWith('# ')) {
        return `<h1 class="text-display vw-heading-lg mb-8">${trimmed.slice(2)}</h1>`
      }
      if (trimmed.startsWith('## ')) {
        return `<h2 class="text-display vw-heading-md mb-6 mt-12">${trimmed.slice(3)}</h2>`
      }
      if (trimmed.startsWith('### ')) {
        return `<h3 class="text-label vw-small text-gold mb-4 mt-8">${trimmed.slice(4)}</h3>`
      }
      if (trimmed.startsWith('- ')) {
        const items = trimmed
          .split('\n')
          .filter((l) => l.startsWith('- '))
          .map((l) => `<li class="mb-2">${processBold(l.slice(2))}</li>`)
          .join('')
        return `<ul class="list-disc pl-6 mb-6 vw-body text-secondary space-y-1">${items}</ul>`
      }
      if (trimmed.startsWith('**')) {
        return `<p class="vw-body mb-4 text-secondary">${processBold(trimmed)}</p>`
      }
      if (trimmed.length === 0 || trimmed === '---') return ''
      return `<p class="vw-body mb-4 leading-relaxed text-secondary">${processBold(trimmed)}</p>`
    })
    .join('\n')
}

function processBold(text: string): string {
  return text.replace(
    /\*\*(.+?)\*\*/g,
    '<strong class="text-[var(--color-text-primary)]">$1</strong>',
  )
}
