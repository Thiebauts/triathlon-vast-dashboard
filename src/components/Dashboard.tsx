'use client'
import { useState, useCallback, useEffect, useRef } from 'react'
import { useLang } from './LanguageProvider'
import { t } from '@/lib/translations'
import { buildHash, parseHash, type Tab } from '@/lib/deeplink'
import { OverviewTab } from './tabs/OverviewTab'
import { ResultsTab } from './tabs/ResultsTab'
import { AthletesTab } from './tabs/AthletesTab'
import { RankingsTab } from './tabs/RankingsTab'
import { ExtraEventsTab } from './tabs/ExtraEventsTab'
import { SeasonTab } from './tabs/SeasonTab'
import { SEASON_YEARS } from '@/lib/season'
import { SiteHeader } from './shell/SiteHeader'
import { SideNav } from './shell/SideNav'
import { SiteFooter } from './shell/SiteFooter'
import type { CompetitionsData, ClubAthlete, ExtraCategory, ExtraEvent, ResultsCategory, SportType } from '@/lib/types'

const VALID_SPORTS: readonly string[] = ['triathlon', 'duathlon', 'swimming', 'cycling', 'running', 'swimrun']
const RESULTS_CATEGORIES: readonly string[] = ['all', 'men', 'women', 'youth']
const EXTRA_CATEGORIES: readonly string[] = ['all', 'men', 'women']
const YEAR_RE = /^\d{4}$/
const DEFAULT_SPORT: SportType = 'triathlon'

interface Props {
  data: CompetitionsData
  athleteNames: string[]
  allTimeRankings: ClubAthlete[]
  extraEvents: ExtraEvent[]
  /** ISO date of the newest result, from getLatestResultDate(). */
  lastUpdated: string
  /** Race day per "<sport>-<year>", from getRaceDates(). */
  raceDates: Record<string, string>
}

export function Dashboard({ data, athleteNames, allTimeRankings, extraEvents, lastUpdated, raceDates }: Props) {
  const { lang, setLang } = useLang()
  const [tab, setTab] = useState<Tab>('overview')
  // Panels mount on first visit and then stay mounted: the server renders only
  // the Overview tab (smaller HTML), while revisited tabs keep their filter
  // state, memoized rankings, and Recharts DOM so switching back is instant.
  const [visited, setVisited] = useState<ReadonlySet<Tab>>(() => new Set<Tab>(['overview']))
  // Per-tab selections live here (not in the tabs) so the URL hash can mirror
  // the full view: #results/<sport>/<year>/<category>, #extra/<date>/<category>, …
  const [selectedAthlete, setSelectedAthlete] = useState<string | null>(null)
  const [sport, setSport] = useState<SportType>(DEFAULT_SPORT)
  const [resultsYear, setResultsYear] = useState('all')
  const [resultsCategory, setResultsCategory] = useState<ResultsCategory>('all')
  const [extraDate, setExtraDate] = useState<string | null>(extraEvents[0]?.date ?? null)
  const [extraCategory, setExtraCategory] = useState<ExtraCategory>('all')
  const [rankingsYear, setRankingsYear] = useState('all')
  const [seasonYear, setSeasonYear] = useState(SEASON_YEARS[0])

  // Side menu: a column on desktop (the header button hides it), a drawer
  // over the page on phones and tablets.
  const [desktopMenuOpen, setDesktopMenuOpen] = useState(true)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [isDesktop, setIsDesktop] = useState(true)
  const menuButtonRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    const mq = window.matchMedia('(min-width: 1024px)')
    const update = () => setIsDesktop(mq.matches)
    update()
    mq.addEventListener('change', update)
    return () => mq.removeEventListener('change', update)
  }, [])

  const toggleMenu = useCallback(() => {
    if (window.matchMedia('(min-width: 1024px)').matches) setDesktopMenuOpen((o) => !o)
    else setMobileMenuOpen(true)
  }, [])

  const closeMobileMenu = useCallback(() => {
    setMobileMenuOpen(false)
    menuButtonRef.current?.focus()
  }, [])

  const selectTab = useCallback((id: Tab) => {
    setTab(id)
    setVisited((prev) => (prev.has(id) ? prev : new Set(prev).add(id)))
    setMobileMenuOpen(false)
  }, [])

  const viewLabel = (id: Tab) => t(`nav_${id}`, lang)

  // Picking a menu item starts the new view at the top
  const selectTabFromMenu = useCallback((id: Tab) => {
    selectTab(id)
    window.scrollTo({ top: 0 })
  }, [selectTab])

  const navigateToAthlete = useCallback((name: string) => {
    setSelectedAthlete(name)
    selectTab('athletes')
  }, [selectTab])

  const navigateToExtra = useCallback(() => selectTab('extra'), [selectTab])
  const navigateToSeason = useCallback(() => selectTab('season'), [selectTab])

  // The season recap's "Full ranking" opens Club Rankings on that same year
  const navigateToSeasonRankings = useCallback(() => {
    setRankingsYear(seasonYear)
    selectTab('rankings')
  }, [seasonYear, selectTab])

  // Years differ per sport, so switching sport resets the year filter —
  // the single place for that rule (the sport <select> and the Overview
  // discipline cards both go through here).
  const changeSport = useCallback((next: SportType) => {
    setSport(next)
    setResultsYear('all')
  }, [])

  const navigateToSport = useCallback((next: SportType) => {
    changeSport(next)
    selectTab('results')
  }, [changeSport, selectTab])

  // ── Deep links ──────────────────────────────────────────────────────────────
  // The hash mirrors the current view (#extra/2026-06-10, #athletes/Name, …)
  // so any view can be bookmarked or shared. Read after mount only — the
  // server always renders the overview, so reading the hash during the first
  // render would cause a hydration mismatch (same pattern as the saved
  // language in LanguageProvider).
  const applyHash = useCallback(() => {
    const parsed = parseHash(window.location.hash)
    if (!parsed) return
    const [p0, p1, p2] = parsed.params
    // A missing or invalid segment means its default, not "keep the current
    // value": following #…/2026/women and then #…/2026 (or pressing Back)
    // must drop the women filter.
    if (parsed.tab === 'results') {
      setSport(p0 && VALID_SPORTS.includes(p0) ? p0 as SportType : DEFAULT_SPORT)
      setResultsYear(p1 && (p1 === 'all' || YEAR_RE.test(p1)) ? p1 : 'all')
      setResultsCategory(p2 && RESULTS_CATEGORIES.includes(p2) ? p2 as ResultsCategory : 'all')
    } else if (parsed.tab === 'athletes') {
      if (p0 && athleteNames.includes(p0)) setSelectedAthlete(p0)
    } else if (parsed.tab === 'extra') {
      setExtraDate(p0 || (extraEvents[0]?.date ?? null))
      setExtraCategory(p1 && EXTRA_CATEGORIES.includes(p1) ? p1 as ExtraCategory : 'all')
    } else if (parsed.tab === 'season') {
      setSeasonYear(p0 && SEASON_YEARS.includes(p0) ? p0 : SEASON_YEARS[0])
    } else if (parsed.tab === 'rankings') {
      setRankingsYear(p0 && (p0 === 'all' || YEAR_RE.test(p0)) ? p0 : 'all')
    }
    selectTab(parsed.tab)
  }, [athleteNames, extraEvents, selectTab])

  const urlInitialized = useRef(false)
  useEffect(() => {
    // The post-mount re-render is the point: applying the deep link only
    // after hydration keeps server and client HTML identical (the server
    // always renders the overview).
    // eslint-disable-next-line react-hooks/set-state-in-effect
    applyHash()
    urlInitialized.current = true
    // Re-apply on hash edits and same-document hash navigations. Our own
    // replaceState below never fires hashchange, so this cannot loop.
    window.addEventListener('hashchange', applyHash)
    return () => window.removeEventListener('hashchange', applyHash)
  }, [applyHash])

  useEffect(() => {
    if (!urlInitialized.current) return
    const params =
      tab === 'results' ? [sport, resultsYear, resultsCategory]
      : tab === 'athletes' ? [selectedAthlete]
      : tab === 'extra' ? [extraDate, extraCategory]
      : tab === 'rankings' ? [rankingsYear]
      : tab === 'season' ? [seasonYear]
      : []
    const hash = buildHash(tab, params)
    // replaceState (not pushState): the URL stays shareable without turning
    // every tab click into a browser-history entry.
    window.history.replaceState(null, '', hash || window.location.pathname + window.location.search)
  }, [tab, sport, resultsYear, resultsCategory, selectedAthlete, extraDate, extraCategory, rankingsYear, seasonYear])

  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader
        ref={menuButtonRef}
        lang={lang}
        onLangChange={setLang}
        menuExpanded={isDesktop ? desktopMenuOpen : mobileMenuOpen}
        menuShowsHide={isDesktop && desktopMenuOpen}
        onToggleMenu={toggleMenu}
        menuId={isDesktop ? 'side-menu' : 'side-menu-mobile'}
        onHome={() => selectTabFromMenu('overview')}
        athleteNames={athleteNames}
        onAthleteSelect={navigateToAthlete}
      />
      <div className="flex flex-1 items-stretch">
        <SideNav current={tab} lang={lang} desktopOpen={desktopMenuOpen} mobileOpen={mobileMenuOpen}
          onSelect={selectTabFromMenu} onCloseMobile={closeMobileMenu} />
        <div className="flex min-w-0 flex-1 flex-col">
          {/* 1200px: wide enough for the tri/du results table — splits plus
              the points column — next to the side menu */}
          <main id="main" tabIndex={-1} className="w-full max-w-[1200px] px-4 py-6 focus:outline-none sm:px-8 lg:px-10">
            <section id="view-overview" aria-label={viewLabel('overview')} hidden={tab !== 'overview'}>
              {visited.has('overview') && <OverviewTab data={data} lang={lang} lastUpdated={lastUpdated} raceDates={raceDates} onNavigateToExtra={navigateToExtra} onNavigateToSeason={navigateToSeason} onNavigateToSport={navigateToSport} onNavigateToRankings={navigateToSeasonRankings} onAthleteClick={navigateToAthlete} />}
            </section>
            <section id="view-results" aria-label={viewLabel('results')} hidden={tab !== 'results'}>
              {visited.has('results') && <ResultsTab data={data} lang={lang} lastUpdated={lastUpdated} raceDates={raceDates} onAthleteClick={navigateToAthlete} sport={sport} year={resultsYear} category={resultsCategory} onSportChange={changeSport} onYearChange={setResultsYear} onCategoryChange={setResultsCategory} />}
            </section>
            <section id="view-athletes" aria-label={viewLabel('athletes')} hidden={tab !== 'athletes'}>
              {visited.has('athletes') && <AthletesTab data={data} athleteNames={athleteNames} allTimeRankings={allTimeRankings} lang={lang} initialAthlete={selectedAthlete} onAthleteChange={setSelectedAthlete} />}
            </section>
            <section id="view-rankings" aria-label={viewLabel('rankings')} hidden={tab !== 'rankings'}>
              {visited.has('rankings') && <RankingsTab data={data} allTimeRankings={allTimeRankings} lang={lang} onAthleteClick={navigateToAthlete} year={rankingsYear} onYearChange={setRankingsYear} />}
            </section>
            <section id="view-season" aria-label={viewLabel('season')} hidden={tab !== 'season'}>
              {visited.has('season') && <SeasonTab data={data} lang={lang} year={seasonYear} onYearChange={setSeasonYear} onAthleteClick={navigateToAthlete} onNavigateToRankings={navigateToSeasonRankings} />}
            </section>
            <section id="view-extra" aria-label={viewLabel('extra')} hidden={tab !== 'extra'}>
              {visited.has('extra') && <ExtraEventsTab events={extraEvents} lang={lang} eventDate={extraDate} category={extraCategory} onEventChange={setExtraDate} onCategoryChange={setExtraCategory} />}
            </section>
          </main>
          <SiteFooter lang={lang} lastUpdated={lastUpdated} />
        </div>
      </div>
    </div>
  )
}
