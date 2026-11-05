'use client'
import { useState, useMemo, useDeferredValue } from 'react'
import dynamic from 'next/dynamic'
import { t } from '@/lib/translations'
import { PageTitle } from '@/components/ui/brand'
import { displayTime } from '@/lib/season'
import { getAthleteEvents } from '@/lib/data'
import { matchesSearch } from '@/lib/search'
import type { CompetitionsData, Lang, ClubAthlete } from '@/lib/types'

const AthleteRankChart = dynamic(
  () => import('@/components/charts/AthleteCharts').then((m) => m.AthleteRankChart),
  { ssr: false, loading: () => <div className="h-[380px] bg-gray-50 animate-pulse rounded" /> },
)

interface Props {
  data: CompetitionsData
  athleteNames: string[]
  /** Precomputed server-side: getClubRankings(data, 'all', 'all') */
  allTimeRankings: ClubAthlete[]
  lang: Lang
  initialAthlete?: string | null
  /** Reports user selections so the dashboard can mirror them in the URL. */
  onAthleteChange?: (name: string) => void
}

function fmt(v: string | undefined) {
  return v && v !== 'N/A' ? displayTime(v) : '—'
}

function formatDelta(seconds: number): string {
  const abs = Math.abs(Math.round(seconds))
  const sign = seconds < 0 ? '-' : '+'
  const m = Math.floor(abs / 60)
  const s = abs % 60
  if (m > 0) return `${sign}${m}:${String(s).padStart(2, '0')}`
  return `${sign}${s}s`
}

export function AthletesTab({ data, athleteNames, allTimeRankings, lang, initialAthlete, onAthleteChange }: Props) {
  const [search, setSearch] = useState('')
  const deferredSearch = useDeferredValue(search)
  const [selected, setSelected] = useState<string | null>(initialAthlete ?? null)
  const deferredSelected = useDeferredValue(selected)
  const isStale = selected !== deferredSelected
  const [prevInitial, setPrevInitial] = useState<string | null | undefined>(initialAthlete)

  if (initialAthlete !== prevInitial) {
    setPrevInitial(initialAthlete)
    if (initialAthlete) setSelected(initialAthlete)
  }

  const filtered = useMemo(
    () => athleteNames.filter((n) => matchesSearch(n, deferredSearch)),
    [athleteNames, deferredSearch],
  )

  const events = useMemo(
    () => (deferredSelected ? getAthleteEvents(data, deferredSelected) : {}),
    [data, deferredSelected],
  )

  const clubPos = useMemo(() => {
    if (!selected) return null
    const idx = allTimeRankings.findIndex((a) => a.name === selected)
    return idx >= 0 ? { rank: idx + 1, total: allTimeRankings.length, pts: allTimeRankings[idx].total_points } : null
  }, [allTimeRankings, selected])

  const eventList = useMemo(
    () => Object.entries(events).sort(([, a], [, b]) => b.year.localeCompare(a.year)),
    [events],
  )
  const isMember = eventList[0]?.[1]?.is_club_member ?? false

  // Personal bests per sport — DNF rows carry a sentinel time, never a PB
  const personalBests = useMemo(() => {
    const bests: Record<string, number> = {}
    for (const [, e] of eventList) {
      if (e.finished && e.time_seconds > 0) {
        if (!bests[e.type] || e.time_seconds < bests[e.type]) {
          bests[e.type] = e.time_seconds
        }
      }
    }
    return bests
  }, [eventList])

  // Previous year time per sport for delta. Only finished races compare —
  // a DNF's sentinel time would otherwise produce a ±16,000-minute "delta"
  // on the surrounding years.
  const prevYearTime = useMemo(() => {
    const bySport: Record<string, Array<{ year: string; time_seconds: number }>> = {}
    for (const [, e] of eventList) {
      if (e.finished && e.time_seconds > 0) {
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

  const chartEvents = useMemo(
    () => Object.fromEntries(eventList.map(([k, v]) => [k, {
      type: v.type, year: v.year, rank: v.rank,
      time_seconds: v.time_seconds, time: v.time,
      gender_class: v.gender_class, class_total: v.class_total,
    }])),
    [eventList],
  )

  return (
    <div className="flex flex-col gap-8">
      <PageTitle eyebrow={t('athlete_profiles_title', lang)} title={t('nav_athletes', lang)} intro={t('athlete_profiles_text', lang)} />

      {/* Top row: search (left) + summary & event table (right) */}
      <div className="flex flex-col gap-5 md:flex-row">
        {/* Athlete list */}
        <div className="shrink-0 rounded-[4px_4px_32px_4px] bg-mist p-4 md:sticky md:top-4 md:w-72 md:self-start">
          <label htmlFor="athlete-search" className="mb-1.5 block text-xs font-bold uppercase tracking-[0.06em] text-muted">
            {t('select_athlete', lang)}
          </label>
          <input
            id="athlete-search"
            type="text"
            placeholder={t('search_athlete', lang)}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="mb-2 h-11 w-full rounded border border-line bg-white px-3 text-[15px] text-navy focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
          />
          <ul className="max-h-[260px] overflow-y-auto">
            {filtered.map((name) => (
              <li key={name}>
                <button
                  onClick={() => { setSelected(name); onAthleteChange?.(name) }}
                  className={`flex min-h-11 w-full items-center rounded px-3 text-left text-[15px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand ${
                    selected === name
                      ? 'bg-white font-bold text-brand'
                      : 'font-semibold text-navy hover:bg-white/70'
                  }`}
                >
                  {name}
                </button>
              </li>
            ))}
          </ul>
        </div>

        {/* Summary + event table */}
        <div className={`flex-1 min-w-0 space-y-5 transition-opacity duration-150 ${isStale ? 'opacity-50' : ''}`} aria-busy={isStale}>
          {!selected ? (
            <div className="rounded-[4px_4px_40px_4px] p-8 text-center text-[15px] text-muted ring-1 ring-line">
              {t('select_athlete_prompt', lang)}
            </div>
          ) : (
            <>
              {/* Summary */}
              <div className="rounded-[4px_4px_40px_4px] bg-navy px-6 py-5 text-white">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <h3 className="m-0 font-display text-[30px] font-semibold leading-tight">{selected}</h3>
                  {isMember
                    ? <span className="inline-flex h-6 items-center rounded-[2px_2px_8px_2px] bg-brand px-2.5 font-display text-[13px] font-semibold">{t('club_member', lang)}</span>
                    : <span className="inline-flex h-6 items-center rounded-[2px_2px_8px_2px] border border-white px-2.5 font-display text-[13px] font-semibold">{t('guest', lang)}</span>}
                </div>
                {clubPos && (
                  <dl className="m-0 mt-3 grid grid-cols-3 gap-3">
                    <div><dt className="text-[13px] text-[#c3c6d1]">{t('athlete_overall_rank', lang)}</dt><dd className="m-0 font-display text-2xl font-semibold">#{clubPos.rank}<span className="text-base text-[#c3c6d1]">/{clubPos.total}</span></dd></div>
                    <div><dt className="text-[13px] text-[#c3c6d1]">{t('total_points', lang)}</dt><dd className="m-0 font-display text-2xl font-semibold">{clubPos.pts}</dd></div>
                    <div><dt className="text-[13px] text-[#c3c6d1]">{t('competitions', lang)}</dt><dd className="m-0 font-display text-2xl font-semibold">{eventList.length}</dd></div>
                  </dl>
                )}
              </div>

              {/* Event table */}
              <div className="overflow-x-auto">
                <table className="min-w-full text-[15px]">
                  <thead>
                    <tr className="text-left font-display text-sm text-white [&>th]:bg-navy">
                      <th scope="col" className="px-3 py-3 text-left font-semibold">{t('year', lang)}</th>
                      <th scope="col" className="px-3 py-3 text-left font-semibold">{t('res_filter_sport', lang)}</th>
                      <th scope="col" className="px-3 py-3 text-left font-semibold">{t('class_rank', lang)}</th>
                      <th scope="col" className="px-3 py-3 text-left font-semibold hidden sm:table-cell">{t('overall_rank', lang)}</th>
                      <th scope="col" className="px-3 py-3 text-left font-semibold hidden sm:table-cell">{t('club_rank', lang)}</th>
                      <th scope="col" className="px-3 py-3 text-right font-semibold">{t('points', lang)}</th>
                      <th scope="col" className="px-3 py-3 text-left font-semibold">{t('total_time', lang)}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {eventList.map(([key, e], i) => {
                      const isPB = e.time_seconds > 0 && personalBests[e.type] === e.time_seconds
                      const delta = prevYearTime[`${e.type}_${e.year}`]
                      return (
                        <tr key={key} className={`border-b border-line hover:bg-mist ${i % 2 === 0 ? 'bg-white' : 'bg-[#f9f9fb]'}`}>
                          <th scope="row" className="px-3 py-2.5 text-muted font-normal">{e.year}</th>
                          <td className="px-3 py-2.5 capitalize font-medium text-ink">{t(e.type, lang)}</td>
                          <td className="px-3 py-2.5 text-muted">{e.finished ? `${e.rank}/${e.class_total}` : '—'}</td>
                          <td className="px-3 py-2.5 text-muted hidden sm:table-cell">{e.finished && typeof e.overall_rank === 'number' && e.overall_rank > 0 ? `${e.overall_rank}/${e.overall_total}` : '—'}</td>
                          <td className="px-3 py-2.5 text-muted hidden sm:table-cell">{e.finished && e.is_club_member ? String(e.club_member_rank) : '—'}</td>
                          <td className={`px-3 py-2.5 text-right tabular-nums ${e.points > 0 ? 'font-bold text-brand' : 'text-muted'}`}>{e.points}</td>
                          <td className="px-3 py-2.5 font-display font-semibold text-navy tabular-nums whitespace-nowrap">
                            {e.finished
                              ? fmt(e.time)
                              : <span className="font-sans font-semibold text-muted">{t('dnf', lang)}</span>}
                            {isPB && (
                              <span className="ml-1.5 inline-flex h-5 items-center rounded-[2px_2px_8px_2px] bg-brand px-1.5 font-display text-[11px] font-semibold text-white">
                                {t('personal_best', lang)}
                              </span>
                            )}
                            {delta !== undefined && (
                              <span className={`ml-1.5 text-xs ${delta <= 0 ? 'text-[#1b7a3a]' : 'text-[#9a4a00]'}`}>
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

      {/* Charts — full width below */}
      {selected && eventList.length > 0 && (
        <div className={`rounded-[4px_4px_40px_4px] p-5 ring-1 ring-line transition-opacity duration-150 ${isStale ? 'opacity-50' : ''}`}>
          <h4 className="mb-3 mt-0 font-display text-[22px] font-semibold text-navy">{t('class_rank', lang)} &amp; {t('total_time', lang)}</h4>
          <AthleteRankChart events={chartEvents} allData={data} lang={lang} />
        </div>
      )}
    </div>
  )
}
