import type { Metadata, Viewport } from 'next'
import ServiceWorkerRegistration from '@/components/ServiceWorkerRegistration'
import Reveal from '@/components/motion/Reveal'
import MastheadIntro from '@/components/motion/MastheadIntro'
import ConsentAwareAnalytics from '@/components/ConsentAwareAnalytics'
import MobileTabBar from '@/components/MobileTabBar'
import InstallPrompt from '@/components/InstallPrompt'
import Providers from './providers'
import GlobalAudioHost from '@/components/audio/GlobalAudioHost'
import AudioDrawer from '@/components/audio/AudioDrawer'
import './globals.css'

/**
 * `viewport-fit=cover` is the whole point of this export.
 *
 * There was no viewport export at all, so Next emitted its default
 * `width=device-width, initial-scale=1` WITHOUT `viewport-fit=cover` — and
 * `env(safe-area-inset-*)` resolves to 0 unless that is set. Roughly fifteen
 * safe-area rules were already written against it and every one was inert:
 * `--shell-safe-top`, the tab bar's home-indicator padding, the menu panel's
 * bottom inset, the cookie banner and the search overlay's notch padding.
 *
 * It matters most in the installed PWA: this app ships
 * `statusBarStyle: 'black-translucent'` with `display: standalone`, which
 * extends the web view under the status bar and REQUIRES the insets to
 * compensate. Without them the topbar renders beneath the notch.
 *
 * `maximumScale` / `userScalable` are deliberately left alone — Next's default
 * permits pinch-zoom, and taking that away is an accessibility failure.
 */
export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
}

export const metadata: Metadata = {
  title: { default: 'Euangelion', template: '%s | Euangelion' },
  description:
    'Daily bread for the cluttered, hungry soul. Ancient wisdom, modern design.',
  metadataBase: new URL('https://euangelion.app'),
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'Euangelion',
  },
  openGraph: {
    type: 'website',
    locale: 'en_US',
    siteName: 'Euangelion',
  },
  twitter: { card: 'summary_large_image' },
  robots: { index: true, follow: true },
  other: {
    'theme-color': '#0b1420',
    'apple-mobile-web-app-capable': 'yes',
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" className="dark" suppressHydrationWarning>
      <head>
        {/* Anti-FOUC: resolve the theme from localStorage / prefers-color-scheme
            and toggle html.dark BEFORE first paint, so a light-preference visitor
            doesn't see a dark→light flash on every load. The <html> ships with the
            dark-first class; this strips it synchronously when light is wanted.
            Mirrors getInitialTheme() + the toggle in EuangelionShellHeader. */}
        <script
          dangerouslySetInnerHTML={{
            __html:
              "(function(){try{var t=localStorage.getItem('theme');var d=t==='dark'||(t!=='light'&&window.matchMedia('(prefers-color-scheme: dark)').matches);document.documentElement.classList.toggle('dark',d);}catch(e){}})();",
          }}
        />
        <link
          rel="preload"
          href="/fonts/InstrumentSerif-Regular.woff2"
          as="font"
          type="font/woff2"
          crossOrigin="anonymous"
        />
        <link
          rel="preload"
          href="/fonts/InstrumentSerif-Italic.woff2"
          as="font"
          type="font/woff2"
          crossOrigin="anonymous"
        />
        {/* Preload only LCP-critical fonts: the above-the-fold display serif
            (Instrument Regular + Italic) + the Industry-Bold masthead weight.
            The Industry Book/Demi UI-label weights load via @font-face on their
            own — preloading them made 5 fonts compete with the LCP hero image
            for early bandwidth. */}
        <link
          rel="preload"
          href="/fonts/IndustryTest-Bold.otf"
          as="font"
          type="font/otf"
          crossOrigin="anonymous"
        />
      </head>
      <body className="newsprint-site antialiased">
        {/* Audit a11y: skip-link must be the first focusable thing
            on every page. Hidden until keyboard-focused. */}
        <a href="#main-content" className="skip-link">
          Skip to reading
        </a>
        <Providers>
          {children}
          {/* SA-096: the one audio element on the site, and the transport that
              follows a listener across routes. Both live ABOVE the route so
              playback survives navigation — a media element rendered inside a
              page is destroyed when Next swaps routes, and playback dies with
              it. The host renders nothing; the bar retires on the reading it
              is playing, where the reader's own panel is the better surface. */}
          <GlobalAudioHost />
          {/* SA-107: the queue, tucked. A full-width bar across every page
              pushed against the written content the site is actually for; this
              is a compact handle that opens into a drawer. Not invisible: it
              carries what is playing and how many are behind it. */}
          <AudioDrawer />
          <MobileTabBar />
          <InstallPrompt />
        </Providers>
        {/* F-104: one scroll-motion island for the whole site. Renders
            nothing; adds reveal/parallax behaviour to anything carrying
            data-reveal or data-parallax, and does nothing at all under
            prefers-reduced-motion. */}
        <MastheadIntro />
        <Reveal />
        <ServiceWorkerRegistration />
        <ConsentAwareAnalytics />
      </body>
    </html>
  )
}
