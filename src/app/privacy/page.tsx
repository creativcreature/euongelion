import { promises as fs } from 'fs'
import path from 'path'
import Navigation from '@/components/Navigation'

export const metadata = {
  title: 'Privacy Policy | Euangelion',
  description: 'How Euangelion collects, uses, and protects your information.',
}

export default async function PrivacyPage() {
  const filePath = path.join(process.cwd(), 'content/legal/privacy-policy.md')
  const [content, stat] = await Promise.all([
    fs.readFile(filePath, 'utf-8'),
    fs.stat(filePath),
  ])
  const lastUpdated = stat.mtime.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })

  // Simple markdown to HTML: headings, paragraphs, lists, bold
  const html = markdownToHtml(content)

  return (
    <div className="min-h-screen bg-page">
      <Navigation />

      <main
        id="main-content"
        className="mx-auto max-w-3xl px-6 pb-32 pt-12 md:px-[60px] md:pb-48 md:pt-20"
      >
        <p className="vw-small mb-8 text-muted">Last updated: {lastUpdated}</p>
        <div
          className="prose-legal"
          dangerouslySetInnerHTML={{ __html: html }}
        />
      </main>

      <footer
        className="py-16 md:py-24"
        style={{ borderTop: '1px solid var(--color-border)' }}
      >
        <div className="mx-auto max-w-7xl px-6 md:px-[60px] lg:px-20">
          <div className="text-center">
            <p className="text-label vw-small leading-relaxed text-muted">
              SOMETHING TO HOLD ONTO.
            </p>
            <p className="vw-small mt-8 text-muted">&copy; 2026 EUANGELION</p>
          </div>
        </div>
      </footer>
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
