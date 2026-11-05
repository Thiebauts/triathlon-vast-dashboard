'use client'
import { useEffect, useRef } from 'react'
import { t } from '@/lib/translations'
import type { Tab } from '@/lib/deeplink'
import type { Lang } from '@/lib/types'

/**
 * The menu, in groups. A new section is one more line here (plus its tab in
 * deeplink.ts and its panel in Dashboard.tsx), so the menu never runs out of
 * room the way a row of header tabs does.
 */
const GROUPS: { title: string | null; items: { tab: Tab; label: string }[] }[] = [
  { title: null, items: [{ tab: 'overview', label: 'nav_overview' }] },
  { title: 'nav_group_kmcup', items: [
    { tab: 'results', label: 'nav_results' },
    { tab: 'season', label: 'nav_season' },
    { tab: 'rankings', label: 'nav_rankings' },
  ] },
  { title: 'nav_group_people', items: [{ tab: 'athletes', label: 'nav_athletes' }] },
  { title: 'nav_group_other', items: [{ tab: 'extra', label: 'nav_extra' }] },
]

function MenuList({ current, lang, onSelect, firstLinkRef }: {
  current: Tab
  lang: Lang
  onSelect: (tab: Tab) => void
  firstLinkRef?: React.Ref<HTMLButtonElement>
}) {
  return (
    <>
      {GROUPS.map((g, gi) => (
        <div key={gi} className="mb-4">
          {g.title && (
            <div className="px-3 pb-1 text-xs font-bold uppercase tracking-[0.06em] text-muted">{t(g.title, lang)}</div>
          )}
          <ul className="m-0 list-none p-0">
            {g.items.map((item, ii) => {
              const isCurrent = item.tab === current
              return (
                <li key={item.tab}>
                  <button
                    ref={gi === 0 && ii === 0 ? firstLinkRef : undefined}
                    type="button"
                    onClick={() => onSelect(item.tab)}
                    aria-current={isCurrent ? 'page' : undefined}
                    className={`flex min-h-11 w-full items-center rounded px-3 text-left text-[15px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand ${
                      isCurrent ? 'bg-white font-bold text-brand' : 'font-semibold text-navy hover:bg-white/70'
                    }`}
                  >
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

  // Phone drawer: focus moves into it, Escape closes it.
  useEffect(() => {
    if (!mobileOpen) return
    closeRef.current?.focus()
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onCloseMobile() }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
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
            className="absolute inset-y-0 left-0 flex w-[318px] max-w-[85vw] flex-col overflow-y-auto bg-mist">
            <div className="flex items-center justify-between gap-2 border-b border-line bg-white py-3 pl-4 pr-2">
              <span className="font-script text-[22px] leading-tight text-brand">{t('site_name', lang)}</span>
              <button ref={closeRef} type="button" onClick={onCloseMobile} aria-label={t('menu_close', lang)}
                className="flex h-12 w-12 items-center justify-center rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand">
                <svg aria-hidden="true" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#212934" strokeWidth="2.2" strokeLinecap="round"><path d="M6 6l12 12M18 6L6 18" /></svg>
              </button>
            </div>
            <nav aria-label={t('nav_label', lang)} className="px-3 pb-2 pt-4">
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
