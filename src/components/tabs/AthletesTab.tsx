'use client'
import { useState, useMemo, useEffect } from 'react'
import { t } from '@/lib/translations'
import { getAthleteEvents, getClubRankings } from '@/lib/data'
import { AthleteRankChart } from '@/components/charts/AthleteCharts'
import type { CompetitionsData, Lang } from '@/lib/types'

interface Props {
  data: CompetitionsData
  athleteNames: string[]
  lang: Lang
  initialAthlete?: string | null
}

function fmt(v: string | undefined) {
  return v && v !== 'N/A' ? v : '—'
}

function formatDelta(seconds: number): string {
  const abs = Math.abs(Math.round(seconds))
  const sign = seconds < 0 ? '-' : '+'
  const m = Math.floor(abs / 60)
  const s = abs % 60
  if (m > 0) return `${sign}${m}:${String(s).padStart(2, '0')}`
  return `${sign}${s}s`
}

export function AthletesTab({ data, athleteNames, lang, initialAthlete }: Props) {
  const [search, setSearch] = useState('')
  const [selected, setSelected] = useState<string | null>(initialAthlete ?? null)

  // Sync when navigating from another tab
  useEffect(() => {
    if (initialAthlete) setSelected(initialAthlete)
  }, [initialAthlete])

  const filtered = useMemo(
    () => athleteNames.filter((n) => n.toLowerCase().includes(search.toLowerCase())),
    [athleteNames, search],
  )

  const events = useMemo(
    () => (selected ? getAthleteEvents(data, selected) : {}),
    [data, selected],
  )

  const clubPos = useMemo(() => {
    if (!selected) return null
    const all = getClubRankings(data, 'all', 'all')
    const idx = all.findIndex((a) => a.name === selected)
    return idx >= 0 ? { rank: idx + 1, total: all.length, pts: all[idx].total_points } : null
  }, [data, selected])

  const eventList = Object.entries(events).sort(([, a], [, b]) => b.year.localeCompare(a.year))
  const isMember = eventList[0]?.[1]?.is_club_member ?? false

  // Personal bests per sport
  const personalBests = useMemo(() => {
    const bests: Record<string, number> = {}
    for (const [, e] of eventList) {
      if (e.time_seconds > 0) {
        if (!bests[e.type] || e.time_seconds < bests[e.type]) {
          bests[e.type] = e.time_seconds
        }
      }
    }
    return bests
  }, [eventList])

  // Previous year time per sport for delta
  const prevYearTime = useMemo(() => {
    const bySport: Record<string, Array<{ year: string; time_seconds: number }>> = {}
    for (const [, e] of eventList) {
      if (e.time_seconds > 0) {
        bySport[e.type] = bySport[e.type] ?? []
        bySport[e.type].push({ year: e.year, time_seconds: e.time_seconds })
      }
    }
    const prev: Record<string, number> = {}
    for (const [sport, entries] of Object.entries(bySport)) {
      const sorted = [...entries].sort((a, b) => a.year.localeCompare(b.year))
      for (let i = 1; i < sorted.length; i++) {
        prev[`${sport}_${sorted[i].year}`] = sorted[i].time_seconds - sorted[i - 1].time_seconds
      }
    }
    return prev
  }, [eventList])

  return (
    <div className="space-y-3">
      {/* Info */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-100 px-4 py-3">
        <h2 className="text-sm font-semibold text-red-700 mb-0.5">{t('athlete_profiles_title', lang)}</h2>
        <p className="text-xs text-gray-500 leading-relaxed">{t('athlete_profiles_text', lang)}</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {/* Athlete list */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-3">
          <label className="block text-[10px] font-medium text-gray-400 uppercase tracking-wide mb-1.5">
            {t('select_athlete', lang)}
          </label>
          <input
            type="text"
            placeholder={t('search_athlete', lang)}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full border border-gray-200 rounded px-2 py-1 text-xs mb-1.5 focus:outline-none focus:border-red-300"
          />
          <ul className="divide-y divide-gray-50 max-h-[168px] overflow-y-auto">
            {filtered.map((name) => (
              <li key={name}>
                <button
                  onClick={() => setSelected(name)}
                  className={`w-full text-left px-2 py-1.5 text-xs transition-colors rounded ${
                    selected === name
                      ? 'bg-red-50 font-semibold text-red-700'
                      : 'hover:bg-gray-50 text-gray-700'
                  }`}
                >
                  {name}
                </button>
              </li>
            ))}
          </ul>
        </div>

        {/* Profile */}
        <div className="md:col-span-2 space-y-3">
          {!selected ? (
            <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-8 text-center text-xs text-gray-400">
              {t('select_athlete_prompt', lang)}
            </div>
          ) : (
            <>
              {/* Summary */}
              <div className="bg-white rounded-lg shadow-sm border border-gray-100 px-4 py-3">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-sm font-bold text-gray-800">{selected}</h3>
                  {isMember
                    ? <span className="text-[10px] bg-red-50 text-red-600 border border-red-100 rounded-full px-2.5 py-0.5 font-semibold">{t('club_member', lang)}</span>
                    : <span className="text-[10px] bg-gray-100 text-gray-500 rounded-full px-2.5 py-0.5">{t('guest', lang)}</span>}
                </div>
                {clubPos && (
                  <div className="flex gap-5 text-xs text-gray-500">
                    <span>{t('overall', lang)} rank: <strong className="text-red-700">#{clubPos.rank}/{clubPos.total}</strong></span>
                    <span>{t('total_points', lang)}: <strong className="text-gray-700">{clubPos.pts}</strong></span>
                    <span>{t('competitions', lang)}: <strong className="text-gray-700">{eventList.length}</strong></span>
                  </div>
                )}
              </div>

              {/* Chart */}
              {eventList.length > 0 && (
                <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-3">
                  <h4 className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-2">{t('class_rank', lang)} &amp; {t('total_time', lang)}</h4>
                  <AthleteRankChart
                    events={Object.fromEntries(eventList.map(([k, v]) => [k, {
                      type: v.type, year: v.year, rank: v.rank,
                      time_seconds: v.time_seconds, time: v.time,
                      gender_class: v.gender_class, class_total: v.class_total,
                    }]))}
                    allData={data}
                    lang={lang}
                  />
                </div>
              )}

              {/* Event table */}
              <div className="bg-white rounded-lg shadow-sm border border-gray-100 overflow-x-auto">
                <table className="min-w-full text-xs">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-200 text-[10px] uppercase tracking-wider text-gray-400">
                      <th className="px-3 py-2 text-left font-semibold">{t('year', lang)}</th>
                      <th className="px-3 py-2 text-left font-semibold">{t('select_event', lang).replace(':', '')}</th>
                      <th className="px-3 py-2 text-left font-semibold">{t('class_rank', lang)}</th>
                      <th className="px-3 py-2 text-left font-semibold hidden sm:table-cell">{t('overall_rank', lang)}</th>
                      <th className="px-3 py-2 text-left font-semibold hidden sm:table-cell">{t('club_rank', lang)}</th>
                      <th className="px-3 py-2 text-right font-semibold">{t('points', lang)}</th>
                      <th className="px-3 py-2 text-left font-semibold">{t('total_time', lang)}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {eventList.map(([key, e], i) => {
                      const isPB = e.time_seconds > 0 && personalBests[e.type] === e.time_seconds
                      const delta = prevYearTime[`${e.type}_${e.year}`]
                      return (
                        <tr key={key} className={`border-b border-gray-100 hover:bg-blue-50/20 transition-colors ${i % 2 === 0 ? 'bg-white' : 'bg-gray-50/40'}`}>
                          <td className="px-3 py-1.5 text-gray-500">{e.year}</td>
                          <td className="px-3 py-1.5 capitalize font-medium text-gray-700">{t(e.type, lang)}</td>
                          <td className="px-3 py-1.5 text-gray-600">{e.rank}/{e.class_total}</td>
                          <td className="px-3 py-1.5 text-gray-400 hidden sm:table-cell">{e.overall_rank}/{e.overall_total}</td>
                          <td className="px-3 py-1.5 text-gray-400 hidden sm:table-cell">{e.is_club_member ? String(e.club_member_rank) : '—'}</td>
                          <td className="px-3 py-1.5 text-right font-bold text-red-700">{e.points}</td>
                          <td className="px-3 py-1.5 font-mono text-gray-700 whitespace-nowrap">
                            {fmt(e.time)}
                            {isPB && (
                              <span className="ml-1.5 text-[9px] font-bold text-green-600 bg-green-50 border border-green-200 rounded px-1 py-px">
                                {t('personal_best', lang)}
                              </span>
                            )}
                            {delta !== undefined && (
                              <span className={`ml-1.5 text-[9px] ${delta <= 0 ? 'text-green-600' : 'text-orange-500'}`}>
                                {formatDelta(delta)}
                              </span>
                            )}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
