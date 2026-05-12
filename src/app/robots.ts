import type { MetadataRoute } from 'next'

// Audit T13 (HOMEPAGE-AUDIT-2026-05-11): make a deliberate per-AI-crawler
// decision instead of a silent allow-all. Stance below is OPT-IN —
// permit both search indexing and training. Reversible by swapping
// `allow: '/'` to `disallow: '/'` for any individual UA.
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      // Search engines
      { userAgent: 'Googlebot', allow: '/' },
      { userAgent: 'Bingbot', allow: '/' },
      { userAgent: 'DuckDuckBot', allow: '/' },

      // AI search crawlers (index for AI search panels)
      { userAgent: 'PerplexityBot', allow: '/' },
      { userAgent: 'ChatGPT-User', allow: '/' },
      { userAgent: 'Claude-Web', allow: '/' },

      // AI training crawlers (current stance: opt-in)
      { userAgent: 'GPTBot', allow: '/' },
      { userAgent: 'ClaudeBot', allow: '/' },
      { userAgent: 'anthropic-ai', allow: '/' },
      { userAgent: 'Google-Extended', allow: '/' },
      { userAgent: 'CCBot', allow: '/' },
      { userAgent: 'cohere-ai', allow: '/' },

      // Fall-through
      { userAgent: '*', allow: '/' },
    ],
    sitemap: 'https://euangelion.app/sitemap.xml',
  }
}
