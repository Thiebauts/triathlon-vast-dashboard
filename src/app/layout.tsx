import type { Metadata } from 'next'
import './globals.css'
import { LanguageProvider } from '@/components/LanguageProvider'
import { Header } from '@/components/Header'

export const metadata: Metadata = {
  title: 'Triathlon Väst – Competition Dashboard',
  description: 'Results, rankings, and athlete profiles for Triathlon Väst members (2021–present).',
  openGraph: {
    title: 'Triathlon Väst – Competition Dashboard',
    description: 'Results, rankings, and athlete profiles for Triathlon Väst members.',
    images: ['/OGLogo-2.png'],
    type: 'website',
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="sv">
      <body>
        <LanguageProvider>
          <Header />
          {children}
        </LanguageProvider>
      </body>
    </html>
  )
}
