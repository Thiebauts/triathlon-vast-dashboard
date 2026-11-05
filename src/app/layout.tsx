import type { Metadata } from 'next'
// The club website's typefaces, shipped with the site (Fontsource) rather than
// fetched from Google at build time: next/font/google broke Vercel builds that
// reused a build cache. IBM Plex Sans for headings and numbers, Raleway for
// body text, Yellowtail for the small script eyebrows.
import '@fontsource/ibm-plex-sans/500.css'
import '@fontsource/ibm-plex-sans/600.css'
import '@fontsource/ibm-plex-sans/600-italic.css'
import '@fontsource/raleway/400.css'
import '@fontsource/raleway/500.css'
import '@fontsource/raleway/600.css'
import '@fontsource/raleway/700.css'
import '@fontsource/yellowtail/400.css'
import './globals.css'
import { LanguageProvider } from '@/components/LanguageProvider'
import { SkipLink } from '@/components/SkipLink'
import { Analytics } from '@vercel/analytics/next'

export const metadata: Metadata = {
  metadataBase: process.env.VERCEL_PROJECT_PRODUCTION_URL
    ? new URL(`https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`)
    : new URL('http://localhost:3000'),
  title: 'Triathlon Väst – Competition Dashboard',
  description: 'Results, rankings, and athlete profiles for Triathlon Väst members (2021–present).',
  openGraph: {
    title: 'Triathlon Väst – Competition Dashboard',
    description: 'Results, rankings, and athlete profiles for Triathlon Väst members.',
    images: ['/OGLogo-2.png'],
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Triathlon Väst – Competition Dashboard',
    description: 'Results, rankings, and athlete profiles for Triathlon Väst members.',
    images: ['/OGLogo-2.png'],
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <LanguageProvider>
          <SkipLink />
          {children}
        </LanguageProvider>
        <Analytics />
      </body>
    </html>
  )
}
