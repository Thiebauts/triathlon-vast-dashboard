'use client'
import { useMemo } from 'react'
import { t, tf } from '@/lib/translations'
import { CARD_MIST, MEDAL_COLORS, PageTitle } from '@/components/ui/brand'
import { getClubRankings } from '@/lib/data'
import type { CompetitionsData, Lang, ClubAthlete } from '@/lib/types'

interface Props {
  data: CompetitionsData
  /** Precomputed server-side: getClubRankings(data, 'all', 'all') */
  allTimeRankings: ClubAthlete[]
  lang: Lang
  onAthleteClick?: (name: string) => void
  /** Owned by the Dashboard (controlled) so the URL can mirror it: #rankings/<year>. */
  year: string
  onYearChange: (year: string) => void
}

function RankTable({ data, lang, onAthleteClick }: {
  data: ReturnType<typeof getClubRankings>
  lang: Lang
  onAthleteClick?: (name: string) => void
}) {
  if (!data.length) return <p className="py-6 text-center text-[15px] text-muted">{t('not_ranked', lang)}</p>
  return (
    <table className="min-w-full text-[15px]">
      <thead>
        <tr className="text-left font-display text-sm text-white">
          <th scope="col" className="w-14 bg-navy px-4 py-3 font-semibold">{t('rank', lang)}</th>
          <th scope="col" className="bg-navy px-3 py-3 font-semibold">{t('athlete', lang)}</th>
          <th scope="col" className="bg-navy px-3 py-3 text-right font-semibold">{t('competitions', lang)}</th>
          <th scope="col" className="bg-navy px-4 py-3 text-right font-semibold">{t('total_points', lang)}</th>
        </tr>
      </thead>
      <tbody>
        {data.map((a, i) => {
          const rank = i + 1
          return (
            <tr key={a.name} className={`border-b border-line ${i % 2 ? 'bg-[#f9f9fb]' : 'bg-white'} hover:bg-mist`}>
              <th scope="row" className="px-4 py-2.5 text-left font-display font-semibold tabular-nums" style={{ color: MEDAL_COLORS[i] ?? '#4a4e57' }}>{rank}</th>
              <td className="px-3 py-2.5">
                {onAthleteClick ? (
                  <button type="button" onClick={() => onAthleteClick(a.name)}
                    className="rounded text-left font-semibold text-navy hover:text-brand hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand">
                    {a.name}
                  </button>
                ) : <span className="font-semibold text-navy">{a.name}</span>}
              </td>
              <td className="px-3 py-2.5 text-right text-muted">{a.competitions.length}</td>
              <td className="px-4 py-2.5 text-right font-display font-semibold tabular-nums text-brand">{a.total_points}</td>
            </tr>
          )
        })}
      </tbody>
    </table>
  )
}

export function RankingsTab({ data, allTimeRankings, lang, onAthleteClick, year, onYearChange }: Props) {
  const years = useMemo(() => {
    const ys = new Set<string>()
    for (const athletes of Object.values(data))
      for (const a of athletes) ys.add(a.Competition_Year)
    return ['all', ...[...ys].sort().reverse()]
  }, [data])

  // For year='all', reuse the precomputed all-time list; for a specific year
  // recompute once and split by gender (the list is already sorted by points).
  const { women, men } = useMemo(() => {
    const list = year === 'all' ? allTimeRankings : getClubRankings(data, 'all', year)
    return {
      women: list.filter((a) => a.gender === 'dam'),
      men:   list.filter((a) => a.gender === 'herr'),
    }
  }, [data, allTimeRankings, year])

  return (
    <div className="flex flex-col gap-9">
      <div className="flex flex-wrap items-end justify-between gap-x-10 gap-y-6">
        <PageTitle
          eyebrow={t('ov_standings_eyebrow', lang)}
          title={year === 'all' ? t('nav_rankings', lang) : tf('rank_title_year', lang, { year })}
          subtitle={year === 'all' ? t('rank_sub_all', lang) : t('rank_sub_year', lang)}
        />
        <label htmlFor="rankings-year" className="flex flex-col gap-1 text-sm font-semibold text-navy">{t('res_filter_year', lang)}
          <select id="rankings-year" value={year} onChange={(e) => onYearChange(e.target.value)}
            className="h-12 min-w-[160px] rounded border border-line bg-mist px-3 text-[15px] font-medium text-navy focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand">
            {years.map((y) => (
              <option key={y} value={y}>{y === 'all' ? t('all_years', lang) : y}</option>
            ))}
          </select>
        </label>
      </div>

      <section className={`${CARD_MIST} px-6 py-5`}>
        <h3 className="mb-1.5 mt-0 font-display text-[22px] font-semibold text-navy">{t('club_rankings_title', lang)}</h3>
        <p className="m-0 text-[15px] leading-relaxed">{t('club_rankings_text1', lang)}</p>
        <p className="mb-0 mt-1.5 text-[15px] leading-relaxed">{t('club_rankings_text2', lang)}</p>
      </section>

      <div className="grid gap-8 lg:grid-cols-2">
        {([['womens_rankings', women], ['mens_rankings', men]] as const).map(([key, list]) => (
          <section key={key} aria-label={t(key, lang)}>
            <h3 className="mb-3 mt-0 font-display text-[26px] font-semibold text-navy">{t(key, lang)}</h3>
            <div className="overflow-x-auto">
              <RankTable data={list} lang={lang} onAthleteClick={onAthleteClick} />
            </div>
          </section>
        ))}
      </div>
    </div>
  )
}
