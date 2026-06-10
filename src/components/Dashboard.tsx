'use client'
import { useState, useCallback, useMemo } from 'react'
import { useLang } from './LanguageProvider'
import { t } from '@/lib/translations'
import { OverviewTab } from './tabs/OverviewTab'
import { ResultsTab } from './tabs/ResultsTab'
import { AthletesTab } from './tabs/AthletesTab'
import { RankingsTab } from './tabs/RankingsTab'
import { ExtraEventsTab } from './tabs/ExtraEventsTab'
import type { CompetitionsData, ClubAthlete, ExtraEvent, SportType } from '@/lib/types'

type Tab = 'overview' | 'results' | 'athletes' | 'rankings' | 'extra'

const TAB_ORDER: Tab[] = ['overview', 'results', 'athletes', 'rankings', 'extra']

interface Props {
  data: CompetitionsData
  athleteNames: string[]
  allTimeRankings: ClubAthlete[]
  extraEvents: ExtraEvent[]
}

export function Dashboard({ data, athleteNames, allTimeRankings, extraEvents }: Props) {
  const { lang } = useLang()
  const [tab, setTab] = useState<Tab>('overview')
  // Panels mount on first visit and then stay mounted: the server renders only
  // the Overview tab (smaller HTML), while revisited tabs keep their filter
  // state, memoized rankings, and Recharts DOM so switching back is instant.
  const [visited, setVisited] = useState<ReadonlySet<Tab>>(() => new Set<Tab>(['overview']))
  const [selectedAthlete, setSelectedAthlete] = useState<string | null>(null)
  const [selectedSport, setSelectedSport] = useState<SportType | null>(null)

  const selectTab = useCallback((id: Tab) => {
    setTab(id)
    setVisited((prev) => (prev.has(id) ? prev : new Set(prev).add(id)))
  }, [])

  const navigateToAthlete = useCallback((name: string) => {
    setSelectedAthlete(name)
    selectTab('athletes')
  }, [selectTab])

  const navigateToExtra = useCallback(() => selectTab('extra'), [selectTab])

  const navigateToSport = useCallback((sport: SportType) => {
    setSelectedSport(sport)
    selectTab('results')
  }, [selectTab])

  const onTabKeyDown = useCallback((e: React.KeyboardEvent, index: number) => {
    let next: number
    if (e.key === 'ArrowRight') next = (index + 1) % TAB_ORDER.length
    else if (e.key === 'ArrowLeft') next = (index + TAB_ORDER.length - 1) % TAB_ORDER.length
    else if (e.key === 'Home') next = 0
    else if (e.key === 'End') next = TAB_ORDER.length - 1
    else return
    e.preventDefault()
    selectTab(TAB_ORDER[next])
    document.getElementById(`tab-${TAB_ORDER[next]}`)?.focus()
  }, [selectTab])

  // Short labels for narrow screens, full labels on wider ones
  const tabs = useMemo<{ id: Tab; full: string; short: string }[]>(() => [
    { id: 'overview', full: t('tab_overview', lang),      short: t('tab_short_overview', lang) },
    { id: 'results',  full: t('tab_event_results', lang), short: t('tab_short_results', lang) },
    { id: 'athletes', full: t('tab_athletes', lang),      short: t('tab_short_athletes', lang) },
    { id: 'rankings', full: t('tab_rankings', lang),      short: t('tab_short_rankings', lang) },
    { id: 'extra',    full: t('tab_extra', lang),         short: t('tab_short_extra', lang) },
  ], [lang])

  return (
    // 7xl (1280px): wide enough for the tri/du results table — splits plus
    // the points column — without horizontal scroll on desktop
    <div className="max-w-7xl mx-auto px-4 py-4">
      {/* Tab bar */}
      <div role="tablist" aria-label="Dashboard"
        className="flex border-b border-gray-200 mb-4 bg-white rounded-t-lg shadow-sm">
        {tabs.map(({ id, full, short }, i) => (
          <button
            key={id}
            id={`tab-${id}`}
            role="tab"
            aria-selected={tab === id}
            aria-controls={`tabpanel-${id}`}
            tabIndex={tab === id ? 0 : -1}
            onClick={() => selectTab(id)}
            onKeyDown={(e) => onTabKeyDown(e, i)}
            className={`flex-1 py-2.5 text-[11px] sm:text-xs font-semibold tracking-wide border-b-2 transition-all text-center uppercase focus-visible:ring-2 focus-visible:ring-red-700 focus-visible:ring-offset-1 ${
              tab === id
                ? 'border-red-700 text-red-700 bg-red-50/50'
                : 'border-transparent text-gray-500 hover:text-gray-600 hover:border-gray-300 hover:bg-gray-50/50'
            }`}
          >
            <span className="sm:hidden">{short}</span>
            <span className="hidden sm:inline">{full}</span>
          </button>
        ))}
      </div>

      <div role="tabpanel" id="tabpanel-overview" aria-labelledby="tab-overview" hidden={tab !== 'overview'}>
        {visited.has('overview') && <OverviewTab data={data} lang={lang} onNavigateToExtra={navigateToExtra} onNavigateToSport={navigateToSport} />}
      </div>
      <div role="tabpanel" id="tabpanel-results" aria-labelledby="tab-results" hidden={tab !== 'results'}>
        {visited.has('results') && <ResultsTab data={data} lang={lang} onAthleteClick={navigateToAthlete} initialSport={selectedSport} />}
      </div>
      <div role="tabpanel" id="tabpanel-athletes" aria-labelledby="tab-athletes" hidden={tab !== 'athletes'}>
        {visited.has('athletes') && <AthletesTab data={data} athleteNames={athleteNames} allTimeRankings={allTimeRankings} lang={lang} initialAthlete={selectedAthlete} />}
      </div>
      <div role="tabpanel" id="tabpanel-rankings" aria-labelledby="tab-rankings" hidden={tab !== 'rankings'}>
        {visited.has('rankings') && <RankingsTab data={data} allTimeRankings={allTimeRankings} lang={lang} onAthleteClick={navigateToAthlete} />}
      </div>
      <div role="tabpanel" id="tabpanel-extra" aria-labelledby="tab-extra" hidden={tab !== 'extra'}>
        {visited.has('extra') && <ExtraEventsTab events={extraEvents} lang={lang} />}
      </div>
    </div>
  )
}
