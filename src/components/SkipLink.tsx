'use client'
import { useLang } from './LanguageProvider'
import { t } from '@/lib/translations'

export function SkipLink() {
  const { lang } = useLang()
  return (
    <a
      href="#main"
      className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-50 focus:bg-white focus:px-4 focus:py-2 focus:text-red-700 focus:rounded focus:shadow"
    >
      {t('skip_to_content', lang)}
    </a>
  )
}
