import { typographer } from '@/lib/typographer'

interface WordblockPanelProps {
  eyebrow?: string
  title: string
  body: string
  className?: string
}

export default function WordblockPanel({
  eyebrow,
  title,
  body,
  className = '',
}: WordblockPanelProps) {
  return (
    <article className={`wordblock-panel ${className}`.trim()}>
      {eyebrow && <p className="text-label vw-small text-gold">{eyebrow}</p>}
      <h3 className="vw-heading-md">{typographer(title)}</h3>
      <div className="newspaper-rule my-4" />
      <p className="vw-body text-secondary type-prose">{typographer(body)}</p>
    </article>
  )
}
