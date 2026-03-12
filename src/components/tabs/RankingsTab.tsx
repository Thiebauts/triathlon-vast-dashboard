'use client'
import { useState, useMemo } from 'react'
import { t } from '@/lib/translations'
import { getClubRankings } from '@/lib/data'
import type { CompetitionsData, Lang } from '@/lib/types'

interface Props {
  data: CompetitionsData
  lang: Lang
  onAthleteClick?: (name: string) => void
}

const MEDAL_COLOR: Record<number, string> = {
  1: '#B8970A',
  2: '#7A8FA6',
  3: '#9E6B3F',
}
const MEDAL_BG: Record<number, string> = {
  1: 'bg-amber-50/60',
  2: 'bg-slate-50/80',
  3: 'bg-orange-50/50',
}

function RankTable({ data, lang, onAthleteClick }: {
  data: ReturnType<typeof getClubRankings>
  lang: Lang
  onAthleteClick?: (name: string) => void
}) {
  if (!data.length) return <p className="text-center text-xs text-gray-400 py-6">{t('not_ranked', lang)}</p>
  return (
    <table className="min-w-full text-xs">
      <thead>
        <tr className="bg-gray-50 border-b border-gray-200 text-[10px] uppercase tracking-wider text-gray-400">
          <th className="px-3 py-2 text-left w-10 font-semibold">{t('rank', lang)}</th>
          <th className="px-3 py-2 text-left font-semibold">{t('athlete', lang)}</th>
          <th className="px-3 py-2 text-right font-semibold">{t('total_points', lang)}</th>
          <th className="px-3 py-2 text-right font-semibold hidden sm:table-cell">{t('competitions', lang)}</th>
        </tr>
      </thead>
      <tbody>
        {data.map((a, i) => {
          const rank = i + 1
          const bg = MEDAL_BG[rank] ?? (i % 2 === 0 ? 'bg-white' : 'bg-gray-50/40')
          const color = MEDAL_COLOR[rank] ?? '#6B7280'
          return (
            <tr key={a.name} className={`${bg} border-b border-gray-100 hover:bg-blue-50/20 transition-colors`}>
              <td className="px-3 py-1.5 font-bold tabular-nums" style={{ color }}>{rank}</td>
              <td className="px-3 py-1.5 font-medium text-gray-800">
                {onAthleteClick ? (
                  <button onClick={() => onAthleteClick(a.name)}
                    className="hover:text-red-700 hover:underline transition-colors text-left">
                    {a.name}
                  </button>
                ) : a.name}
              </td>
              <td className="px-3 py-1.5 text-right font-bold tabular-nums" style={{ color }}>{a.total_points}</td>
              <td className="px-3 py-1.5 text-right text-gray-400 hidden sm:table-cell">{a.competitions.length}</td>
            </tr>
          )
        })}
      </tbody>
    </table>
  )
}

export function RankingsTab({ data, lang, onAthleteClick }: Props) {
  const [year, setYear] = useState<string>('all')

  const years = useMemo(() => {
    const ys = new Set<string>()
    for (const athletes of Object.values(data))
      for (const a of athletes) ys.add(a.Competition_Year)
    return ['all', ...[...ys].sort().reverse()]
  }, [data])

  const women = useMemo(() => getClubRankings(data, 'women', year), [data, year])
  const men   = useMemo(() => getClubRankings(data, 'men',   year), [data, year])

  return (
    <div className="space-y-3">
      <div className="bg-white rounded-lg shadow-sm border border-gray-100 px-4 py-3">
        <h2 className="text-sm font-semibold text-red-700 mb-0.5">{t('club_rankings_title', lang)}</h2>
        <p className="text-xs text-gray-500">{t('club_rankings_text1', lang)}</p>
        <p className="text-xs text-gray-500 mt-1">{t('club_rankings_text2', lang)}</p>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-gray-100 px-4 py-2.5 flex items-center gap-3">
        <label className="text-[10px] font-medium text-gray-400 uppercase tracking-wide">{t('select_year', lang)}</label>
        <select value={year} onChange={(e) => setYear(e.target.value)}
          className="border border-gray-200 rounded px-2 py-1 text-xs bg-white">
          {years.map((y) => (
            <option key={y} value={y}>{y === 'all' ? t('all_years', lang) : y}</option>
          ))}
        </select>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="bg-white rounded-lg shadow-sm border border-gray-100 overflow-hidden">
          <h3 className="px-4 py-2 text-xs font-semibold text-gray-600 border-b border-gray-100 bg-gray-50/50">
            {t('womens_rankings', lang)}
          </h3>
          <RankTable data={women} lang={lang} onAthleteClick={onAthleteClick} />
        </div>
        <div className="bg-white rounded-lg shadow-sm border border-gray-100 overflow-hidden">
          <h3 className="px-4 py-2 text-xs font-semibold text-gray-600 border-b border-gray-100 bg-gray-50/50">
            {t('mens_rankings', lang)}
          </h3>
          <RankTable data={men} lang={lang} onAthleteClick={onAthleteClick} />
        </div>
      </div>
    </div>
  )
}
