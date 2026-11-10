'use client'
import { useState, useMemo, useDeferredValue } from 'react'
import dynamic from 'next/dynamic'
import { t, tf } from '@/lib/translations'
import { CARD_MIST, CARD_NAVY, Eyebrow, H_BLOCK, H_SECTION, PageTitle } from '@/components/ui/brand'
import { displayTime, parseClock } from '@/lib/season'
import { currentCourseFrom } from '@/lib/records'
import { getAthleteEvents } from '@/lib/data'
import { AthleteSearch } from '@/components/shell/AthleteSearch'
import type { TimePoint } from '@/components/charts/AthleteTimeChart'
import type { CompetitionsData, Lang, ClubAthlete, EventResult, SportType } from '@/lib/types'

const AthleteTimeChart = dynamic(
  () => import('@/components/charts/AthleteTimeChart').then((m) => m.AthleteTimeChart),
  { ssr: false, loading: () => <div className="h-[300px] animate-pulse rounded bg-mist" /> },
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

const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZÅÄÖ'.split('')

const SPORT_ORDER: SportType[] = ['triathlon', 'duathlon', 'swimming', 'cycling', 'running', 'swimrun']

function fmt(v: string | undefined) {
  return v && v !== 'N/A' ? displayTime(v) : '—'
}

/** "−0:48" / "+1:08" for a change in seconds. */
function formatDelta(seconds: number): string {
  const abs = Math.abs(Math.round(seconds))
  const sign = seconds < 0 ? '−' : '+'
  return `${sign}${Math.floor(abs / 60)}:${String(abs % 60).padStart(2, '0')}`
}

const isAdult = (e: EventResult) => e.gender_class.toLowerCase() === 'herr' || e.gender_class.toLowerCase() === 'dam'
/** Raced as an adult on today's course: compares with the athlete's best. */
const comparable = (e: EventResult) => e.finished && isAdult(e) && Number(e.year) >= currentCourseFrom(e.type)

interface SportSummary {
  sport: SportType
  races: number
  best: EventResult | null
  latest: EventResult | null
  /** Latest comparable time minus the one before it (negative = faster). */
  change: number | null
  points: TimePoint[]
}

export function AthletesTab({ data, athleteNames, allTimeRankings, lang, initialAthlete, onAthleteChange }: Props) {
  const [selected, setSelected] = useState<string | null>(initialAthlete ?? null)
  const deferredSelected = useDeferredValue(selected)
  const isStale = selected !== deferredSelected
  const [chartSport, setChartSport] = useState<SportType | null>(null)

  // Follow athletes picked elsewhere (header search, a name in Results)
  const [prevInitial, setPrevInitial] = useState<string | null | undefined>(initialAthlete)
  if (initialAthlete !== prevInitial) {
    setPrevInitial(initialAthlete)
    if (initialAthlete) { setSelected(initialAthlete); setChartSport(null) }
  }

  const pick = (name: string) => {
    setSelected(name)
    setChartSport(null)
    onAthleteChange?.(name)
  }

  // Browse by first letter of the first name: everyone listed the same way,
  // no hand-picked names. Å, Ä and Ö keep their own letters (Swedish order).
  const [letter, setLetter] = useState<string | null>(null)
  const byLetter = useMemo(() => {
    const out = new Map<string, string[]>()
    for (const name of athleteNames) {
      const c = name.trim().charAt(0).toUpperCase()
      const key = 'ÅÄÖ'.includes(c) ? c : c.normalize('NFD').replace(/[\u0300-\u036f]/g, '')
      if (!out.has(key)) out.set(key, [])
      out.get(key)!.push(name)
    }
    for (const list of out.values()) list.sort((a, b) => a.localeCompare(b, 'sv'))
    return out
  }, [athleteNames])

  const events = useMemo(
    () => (deferredSelected ? getAthleteEvents(data, deferredSelected) : {}),
    [data, deferredSelected],
  )
  const eventList = useMemo(
    () => Object.values(events).sort((a, b) => b.year.localeCompare(a.year) || SPORT_ORDER.indexOf(a.type) - SPORT_ORDER.indexOf(b.type)),
    [events],
  )
  const clubPos = useMemo(() => {
    if (!deferredSelected) return null
    const me = allTimeRankings.find((a) => a.name === deferredSelected)
    if (!me) return null
    // Same table as the Club ranking page: men and women are ranked apart,
    // and equal points share a place
    const table = allTimeRankings.filter((a) => a.gender === me.gender)
    return {
      rank: table.filter((a) => a.total_points > me.total_points).length + 1,
      total: table.length, pts: me.total_points, women: me.gender === 'dam',
    }
  }, [allTimeRankings, deferredSelected])
  const isMember = eventList.some((e) => e.is_club_member)
  const years = eventList.map((e) => e.year).sort()
  const yearSpan = years.length ? (years[0] === years.at(-1) ? years[0] : `${years[0]}–${years.at(-1)}`) : ''

  const sports = useMemo<SportSummary[]>(() => SPORT_ORDER.flatMap((sport) => {
    const list = eventList.filter((e) => e.type === sport).sort((a, b) => a.year.localeCompare(b.year))
    if (!list.length) return []
    const comp = list.filter(comparable)
    const best = comp.reduce<EventResult | null>((m, e) => (!m || e.time_seconds < m.time_seconds ? e : m), null)
    const finished = list.filter((e) => e.finished)
    // From the official times shown, like the season recap (raw seconds carry decimals)
    const change = comp.length >= 2 ? parseClock(comp[comp.length - 1].time) - parseClock(comp[comp.length - 2].time) : null
    const points: TimePoint[] = finished.map((e) => ({
      year: e.year,
      seconds: e.time_seconds,
      time: displayTime(e.time),
      memberPlace: typeof e.club_member_rank === 'number' ? e.club_member_rank : null,
      memberField: 0,
      comparable: comparable(e),
      best: !!best && e === best,
    }))
    return [{ sport, races: list.length, best, latest: finished.at(-1) ?? null, change, points }]
  }), [eventList])

  // Members in the same class and race, for "3rd of 12 members" in the chart
  const memberFields = useMemo(() => {
    const out: Record<string, number> = {}
    for (const e of eventList) {
      out[`${e.type}_${e.year}`] = data[e.type].filter((a) => a.Competition_Year === e.year && a.is_club_member
        && a.Class === e.gender_class && a.Status !== 'dnf' && a.Status !== 'dns' && a.Total_Time_Seconds > 0).length
    }
    return out
  }, [data, eventList])

  // Chart sport: the one picked, else the most recently raced
  const activeSport = chartSport && sports.some((s) => s.sport === chartSport) ? chartSport : (eventList[0]?.type ?? null)
  const active = sports.find((s) => s.sport === activeSport) ?? null
  const chartPoints = active?.points.map((p) => ({ ...p, memberField: memberFields[`${active.sport}_${p.year}`] ?? 0 })) ?? []

  // Find an athlete: one search field, plus browse by letter
  const finder = (
      <section aria-labelledby="ath-find" className={`${CARD_MIST} px-5 py-5 sm:px-6`}>
        <h3 id="ath-find" className={`${H_BLOCK} mb-3`}>{t(selected ? 'ath_find_other' : 'ath_find', lang)}</h3>
        <div className="max-w-[480px]">
          <AthleteSearch athleteNames={athleteNames} lang={lang} onSelect={pick} />
        </div>
        <div className="mt-5">
          <div id="ath-letters" className="mb-2 text-xs font-bold uppercase tracking-[0.06em] text-muted">{t('ath_browse', lang)}</div>
          <ul aria-labelledby="ath-letters" className="m-0 flex list-none flex-wrap gap-1.5 p-0">
            {ALPHABET.map((l) => {
              const has = byLetter.has(l)
              return (
                <li key={l}>
                  <button type="button" disabled={!has} onClick={() => setLetter(letter === l ? null : l)} aria-pressed={letter === l}
                    aria-label={has ? tf('ath_letter_label', lang, { l, n: byLetter.get(l)!.length }) : l}
                    className={`h-11 w-11 rounded-[4px_4px_12px_4px] font-display text-base font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand ${
                      letter === l ? 'bg-brand text-white' : has ? 'bg-white text-navy hover:bg-white/70' : 'cursor-default bg-transparent text-[#b6bac1]'}`}>
                    {l}
                  </button>
                </li>
              )
            })}
          </ul>
          {letter && byLetter.has(letter) && (
            <ul aria-label={tf('ath_letter_list', lang, { l: letter })} className="m-0 mt-3 grid list-none grid-cols-[repeat(auto-fill,minmax(min(100%,200px),1fr))] gap-1 p-0">
              {byLetter.get(letter)!.map((name) => (
                <li key={name}>
                  <button type="button" onClick={() => pick(name)} aria-current={selected === name ? 'true' : undefined}
                    className={`flex min-h-11 w-full items-center rounded px-3 text-left text-[15px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand ${
                      selected === name ? 'bg-white font-bold text-brand' : 'font-semibold text-navy hover:bg-white/70'}`}>
                    {name}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>
  )

  return (
    <div className="flex flex-col gap-8">
      {selected
        ? <PageTitle eyebrow={t('ath_eyebrow', lang)} title={selected} />
        : <PageTitle eyebrow={t('athlete_profiles_title', lang)} title={t('nav_athletes', lang)} intro={t('athlete_profiles_text', lang)} />}

      {/* Nobody picked yet: the finder comes first. With a profile open it moves below it. */}
      {!selected && finder}

      {!selected ? (
        <p className="m-0 rounded-[4px_4px_40px_4px] p-8 text-center text-[15px] text-muted ring-1 ring-line">{t('select_athlete_prompt', lang)}</p>
      ) : (
        <div className={`flex flex-col gap-8 transition-opacity duration-150 ${isStale ? 'opacity-50' : ''}`} aria-busy={isStale}>
          {/* Who */}
          <section className={`${CARD_NAVY} px-6 py-6 lg:rounded-[4px_4px_48px_4px]`}>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h3 className="m-0 font-display text-[22px] font-semibold leading-tight">{t('ath_summary', lang)}</h3>
              {isMember
                ? <span className="inline-flex h-7 items-center rounded-[2px_2px_10px_2px] bg-brand px-3 font-display text-sm font-semibold">{t('club_member', lang)}</span>
                : <span className="inline-flex h-7 items-center rounded-[2px_2px_10px_2px] border border-white px-3 font-display text-sm font-semibold">{t('guest', lang)}</span>}
            </div>
            <dl className="m-0 mt-4 grid grid-cols-2 gap-4 sm:grid-cols-4">
              <div><dt className="text-[13px] text-[#c3c6d1]">{t('ath_years', lang)}</dt><dd className="m-0 font-display text-2xl font-semibold">{yearSpan}</dd></div>
              <div><dt className="text-[13px] text-[#c3c6d1]">{t('ath_races', lang)}</dt><dd className="m-0 font-display text-2xl font-semibold">{eventList.length}</dd></div>
              {clubPos && <>
                <div><dt className="text-[13px] text-[#c3c6d1]">{t('total_points', lang)}</dt><dd className="m-0 font-display text-2xl font-semibold">{clubPos.pts}</dd></div>
                <div><dt className="text-[13px] text-[#c3c6d1]">{t(clubPos.women ? 'athlete_rank_women' : 'athlete_rank_men', lang)}</dt><dd className="m-0 font-display text-2xl font-semibold">#{clubPos.rank}<span className="text-base text-[#c3c6d1]"> / {clubPos.total}</span></dd></div>
              </>}
            </dl>
          </section>

          {/* One card per sport: best, latest, change — and picks the chart */}
          <section aria-labelledby="ath-sports">
            <h3 id="ath-sports" className={`${H_SECTION} mb-1`}>{t('ath_by_sport', lang)}</h3>
            <p className="mb-4 mt-0 text-[15px] text-muted">{t('ath_by_sport_text', lang)}</p>
            <div className="grid grid-cols-[repeat(auto-fill,minmax(min(100%,240px),1fr))] gap-4">
              {sports.map((s) => {
                const on = s.sport === activeSport
                return (
                  <button key={s.sport} type="button" onClick={() => setChartSport(s.sport)} aria-pressed={on}
                    className={`flex flex-col gap-1 rounded-[4px_4px_32px_4px] px-5 py-4 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand ${
                      on ? 'bg-white ring-2 ring-brand' : 'bg-mist hover:ring-1 hover:ring-line'}`}>
                    <span className="flex items-baseline justify-between gap-2">
                      <span className="font-display text-xl font-semibold text-navy">{t(s.sport, lang)}</span>
                      <span className="text-sm text-muted">{s.races === 1 ? t('ov_races_one', lang) : tf('ov_races_n', lang, { n: s.races })}</span>
                    </span>
                    {s.best ? (
                      <span className="text-[15px]">
                        <span className="text-muted">{t('ath_best', lang)}: </span>
                        <strong className="font-display text-lg text-brand">{fmt(s.best.time)}</strong>
                        <span className="text-muted"> ({s.best.year})</span>
                      </span>
                    ) : <span className="text-sm text-muted">{t('ath_no_best', lang)}</span>}
                    {s.latest && (
                      <span className="text-[15px]">
                        <span className="text-muted">{t('ath_latest', lang)}: </span>
                        <strong className="font-display text-navy">{fmt(s.latest.time)}</strong>
                        <span className="text-muted"> ({s.latest.year})</span>
                        {s.change !== null && (
                          <span className={`ml-1.5 text-sm font-semibold ${s.change < 0 ? 'text-[#1b7a3a]' : 'text-[#9a4a00]'}`}>
                            {formatDelta(s.change)} {s.change < 0 ? t('ath_faster', lang) : t('ath_slower', lang)}
                          </span>
                        )}
                      </span>
                    )}
                  </button>
                )
              })}
            </div>
          </section>

          {/* One clear chart: time per year in the chosen sport */}
          {active && chartPoints.length > 0 && (
            <section aria-labelledby="ath-chart" className="rounded-[4px_4px_40px_4px] px-5 pb-5 pt-5 ring-1 ring-line sm:px-6">
              <Eyebrow>{t(active.sport, lang)}</Eyebrow>
              <h3 id="ath-chart" className={`${H_BLOCK} mb-2 mt-0.5`}>{t('ath_chart_title', lang)}</h3>
              {chartPoints.length === 1
                ? <p className="m-0 text-[15px] text-muted">{tf('ath_one_race', lang, { year: chartPoints[0].year, time: chartPoints[0].time })}</p>
                : <AthleteTimeChart points={chartPoints} lang={lang} />}
            </section>
          )}

          {/* Every race */}
          <section aria-labelledby="ath-all">
            <h3 id="ath-all" className={`${H_SECTION} mb-3`}>{t('ath_all_races', lang)}</h3>
            <div tabIndex={0} role="region" aria-labelledby="ath-all" className="overflow-x-auto focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand">
              <table className="min-w-full text-[15px]">
                <thead>
                  <tr className="text-left font-display text-sm text-white [&>th]:bg-navy">
                    <th scope="col" className="px-2 py-3 font-semibold sm:px-3">{t('year', lang)}</th>
                    <th scope="col" className="px-2 py-3 font-semibold sm:px-3">{t('res_filter_sport', lang)}</th>
                    <th scope="col" className="px-2 py-3 text-right font-semibold sm:px-3">{t('total_time', lang)}</th>
                    <th scope="col" className="hidden px-3 py-3 font-semibold sm:table-cell">{t('class_rank', lang)}</th>
                    <th scope="col" className="hidden px-3 py-3 font-semibold sm:table-cell">{t('overall_rank', lang)}</th>
                    <th scope="col" className="hidden px-3 py-3 font-semibold sm:table-cell">{t('club_rank', lang)}</th>
                    <th scope="col" className="px-2 py-3 text-right font-semibold sm:px-3">{t('points', lang)}</th>
                  </tr>
                </thead>
                <tbody>
                  {eventList.map((e, i) => {
                    const sum = sports.find((s) => s.sport === e.type)
                    const isBest = !!sum?.best && sum.best === e
                    return (
                      <tr key={`${e.type}_${e.year}`} className={`border-b border-line hover:bg-mist ${i % 2 === 0 ? 'bg-white' : 'bg-[#f9f9fb]'}`}>
                        <th scope="row" className="px-2 py-2.5 text-left font-normal text-muted sm:px-3">{e.year}</th>
                        <td className="px-2 py-2.5 font-semibold text-navy sm:px-3">{t(e.type, lang)}</td>
                        <td className="whitespace-nowrap px-2 py-2.5 text-right font-display font-semibold tabular-nums text-navy sm:px-3">
                          {isBest && (
                            <span className="mr-1.5 inline-flex h-5 items-center rounded-[2px_2px_8px_2px] bg-brand px-1.5 font-display text-[11px] font-semibold text-white">
                              {t('personal_best', lang)}
                            </span>
                          )}
                          {e.finished ? fmt(e.time) : <span className="font-sans text-muted">{t('dnf', lang)}</span>}
                        </td>
                        <td className="hidden px-3 py-2.5 text-muted sm:table-cell">{e.finished ? `${e.rank}/${e.class_total}` : '—'}</td>
                        <td className="hidden px-3 py-2.5 text-muted sm:table-cell">{e.finished && typeof e.overall_rank === 'number' && e.overall_rank > 0 ? `${e.overall_rank}/${e.overall_total}` : '—'}</td>
                        <td className="hidden px-3 py-2.5 text-muted sm:table-cell">{e.finished && e.is_club_member && isAdult(e) ? String(e.club_member_rank) : '—'}</td>
                        <td className={`px-2 py-2.5 text-right tabular-nums sm:px-3 ${e.points > 0 ? 'font-display font-semibold text-brand' : 'text-muted'}`}>{e.points}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </section>
          {finder}
        </div>
      )}
    </div>
  )
}
