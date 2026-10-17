'use client'
import { useMemo } from 'react'
import { t, tf } from '@/lib/translations'
import { displayTime, getSeasonSummary, SEASON_YEARS, type PodiumEntry, type RaceSummary } from '@/lib/season'
import { seasonStory } from '@/lib/seasonStory'
import { clock, MembersPerRaceCount, ParticipationBars, PersonalBestChart } from '@/components/charts/SeasonCharts'
import type { CompetitionsData, Lang } from '@/lib/types'

interface Props {
  data: CompetitionsData
  lang: Lang
  /** Owned by the Dashboard (controlled) so the URL can mirror it: #season/<year>. */
  year: string
  onYearChange: (year: string) => void
  onAthleteClick?: (name: string) => void
  onNavigateToRankings?: () => void
}

const MEDAL_COLOR = ['#7D6300', '#56677A', '#85552B']
const CARD = 'bg-white rounded-lg shadow-sm border border-gray-100 px-4 py-3'
const H3 = 'text-xs font-semibold text-gray-700 uppercase tracking-wide mb-2'

function Name({ name, onClick }: { name: string; onClick?: (name: string) => void }) {
  if (!onClick) return <>{name}</>
  return (
    <button onClick={() => onClick(name)}
      className="min-h-6 inline-flex items-center text-left hover:text-red-700 hover:underline focus-visible:ring-2 focus-visible:ring-red-700 focus-visible:ring-offset-1 rounded">
      {name}
    </button>
  )
}

function Podium({ title, entries, onAthleteClick }: { title: string; entries: Array<{ name: string; value: string }>; onAthleteClick?: (name: string) => void }) {
  return (
    <div>
      <div className="text-[11px] font-medium text-gray-500 mb-1">{title}</div>
      <ol>
        {entries.map((e, i) => (
          <li key={e.name} className="flex items-center gap-2 min-h-6 text-xs">
            <span className="w-4 font-bold tabular-nums" style={{ color: MEDAL_COLOR[i] }}>{i + 1}</span>
            <span className="flex-1 min-w-0 truncate text-gray-800 font-medium"><Name name={e.name} onClick={onAthleteClick} /></span>
            <span className="tabular-nums text-gray-600">{e.value}</span>
          </li>
        ))}
      </ol>
    </div>
  )
}

function Kpi({ label, value, sub }: { label: string; value: number; sub: string }) {
  return (
    <div className={CARD}>
      <div className="text-[11px] font-medium text-gray-500 uppercase tracking-wide">{label}</div>
      <div className="text-2xl font-bold text-red-700 tabular-nums leading-tight mt-0.5">{value}</div>
      <div className="text-[11px] text-gray-500 leading-snug">{sub}</div>
    </div>
  )
}

/** A delimited block inside a race card: podium, course records or personal bests. */
function Block({ title, children, className = '' }: { title: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={`rounded-md border border-gray-200 bg-gray-50/60 px-3 py-2.5 ${className}`}>
      <h4 className={H3}>{title}</h4>
      {children}
    </div>
  )
}

function CourseRecords({ race, year, lang, onAthleteClick }: { race: RaceSummary; year: string; lang: Lang; onAthleteClick?: (name: string) => void }) {
  if (race.courseRecords === null) {
    return <p className="text-xs text-gray-600 leading-relaxed">{t('season_note_swimrun', lang)}</p>
  }
  return (
    <div className="space-y-2.5">
      {(['men', 'women'] as const).map((g) => {
        const rec = race.courseRecords![g]
        const beaten = race.records?.find((r) => r.gender === g)?.previous
        return (
          <div key={g}>
            <div className="text-[11px] font-medium text-gray-500">{t(g === 'men' ? 'season_men' : 'season_women', lang)}</div>
            {rec ? (
              <div className="text-xs text-gray-800">
                <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 min-h-6">
                  <span className="font-medium"><Name name={rec.name} onClick={onAthleteClick} /></span>
                  <span className="tabular-nums">{displayTime(rec.time)}</span>
                  <span className="text-gray-500">({rec.year})</span>
                  {rec.setThisSeason && (
                    <span className="text-[11px] font-semibold text-amber-900 bg-amber-50 border border-amber-200 rounded px-1.5 py-px">
                      {tf('season_record_new_badge', lang, { y: year })}
                    </span>
                  )}
                </div>
                {rec.setThisSeason && beaten && (
                  <div className="text-[11px] text-gray-500">
                    {tf('season_record_beat', lang, { name: beaten.name, time: displayTime(beaten.time), year: beaten.year })}
                  </div>
                )}
              </div>
            ) : <div className="text-xs text-gray-500">{t('season_record_none', lang)}</div>}
          </div>
        )
      })}
      {race.sport === 'triathlon' && <p className="text-[11px] text-gray-500 leading-relaxed">{t('season_note_triathlon', lang)}</p>}
    </div>
  )
}

function RaceCard({ race, year, lang, onAthleteClick }: { race: RaceSummary; year: string; lang: Lang; onAthleteClick?: (name: string) => void }) {
  const toEntries = (p: PodiumEntry[]) => p.map((e) => ({ name: e.name, value: displayTime(e.time) }))
  const pbs = race.personalBests
  return (
    <section className={CARD} aria-labelledby={`season-${race.sport}`}>
      <div className="flex items-baseline justify-between gap-2 mb-2.5">
        <h3 id={`season-${race.sport}`} className="text-sm font-semibold text-red-700">{t(race.sport, lang)}</h3>
        <span className="text-[11px] text-gray-500 tabular-nums">{race.starts.total} {t('season_starts', lang)}</span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)] gap-3">
        <Block title={t('season_podium', lang)}>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {(['men', 'women'] as const).map((g) => (
              <div key={g}>
                <Podium title={t(g === 'men' ? 'season_men' : 'season_women', lang)} entries={toEntries(race.podium[g])} onAthleteClick={onAthleteClick} />
                {race.fasterGuest[g] && (
                  <p className="text-[11px] text-gray-500 mt-1">
                    {tf('season_faster_guest', lang, { name: race.fasterGuest[g]!.name, time: displayTime(race.fasterGuest[g]!.time) })}
                  </p>
                )}
              </div>
            ))}
          </div>
        </Block>
        <Block title={t('season_course_records', lang)}>
          <CourseRecords race={race} year={year} lang={lang} onAthleteClick={onAthleteClick} />
        </Block>
      </div>

      {pbs && (
        <Block title={tf('season_pbs', lang, { n: pbs.length, m: race.comparable })} className="mt-3 bg-white">
          {pbs.length === 0 ? (
            <p className="text-xs text-gray-500">{t('season_pbs_none', lang)}</p>
          ) : (
            <>
              <PersonalBestChart pbs={pbs} year={year} lang={lang} onAthleteClick={onAthleteClick} />
              <details className="mt-2">
                <summary className="min-h-6 text-[11px] text-red-700 font-medium cursor-pointer w-fit rounded focus-visible:ring-2 focus-visible:ring-red-700 focus-visible:ring-offset-1">
                  {t('season_pb_exact', lang)}
                </summary>
                {/* Scrolls sideways on phones, so it must be reachable by keyboard */}
                <div className="overflow-x-auto mt-1 rounded focus-visible:ring-2 focus-visible:ring-red-700" tabIndex={0} role="region"
                  aria-label={`${t(race.sport, lang)} — ${t('season_pb_exact', lang)}`}>
                  <table className="min-w-full text-xs">
                    <thead>
                      <tr className="bg-gray-50 border-b border-gray-200 text-[11px] uppercase tracking-wider text-gray-500">
                        <th scope="col" className="px-2 py-1.5 text-left font-semibold">{t('season_member', lang)}</th>
                        <th scope="col" className="px-2 py-1.5 text-left font-semibold">{year}</th>
                        <th scope="col" className="px-2 py-1.5 text-left font-semibold">{t('season_pb_prev', lang)}</th>
                        <th scope="col" className="px-2 py-1.5 text-right font-semibold">{t('season_pb_gain', lang)}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {pbs.map((p) => (
                        <tr key={p.name} className="border-b border-gray-100">
                          <th scope="row" className="px-2 py-1 text-left font-medium text-gray-800">{p.name}</th>
                          <td className="px-2 py-1 tabular-nums text-gray-700">{displayTime(p.time)}</td>
                          <td className="px-2 py-1 tabular-nums text-gray-600">{displayTime(p.previousBest.time)} ({p.previousBest.year})</td>
                          <td className="px-2 py-1 tabular-nums text-right font-semibold text-gray-800">−{clock(p.gain)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </details>
            </>
          )}
        </Block>
      )}
    </section>
  )
}

export function SeasonTab({ data, lang, year, onYearChange, onAthleteClick, onNavigateToRankings }: Props) {
  const s = useMemo(() => getSeasonSummary(data, year), [data, year])
  const story = useMemo(() => seasonStory(s, lang), [s, lang])
  const comparableRaces = s.races.filter((r) => r.personalBests !== null)
  const pbCount = comparableRaces.reduce((n, r) => n + (r.personalBests?.length ?? 0), 0)
  const comparableCount = comparableRaces.reduce((n, r) => n + r.comparable, 0)
  const recordCount = s.races.reduce((n, r) => n + (r.records?.length ?? 0), 0)

  return (
    <div className="space-y-3">
      <div className={CARD}>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <h2 className="text-sm font-semibold text-red-700 mb-0.5">{t('season_title', lang)} {year}</h2>
            <p className="text-xs text-gray-500 leading-relaxed">{t('season_intro', lang)}</p>
          </div>
          <div>
            <label htmlFor="season-year" className="block text-[11px] font-medium text-gray-500 uppercase tracking-wide mb-1">{t('season_select', lang)}</label>
            <select id="season-year" value={year} onChange={(e) => onYearChange(e.target.value)}
              className="min-h-6 border border-gray-200 rounded px-2 py-1 text-xs bg-white focus-visible:ring-2 focus-visible:ring-red-700 focus-visible:ring-offset-1">
              {SEASON_YEARS.map((y) => <option key={y} value={y}>{y}</option>)}
            </select>
          </div>
        </div>
      </div>

      {/* The season in words: short paragraph, full race-by-race version on demand */}
      <div className={CARD}>
        <p className="text-sm text-gray-800 leading-relaxed">{story.short}</p>
        <details className="mt-2">
          <summary className="min-h-6 text-xs text-red-700 font-medium cursor-pointer w-fit rounded focus-visible:ring-2 focus-visible:ring-red-700 focus-visible:ring-offset-1">
            {t('season_read_more', lang)}
          </summary>
          <div className="mt-2 space-y-2 border-l-2 border-red-100 pl-3">
            {story.long.map((para, i) => <p key={i} className="text-xs text-gray-700 leading-relaxed">{para}</p>)}
          </div>
        </details>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        <Kpi label={t('season_kpi_starts', lang)} value={s.participations.total}
          sub={tf('season_kpi_starts_sub', lang, { m: s.participations.members, g: s.participations.guests })} />
        <Kpi label={t('season_kpi_people', lang)} value={s.people.total}
          sub={tf('season_kpi_people_sub', lang, { m: s.people.members, g: s.people.guests })} />
        <Kpi label={t('season_kpi_new', lang)} value={s.newMembers} sub={t('season_kpi_new_sub', lang)} />
        <Kpi label={t('season_kpi_pbs', lang)} value={pbCount} sub={tf('season_kpi_pbs_sub', lang, { m: comparableCount })} />
        <div className="col-span-2 sm:col-span-1">
          <Kpi label={t('season_kpi_records', lang)} value={recordCount} sub={t('season_kpi_records_sub', lang)} />
        </div>
      </div>

      <section className={CARD} aria-labelledby="season-participation">
        <h3 id="season-participation" className={H3}>{t('season_participation', lang)}</h3>
        <ParticipationBars races={s.races} year={year} lang={lang} />
      </section>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <section className={CARD} aria-labelledby="season-points">
          <h3 id="season-points" className={H3}>{t('season_points', lang)}</h3>
          <div className="grid grid-cols-1 gap-3">
            {(['men', 'women'] as const).map((g) => (
              <Podium key={g} title={t(g === 'men' ? 'season_men' : 'season_women', lang)}
                entries={s.pointsPodium[g].map((a) => ({ name: a.name, value: `${a.points} ${t('season_points_unit', lang)}` }))}
                onAthleteClick={onAthleteClick} />
            ))}
          </div>
          {onNavigateToRankings && (
            <button onClick={onNavigateToRankings}
              className="mt-2 min-h-6 text-xs text-red-700 hover:underline font-medium focus-visible:ring-2 focus-visible:ring-red-700 focus-visible:ring-offset-1 rounded">
              {t('season_full_ranking', lang)}
            </button>
          )}
        </section>
        <section className={CARD} aria-labelledby="season-loyalty">
          <h3 id="season-loyalty" className={H3}>{t('season_loyalty', lang)}</h3>
          <MembersPerRaceCount racesPerMember={s.racesPerMember} raceCount={s.races.length} lang={lang} />
          {s.everyRace.length > 0 && (
            <p className="mt-2 text-xs text-gray-700">
              {tf('season_loyalty_all', lang, { n: s.races.length })}{' '}
              {s.everyRace.map((n, i) => (
                <span key={n}>{i > 0 && ', '}<strong><Name name={n} onClick={onAthleteClick} /></strong></span>
              ))}
            </p>
          )}
        </section>
      </div>

      {s.races.map((r) => <RaceCard key={r.sport} race={r} year={year} lang={lang} onAthleteClick={onAthleteClick} />)}
    </div>
  )
}
