'use client'
import Image from 'next/image'
import { useLang } from './LanguageProvider'
import { t } from '@/lib/translations'

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
          aria-label={t('switch_to_swedish', lang)}
          className="text-xs font-medium text-gray-500 hover:text-red-700 border border-gray-200 rounded-md px-2.5 py-1 transition-colors bg-gray-50 hover:bg-white"
        >
          {lang === 'en' ? '🇸🇪 Svenska' : '🇬🇧 English'}
        </button>
      </div>
    </header>
  )
}
