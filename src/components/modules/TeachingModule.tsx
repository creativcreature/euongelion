'use client'

import ReactMarkdown from 'react-markdown'
import type { Module } from '@/types'
import { typographer } from '@/lib/typographer'
import DropCap from '@/components/motion/DropCap'
import PullQuote from '@/components/PullQuote'

export default function TeachingModule({ module }: { module: Module }) {
  if (!module.content && !module.keyInsight) return null

  const paragraphs = module.content ? module.content.split('\n\n') : []
  const usColumns = paragraphs.length > 3
  const useMarkdown = module.markdown === true

  return (
    <div className="my-16 md:my-24">
      {module.heading && (
        <h2 className="text-display vw-heading-md mb-10">{module.heading}</h2>
      )}
      {module.keyInsight && <PullQuote>{module.keyInsight}</PullQuote>}
      <div
        className={`space-y-6 type-prose ${usColumns ? 'columns-prose' : ''}`}
      >
        {useMarkdown && module.content ? (
          <div className="vw-body leading-relaxed text-secondary teaching-markdown">
            <ReactMarkdown
              components={{
                p: ({ children }) => (
                  <p className="vw-body leading-relaxed text-secondary mb-6">
                    {children}
                  </p>
                ),
                strong: ({ children }) => (
                  <strong style={{ fontWeight: 600 }}>{children}</strong>
                ),
                em: ({ children }) => (
                  <em style={{ fontStyle: 'italic' }}>{children}</em>
                ),
                blockquote: ({ children }) => (
                  <blockquote
                    className="my-8 pl-5"
                    style={{
                      borderLeft: '2px solid var(--color-gold)',
                      fontStyle: 'italic',
                    }}
                  >
                    {children}
                  </blockquote>
                ),
                a: ({ href, children }) => (
                  <a
                    href={href}
                    className="link-highlight"
                    target={href?.startsWith('http') ? '_blank' : undefined}
                    rel={
                      href?.startsWith('http')
                        ? 'noopener noreferrer'
                        : undefined
                    }
                  >
                    {children}
                  </a>
                ),
                ul: ({ children }) => (
                  <ul className="my-6 ml-6 space-y-2 list-disc">{children}</ul>
                ),
                ol: ({ children }) => (
                  <ol className="my-6 ml-6 space-y-2 list-decimal">
                    {children}
                  </ol>
                ),
                li: ({ children }) => (
                  <li className="vw-body leading-relaxed text-secondary">
                    {children}
                  </li>
                ),
                h2: ({ children }) => (
                  <h3 className="text-display vw-heading-sm mt-12 mb-6">
                    {children}
                  </h3>
                ),
                h3: ({ children }) => (
                  <h4 className="text-display vw-body-lg mt-10 mb-5">
                    {children}
                  </h4>
                ),
              }}
            >
              {module.content}
            </ReactMarkdown>
          </div>
        ) : (
          paragraphs.map((paragraph, i) =>
            i === 0 ? (
              <DropCap
                key={i}
                className="vw-body leading-relaxed text-secondary"
              >
                {typographer(paragraph)}
              </DropCap>
            ) : (
              <p key={i} className="vw-body leading-relaxed text-secondary">
                {typographer(paragraph)}
              </p>
            ),
          )
        )}
      </div>
    </div>
  )
}
