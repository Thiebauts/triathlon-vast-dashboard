'use client'
import { useMemo } from 'react'
import dynamic from 'next/dynamic'
import { t, tf } from '@/lib/translations'
import { SEASON_SPORTS, SEASON_YEARS, getSeasonSummary } from '@/lib/season'
import { formatDate, formatDayMonth } from '@/lib/dates'
import { getClubRankings, getParticipationByYear } from '@/lib/data'
import type { CompetitionsData, Lang, SportType } from '@/lib/types'
import { BTN_OUTLINE_LIGHT, BTN_PRIMARY, CARD, CARD_MIST, Eyebrow, LINK_BTN, MEDAL_COLORS, SectionTitle } from '@/components/ui/brand'

const ParticipationChart = dynamic(
  () => import('@/components/charts/ParticipationChart').then((m) => m.ParticipationChart),
  { ssr: false, loading: () => <div className="h-[320px] animate-pulse rounded bg-mist" /> },
)

interface Props {
  data: CompetitionsData
  lang: Lang
  /** ISO date of the newest result on the dashboard. */
  lastUpdated: string
  /** Race day per "<sport>-<year>". */
  raceDates: Record<string, string>
  onNavigateToSeason?: () => void
  onNavigateToExtra?: () => void
  onNavigateToSport?: (sport: SportType) => void
  onNavigateToRankings?: () => void
  onAthleteClick?: (name: string) => void
}

const racesLabel = (n: number, lang: Lang) => (n === 1 ? t('ov_races_one', lang) : tf('ov_races_n', lang, { n }))

export function OverviewTab({ data, lang, lastUpdated, raceDates, onNavigateToSeason, onNavigateToExtra, onNavigateToSport, onNavigateToRankings, onAthleteClick }: Props) {
  const year = SEASON_YEARS[0]
  const season = useMemo(() => getSeasonSummary(data, year), [data, year])
  const participationByYear = useMemo(() => getParticipationByYear(data), [data])
  const standings = useMemo(() => ({
    men: getClubRankings(data, 'men', year).slice(0, 5),
    women: getClubRankings(data, 'women', year).slice(0, 5),
  }), [data, year])

  const racedSports = new Set(season.races.map((r) => r.sport))
  const seasonDone = SEASON_SPORTS.every((s) => racedSports.has(s))
  const personalBests = season.races.reduce((n, r) => n + (r.personalBests?.length ?? 0), 0)
  // Races in calendar order (by race day), unraced ones last
  const raceCards = [...SEASON_SPORTS]
    .map((sport) => ({ sport, date: raceDates[`${sport}-${year}`], race: season.races.find((r) => r.sport === sport) }))
    .sort((a, b) => (a.date ?? '9999').localeCompare(b.date ?? '9999'))

  const kpis = [
    { value: season.participations.total, label: t('ov_kpi_starts', lang) },
    { value: season.people.total, label: t('ov_kpi_people', lang) },
    { value: personalBests, label: t('ov_kpi_pbs', lang) },
    { value: season.newMembers, label: t('ov_kpi_new', lang) },
  ]

  const leaders = [
    { label: t('men', lang), entry: standings.men[0] },
    { label: t('women', lang), entry: standings.women[0] },
  ].filter((l) => l.entry)

  const nameButton = (name: string, className: string) => onAthleteClick
    ? <button type="button" onClick={() => onAthleteClick(name)} className={`text-left hover:text-brand hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand rounded ${className}`}>{name}</button>
    : <span className={className}>{name}</span>

  return (
    <div className="flex flex-col">
      {/* Hero: dark slanted band, as on triathlonvast.se */}
      <section aria-labelledby="ov-title"
        className="-mx-4 -mt-6 bg-navy text-white [clip-path:polygon(0_0,100%_0,100%_92%,0_100%)] sm:-mx-8 lg:-mx-10 lg:[clip-path:polygon(0_0,100%_0,100%_86%,0_100%)]">
        <div className="mx-auto flex max-w-[1280px] flex-wrap items-center justify-between gap-10 px-4 pb-24 pt-12 sm:px-8 lg:px-10 lg:pb-28 lg:pt-16">
          <div className="min-w-0 flex-[1_1_440px]">
            <Eyebrow light className="text-[26px]">{t('ov_eyebrow', lang)}</Eyebrow>
            <h2 id="ov-title" className="mt-1.5 hyphens-auto break-words font-display text-[clamp(28px,8.6vw,38px)] font-semibold leading-[1.16] sm:text-[52px]">{tf('ov_title', lang, { year })}</h2>
            <p className="m-0 font-display text-2xl font-semibold italic leading-tight sm:text-[36px]">
              {tf('ov_subtitle', lang, { races: season.races.length, starts: season.participations.total })}
            </p>
            <div className="mt-7 flex flex-wrap gap-3">
              {onNavigateToSeason && <button type="button" onClick={onNavigateToSeason} className={`${BTN_PRIMARY} text-lg`}>{t('ov_read_season', lang)}</button>}
              {onNavigateToSport && <button type="button" onClick={() => onNavigateToSport('triathlon')} className={`${BTN_OUTLINE_LIGHT} text-lg`}>{t('ov_all_results', lang)}</button>}
            </div>
          </div>
          {leaders.length > 0 && (
            <div className={`w-full flex-[0_1_360px] bg-white px-7 py-6 text-ink ${CARD} lg:rounded-[4px_4px_48px_4px]`}>
              <Eyebrow>{seasonDone ? tf('ov_winners', lang, { year }) : tf('ov_leaders', lang, { n: season.races.length, total: SEASON_SPORTS.length })}</Eyebrow>
              {leaders.map(({ label, entry }) => (
                <div key={label} className="grid grid-cols-[minmax(0,1fr)_auto] items-baseline gap-3 border-b border-line py-3 last:border-b-0">
                  <span>
                    <span className="block text-[13px] font-semibold text-muted">{label} · {racesLabel(entry.competitions.length, lang)}</span>
                    {nameButton(entry.name, 'font-display text-xl font-semibold text-navy')}
                  </span>
                  <span className="font-display text-2xl font-semibold text-brand">{entry.total_points} {t('season_points_unit', lang)}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* The cup in a few words, with the season's key numbers */}
      <section className="mx-auto flex w-full max-w-[1200px] flex-wrap items-center gap-10 pb-14 pt-8">
        <div className="min-w-0 flex-[1_1_420px]">
          <SectionTitle eyebrow={t('ov_intro_eyebrow', lang)} title={tf('ov_intro_title', lang, { races: SEASON_SPORTS.length })} />
          <div aria-hidden="true" className="my-5 h-px w-20 bg-[#a3a8ac]" />
          <p className="m-0 max-w-[560px] leading-[1.8]">{t('ov_intro_text', lang)}</p>
          <p className="mt-3 max-w-[560px] leading-[1.8]">{t('championships_intro', lang)}</p>
        </div>
        <dl className={`m-0 grid flex-[1_1_340px] grid-cols-2 gap-px overflow-hidden bg-line ${CARD} lg:rounded-[4px_4px_48px_4px]`}>
          {kpis.map((k) => (
            <div key={k.label} className="flex flex-col-reverse bg-white px-6 py-5">
              <dt className="text-[15px] font-semibold text-navy">{k.label}</dt>
              <dd className="m-0 font-display text-[44px] font-semibold leading-[1.1] text-brand">{k.value}</dd>
            </div>
          ))}
        </dl>
      </section>

      {/* The six races */}
      <section aria-labelledby="ov-races" className="-mx-4 bg-mist px-4 py-14 sm:-mx-8 sm:px-8 lg:-mx-10 lg:px-10">
        <div className="mx-auto max-w-[1200px]">
        <SectionTitle id="ov-races" eyebrow={t('ov_races_eyebrow', lang)} title={tf('ov_races_title', lang, { year })} />
        <ol className="m-0 mt-7 grid list-none grid-cols-[repeat(auto-fit,minmax(min(100%,300px),1fr))] gap-5 p-0">
          {raceCards.map(({ sport, date, race }) => (
            <li key={sport} className={`flex flex-col gap-1.5 bg-white px-6 pb-6 pt-6 ${CARD}`}>
              <div className="flex items-baseline justify-between gap-3">
                <h4 className="m-0 font-display text-2xl font-semibold leading-tight text-navy">{t(sport, lang)}</h4>
                {date && <span className="text-sm font-semibold text-muted">{formatDayMonth(date, lang)}</span>}
              </div>
              <div className="text-sm leading-normal text-muted">{t(`discipline_${sport}_desc`, lang)}</div>
              {race ? (
                <>
                  {(race.podium.men[0] || race.podium.women[0]) && (
                    <div className="mt-2 text-[15px] leading-relaxed">
                      {t('ov_champions', lang)}{' '}
                      {[race.podium.men[0]?.name, race.podium.women[0]?.name].filter(Boolean).map((n, i, arr) => (
                        <span key={n}>
                          <strong className="text-navy">{n}</strong>
                          {i < arr.length - 1 && ` ${t('season_and', lang)} `}
                        </span>
                      ))}
                    </div>
                  )}
                  <div className="mt-auto flex items-center justify-between gap-3 border-t border-line pt-3">
                    <span className="text-sm text-muted">{tf('ov_starts_n', lang, { n: race.starts.total })}</span>
                    {onNavigateToSport && (
                      <button type="button" onClick={() => onNavigateToSport(sport)} aria-label={`${t(sport, lang)}: ${t('ov_see_results', lang)}`} className={`${LINK_BTN} text-[15px]`}>
                        {t('ov_see_results', lang)}
                      </button>
                    )}
                  </div>
                </>
              ) : (
                <div className="mt-auto border-t border-line pt-3 text-sm text-muted">{t('ov_not_raced', lang)}</div>
              )}
            </li>
          ))}
        </ol>
        <p className="mb-0 mt-4 text-sm text-muted">{t('ov_starts_note', lang)}</p>
        </div>
      </section>

      {/* Standings */}
      <section aria-labelledby="ov-standings" className="mx-auto w-full max-w-[1200px] py-14">
        <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
          <SectionTitle id="ov-standings" eyebrow={t('ov_standings_eyebrow', lang)} title={tf('ov_standings_title', lang, { year })} />
          {onNavigateToRankings && <button type="button" onClick={onNavigateToRankings} className={BTN_PRIMARY}>{t('ov_full_ranking', lang)}</button>}
        </div>
        <div className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,340px),1fr))] gap-8">
          {([['men', standings.men], ['women', standings.women]] as const).map(([g, rows]) => (
            <div key={g}>
              <h4 className="mb-2 mt-0 font-display text-[22px] font-semibold text-navy">{t(g, lang)}</h4>
              <ol className="m-0 list-none p-0">
                {rows.map((r, i) => (
                  <li key={r.name} className="grid grid-cols-[32px_minmax(0,1fr)_auto_auto] items-center gap-3 border-b border-line py-2.5">
                    <span className="font-display text-lg font-semibold" style={{ color: MEDAL_COLORS[i] ?? '#4a4e57' }}>{i + 1}</span>
                    {nameButton(r.name, 'font-semibold text-navy')}
                    <span className="text-sm text-muted">{racesLabel(r.competitions.length, lang)}</span>
                    <span className="min-w-16 text-right font-display text-lg font-semibold text-brand">{r.total_points} {t('season_points_unit', lang)}</span>
                  </li>
                ))}
              </ol>
            </div>
          ))}
        </div>
      </section>

      {/* More: other events, participation over the years, about */}
      <section aria-labelledby="ov-more" className="mx-auto w-full max-w-[1200px] border-t border-line pt-14">
        <SectionTitle id="ov-more" eyebrow={t('ov_more_eyebrow', lang)} title={t('overview_extra_title', lang)} />
        <p className="mb-0 mt-4 max-w-[640px] leading-[1.8]">{t('overview_extra_text', lang)}</p>
        {onNavigateToExtra && (
          <button type="button" onClick={onNavigateToExtra} className={`${BTN_PRIMARY} mt-5`}>{t('nav_extra', lang)}</button>
        )}

        <div className={`mt-12 bg-white p-5 ring-1 ring-line ${CARD}`}>
          <h4 className="mb-4 mt-0 font-display text-[22px] font-semibold text-navy">{t('participation_by_year', lang)}</h4>
          <ParticipationChart data={participationByYear} lang={lang} />
        </div>

        <div className="mt-8 grid gap-5 md:grid-cols-2">
          <div className={`${CARD_MIST} px-6 py-6`}>
            <h4 className="mb-2 mt-0 font-display text-[22px] font-semibold text-navy">{t('created_by_title', lang)}</h4>
            <p className="m-0 text-[15px] leading-relaxed">{t('created_by_text1', lang)}</p>
            <p className="mb-0 mt-2 text-[15px] leading-relaxed">{t('created_by_text2', lang)}</p>
            {lastUpdated && (
              <p className="mb-0 mt-2 text-[15px]">{t('last_updated', lang)} <strong>{formatDate(lastUpdated, lang)}</strong></p>
            )}
          </div>
          <div className={`${CARD_MIST} px-6 py-6`}>
            <h4 className="mb-2 mt-0 font-display text-[22px] font-semibold text-navy">{t('contact_title', lang)}</h4>
            <p className="m-0 text-[15px] leading-relaxed">
              {t('contact_text', lang)}{' '}
              <code className="rounded bg-white px-1 py-0.5 text-[13px] text-navy">[triathlon-vast-dashboard] {t('contact_subject_placeholder', lang)}</code>
            </p>
            <p className="mb-0 mt-2 text-[15px] leading-relaxed">
              {t('contribute_text', lang)}{' '}
              <a href="https://github.com/Thiebauts/triathlon-vast-dashboard" target="_blank" rel="noopener noreferrer" className="font-semibold text-link hover:underline">GitHub</a>
            </p>
          </div>
        </div>
      </section>
    </div>
  )
}
