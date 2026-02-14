import Link from 'next/link'

export type BreadcrumbItem = {
  label: string
  href?: string
}

export default function Breadcrumbs({
  items,
  className = '',
}: {
  items: BreadcrumbItem[]
  className?: string
}) {
  if (items.length === 0) return null

  return (
    <nav
      aria-label="Breadcrumb"
      className={`app-breadcrumbs text-label ${className}`.trim()}
    >
      <ol>
        {items.map((item, index) => {
          const isLast = index === items.length - 1
          return (
            <li key={`${item.label}-${index}`}>
              {item.href && !isLast ? (
                <Link href={item.href} className="app-breadcrumb-link">
                  {item.label}
                </Link>
              ) : (
                <span
                  className="app-breadcrumb-current"
                  aria-current={isLast ? 'page' : undefined}
                >
                  {item.label}
                </span>
              )}
              {!isLast && <span aria-hidden="true">/</span>}
            </li>
          )
        })}
      </ol>
    </nav>
  )
}
