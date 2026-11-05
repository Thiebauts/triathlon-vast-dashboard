'use client'
import { useMemo } from 'react'
import { t, tf } from '@/lib/translations'
import { calculateClubMemberRank, calculatePoints, isFinisher, racesOverall } from '@/lib/data'
import { SEASON_SPORTS, displayTime } from '@/lib/season'
import type { CompetitionsData, Lang } from '@/lib/types'
import { CARD, CARD_MIST, Eyebrow, MEDAL_COLORS, PageTitle } from '@/components/ui/brand'

interface Props {
  data: CompetitionsData
  lang: Lang
  /** Race day per "<sport>-<year>", to pick the latest race as the example. */
  raceDates: Record<string, string>
}

const RULES = ['members', 'gender', 'adults', 'finish', 'ties', 'season'] as const
const PLACES = Array.from({ length: 32 }, (_, i) => i + 1)

export function PointsTab({ data, lang, raceDates }: Props) {
  // The example: women in the most recent championship, with the first guest
  // among them if there is one, so the "members only" rule is visible.
  const example = useMemo(() => {
    const latest = SEASON_SPORTS
      .map((sport) => {
        const year = Object.keys(raceDates).filter((k) => k.startsWith(`${sport}-`)).map((k) => k.split('-')[1]).sort().at(-1)
        return year ? { sport, year, date: raceDates[`${sport}-${year}`] } : null
      })
      .filter((r): r is NonNullable<typeof r> => r !== null)
      .sort((a, b) => b.date.localeCompare(a.date))[0]
    if (!latest) return null
    const yearGroup = data[latest.sport].filter((a) => a.Competition_Year === latest.year)
    const women = yearGroup
      .filter((a) => a.class_lower === 'dam' && isFinisher(a) && racesOverall(a))
      .sort((a, b) => a.Total_Time_Seconds - b.Total_Time_Seconds)
    const firstGuest = women.findIndex((a) => !a.is_club_member)
    const count = Math.max(6, firstGuest >= 0 && firstGuest < 10 ? firstGuest + 2 : 0)
    const rows = women.slice(0, count).map((a, i) => {
      const rank = a.is_club_member ? calculateClubMemberRank(a, yearGroup) : null
      return { name: a.Name, finish: i + 1, time: a.Total_Time, rank, points: rank ? calculatePoints(rank) : null }
    })
    return { ...latest, rows }
  }, [data, raceDates])

  return (
    <div className="flex flex-col gap-10">
      <PageTitle eyebrow={t('pts_eyebrow', lang)} title={t('pts_title', lang)} subtitle={t('pts_subtitle', lang)} />

      <section aria-labelledby="pts-table">
        <h3 id="pts-table" className="mb-2 mt-0 font-display text-[30px] font-semibold text-navy">{t('pts_table_title', lang)}</h3>
        <p className="mb-5 mt-0 max-w-[720px] text-[15px] leading-relaxed">{t('pts_table_text', lang)}</p>
        <ol className="m-0 grid list-none grid-cols-4 gap-2 p-0 sm:grid-cols-8">
          {PLACES.map((n) => (
            <li key={n} className={`flex flex-col items-center rounded-[4px_4px_14px_4px] py-2 ${n <= 3 ? 'bg-navy text-white' : 'bg-mist'}`}>
              <span className={`text-xs font-semibold ${n <= 3 ? 'text-[#c3c6d1]' : 'text-muted'}`}>{tf('pts_place', lang, { n })}</span>
              <span className={`font-display text-2xl font-semibold ${n <= 3 ? 'text-white' : 'text-brand'}`}>{calculatePoints(n)}</span>
            </li>
          ))}
        </ol>
      </section>

      <section aria-labelledby="pts-rules">
        <h3 id="pts-rules" className="mb-4 mt-0 font-display text-[30px] font-semibold text-navy">{t('pts_rules_title', lang)}</h3>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {RULES.map((r) => (
            <div key={r} className={`${CARD_MIST} px-6 py-5`}>
              <h4 className="mb-1.5 mt-0 font-display text-xl font-semibold text-navy">{t(`pts_rule_${r}_t`, lang)}</h4>
              <p className="m-0 text-[15px] leading-relaxed">{t(`pts_rule_${r}`, lang)}</p>
            </div>
          ))}
        </div>
      </section>

      {example && example.rows.length > 0 && (
        <section aria-labelledby="pts-example" className={`${CARD} bg-white px-6 py-6 ring-1 ring-line`}>
          <Eyebrow>{t('pts_example_eyebrow', lang)}</Eyebrow>
          <h3 id="pts-example" className="mb-1.5 mt-1 font-display text-[26px] font-semibold text-navy">
            {tf('pts_example_title', lang, { sport: t(example.sport, lang), year: example.year })}
          </h3>
          <p className="mb-4 mt-0 text-[15px] text-muted">{t('pts_example_text', lang)}</p>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[480px] text-[15px]">
              <thead>
                <tr className="text-left font-display text-sm text-white [&>th]:static [&>th]:bg-navy">
                  <th scope="col" className="px-4 py-3 font-semibold">{t('pts_col_finish', lang)}</th>
                  <th scope="col" className="px-3 py-3 font-semibold">{t('name', lang)}</th>
                  <th scope="col" className="px-3 py-3 font-semibold">{t('time', lang)}</th>
                  <th scope="col" className="px-3 py-3 font-semibold">{t('pts_col_member', lang)}</th>
                  <th scope="col" className="px-4 py-3 text-right font-semibold">{t('points', lang)}</th>
                </tr>
              </thead>
              <tbody>
                {example.rows.map((r) => (
                  <tr key={r.name} className={`border-b border-line ${r.rank ? '' : 'bg-mist'}`}>
                    <td className="px-4 py-2.5 tabular-nums text-muted">{r.finish}</td>
                    <th scope="row" className="px-3 py-2.5 text-left font-semibold text-navy">{r.name}</th>
                    <td className="px-3 py-2.5 tabular-nums">{displayTime(r.time)}</td>
                    <td className="px-3 py-2.5 font-display font-semibold" style={{ color: r.rank ? (MEDAL_COLORS[r.rank - 1] ?? '#212934') : undefined }}>
                      {r.rank ?? <span className="font-sans font-normal italic text-muted">{t('pts_guest_note', lang)}</span>}
                    </td>
                    <td className="px-4 py-2.5 text-right font-display font-semibold text-brand">{r.points ?? <span className="text-muted">—</span>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      <p className="m-0 text-[15px] text-muted">{t('pts_wrong', lang)}</p>
    </div>
  )
}
