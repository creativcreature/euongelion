import Link from 'next/link'
import type { ReactNode } from 'react'
import Breadcrumbs from '@/components/Breadcrumbs'
import EuangelionShellHeader from '@/components/EuangelionShellHeader'
import SiteFooter from '@/components/SiteFooter'

const ADMIN_NAV = [
  { href: '/admin', label: 'Dashboard' },
  { href: '/admin/youtube-allowlist', label: 'YouTube Allowlist' },
  { href: '/admin/moderation', label: 'Moderation' },
  { href: '/admin/feed-controls', label: 'Feed Controls' },
  { href: '/admin/transparency', label: 'Transparency' },
  { href: '/admin/audit-logs', label: 'Audit Logs' },
]

export default function AdminShell({
  title,
  kicker,
  activeHref,
  children,
}: {
  title: string
  kicker: string
  activeHref: string
  children: ReactNode
}) {
  return (
    <div className="newspaper-home min-h-screen">
      <EuangelionShellHeader />
      <main id="main-content" className="shell-content-pad mx-auto max-w-6xl">
        <Breadcrumbs
          className="mb-7"
          items={[
            { label: 'HOME', href: '/' },
            { label: 'ADMIN', href: '/admin' },
            { label: title.toUpperCase() },
          ]}
        />

        <header className="mb-8 border-b border-[var(--color-border)] pb-6">
          <p className="text-label vw-small mb-3 text-gold">{kicker}</p>
          <h1 className="vw-heading-md">{title}</h1>
        </header>

        <nav
          className="mb-8 grid gap-2 border border-[var(--color-border)] p-3 md:grid-cols-3"
          aria-label="Admin sections"
        >
          {ADMIN_NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="text-label vw-small border border-[var(--color-border)] px-3 py-2"
              style={
                item.href === activeHref
                  ? {
                      borderColor: 'var(--color-border-strong)',
                      color: 'var(--color-gold)',
                    }
                  : undefined
              }
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <section className="mb-16">{children}</section>
      </main>
      <SiteFooter />
    </div>
  )
}
