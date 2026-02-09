import type { Metadata } from 'next'
import { Space_Grotesk, Cormorant_Garamond } from 'next/font/google'
import './globals.css'

const spaceGrotesk = Space_Grotesk({
  variable: '--font-space-grotesk',
  subsets: ['latin'],
  weight: ['300', '400', '500', '600', '700'],
})

const cormorant = Cormorant_Garamond({
  variable: '--font-cormorant',
  subsets: ['latin'],
  weight: ['300', '400', '500', '600', '700'],
  style: ['normal', 'italic'],
})

export const metadata: Metadata = {
  title: { default: 'Euangelion', template: '%s | Euangelion' },
  description:
    'Daily bread for the cluttered, hungry soul. Ancient wisdom, modern design.',
  metadataBase: new URL('https://euangelion.app'),
  openGraph: {
    type: 'website',
    locale: 'en_US',
    siteName: 'Euangelion',
  },
  twitter: { card: 'summary_large_image' },
  robots: { index: true, follow: true },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" className="dark">
      <body
        className={`${spaceGrotesk.variable} ${cormorant.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  )
}
