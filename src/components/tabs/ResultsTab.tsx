'use client'
import { useState, useMemo, useCallback, useDeferredValue, Fragment } from 'react'
import { t } from '@/lib/translations'
import type { AthleteResult, CompetitionsData, SportType, Lang } from '@/lib/types'
import { athleteKey, computeSplitRanks, computeEventPoints, isFinisher, type SplitRanks } from '@/lib/data'
import { csvEscape } from '@/lib/csv'

const SPORTS: SportType[] = ['triathlon', 'duathlon', 'swimming', 'cycling', 'running', 'swimrun']

const MEDAL = {
  1: { color: '#B8970A' },
  2: { color: '#7A8FA6' },
  3: { color: '#9E6B3F' },
} as Record<number, { color: string }>

function RankCell({ n }: { n: number | undefined }) {
  if (!n) return <span className="text-gray-400 text-[11px]">—</span>
  const style = MEDAL[n] ?? { color: '#9CA3AF' }
  const weight = n <= 3 ? 'font-semibold' : 'font-normal'
  return <span style={style} className={`text-[11px] tabular-nums ${weight}`}>{n}</span>
}

function fmt(v: string | undefined) {
  return v && v !== 'N/A' ? v : '—'
}

const D = 'hidden sm:table-cell'

type Category = 'all' | 'men' | 'women' | 'youth'

/**
 * Whether an athlete belongs to the selected category section. `all` is the
 * adult mixed field (Herr + Dam); `youth` (Ungdom) is its own section because
 * it races a shorter course. Shared by the visible rows AND the per-split
 * rankings so both rank over exactly the same pool.
 */
function inCategory(a: AthleteResult, category: Category): boolean {
  switch (category) {
    case 'men':   return a.class_lower === 'herr'
    case 'women': return a.class_lower === 'dam'
    case 'youth': return a.class_lower === 'ungdom'
    case 'all':   return a.class_lower === 'herr' || a.class_lower === 'dam'
  }
}

interface Props {
  data: CompetitionsData
  lang: Lang
  onAthleteClick?: (name: string) => void
  /** Set by the Overview discipline cards — selects this sport on navigation. */
  initialSport?: SportType | null
  /** Reports user sport changes so the dashboard can mirror them in the URL. */
  onSportChange?: (sport: SportType) => void
}

export function ResultsTab({ data, lang, onAthleteClick, initialSport, onSportChange }: Props) {
  const [sport, setSport] = useState<SportType>(initialSport ?? 'triathlon')
  const [year, setYear] = useState<string>('all')
  // 'all' = adults only (Herr + Dam); youth (Ungdom) is its own category
  // because it races a different/shorter course and shouldn't be ranked
  // alongside adult times.
  const [category, setCategory] = useState<Category>('all')
  const [search, setSearch] = useState('')
  const [showGuests, setShowGuests] = useState(false)
  const deferredSearch = useDeferredValue(search)
  const [prevInitialSport, setPrevInitialSport] = useState(initialSport)

  if (initialSport !== prevInitialSport) {
    setPrevInitialSport(initialSport)
    if (initialSport) {
      setSport(initialSport)
      setYear('all') // same reset as the sport <select> handler
    }
  }

  const isMultiSport = sport === 'triathlon' || sport === 'duathlon'

  const years = useMemo(() => {
    const ys = new Set<string>()
    for (const a of data[sport]) ys.add(a.Competition_Year)
    return ['all', ...[...ys].sort().reverse()]
  }, [data, sport])

  // Split ranks share the SAME pool as the visible rows: sport, category,
  // guests, and the year filter. With one year selected, each split is ranked
  // within that year's field; with "All Years (Combined)" the splits are ranked
  // across every year at once, so the # columns line up with the all-time
  // overall rank (one true fastest Run 1, etc.). Category keeps e.g. "Men Only"
  // ranking among men, not across the whole mixed-distance field. Search is
  // deliberately excluded — typing a name must not renumber anyone.
  const splitRankLookup = useMemo(() => {
    if (!isMultiSport) return null
    let pool = data[sport].filter((a) => inCategory(a, category))
    if (!showGuests) pool = pool.filter((a) => a.Club.toLowerCase().trim() !== 'gäst')
    if (year !== 'all') pool = pool.filter((a) => a.Competition_Year === year)
    const out: Record<string, SplitRanks> = {}
    computeSplitRanks(pool, sport as 'triathlon' | 'duathlon').forEach((v, k) => { out[k] = v })
    return out
  }, [data, sport, isMultiSport, showGuests, category, year])

  // Club points each athlete earned in their event, keyed by athleteKey().
  // Computed over the FULL field for the sport (every member in their adult
  // class that year), so the number is independent of the category/guest/search
  // filters here and always matches the Rankings tab and athlete profiles.
  // Non-members and youth earn 0.
  const pointsLookup = useMemo(() => {
    const out: Record<string, number> = {}
    computeEventPoints(data[sport]).forEach((v, k) => { out[k] = v })
    return out
  }, [data, sport])

  // Sort and assign rank WITHOUT the search applied. Year/category/showGuests
  // define the ranking pool; search is just a lookup that mustn't renumber.
  // Rank = position among FINISHERS in the visible pool (DNFs are listed last,
  // unranked) and equal times share a rank (competition ranking: 1, 1, 3, …).
  const ranked = useMemo(() => {
    let list = data[sport]
    if (year !== 'all') list = list.filter((a) => a.Competition_Year === year)
    list = list.filter((a) => inCategory(a, category))
    if (!showGuests) list = list.filter((a) => a.Club.toLowerCase().trim() !== 'gäst')
    const finishers = list.filter(isFinisher)
      .sort((a, b) => a.Total_Time_Seconds - b.Total_Time_Seconds)
    const out: Array<{ athlete: AthleteResult; rank: number | null }> = []
    finishers.forEach((athlete, i) => {
      const tiedWithPrev = i > 0 && athlete.Total_Time_Seconds === finishers[i - 1].Total_Time_Seconds
      out.push({ athlete, rank: tiedWithPrev ? out[i - 1].rank : i + 1 })
    })
    for (const athlete of list.filter((a) => !isFinisher(a))) out.push({ athlete, rank: null })
    return out
  }, [data, sport, year, category, showGuests])

  // Search filter kept separate so typing never re-sorts the pool.
  const rows = useMemo(() => {
    if (!deferredSearch.trim()) return ranked
    const q = deferredSearch.toLowerCase()
    return ranked.filter((r) => r.athlete.Name.toLowerCase().includes(q))
  }, [ranked, deferredSearch])

  const segs = useMemo(() => {
    if (sport === 'triathlon') return [
      { timeKey: 'Swim_Time',  rankKey: 'swim',  label: t('swim', lang) },
      { timeKey: 'T1_Time',    rankKey: 't1',    label: t('t1', lang) },
      { timeKey: 'Bike_Time',  rankKey: 'bike',  label: t('bike', lang) },
      { timeKey: 'T2_Time',    rankKey: 't2',    label: t('t2', lang) },
      { timeKey: 'Run_Time',   rankKey: 'run',   label: t('run', lang) },
    ] as const
    if (sport === 'duathlon') return [
      { timeKey: 'Run1_Time',  rankKey: 'run1',  label: t('run_1', lang) },
      { timeKey: 'T1_Time',    rankKey: 't1',    label: t('t1', lang) },
      { timeKey: 'Bike_Time',  rankKey: 'bike',  label: t('bike', lang) },
      { timeKey: 'T2_Time',    rankKey: 't2',    label: t('t2', lang) },
      { timeKey: 'Run2_Time',  rankKey: 'run2',  label: t('run_2', lang) },
    ] as const
    return [] as const
  }, [sport, lang])

  const exportCsv = useCallback(() => {
    const headers = [
      year === 'all' ? t('all_time_rank', lang) : t('overall_rank', lang),
      t('name', lang), t('club', lang),
      t('gender', lang), t('year', lang), t('total_time', lang), t('points', lang),
    ]
    const csvRows = [headers.map(csvEscape).join(',')]
    rows.forEach(({ athlete: a, rank }) => {
      csvRows.push([
        rank ?? 'DNF',
        csvEscape(a.Name),
        csvEscape(a.Club),
        csvEscape(a.Class),
        csvEscape(a.Competition_Year),
        csvEscape(a.Total_Time),
        pointsLookup[athleteKey(a)] ?? 0,
      ].join(','))
    })
    const blob = new Blob([csvRows.join('\n')], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `${sport}_${year}_${category}.csv`
    link.click()
    URL.revokeObjectURL(url)
  }, [rows, sport, year, category, lang, pointsLookup])

  return (
    <div className="space-y-3">
      <div className="bg-white rounded-lg shadow-sm border border-gray-100 px-4 py-3">
        <h2 className="text-sm font-semibold text-red-700 mb-0.5">{t('event_results_title', lang)}</h2>
        <p className="text-xs text-gray-500 leading-relaxed">{t('event_results_text1', lang)}</p>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-100 px-4 py-2.5 flex flex-wrap items-end gap-4">
        <div>
          <label htmlFor="filter-event" className="block text-[11px] font-medium text-gray-500 uppercase tracking-wide mb-1">{t('select_event', lang)}</label>
          <select id="filter-event" value={sport}
            onChange={(e) => {
              const next = e.target.value as SportType
              setSport(next)
              setYear('all')
              onSportChange?.(next)
            }}
            className="border border-gray-200 rounded px-2 py-1 text-xs bg-white focus-visible:ring-2 focus-visible:ring-red-700 focus-visible:ring-offset-1">
            {SPORTS.map((s) => <option key={s} value={s}>{t(s, lang)}</option>)}
          </select>
        </div>
        <div>
          <label htmlFor="filter-year" className="block text-[11px] font-medium text-gray-500 uppercase tracking-wide mb-1">{t('select_year', lang)}</label>
          <select id="filter-year" value={year} onChange={(e) => setYear(e.target.value)}
            className="border border-gray-200 rounded px-2 py-1 text-xs bg-white focus-visible:ring-2 focus-visible:ring-red-700 focus-visible:ring-offset-1">
            {years.map((y) => <option key={y} value={y}>{y === 'all' ? t('all_years', lang) : y}</option>)}
          </select>
        </div>
        <div>
          <label htmlFor="filter-category" className="block text-[11px] font-medium text-gray-500 uppercase tracking-wide mb-1">{t('select_category', lang)}</label>
          <select id="filter-category" value={category} onChange={(e) => setCategory(e.target.value as Category)}
            className="border border-gray-200 rounded px-2 py-1 text-xs bg-white focus-visible:ring-2 focus-visible:ring-red-700 focus-visible:ring-offset-1">
            <option value="all">{t('all_mixed', lang)}</option>
            <option value="men">{t('men_only', lang)}</option>
            <option value="women">{t('women_only', lang)}</option>
            <option value="youth">{t('youth_only', lang)}</option>
          </select>
        </div>
        <div>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t('search_athlete', lang)}
            aria-label={t('search_athlete', lang)}
            className="border border-gray-200 rounded px-2 py-1 text-xs bg-white w-36 focus-visible:ring-2 focus-visible:ring-red-700 focus-visible:ring-offset-1"
          />
        </div>
        <div>
          <span aria-hidden="true" className="block text-[11px] mb-1 invisible">·</span>
          <label className="flex items-center gap-1.5 text-xs text-gray-600 cursor-pointer select-none px-2 py-1 border border-transparent">
            <input
              type="checkbox"
              checked={showGuests}
              onChange={(e) => setShowGuests(e.target.checked)}
              className="accent-red-700 focus-visible:ring-2 focus-visible:ring-red-700 focus-visible:ring-offset-1"
            />
            {t('show_guests', lang)}
          </label>
        </div>
        <div className="flex items-center gap-3 ml-auto self-center">
          <span className="text-xs text-gray-500" aria-live="polite">{rows.length} {t('total_results', lang)}</span>
          <button onClick={exportCsv}
            className="text-[11px] text-gray-500 hover:text-red-700 border border-gray-200 rounded px-2 py-0.5 transition-colors focus-visible:ring-2 focus-visible:ring-red-700 focus-visible:ring-offset-1">
            {t('export_csv', lang)}
          </button>
        </div>
      </div>

      {isMultiSport && (
        <p className="text-[11px] text-gray-500 sm:hidden px-1">{t('split_times_hint', lang)}</p>
      )}

      {/* Table */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-100 overflow-x-auto">
        {rows.length === 0 ? (
          <div className="p-8 text-center space-y-2">
            <p className="text-xs text-gray-400">{t('no_data_available', lang)} {t(sport, lang)}</p>
            {category === 'youth' && !showGuests && (
              <p className="text-[11px] text-gray-500">{t('youth_no_data_hint', lang)}</p>
            )}
          </div>
        ) : (
          <table className="min-w-full text-xs">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200 text-[11px] uppercase tracking-wider text-gray-500">
                <th scope="col" className="px-3 py-2 text-left font-semibold">
                  {year === 'all' ? t('all_time_rank', lang) : t('overall_rank', lang)}
                </th>
                <th scope="col" className="px-3 py-2 text-left font-semibold">{t('name', lang)}</th>
                <th scope="col" className={`px-3 py-2 text-left font-semibold ${D}`}>{t('club', lang)}</th>
                <th scope="col" className={`px-3 py-2 text-left font-semibold ${D}`}>{t('gender', lang)}</th>
                {year === 'all' && <th scope="col" className={`px-3 py-2 text-left font-semibold ${D}`}>{t('year', lang)}</th>}
                <th scope="col" className="px-3 py-2 text-left font-semibold">{t('total_time', lang)}</th>
                {segs.map((s) => (
                  <Fragment key={s.label}>
                    <th scope="col" className={`px-2 py-2 text-left font-semibold border-l border-gray-100 ${D}`}>{s.label}</th>
                    <th scope="col" className={`px-2 py-2 text-center font-semibold text-gray-300 ${D}`}>#</th>
                  </Fragment>
                ))}
                <th scope="col" className="px-3 py-2 text-right font-semibold border-l border-gray-100">{t('points', lang)}</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(({ athlete: a, rank }, i) => {
                const isMember = a.is_club_member
                const finished = rank !== null
                // Only adult (Herr/Dam) members who finished earn club points;
                // everyone else shows a dash. A member can still earn 0
                // (ranked past 32nd).
                const earnsPoints = finished && isMember && (a.class_lower === 'herr' || a.class_lower === 'dam')
                const points = pointsLookup[athleteKey(a)] ?? 0
                const sr = splitRankLookup?.[athleteKey(a)] ?? {}
                const bg = rank === 1 ? 'bg-amber-50/60'
                         : rank === 2 ? 'bg-slate-50/80'
                         : rank === 3 ? 'bg-orange-50/50'
                         : isMember   ? 'bg-red-50/30'
                         : i % 2 === 0 ? 'bg-white' : 'bg-gray-50/40'

                return (
                  <tr key={`${a.Name}-${a.Competition_Year}-${i}`}
                    className={`${bg} border-b border-gray-100 hover:bg-blue-50/20 transition-colors`}>
                    <th scope="row" className="px-3 py-1.5 font-semibold tabular-nums">
                      {rank !== null
                        ? <span style={MEDAL[rank] ?? { color: '#6B7280' }}>{rank}</span>
                        : <span className="text-gray-400 font-normal">—</span>}
                    </th>
                    <td className="px-3 py-1.5 whitespace-nowrap font-medium text-gray-800">
                      {onAthleteClick ? (
                        <button onClick={() => onAthleteClick(a.Name)}
                          className="hover:text-red-700 hover:underline transition-colors text-left focus-visible:ring-2 focus-visible:ring-red-700 focus-visible:ring-offset-1 rounded">
                          {a.Name}
                        </button>
                      ) : a.Name}
                    </td>
                    <td className={`px-3 py-1.5 text-gray-500 ${D}`}>{a.Club}</td>
                    <td className={`px-3 py-1.5 text-gray-500 ${D}`}>{a.Class}</td>
                    {year === 'all' && <td className={`px-3 py-1.5 text-gray-400 ${D}`}>{a.Competition_Year}</td>}
                    <td className="px-3 py-1.5 font-mono font-semibold text-gray-800">
                      {finished
                        ? fmt(a.Total_Time)
                        : <span className="font-sans font-semibold text-gray-400">{t('dnf', lang)}</span>}
                    </td>
                    {segs.map((s) => (
                      <Fragment key={s.label}>
                        <td className={`px-2 py-1.5 font-mono text-gray-500 border-l border-gray-100 ${D}`}>
                          {fmt((a as unknown as Record<string, string>)[s.timeKey])}
                        </td>
                        <td className={`px-2 py-1.5 text-center ${D}`}>
                          <RankCell n={(sr as Record<string, number | undefined>)[s.rankKey]} />
                        </td>
                      </Fragment>
                    ))}
                    <td className="px-3 py-1.5 text-right tabular-nums border-l border-gray-100">
                      {earnsPoints
                        ? <span className={points > 0 ? 'font-semibold text-red-700' : 'text-gray-400'}>{points}</span>
                        : <span className="text-gray-300">—</span>}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
