'use client'
import { useState, useMemo, useCallback, useDeferredValue, Fragment } from 'react'
import { t } from '@/lib/translations'
import type { CompetitionsData, SportType, Lang } from '@/lib/types'
import { isClubMember, computeSplitRanks, athleteKey, type SplitRanks } from '@/lib/data'
import type { AthleteResult } from '@/lib/types'

const SPORTS: SportType[] = ['triathlon', 'duathlon', 'swimming', 'cycling', 'running', 'swimrun']

const MEDAL = {
  1: { color: '#B8970A' },
  2: { color: '#7A8FA6' },
  3: { color: '#9E6B3F' },
} as Record<number, { color: string }>

function RankCell({ n }: { n: number | undefined }) {
  if (!n) return <span className="text-gray-200 text-[11px]">—</span>
  const style = MEDAL[n] ?? { color: '#9CA3AF' }
  const weight = n <= 3 ? 'font-semibold' : 'font-normal'
  return <span style={style} className={`text-[11px] tabular-nums ${weight}`}>{n}</span>
}

function fmt(v: string | undefined) {
  return v && v !== 'N/A' ? v : '—'
}

const D = 'hidden sm:table-cell'

interface Props {
  data: CompetitionsData
  lang: Lang
  onAthleteClick?: (name: string) => void
}

export function ResultsTab({ data, lang, onAthleteClick }: Props) {
  const [sport, setSport] = useState<SportType>('triathlon')
  const [year, setYear] = useState<string>('all')
  const [category, setCategory] = useState<'all' | 'men' | 'women'>('all')
  const [search, setSearch] = useState('')
  const deferredSearch = useDeferredValue(search)

  const isMultiSport = sport === 'triathlon' || sport === 'duathlon'

  const years = useMemo(() => {
    const ys = new Set<string>()
    for (const a of data[sport]) ys.add(a.Competition_Year)
    return ['all', ...[...ys].sort().reverse()]
  }, [data, sport])

  const splitRankMap = useMemo((): Map<string, SplitRanks> => {
    if (!isMultiSport) return new Map()
    const merged = new Map<string, SplitRanks>()
    const byYear: Record<string, AthleteResult[]> = {}
    for (const a of data[sport]) {
      byYear[a.Competition_Year] = byYear[a.Competition_Year] ?? []
      byYear[a.Competition_Year].push(a)
    }
    for (const group of Object.values(byYear)) {
      computeSplitRanks(group, sport as 'triathlon' | 'duathlon').forEach((v, k) => merged.set(k, v))
    }
    return merged
  }, [data, sport, isMultiSport])

  const rows = useMemo(() => {
    let list = data[sport]
    if (year !== 'all') list = list.filter((a) => a.Competition_Year === year)
    if (category === 'men') list = list.filter((a) => ['herr', 'man', 'men'].includes(a.Class.toLowerCase()))
    if (category === 'women') list = list.filter((a) => ['dam', 'woman', 'women'].includes(a.Class.toLowerCase()))
    if (deferredSearch.trim()) {
      const q = deferredSearch.toLowerCase()
      list = list.filter((a) => a.Name.toLowerCase().includes(q))
    }
    return year === 'all'
      ? [...list].sort((a, b) => (a.Total_Time_Seconds || Infinity) - (b.Total_Time_Seconds || Infinity))
      : [...list].sort((a, b) => (a.Overall_Rank || 999) - (b.Overall_Rank || 999))
  }, [data, sport, year, category, deferredSearch])

  const triathlonSegs = [
    { timeKey: 'Swim_Time',  rankKey: 'swim',  label: t('swim', lang) },
    { timeKey: 'T1_Time',    rankKey: 't1',    label: t('t1', lang) },
    { timeKey: 'Bike_Time',  rankKey: 'bike',  label: t('bike', lang) },
    { timeKey: 'T2_Time',    rankKey: 't2',    label: t('t2', lang) },
    { timeKey: 'Run_Time',   rankKey: 'run',   label: t('run', lang) },
  ] as const

  const duathlonSegs = [
    { timeKey: 'Run1_Time',  rankKey: 'run1',  label: t('run_1', lang) },
    { timeKey: 'T1_Time',    rankKey: 't1',    label: t('t1', lang) },
    { timeKey: 'Bike_Time',  rankKey: 'bike',  label: t('bike', lang) },
    { timeKey: 'T2_Time',    rankKey: 't2',    label: t('t2', lang) },
    { timeKey: 'Run2_Time',  rankKey: 'run2',  label: t('run_2', lang) },
  ] as const

  const segs = sport === 'triathlon' ? triathlonSegs : sport === 'duathlon' ? duathlonSegs : []

  const exportCsv = useCallback(() => {
    const headers = [
      t('overall_rank', lang), t('name', lang), t('club', lang),
      t('gender', lang), t('year', lang), t('total_time', lang),
    ]
    const csvRows = [headers.join(',')]
    rows.forEach((a, i) => {
      const rank = year === 'all' ? i + 1 : a.Overall_Rank
      const esc = (s: string) => `"${s.replace(/"/g, '""')}"`
      csvRows.push([rank, esc(a.Name), esc(a.Club), a.Class, a.Competition_Year, a.Total_Time].join(','))
    })
    const blob = new Blob([csvRows.join('\n')], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `${sport}_${year}_${category}.csv`
    link.click()
    URL.revokeObjectURL(url)
  }, [rows, sport, year, category, lang])

  return (
    <div className="space-y-3">
      <div className="bg-white rounded-lg shadow-sm border border-gray-100 px-4 py-3">
        <h2 className="text-sm font-semibold text-red-700 mb-0.5">{t('event_results_title', lang)}</h2>
        <p className="text-xs text-gray-500 leading-relaxed">{t('event_results_text1', lang)}</p>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-100 px-4 py-2.5 flex flex-wrap items-end gap-4">
        {[
          { label: t('select_event', lang), node: (
            <select value={sport} onChange={(e) => { setSport(e.target.value as SportType); setYear('all') }}
              className="border border-gray-200 rounded px-2 py-1 text-xs bg-white">
              {SPORTS.map((s) => <option key={s} value={s}>{t(s, lang)}</option>)}
            </select>
          )},
          { label: t('select_year', lang), node: (
            <select value={year} onChange={(e) => setYear(e.target.value)}
              className="border border-gray-200 rounded px-2 py-1 text-xs bg-white">
              {years.map((y) => <option key={y} value={y}>{y === 'all' ? t('all_years', lang) : y}</option>)}
            </select>
          )},
          { label: t('select_category', lang), node: (
            <select value={category} onChange={(e) => setCategory(e.target.value as 'all' | 'men' | 'women')}
              className="border border-gray-200 rounded px-2 py-1 text-xs bg-white">
              <option value="all">{t('all_mixed', lang)}</option>
              <option value="men">{t('men_only', lang)}</option>
              <option value="women">{t('women_only', lang)}</option>
            </select>
          )},
        ].map(({ label, node }) => (
          <div key={label}>
            <label className="block text-[10px] font-medium text-gray-400 uppercase tracking-wide mb-1">{label}</label>
            {node}
          </div>
        ))}
        <div>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t('search_athlete', lang)}
            className="border border-gray-200 rounded px-2 py-1 text-xs bg-white w-36"
          />
        </div>
        <div className="flex items-center gap-3 ml-auto self-center">
          <span className="text-xs text-gray-400">{rows.length} {t('total_participants', lang)}</span>
          <button onClick={exportCsv}
            className="text-[10px] text-gray-400 hover:text-red-700 border border-gray-200 rounded px-2 py-0.5 transition-colors">
            {t('export_csv', lang)}
          </button>
        </div>
      </div>

      {isMultiSport && (
        <p className="text-[10px] text-gray-400 sm:hidden px-1">Split times and ranks visible on wider screens.</p>
      )}

      {/* Table */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-100 overflow-x-auto">
        {rows.length === 0 ? (
          <p className="p-8 text-center text-xs text-gray-400">{t('no_data_available', lang)} {t(sport, lang)}</p>
        ) : (
          <table className="min-w-full text-xs">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200 text-[10px] uppercase tracking-wider text-gray-400">
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
              </tr>
            </thead>
            <tbody>
              {rows.map((a, i) => {
                const rank = year === 'all' ? i + 1 : a.Overall_Rank
                const isMember = isClubMember(a.Club)
                const sr = isMultiSport ? (splitRankMap.get(athleteKey(a)) ?? {}) : {}
                const bg = rank === 1 ? 'bg-amber-50/60'
                         : rank === 2 ? 'bg-slate-50/80'
                         : rank === 3 ? 'bg-orange-50/50'
                         : isMember   ? 'bg-red-50/30'
                         : i % 2 === 0 ? 'bg-white' : 'bg-gray-50/40'

                return (
                  <tr key={`${a.Name}-${a.Competition_Year}-${i}`}
                    className={`${bg} border-b border-gray-100 hover:bg-blue-50/20 transition-colors`}>
                    <td className="px-3 py-1.5 font-semibold tabular-nums">
                      <span style={MEDAL[rank] ?? { color: '#6B7280' }}>{rank}</span>
                    </td>
                    <td className="px-3 py-1.5 whitespace-nowrap font-medium text-gray-800">
                      {onAthleteClick ? (
                        <button onClick={() => onAthleteClick(a.Name)}
                          className="hover:text-red-700 hover:underline transition-colors text-left">
                          {a.Name}
                        </button>
                      ) : a.Name}
                    </td>
                    <td className={`px-3 py-1.5 text-gray-500 ${D}`}>{a.Club}</td>
                    <td className={`px-3 py-1.5 text-gray-500 ${D}`}>{a.Class}</td>
                    {year === 'all' && <td className={`px-3 py-1.5 text-gray-400 ${D}`}>{a.Competition_Year}</td>}
                    <td className="px-3 py-1.5 font-mono font-semibold text-gray-800">{fmt(a.Total_Time)}</td>
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
