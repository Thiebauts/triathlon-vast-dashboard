import type { Metadata } from 'next'
import { IBM_Plex_Sans, Raleway, Yellowtail } from 'next/font/google'
import './globals.css'
import { LanguageProvider } from '@/components/LanguageProvider'
import { SkipLink } from '@/components/SkipLink'
import { Analytics } from '@vercel/analytics/next'

// The club website's typefaces: IBM Plex Sans for headings and numbers,
// Raleway for body text, Yellowtail for the small script eyebrows.
const plex = IBM_Plex_Sans({ subsets: ['latin'], weight: ['500', '600'], style: ['normal', 'italic'], variable: '--font-plex', display: 'swap' })
const raleway = Raleway({ subsets: ['latin'], weight: ['400', '500', '600', '700'], variable: '--font-raleway', display: 'swap' })
const yellowtail = Yellowtail({ subsets: ['latin'], weight: '400', variable: '--font-yellowtail', display: 'swap' })

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
    <html lang="en" className={`${plex.variable} ${raleway.variable} ${yellowtail.variable}`}>
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
