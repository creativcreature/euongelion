import { promises as fs } from 'fs'
import path from 'path'
import Breadcrumbs from '@/components/Breadcrumbs'
import EuangelionShellHeader from '@/components/EuangelionShellHeader'
import SiteBottom from '@/components/SiteBottom'
import { retentionClarityRows } from '@/lib/privacy/retention'

export const metadata = {
  title: 'Privacy Policy',
  description: 'How Euangelion collects, uses, and protects your information.',
}

export default async function PrivacyPage() {
  const filePath = path.join(process.cwd(), 'content/legal/privacy-policy.md')
  let content = ''
  let lastUpdated = 'February 2026'
  try {
    const [raw, stat] = await Promise.all([
      fs.readFile(filePath, 'utf-8'),
      fs.stat(filePath),
    ])
    content = raw
    lastUpdated = stat.mtime.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    })
  } catch {
    content =
      '# Privacy Policy\n\n' +
      'Euangelion respects your privacy. We collect only what is necessary for the service to function.\n\n' +
      '## Data We Collect\n\n' +
      'We collect your email address for authentication and anonymous usage data to improve the experience.\n\n' +
      '## Contact\n\n' +
      'For privacy inquiries, contact us at privacy@euangelion.app.'
  }

  // Simple markdown to HTML: headings, paragraphs, lists, bold
  const html = markdownToHtml(content)
  const retentionRows = retentionClarityRows()

  return (
    <div className="mock-home min-h-screen">
      <main id="main-content" className="mock-paper min-h-screen">
        <EuangelionShellHeader />
        <div className="shell-content-pad mx-auto max-w-3xl">
          <Breadcrumbs
            className="mb-7"
            items={[{ label: 'HOME', href: '/' }, { label: 'PRIVACY' }]}
          />
          <p className="vw-small mb-8 text-muted">
            Last updated: {lastUpdated}
          </p>

          {/* Retention clarity (F-037): what is stored, where, for how
              long — visible per artifact type, sourced from the same
              policy the backend enforces so copy cannot drift. */}
          <section
            aria-labelledby="retention-clarity-heading"
            className="mb-12 pb-12"
            style={{ borderBottom: '1px solid var(--color-border)' }}
          >
            <h2
              id="retention-clarity-heading"
              className="text-display vw-heading-md mb-2"
            >
              What we store, and for how long
            </h2>
            <p
              className="vw-body mb-8 text-secondary"
              style={{ maxWidth: '60ch' }}
            >
              Anonymous use stays anonymous. Here is exactly what each thing you
              create is, where it lives, and when it is deleted.
            </p>
            <div className="grid gap-4">
              {retentionRows.map((row) => (
                <div
                  key={row.id}
                  className="p-5"
                  style={{ border: '1px solid var(--color-border)' }}
                >
                  <p className="text-label vw-small mb-3 text-gold">
                    {row.artifact}
                  </p>
                  <dl className="grid gap-2">
                    <div>
                      <dt className="text-label vw-small text-muted">WHAT</dt>
                      <dd className="vw-small text-secondary">{row.what}</dd>
                    </div>
                    <div>
                      <dt className="text-label vw-small text-muted">WHERE</dt>
                      <dd className="vw-small text-secondary">{row.where}</dd>
                    </div>
                    <div>
                      <dt className="text-label vw-small text-muted">
                        HOW LONG
                      </dt>
                      <dd className="vw-small text-secondary">
                        {row.retention}
                      </dd>
                    </div>
                  </dl>
                </div>
              ))}
            </div>
          </section>

          <div
            className="prose-legal"
            dangerouslySetInnerHTML={{ __html: html }}
          />
        </div>
        <SiteBottom />
      </main>
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
