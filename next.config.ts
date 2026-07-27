import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  images: {
    unoptimized: true,
  },
  turbopack: {
    root: __dirname,
  },
  // Include curated series JSON files in serverless function bundles.
  // These are read at runtime via fs.readFileSync (dynamic paths) so the
  // output file tracer cannot discover them automatically.
  outputFileTracingIncludes: {
    '/api/soul-audit/*': ['./content/series-json/**/*.json'],
  },
  async redirects() {
    return [
      // F-084 (SA-033, 2026-07-27): legacy Wake-Up magazine mount retired
      // (founder pin 2026-07-12). Permanent redirects keep every old URL.
      { source: '/wake-up', destination: '/series', permanent: true },
      {
        source: '/wake-up/feed.xml',
        destination: '/series',
        permanent: true,
      },
      {
        source: '/wake-up/series/:slug',
        destination: '/series/:slug',
        permanent: true,
      },
      {
        source: '/wake-up/devotional/:slug',
        destination: '/devotional/:slug',
        permanent: true,
      },
      // RETIRED READER (Mobbin audit P0 #5): /daily-bread is the canonical
      // plan reader; old bookmarked /soul-audit/plan/<token>[?day=N] deep
      // links 307 there at the routing layer (a page-level redirect() can't
      // return a clean 307 once the root loading shell has flushed).
      {
        source: '/soul-audit/plan/:planToken',
        destination: '/daily-bread',
        permanent: false,
      },
      // RETIRED LIBRARY PAGES (F-068, Mobbin audit P1 #12): /library is the
      // single library home. /saved and /clippings 307 into their tabs at
      // the routing layer for the same reason as above; the page-level
      // redirect()s remain as belt-and-braces.
      {
        source: '/saved',
        destination: '/library?tab=bookmarks',
        permanent: false,
      },
      {
        source: '/clippings',
        destination: '/library?tab=clippings',
        permanent: false,
      },
    ]
  },
  async headers() {
    const isDev = process.env.NODE_ENV === 'development'
    const csp = [
      "default-src 'self'",
      "base-uri 'self'",
      "frame-ancestors 'none'",
      "object-src 'none'",
      isDev
        ? "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://challenges.cloudflare.com https://static.cloudflareinsights.com"
        : "script-src 'self' 'unsafe-inline' https://challenges.cloudflare.com https://static.cloudflareinsights.com",
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: https:",
      "font-src 'self' data:",
      "connect-src 'self' https://*.supabase.co https://api.anthropic.com https://generativelanguage.googleapis.com https://api.minimax.chat https://integrate.api.nvidia.com https://api.stripe.com https://cloudflareinsights.com",
      "frame-src 'self' https://challenges.cloudflare.com https://js.stripe.com https://hooks.stripe.com https://www.youtube-nocookie.com",
      "form-action 'self' https://checkout.stripe.com",
      'upgrade-insecure-requests',
    ].join('; ')

    return [
      {
        source: '/:path*',
        headers: [
          { key: 'Content-Security-Policy', value: csp },
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=31536000; includeSubDomains; preload',
          },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'X-Frame-Options', value: 'DENY' },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin',
          },
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
        ],
      },
    ]
  },
}

export default nextConfig
