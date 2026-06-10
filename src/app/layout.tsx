import type { Metadata } from 'next'
import './globals.css'
import { LanguageProvider } from '@/components/LanguageProvider'
import { Header } from '@/components/Header'
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
          <Header />
          {children}
        </LanguageProvider>
        <Analytics />
      </body>
    </html>
  )
}
