'use client'
import Image from 'next/image'
import { useLang } from './LanguageProvider'

export function Header() {
  const { lang, setLang } = useLang()
  return (
    <header className="bg-white border-b-[3px] border-red-700 shadow-sm">
      <div className="max-w-6xl mx-auto px-4 py-1.5 flex items-center justify-between">
        <Image
          src="/OGLogo-2.png"
          alt="Triathlon Väst"
          width={220}
          height={76}
          className="object-contain"
          priority
        />
        <button
          onClick={() => setLang(lang === 'en' ? 'sv' : 'en')}
          aria-label={lang === 'en' ? 'Switch to Swedish' : 'Switch to English'}
          className="text-xs font-medium text-gray-500 hover:text-red-700 border border-gray-200 rounded-md px-2.5 py-1 transition-colors bg-gray-50 hover:bg-white focus-visible:ring-2 focus-visible:ring-red-700 focus-visible:ring-offset-1"
        >
          {lang === 'en' ? '🇸🇪 Svenska' : '🇬🇧 English'}
        </button>
      </div>
    </header>
  )
}
