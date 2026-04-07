import type { Metadata } from 'next'
import './globals.css'
import { LanguageProvider } from '@/components/LanguageProvider'
import { Header } from '@/components/Header'

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
        <a href="#main" className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-50 focus:bg-white focus:px-4 focus:py-2 focus:text-red-700 focus:rounded focus:shadow">
          Skip to main content
        </a>
        <LanguageProvider>
          <Header />
          {children}
        </LanguageProvider>
      </body>
    </html>
  )
}
