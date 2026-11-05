'use client'
import Image from 'next/image'
import { forwardRef } from 'react'
import { t } from '@/lib/translations'
import type { Lang } from '@/lib/types'
import { AthleteSearch } from './AthleteSearch'

interface Props {
  lang: Lang
  onLangChange: (l: Lang) => void
  menuExpanded: boolean
  /** Desktop with the side menu showing: the button reads "Hide menu". */
  menuShowsHide: boolean
  onToggleMenu: () => void
  /** id of the menu the button opens (desktop column or phone drawer). */
  menuId: string
  onHome: () => void
  athleteNames: string[]
  onAthleteSelect: (name: string) => void
}

/** Red club bar, then the white header: menu button, logo + site name, athlete search, language. */
export const SiteHeader = forwardRef<HTMLButtonElement, Props>(function SiteHeader(
  { lang, onLangChange, menuExpanded, menuShowsHide, onToggleMenu, menuId, onHome, athleteNames, onAthleteSelect },
  menuButtonRef,
) {
  return (
    <>
      <div className="bg-brand">
        <div className="flex min-h-8 items-center justify-end px-4 sm:px-6">
          <a href="https://triathlonvast.se" className="text-[13px] leading-snug text-white no-underline hover:underline">
            {t('club_site_link', lang)}
          </a>
        </div>
      </div>
      <header className="border-b border-line bg-white">
        {/* The logo is the visual title; this gives the page its one <h1>. */}
        <h1 className="sr-only">{t('site_title', lang)}</h1>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 px-3 py-3 sm:px-6 lg:min-h-20">
          <button
            ref={menuButtonRef}
            type="button"
            onClick={onToggleMenu}
            aria-expanded={menuExpanded}
            aria-controls={menuId}
            className="flex h-12 items-center gap-2.5 rounded border border-line bg-white pl-3 pr-3.5 font-display text-[15px] font-semibold text-navy hover:bg-mist focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
          >
            <svg aria-hidden="true" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
              <path d="M4 6h16M4 12h16M4 18h16" />
            </svg>
            <span className="max-sm:sr-only">{menuShowsHide ? t('menu_hide', lang) : t('menu_show', lang)}</span>
          </button>
          <a href="./" onClick={(e) => { e.preventDefault(); onHome() }} className="flex min-w-0 flex-1 flex-col items-start gap-0.5 no-underline sm:flex-none sm:flex-row sm:items-center sm:gap-3">
            <Image src="/OGLogo-2.png" alt="Triathlon Väst" width={180} height={62} className="h-auto w-[130px] object-contain sm:w-[180px]" priority />
            <span className="whitespace-nowrap font-script text-[20px] leading-none text-brand sm:text-[30px]">{t('site_name', lang)}</span>
          </a>
          <div className="order-last w-full sm:order-none sm:ml-auto sm:w-[300px]">
            <AthleteSearch athleteNames={athleteNames} lang={lang} onSelect={onAthleteSelect} />
          </div>
          <button
            type="button"
            onClick={() => onLangChange(lang === 'en' ? 'sv' : 'en')}
            lang={lang === 'en' ? 'sv' : 'en'}
            className="ml-auto min-h-11 px-2 text-sm font-semibold text-navy underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand sm:ml-0"
          >
            {lang === 'en' ? 'Svenska' : 'English'}
          </button>
        </div>
      </header>
    </>
  )
})
