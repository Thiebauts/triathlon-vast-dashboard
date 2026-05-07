'use client'
import { useState, useCallback, useMemo } from 'react'
import { useLang } from './LanguageProvider'
import { t } from '@/lib/translations'
import { OverviewTab } from './tabs/OverviewTab'
import { ResultsTab } from './tabs/ResultsTab'
import { AthletesTab } from './tabs/AthletesTab'
import { RankingsTab } from './tabs/RankingsTab'
import type { CompetitionsData, ClubAthlete } from '@/lib/types'
import type { SplitRanks } from '@/lib/data'

type Tab = 'overview' | 'results' | 'athletes' | 'rankings'

interface Props {
  data: CompetitionsData
  athleteNames: string[]
  allTimeRankings: ClubAthlete[]
  splitRanks: Record<'triathlon' | 'duathlon', Record<string, SplitRanks>>
}

// Short labels shown on mobile (≤sm), full labels on wider screens
const SHORT_LABELS: Record<Tab, { en: string; sv: string }> = {
  overview:  { en: 'Overview',  sv: 'Översikt' },
  results:   { en: 'Results',   sv: 'Resultat' },
  athletes:  { en: 'Athletes',  sv: 'Idrottare' },
  rankings:  { en: 'Rankings',  sv: 'Ranking' },
}

export function Dashboard({ data, athleteNames, allTimeRankings, splitRanks }: Props) {
  const { lang } = useLang()
  const [tab, setTab] = useState<Tab>('overview')
  const [selectedAthlete, setSelectedAthlete] = useState<string | null>(null)

  const navigateToAthlete = useCallback((name: string) => {
    setSelectedAthlete(name)
    setTab('athletes')
  }, [])

  const tabs = useMemo<{ id: Tab; full: string; short: string }[]>(() => [
    { id: 'overview', full: t('tab_overview', lang),      short: SHORT_LABELS.overview[lang] },
    { id: 'results',  full: t('tab_event_results', lang), short: SHORT_LABELS.results[lang] },
    { id: 'athletes', full: t('tab_athletes', lang),      short: SHORT_LABELS.athletes[lang] },
    { id: 'rankings', full: t('tab_rankings', lang),      short: SHORT_LABELS.rankings[lang] },
  ], [lang])

  return (
    <div className="max-w-6xl mx-auto px-4 py-4">
      {/* Tab bar */}
      <div className="flex border-b border-gray-200 mb-4 bg-white rounded-t-lg shadow-sm">
        {tabs.map(({ id, full, short }) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            aria-pressed={tab === id}
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

      {/*
        Tabs stay mounted via `hidden` instead of conditional rendering so
        switching is instant: filter state, memoized rankings, and Recharts
        DOM all survive across tab changes.
      */}
      <div hidden={tab !== 'overview'}>
        <OverviewTab data={data} lang={lang} />
      </div>
      <div hidden={tab !== 'results'}>
        <ResultsTab data={data} lang={lang} splitRanks={splitRanks} onAthleteClick={navigateToAthlete} />
      </div>
      <div hidden={tab !== 'athletes'}>
        <AthletesTab data={data} athleteNames={athleteNames} allTimeRankings={allTimeRankings} lang={lang} initialAthlete={selectedAthlete} />
      </div>
      <div hidden={tab !== 'rankings'}>
        <RankingsTab data={data} allTimeRankings={allTimeRankings} lang={lang} onAthleteClick={navigateToAthlete} />
      </div>
    </div>
  )
}
