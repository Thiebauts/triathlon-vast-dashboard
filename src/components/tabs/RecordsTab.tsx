'use client'
import { useMemo } from 'react'
import { t, tf } from '@/lib/translations'
import { getClubRecords, multiRecordHolders, type RecordHolder } from '@/lib/records'
import { SEASON_YEARS, displayTime } from '@/lib/season'
import type { CompetitionsData, Lang, SportType } from '@/lib/types'
import { H_BLOCK, H_SECTION, CARD_MIST, CARD_NAVY, Eyebrow, LINK_BTN, PageTitle } from '@/components/ui/brand'

interface Props {
  data: CompetitionsData
  lang: Lang
  onAthleteClick?: (name: string) => void
  /** Opens Results for the sport with every year (the all-time list). */
  onAllTime?: (sport: SportType) => void
}

export function RecordsTab({ data, lang, onAthleteClick, onAllTime }: Props) {
  const { current, earlier } = useMemo(() => getClubRecords(data), [data])
  const holders = useMemo(() => ({
    women: multiRecordHolders(current, 'women'),
    men: multiRecordHolders(current, 'men'),
  }), [current])
  const latest = SEASON_YEARS[0]

  const name = (h: RecordHolder) => onAthleteClick
    ? <button type="button" onClick={() => onAthleteClick(h.name)} className="rounded text-left font-semibold text-navy hover:text-brand hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand">{h.name}</button>
    : <span className="font-semibold text-navy">{h.name}</span>

  const holderLines = [
    ...holders.women.map((h) => tf('rec_holds_women', lang, { name: h.name, n: h.count, total: current.length })),
    ...holders.men.map((h) => tf('rec_holds_men', lang, { name: h.name, n: h.count, total: current.length })),
  ]

  return (
    <div className="flex flex-col gap-9">
      <div className="flex flex-wrap items-start justify-between gap-x-10 gap-y-6">
        <PageTitle eyebrow={t('rec_eyebrow', lang)} title={t('rec_title', lang)} subtitle={t('rec_subtitle', lang)} />
        {holderLines.length > 0 && (
          <div className={`${CARD_NAVY} max-w-[380px] px-6 py-5`}>
            <Eyebrow light className="text-xl">{t('rec_holders', lang)}</Eyebrow>
            {holderLines.map((l) => <p key={l} className="mb-0 mt-1 text-[15px] leading-relaxed">{l}</p>)}
          </div>
        )}
      </div>

      <section className="grid gap-5 md:grid-cols-2">
        {current.map((r) => (
          <article key={r.sport} className={`${CARD_MIST} flex flex-col gap-1 px-6 pb-6 pt-5`}>
            <div className="flex items-baseline justify-between gap-3">
              <h3 className={H_BLOCK}>{t(r.sport, lang)}</h3>
              {onAllTime && (
                <button type="button" onClick={() => onAllTime(r.sport)} aria-label={`${t(r.sport, lang)}: ${t('rec_all_time', lang)}`} className={`${LINK_BTN} text-sm`}>
                  {t('rec_all_time', lang)}
                </button>
              )}
            </div>
            <p className="mb-2 mt-0 text-sm leading-normal text-muted">
              {t(`discipline_${r.sport}_desc`, lang)}
            </p>
            <dl className="m-0">
              {(['men', 'women'] as const).map((g) => {
                const h = r[g]
                // "New" only when it beat an earlier record, not on a course's first year
                const isNew = h && h.year === latest && r.from < Number(latest)
                return (
                  <div key={g} className="grid grid-cols-[minmax(0,1fr)_auto] items-baseline gap-x-3 border-t border-line py-2.5 sm:grid-cols-[72px_minmax(0,1fr)_auto]">
                    <dt className="text-[13px] font-bold uppercase tracking-[0.06em] text-muted max-sm:col-span-2">{t(g, lang)}</dt>
                    {h ? (
                      <>
                        <dd className="m-0 min-w-0 break-words">{name(h)}<span className="block text-[13px] text-muted">{h.year}</span></dd>
                        <dd className="m-0 flex flex-col items-end gap-0.5">
                          <span className="font-display text-2xl font-semibold leading-tight text-brand">{displayTime(h.time)}</span>
                          {isNew && (
                            <span className="inline-flex h-[22px] items-center rounded-[2px_2px_8px_2px] bg-brand px-2 font-display text-xs font-semibold text-white">
                              {tf('rec_new', lang, { year: latest })}
                            </span>
                          )}
                        </dd>
                      </>
                    ) : (
                      <dd className="col-span-2 m-0 text-sm text-muted">{t('rec_none', lang)}</dd>
                    )}
                  </div>
                )
              })}
            </dl>
          </article>
        ))}
      </section>

      {earlier.length > 0 && (
        <section aria-labelledby="rec-earlier">
          <h3 id="rec-earlier" className={`${H_SECTION} mb-1.5`}>{t('rec_earlier', lang)}</h3>
          <p className="mb-3 mt-0 text-[15px] text-muted">{t('rec_earlier_text', lang)}</p>
          <div tabIndex={0} role="region" aria-label={t('rec_earlier', lang)} className="overflow-x-auto focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand">
            <table className="w-full text-[15px]">
              <thead>
                <tr className="text-left font-display text-sm text-white">
                  <th scope="col" className="bg-navy px-2 py-3 font-semibold sm:px-4">{t('rec_course', lang)}</th>
                  <th scope="col" className="bg-navy px-2 py-3 font-semibold sm:px-4">{t('men', lang)}</th>
                  <th scope="col" className="bg-navy px-2 py-3 font-semibold sm:px-4">{t('women', lang)}</th>
                </tr>
              </thead>
              <tbody>
                {earlier.map((r) => (
                  <tr key={`${r.sport}-${r.place}`} className="border-b border-line">
                    {/* Race and course share a cell and each record stacks, so the table fits a phone */}
                    <th scope="row" className="px-2 py-3 text-left align-top font-normal sm:px-4">
                      <span className="block font-semibold text-navy">{t(r.sport, lang)}</span>
                      <span className="block text-sm text-muted">{r.place}, {r.from === r.to ? r.from : `${r.from}–${r.to}`}</span>
                    </th>
                    {[r.men, r.women].map((h, i) => (
                      <td key={i} className="px-2 py-3 align-top sm:px-4">
                        {h ? <>
                          <strong className="block font-display text-navy">{displayTime(h.time)}</strong>
                          <span className="block text-sm">{h.name} ({h.year})</span>
                        </> : '—'}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
      <p className="m-0 text-sm text-muted">{t('rec_note', lang)}</p>
    </div>
  )
}
