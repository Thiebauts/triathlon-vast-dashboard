'use client'
import { useState, useCallback, useEffect, useMemo, useRef } from 'react'
import { useLang } from './LanguageProvider'
import { t } from '@/lib/translations'
import { buildHash, parseHash, type Tab } from '@/lib/deeplink'
import { OverviewTab } from './tabs/OverviewTab'
import { ResultsTab } from './tabs/ResultsTab'
import { AthletesTab } from './tabs/AthletesTab'
import { RankingsTab } from './tabs/RankingsTab'
import { ExtraEventsTab } from './tabs/ExtraEventsTab'
import { SeasonTab } from './tabs/SeasonTab'
import { RecordsTab } from './tabs/RecordsTab'
import { PointsTab } from './tabs/PointsTab'
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

  // Remember whether the desktop menu was hidden. Read after mount, like the
  // saved language, so server and client render the same first HTML.
  useEffect(() => {
    try {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      if (window.localStorage.getItem('menu') === 'closed') setDesktopMenuOpen(false)
    } catch { /* storage blocked: keep the default */ }
  }, [])

  useEffect(() => {
    const mq = window.matchMedia('(min-width: 1024px)')
    const update = () => setIsDesktop(mq.matches)
    update()
    mq.addEventListener('change', update)
    return () => mq.removeEventListener('change', update)
  }, [])

  const toggleMenu = useCallback(() => {
    if (window.matchMedia('(min-width: 1024px)').matches) {
      setDesktopMenuOpen((open) => {
        try { window.localStorage.setItem('menu', open ? 'closed' : 'open') } catch { /* ignore */ }
        return !open
      })
    } else setMobileMenuOpen(true)
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

  // Every change of view starts at the top (see the URL effect below)
  const selectTabFromMenu = selectTab

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

  // The Overview always shows the latest season, whatever the Season page is on
  const navigateToLatestRankings = useCallback(() => {
    setRankingsYear(SEASON_YEARS[0])
    selectTab('rankings')
  }, [selectTab])

  // Years that exist, so a link to a year without results falls back to "all"
  const yearsBySport = useMemo(() => {
    const out = {} as Record<SportType, Set<string>>
    for (const s of VALID_SPORTS as SportType[]) out[s] = new Set(data[s].map((a) => a.Competition_Year))
    return out
  }, [data])

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
  // Set while the view is being set FROM the URL (first load, Back/Forward,
  // an edited hash): the URL effect then must not add a history entry.
  const fromUrl = useRef(false)
  // Bumped on every read of the URL so the URL effect always runs and clears the flag
  const [urlTick, setUrlTick] = useState(0)
  const applyHash = useCallback(() => {
    const parsed = parseHash(window.location.hash)
    fromUrl.current = true
    setUrlTick((n) => n + 1)
    if (!parsed) {
      // No hash is the Overview — also when Back returns to it
      if (!window.location.hash) selectTab('overview')
      return
    }
    const [p0, p1, p2] = parsed.params
    // A missing or invalid segment means its default, not "keep the current
    // value": following #…/2026/women and then #…/2026 (or pressing Back)
    // must drop the women filter.
    if (parsed.tab === 'results') {
      const nextSport = p0 && VALID_SPORTS.includes(p0) ? p0 as SportType : DEFAULT_SPORT
      setSport(nextSport)
      setResultsYear(p1 && yearsBySport[nextSport].has(p1) ? p1 : 'all')
      setResultsCategory(p2 && RESULTS_CATEGORIES.includes(p2) ? p2 as ResultsCategory : 'all')
    } else if (parsed.tab === 'athletes') {
      if (p0 && athleteNames.includes(p0)) setSelectedAthlete(p0)
    } else if (parsed.tab === 'extra') {
      setExtraDate(p0 || (extraEvents[0]?.date ?? null))
      setExtraCategory(p1 && EXTRA_CATEGORIES.includes(p1) ? p1 as ExtraCategory : 'all')
    } else if (parsed.tab === 'season') {
      setSeasonYear(p0 && SEASON_YEARS.includes(p0) ? p0 : SEASON_YEARS[0])
    } else if (parsed.tab === 'rankings') {
      setRankingsYear(p0 && YEAR_RE.test(p0) && Object.values(yearsBySport).some((ys) => ys.has(p0)) ? p0 : 'all')
    }
    selectTab(parsed.tab)
  }, [athleteNames, extraEvents, selectTab, yearsBySport])

  const urlInitialized = useRef(false)
  const lastPage = useRef('overview/')
  useEffect(() => {
    // The post-mount re-render is the point: applying the deep link only
    // after hydration keeps server and client HTML identical (the server
    // always renders the overview).
    // eslint-disable-next-line react-hooks/set-state-in-effect
    applyHash()
    urlInitialized.current = true
    // Re-apply on hash edits, Back/Forward and same-document hash navigations.
    // Our own pushState/replaceState below never fire these, so this cannot loop.
    window.addEventListener('hashchange', applyHash)
    window.addEventListener('popstate', applyHash)
    return () => {
      window.removeEventListener('hashchange', applyHash)
      window.removeEventListener('popstate', applyHash)
    }
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
    const url = hash || window.location.pathname + window.location.search
    const page = `${tab}/${tab === 'athletes' ? selectedAthlete ?? '' : ''}`
    const newPage = page !== lastPage.current
    lastPage.current = page
    if (fromUrl.current) {
      // The browser already moved (or loaded) this entry: only tidy its URL
      fromUrl.current = false
      window.history.replaceState(null, '', url)
    } else if (newPage) {
      // Another page (or another athlete) is a step the Back button returns
      // from; it opens at the top with the keyboard focus on the page.
      window.history.pushState(null, '', url)
      window.scrollTo({ top: 0 })
      document.getElementById('main')?.focus({ preventScroll: true })
    } else {
      // A filter change keeps the URL shareable without filling the history
      window.history.replaceState(null, '', url)
    }
  }, [tab, sport, resultsYear, resultsCategory, selectedAthlete, extraDate, extraCategory, rankingsYear, seasonYear, urlTick])

  // The browser tab names the page, in the current language
  useEffect(() => {
    const page = tab === 'athletes' && selectedAthlete ? selectedAthlete : tab === 'overview' ? null : t(`nav_${tab}`, lang)
    const title = page ? `${page} – Triathlon Väst` : t('site_title', lang)
    document.title = title
    // The framework writes the static title once more when it finishes loading
    // a deep link; put ours back if that happens.
    const observer = new MutationObserver(() => { if (document.title !== title) document.title = title })
    observer.observe(document.head, { childList: true, subtree: true, characterData: true })
    return () => observer.disconnect()
  }, [tab, selectedAthlete, lang])

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
        <div data-page-shell className="flex min-w-0 flex-1 flex-col">
          {/* Pages keep their content to 1200px (wide enough for the tri/du
              results table); the Overview's coloured bands run full width. */}
          <main id="main" tabIndex={-1} className="w-full px-4 py-6 focus:outline-none sm:px-8 lg:px-10">
            <section id="view-overview" aria-label={viewLabel('overview')} hidden={tab !== 'overview'}>
              {visited.has('overview') && <OverviewTab data={data} lang={lang} lastUpdated={lastUpdated} raceDates={raceDates} onNavigateToExtra={navigateToExtra} onNavigateToSeason={navigateToSeason} onNavigateToSport={navigateToSport} onNavigateToRankings={navigateToLatestRankings} onAthleteClick={navigateToAthlete} />}
            </section>
            <section id="view-results" aria-label={viewLabel('results')} hidden={tab !== 'results'} className="mx-auto max-w-[1200px]">
              {visited.has('results') && <ResultsTab data={data} lang={lang} lastUpdated={lastUpdated} raceDates={raceDates} onAthleteClick={navigateToAthlete} sport={sport} year={resultsYear} category={resultsCategory} onSportChange={changeSport} onYearChange={setResultsYear} onCategoryChange={setResultsCategory} />}
            </section>
            <section id="view-athletes" aria-label={viewLabel('athletes')} hidden={tab !== 'athletes'} className="mx-auto max-w-[1200px]">
              {visited.has('athletes') && <AthletesTab data={data} athleteNames={athleteNames} allTimeRankings={allTimeRankings} lang={lang} initialAthlete={selectedAthlete} onAthleteChange={setSelectedAthlete} />}
            </section>
            <section id="view-rankings" aria-label={viewLabel('rankings')} hidden={tab !== 'rankings'} className="mx-auto max-w-[1200px]">
              {visited.has('rankings') && <RankingsTab data={data} allTimeRankings={allTimeRankings} lang={lang} onAthleteClick={navigateToAthlete} year={rankingsYear} onYearChange={setRankingsYear} />}
            </section>
            <section id="view-season" aria-label={viewLabel('season')} hidden={tab !== 'season'} className="mx-auto max-w-[1200px]">
              {visited.has('season') && <SeasonTab data={data} lang={lang} year={seasonYear} onYearChange={setSeasonYear} onAthleteClick={navigateToAthlete} onNavigateToRankings={navigateToSeasonRankings} />}
            </section>
            <section id="view-records" aria-label={viewLabel('records')} hidden={tab !== 'records'} className="mx-auto max-w-[1200px]">
            {visited.has('records') && <RecordsTab data={data} lang={lang} onAthleteClick={navigateToAthlete} onAllTime={navigateToSport} />}
          </section>
          <section id="view-points" aria-label={viewLabel('points')} hidden={tab !== 'points'} className="mx-auto max-w-[1200px]">
            {visited.has('points') && <PointsTab lang={lang} />}
          </section>
          <section id="view-extra" aria-label={viewLabel('extra')} hidden={tab !== 'extra'} className="mx-auto max-w-[1200px]">
              {visited.has('extra') && <ExtraEventsTab events={extraEvents} lang={lang} eventDate={extraDate} category={extraCategory} onEventChange={setExtraDate} onCategoryChange={setExtraCategory} />}
            </section>
          </main>
          <SiteFooter lang={lang} lastUpdated={lastUpdated} />
        </div>
      </div>
    </div>
  )
}
