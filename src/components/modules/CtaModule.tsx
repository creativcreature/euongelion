import Link from 'next/link'
import type { Module } from '@/types'
import { typographer } from '@/lib/typographer'

export default function CtaModule({ module }: { module: Module }) {
  if (!module.ctaLabel || !module.ctaHref) return null

  return (
    <aside className="cta-module my-14 md:my-20 text-center">
      {module.ctaSubtext && (
        <p
          className="vw-small text-secondary type-prose mb-4"
          style={{
            maxWidth: '36rem',
            margin: '0 auto 1rem',
            fontStyle: 'italic',
          }}
        >
          {typographer(module.ctaSubtext)}
        </p>
      )}

      <Link
        href={module.ctaHref}
        className="cta-major text-label inline-block px-6 py-3"
        style={{
          letterSpacing: '0.12em',
          textDecoration: 'none',
        }}
      >
        {module.ctaLabel} →
      </Link>
    </aside>
  )
}
