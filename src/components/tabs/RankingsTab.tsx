'use client'
import { useMemo } from 'react'
import { t, tf } from '@/lib/translations'
import { H_BLOCK, H_SECTION, CARD_MIST, MEDAL_COLORS, PageTitle } from '@/components/ui/brand'
import { getClubRankings, pointsRanks } from '@/lib/data'
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
  const ranks = pointsRanks(data)
  return (
    <table className="w-full text-[15px]">
      <thead>
        <tr className="text-left font-display text-sm text-white">
          <th scope="col" className="w-12 bg-navy py-3 pl-3 pr-2 font-semibold sm:pl-4"><span aria-hidden="true">#</span><span className="sr-only">{t('rank', lang)}</span></th>
          <th scope="col" className="bg-navy px-2 py-3 font-semibold sm:px-3">{t('name', lang)}</th>
          <th scope="col" className="bg-navy px-2 py-3 text-right font-semibold sm:px-3">{t('rank_races', lang)}</th>
          <th scope="col" className="bg-navy py-3 pl-2 pr-3 text-right font-semibold sm:pr-4">{t('points', lang)}</th>
        </tr>
      </thead>
      <tbody>
        {data.map((a, i) => {
          const rank = ranks[i]
          return (
            <tr key={a.name} className={`border-b border-line ${i % 2 ? 'bg-[#f9f9fb]' : 'bg-white'} hover:bg-mist`}>
              <th scope="row" className="py-1.5 pl-3 pr-2 text-left font-display font-semibold tabular-nums sm:pl-4" style={{ color: MEDAL_COLORS[rank - 1] ?? '#4a4e57' }}>{rank}</th>
              <td className="px-2 py-1.5 sm:px-3">
                {onAthleteClick ? (
                  <button type="button" onClick={() => onAthleteClick(a.name)}
                    className="inline-flex min-h-9 items-center rounded text-left font-semibold text-navy hover:text-brand hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand">
                    {a.name}
                  </button>
                ) : <span className="font-semibold text-navy">{a.name}</span>}
              </td>
              <td className="px-2 py-1.5 text-right tabular-nums text-muted sm:px-3">{a.competitions.length}</td>
              <td className="py-1.5 pl-2 pr-3 text-right font-display font-semibold tabular-nums text-brand sm:pr-4">{a.total_points}</td>
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
      <div className="flex flex-col items-start gap-6">
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
        <h3 className={`${H_BLOCK} mb-1.5`}>{t('club_rankings_title', lang)}</h3>
        <p className="m-0 text-[15px] leading-relaxed">{t('club_rankings_text1', lang)}</p>
        <p className="mb-0 mt-1.5 text-[15px] leading-relaxed">{t('club_rankings_text2', lang)}</p>
      </section>

      <div className="grid gap-8 lg:grid-cols-2">
        {/* Men first, like every other page */}
        {([['mens_rankings', men], ['womens_rankings', women]] as const).map(([key, list]) => (
          <section key={key} aria-label={t(key, lang)} className="min-w-0">
            <h3 className={`${H_SECTION} mb-3`}>{t(key, lang)}</h3>
            {/* No scroll box: the four columns fit a phone, and the header stays in view while the page scrolls */}
            <RankTable data={list} lang={lang} onAthleteClick={onAthleteClick} />
          </section>
        ))}
      </div>
    </div>
  )
}
