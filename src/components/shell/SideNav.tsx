'use client'
import { useEffect, useRef } from 'react'
import { t } from '@/lib/translations'
import type { Tab } from '@/lib/deeplink'
import type { Lang } from '@/lib/types'

/** Small line icons (24px grid, drawn with the text colour). */
const ICONS: Record<string, React.ReactNode> = {
  overview: <><path d="M3 11l9-7 9 7" /><path d="M5 10v10h14V10" /><path d="M10 20v-6h4v6" /></>,
  results: <><path d="M8 6h12M8 12h12M8 18h12" /><path d="M4 6h.01M4 12h.01M4 18h.01" /></>,
  season: <><rect x="3" y="5" width="18" height="16" rx="2" /><path d="M3 10h18M8 3v4M16 3v4" /></>,
  rankings: <><path d="M8 21h8M12 17v4" /><path d="M7 4h10v5a5 5 0 0 1-10 0V4z" /><path d="M17 6h3v1a3 3 0 0 1-3 3M7 6H4v1a3 3 0 0 0 3 3" /></>,
  records: <><circle cx="12" cy="13" r="8" /><path d="M12 9v4l2.5 2.5M10 2h4M12 2v3" /></>,
  athletes: <><circle cx="12" cy="8" r="4" /><path d="M4 21a8 8 0 0 1 16 0" /></>,
  extra: <><path d="M5 21V4" /><path d="M5 4h11l-2 4 2 4H5" /></>,
  races: <><rect x="3" y="5" width="18" height="16" rx="2" /><path d="M3 10h18M8 3v4M16 3v4" /><path d="M9 15l2 2 4-4" /></>,
  points: <><circle cx="12" cy="12" r="9" /><path d="M12 11v6M12 7.5h.01" /></>,
}

/**
 * The menu, in groups. A new section is one more line here (plus its tab in
 * deeplink.ts, its panel in Dashboard.tsx and an icon above), so the menu
 * never runs out of room the way a row of header tabs does.
 */
const GROUPS: { title: string | null; items: { tab: Tab; label: string }[] }[] = [
  { title: null, items: [{ tab: 'overview', label: 'nav_overview' }] },
  { title: 'nav_group_kmcup', items: [
    { tab: 'results', label: 'nav_results' },
    { tab: 'season', label: 'nav_season' },
    { tab: 'rankings', label: 'nav_rankings' },
    { tab: 'records', label: 'nav_records' },
  ] },
  { title: 'nav_group_people', items: [{ tab: 'athletes', label: 'nav_athletes' }] },
  { title: 'nav_group_other', items: [{ tab: 'extra', label: 'nav_extra' }] },
  { title: 'nav_group_club', items: [{ tab: 'races', label: 'nav_races' }] },
  { title: 'nav_group_about', items: [{ tab: 'points', label: 'nav_points' }] },
]

function MenuList({ current, lang, onSelect }: {
  current: Tab
  lang: Lang
  onSelect: (tab: Tab) => void
}) {
  return (
    <>
      {GROUPS.map((g, gi) => (
        <div key={gi} className={gi === 0 ? 'mb-2' : 'mb-2 mt-3 border-t border-line pt-3'}>
          {/* Group names are labels, not links: small, quiet, no hover */}
          {g.title && (
            <div className="px-3 pb-1.5 text-[11px] font-bold uppercase tracking-[0.1em] text-muted" aria-hidden="true">{t(g.title, lang)}</div>
          )}
          <ul className="m-0 list-none p-0" aria-label={g.title ? t(g.title, lang) : undefined}>
            {g.items.map((item) => {
              const isCurrent = item.tab === current
              return (
                <li key={item.tab}>
                  <button
                    type="button"
                    onClick={() => onSelect(item.tab)}
                    aria-current={isCurrent ? 'page' : undefined}
                    className={`relative flex min-h-11 w-full items-center gap-3 rounded px-3 py-1.5 text-left text-[15px] font-semibold leading-snug focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand ${
                      isCurrent ? 'bg-white text-brand shadow-sm' : 'text-navy hover:bg-white/70'
                    }`}
                  >
                    {isCurrent && <span aria-hidden="true" className="absolute inset-y-1.5 left-0 w-1 rounded-r bg-brand" />}
                    <svg aria-hidden="true" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"
                      className={`shrink-0 ${isCurrent ? 'text-brand' : 'text-muted'}`}>
                      {ICONS[item.tab]}
                    </svg>
                    {t(item.label, lang)}
                  </button>
                </li>
              )
            })}
          </ul>
        </div>
      ))}
    </>
  )
}

interface Props {
  current: Tab
  lang: Lang
  /** Desktop: the menu column is shown (the header button hides it). */
  desktopOpen: boolean
  /** Phone/tablet: the menu slides in over the page. */
  mobileOpen: boolean
  onSelect: (tab: Tab) => void
  onCloseMobile: () => void
}

export function SideNav({ current, lang, desktopOpen, mobileOpen, onSelect, onCloseMobile }: Props) {
  const closeRef = useRef<HTMLButtonElement>(null)

  // Phone drawer: a real modal. Focus moves into it, Escape closes it, and the
  // page behind (marked data-page-shell) can't be scrolled, tabbed to or read.
  useEffect(() => {
    if (!mobileOpen) return
    closeRef.current?.focus()
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onCloseMobile() }
    document.addEventListener('keydown', onKey)
    const shell = [...document.querySelectorAll<HTMLElement>('[data-page-shell]')]
    for (const el of shell) el.inert = true
    const overflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      for (const el of shell) el.inert = false
      document.body.style.overflow = overflow
    }
  }, [mobileOpen, onCloseMobile])

  return (
    <>
      {/* Desktop column */}
      <nav id="side-menu" aria-label={t('nav_label', lang)}
        className={`${desktopOpen ? 'lg:block' : ''} hidden w-[248px] shrink-0 border-r border-line bg-mist px-3.5 pb-10 pt-6`}>
        <MenuList current={current} lang={lang} onSelect={onSelect} />
      </nav>

      {/* Phone/tablet drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div className="absolute inset-0 bg-navy/55" aria-hidden="true" onClick={onCloseMobile} />
          <div id="side-menu-mobile" role="dialog" aria-modal="true" aria-label={t('nav_label', lang)}
            className="absolute inset-y-0 left-0 flex w-[318px] max-w-[85vw] flex-col overflow-y-auto overscroll-contain bg-mist">
            <div className="flex items-center justify-between gap-2 border-b border-line bg-white py-3 pl-4 pr-2">
              <span className="font-script text-[22px] leading-tight text-brand">{t('site_name', lang)}</span>
              <button ref={closeRef} type="button" onClick={onCloseMobile} aria-label={t('menu_close', lang)}
                className="flex h-12 w-12 items-center justify-center rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand">
                <svg aria-hidden="true" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#212934" strokeWidth="2.2" strokeLinecap="round"><path d="M6 6l12 12M18 6L6 18" /></svg>
              </button>
            </div>
            <nav className="px-3 pb-2 pt-4">
              <MenuList current={current} lang={lang} onSelect={onSelect} />
            </nav>
            <div className="mt-auto border-t border-line p-4">
              <a href="https://triathlonvast.se"
                className="flex min-h-12 items-center justify-center rounded bg-brand font-display text-[15px] font-semibold text-white no-underline">
                triathlonvast.se
              </a>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
