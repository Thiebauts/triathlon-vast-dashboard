'use client'
import { useMemo } from 'react'
import { t, tf } from '@/lib/translations'
import { displayTime, getSeasonSummary, SEASON_YEARS, type PodiumEntry, type RaceSummary } from '@/lib/season'
import { seasonStory } from '@/lib/seasonStory'
import { clock, MembersPerRaceCount, ParticipationBars, PersonalBestChart } from '@/components/charts/SeasonCharts'
import type { CompetitionsData, Lang } from '@/lib/types'
import { CARD_MIST, LINK_BTN, MEDAL_COLORS, PageTitle } from '@/components/ui/brand'

interface Props {
  data: CompetitionsData
  lang: Lang
  /** Owned by the Dashboard (controlled) so the URL can mirror it: #season/<year>. */
  year: string
  onYearChange: (year: string) => void
  onAthleteClick?: (name: string) => void
  onNavigateToRankings?: () => void
}

const MEDAL_COLOR = MEDAL_COLORS
// Club look: white panels with a thin line and the one big rounded corner
const CARD = 'bg-white ring-1 ring-line rounded-[4px_4px_40px_4px] px-5 py-5 sm:px-6'
const H3 = 'font-display text-[22px] font-semibold text-navy mb-3 mt-0'

function Name({ name, onClick }: { name: string; onClick?: (name: string) => void }) {
  if (!onClick) return <>{name}</>
  return (
    <button onClick={() => onClick(name)}
      className="min-h-6 inline-flex items-center text-left font-semibold text-navy hover:text-brand hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand rounded">
      {name}
    </button>
  )
}

function Podium({ title, entries, onAthleteClick }: { title: string; entries: Array<{ name: string; value: string }>; onAthleteClick?: (name: string) => void }) {
  return (
    <div>
      <div className="mb-1 text-sm font-bold uppercase tracking-[0.06em] text-muted">{title}</div>
      <ol>
        {entries.map((e, i) => (
          <li key={e.name} className="flex min-h-9 items-center gap-2.5 border-b border-line text-[15px] last:border-b-0">
            <span className="w-5 font-display font-semibold tabular-nums" style={{ color: MEDAL_COLOR[i] }}>{i + 1}</span>
            <span className="min-w-0 flex-1 truncate"><Name name={e.name} onClick={onAthleteClick} /></span>
            <span className="font-display font-semibold tabular-nums text-navy">{e.value}</span>
          </li>
        ))}
      </ol>
    </div>
  )
}

function Kpi({ label, value, sub }: { label: string; value: number; sub: string }) {
  return (
    <div className={CARD}>
      <div className="font-display text-[40px] font-semibold leading-[1.1] tabular-nums text-brand">{value}</div>
      <div className="text-[15px] font-semibold text-navy">{label}</div>
      <div className="text-[13px] leading-snug text-muted">{sub}</div>
    </div>
  )
}

/** A delimited block inside a race card: podium, course records or personal bests. */
function Block({ title, children, className = '' }: { title: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={`rounded-[4px_4px_24px_4px] bg-mist px-4 py-3.5 ${className}`}>
      <h4 className="mb-2 mt-0 text-sm font-bold uppercase tracking-[0.06em] text-muted">{title}</h4>
      {children}
    </div>
  )
}

function CourseRecords({ race, year, lang, onAthleteClick, firstSeason }: { race: RaceSummary; year: string; lang: Lang; onAthleteClick?: (name: string) => void; firstSeason: boolean }) {
  if (race.courseRecords === null) {
    return <p className="m-0 text-sm leading-relaxed text-muted">{t('season_note_swimrun', lang)}</p>
  }
  return (
    <div className="space-y-2.5">
      {(['men', 'women'] as const).map((g) => {
        const rec = race.courseRecords![g]
        const beaten = race.records?.find((r) => r.gender === g)?.previous
        return (
          <div key={g}>
            <div className="text-[13px] font-medium text-muted">{t(g === 'men' ? 'season_men' : 'season_women', lang)}</div>
            {rec ? (
              <div className="text-sm text-navy">
                <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 min-h-6">
                  <span className="font-medium"><Name name={rec.name} onClick={onAthleteClick} /></span>
                  <span className="tabular-nums">{displayTime(rec.time)}</span>
                  <span className="text-muted">({rec.year})</span>
                  {rec.setThisSeason && !firstSeason && (
                    <span className="inline-flex h-[22px] items-center rounded-[2px_2px_8px_2px] bg-brand px-2 font-display text-sm font-semibold text-white">
                      {tf('season_record_new_badge', lang, { y: year })}
                    </span>
                  )}
                </div>
                {rec.setThisSeason && !firstSeason && beaten && (
                  <div className="text-[13px] text-muted">
                    {tf('season_record_beat', lang, { name: beaten.name, time: displayTime(beaten.time), year: beaten.year })}
                  </div>
                )}
              </div>
            ) : <div className="text-sm text-muted">{t('season_record_none', lang)}</div>}
          </div>
        )
      })}
      {race.sport === 'triathlon' && <p className="text-[13px] text-muted leading-relaxed">{t('season_note_triathlon', lang)}</p>}
    </div>
  )
}

function RaceCard({ race, year, lang, onAthleteClick, firstSeason }: { race: RaceSummary; year: string; lang: Lang; onAthleteClick?: (name: string) => void; firstSeason: boolean }) {
  const toEntries = (p: PodiumEntry[]) => p.map((e) => ({ name: e.name, value: displayTime(e.time) }))
  const pbs = race.personalBests
  return (
    <section className={CARD} aria-labelledby={`season-${race.sport}`}>
      <div className="flex items-baseline justify-between gap-2 mb-2.5">
        <h3 id={`season-${race.sport}`} className="m-0 font-display text-[26px] font-semibold text-navy">{t(race.sport, lang)}</h3>
        <span className="text-sm text-muted tabular-nums">{race.starts.total} {t('season_starts', lang)}</span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)] gap-3">
        <Block title={t('season_podium', lang)}>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {(['men', 'women'] as const).map((g) => (
              <div key={g}>
                <Podium title={t(g === 'men' ? 'season_men' : 'season_women', lang)} entries={toEntries(race.podium[g])} onAthleteClick={onAthleteClick} />
                {race.fasterGuest[g] && (
                  <p className="text-[13px] text-muted mt-1">
                    {tf('season_faster_guest', lang, { name: race.fasterGuest[g]!.name, time: displayTime(race.fasterGuest[g]!.time) })}
                  </p>
                )}
              </div>
            ))}
          </div>
        </Block>
        <Block title={t('season_course_records', lang)}>
          <CourseRecords race={race} year={year} lang={lang} onAthleteClick={onAthleteClick} firstSeason={firstSeason} />
        </Block>
      </div>

      {pbs && !firstSeason && (
        <Block title={tf('season_pbs', lang, { n: pbs.length, m: race.comparable })} className="mt-3 !bg-white ring-1 ring-line">
          {pbs.length === 0 ? (
            <p className="text-sm text-muted">{t('season_pbs_none', lang)}</p>
          ) : (
            <>
              <PersonalBestChart pbs={pbs} year={year} lang={lang} onAthleteClick={onAthleteClick} />
              <details className="mt-2">
                <summary className={`${LINK_BTN} w-fit cursor-pointer text-sm`}>
                  {t('season_pb_exact', lang)}
                </summary>
                {/* Scrolls sideways on phones, so it must be reachable by keyboard */}
                <div className="overflow-x-auto mt-1 rounded focus-visible:ring-2 focus-visible:ring-red-700" tabIndex={0} role="region"
                  aria-label={`${t(race.sport, lang)} — ${t('season_pb_exact', lang)}`}>
                  <table className="min-w-full text-sm">
                    <thead>
                      <tr className="bg-navy text-left font-display text-[13px] text-white">
                        <th scope="col" className="px-2 py-1.5 text-left font-semibold">{t('season_member', lang)}</th>
                        <th scope="col" className="px-2 py-1.5 text-left font-semibold">{year}</th>
                        <th scope="col" className="px-2 py-1.5 text-left font-semibold">{t('season_pb_prev', lang)}</th>
                        <th scope="col" className="px-2 py-1.5 text-right font-semibold">{t('season_pb_gain', lang)}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {pbs.map((p) => (
                        <tr key={p.name} className="border-b border-line">
                          <th scope="row" className="px-2 py-1 text-left font-medium text-navy">{p.name}</th>
                          <td className="px-2 py-1 tabular-nums text-ink">{displayTime(p.time)}</td>
                          <td className="px-2 py-1 tabular-nums text-muted">{displayTime(p.previousBest.time)} ({p.previousBest.year})</td>
                          <td className="px-2 py-1 tabular-nums text-right font-semibold text-navy">−{clock(p.gain)}</td>
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
    <div className="flex flex-col gap-6">
      <div className="flex flex-col items-start gap-6">
        <PageTitle eyebrow={t('nav_season', lang)} title={`${t('season_title', lang)} ${year}`} intro={t('season_intro', lang)} />
        <label htmlFor="season-year" className="flex flex-col gap-1 text-sm font-semibold text-navy">{t('res_filter_year', lang)}
          <select id="season-year" value={year} onChange={(e) => onYearChange(e.target.value)}
            className="h-12 min-w-[130px] rounded border border-line bg-mist px-3 text-[15px] font-medium text-navy focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand">
            {SEASON_YEARS.map((y) => <option key={y} value={y}>{y}</option>)}
          </select>
        </label>
      </div>

      {/* The season in words: short paragraph, full race-by-race version on demand */}
      <div className={`${CARD_MIST} px-6 py-6`}>
        <p className="m-0 text-base leading-[1.8] text-ink">{story.short}</p>
        <details className="mt-3">
          <summary className={`${LINK_BTN} w-fit cursor-pointer text-[15px]`}>
            {t('season_read_more', lang)}
          </summary>
          <div className="mt-3 space-y-3 border-l-2 border-brand/30 pl-4">
            {story.long.map((para, i) => <p key={i} className="m-0 text-[15px] leading-relaxed">{para}</p>)}
          </div>
        </details>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-5">
        <Kpi label={t('season_kpi_starts', lang)} value={s.participations.total}
          sub={tf('season_kpi_starts_sub', lang, { m: s.participations.members, g: s.participations.guests })} />
        <Kpi label={t('season_kpi_people', lang)} value={s.people.total}
          sub={tf('season_kpi_people_sub', lang, { m: s.people.members, g: s.people.guests })} />
        {/* The first season has nothing earlier to compare with */}
        {!s.firstSeason && <>
          <Kpi label={t('season_kpi_new', lang)} value={s.newMembers} sub={t('season_kpi_new_sub', lang)} />
          <Kpi label={t('season_kpi_pbs', lang)} value={pbCount} sub={tf('season_kpi_pbs_sub', lang, { m: comparableCount })} />
          <div className="col-span-2 sm:col-span-1">
            <Kpi label={t('season_kpi_records', lang)} value={recordCount} sub={t('season_kpi_records_sub', lang)} />
          </div>
        </>}
      </div>
      {s.firstSeason && <p className="-mt-3 mb-0 text-sm text-muted">{t('season_first_note', lang)}</p>}

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
            <button type="button" onClick={onNavigateToRankings} className={`${LINK_BTN} mt-2 text-[15px]`}>
              {t('season_full_ranking', lang)}
            </button>
          )}
        </section>
        <section className={CARD} aria-labelledby="season-loyalty">
          <h3 id="season-loyalty" className={H3}>{t('season_loyalty', lang)}</h3>
          <MembersPerRaceCount racesPerMember={s.racesPerMember} raceCount={s.races.length} lang={lang} />
          {/* Names for "raced all", one less and two less — but never below
              four races, where the lists get too long to read. */}
          {Array.from({ length: 3 }, (_, i) => s.races.length - i)
            .filter((n) => n >= 4 && (s.membersByRaceCount[n]?.length ?? 0) > 0)
            .map((n) => (
              <p key={n} className="mb-0 mt-3 text-[15px]">
                <span className="font-semibold text-navy">
                  {n === s.races.length ? tf('season_loyalty_all', lang, { n }) : tf('season_loyalty_n', lang, { n })}
                </span>{' '}
                {s.membersByRaceCount[n].map((name, j) => (
                  <span key={name}>{j > 0 && ', '}<Name name={name} onClick={onAthleteClick} /></span>
                ))}
              </p>
            ))}
        </section>
      </div>

      {s.races.map((r) => <RaceCard key={r.sport} race={r} year={year} lang={lang} onAthleteClick={onAthleteClick} firstSeason={s.firstSeason} />)}
    </div>
  )
}
