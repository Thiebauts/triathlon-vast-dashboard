'use client'
import { useMemo, useCallback, Fragment } from 'react'
import { t } from '@/lib/translations'
import { athleteKey, computeSplitRanks, type SplitRanks } from '@/lib/data'
import { csvEscape } from '@/lib/csv'
import type { AthleteResult, ExtraCategory, ExtraEvent, Lang } from '@/lib/types'

const MEDAL = {
  1: { color: '#B8970A' },
  2: { color: '#7A8FA6' },
  3: { color: '#9E6B3F' },
} as Record<number, { color: string }>

function RankCell({ n }: { n: number | undefined }) {
  if (!n) return <span className="text-gray-400 text-[11px]">—</span>
  const style = MEDAL[n] ?? { color: '#9CA3AF' }
  const weight = n <= 3 ? 'font-semibold' : 'font-normal'
  return <span style={style} className={`text-[11px] tabular-nums ${weight}`}>{n}</span>
}

function fmt(v: string | undefined) {
  return v && v !== 'N/A' ? v : '—'
}

/** "10 juni 2026" / "10 June 2026" — parsed as local date parts to avoid the
 *  UTC-midnight day shift `new Date('YYYY-MM-DD')` can produce. */
function formatEventDate(iso: string, lang: Lang): string {
  const [y, m, d] = iso.split('-').map(Number)
  return new Intl.DateTimeFormat(lang === 'sv' ? 'sv-SE' : 'en-GB', {
    day: 'numeric', month: 'long', year: 'numeric',
  }).format(new Date(y, m - 1, d))
}

const D = 'hidden sm:table-cell'

/**
 * Unlike the KM Results tab, 'all' includes every class: training events run
 * one shared course, so there is no shorter youth course to keep apart.
 */
function inCategory(a: AthleteResult, category: ExtraCategory): boolean {
  switch (category) {
    case 'men':   return a.class_lower === 'herr'
    case 'women': return a.class_lower === 'dam'
    case 'all':   return true
  }
}

/** Segment columns per event format. Extra formats can be added as needed. */
const FORMAT_SEGMENTS: Record<string, Array<{ timeKey: keyof AthleteResult; secondsKey: keyof AthleteResult; rankKey: keyof SplitRanks; labelKey: string }>> = {
  triathlon: [
    { timeKey: 'Swim_Time', secondsKey: 'Swim_Seconds', rankKey: 'swim', labelKey: 'swim' },
    { timeKey: 'T1_Time',   secondsKey: 'T1_Seconds',   rankKey: 't1',   labelKey: 't1' },
    { timeKey: 'Bike_Time', secondsKey: 'Bike_Seconds', rankKey: 'bike', labelKey: 'bike' },
    { timeKey: 'T2_Time',   secondsKey: 'T2_Seconds',   rankKey: 't2',   labelKey: 't2' },
    { timeKey: 'Run_Time',  secondsKey: 'Run_Seconds',  rankKey: 'run',  labelKey: 'run' },
  ],
  duathlon: [
    { timeKey: 'Run1_Time', secondsKey: 'Run1_Seconds', rankKey: 'run1', labelKey: 'run_1' },
    { timeKey: 'T1_Time',   secondsKey: 'T1_Seconds',   rankKey: 't1',   labelKey: 't1' },
    { timeKey: 'Bike_Time', secondsKey: 'Bike_Seconds', rankKey: 'bike', labelKey: 'bike' },
    { timeKey: 'T2_Time',   secondsKey: 'T2_Seconds',   rankKey: 't2',   labelKey: 't2' },
    { timeKey: 'Run2_Time', secondsKey: 'Run2_Seconds', rankKey: 'run2', labelKey: 'run_2' },
  ],
}

const TRANSITIONS = new Set(['t1', 't2'])

/** "Sim + Löp"-style label of the legs a partial participant completed. */
function completedLegsLabel(a: AthleteResult, event: ExtraEvent, lang: Lang): string {
  const segs = FORMAT_SEGMENTS[event.format] ?? []
  return segs
    .filter((s) => !TRANSITIONS.has(s.labelKey)) // legs only, not transitions
    .filter((s) => ((a[s.secondsKey] as number | undefined) ?? 0) > 0)
    .map((s) => t(s.labelKey, lang))
    .join(' + ')
}

interface Props {
  events: ExtraEvent[]
  lang: Lang
  /**
   * Event date and category are owned by the Dashboard (controlled) so the
   * URL can mirror the full selection: #extra/<date>/<category>.
   */
  eventDate: string | null
  category: ExtraCategory
  onEventChange: (date: string) => void
  onCategoryChange: (category: ExtraCategory) => void
}

export function ExtraEventsTab({ events, lang, eventDate, category, onEventChange, onCategoryChange }: Props) {
  // events arrive newest first — fall back to the most recent
  const event = useMemo(
    () => events.find((e) => e.date === eventDate) ?? events[0],
    [events, eventDate],
  )

  const segs = event ? (FORMAT_SEGMENTS[event.format] ?? []) : []

  // CSV order is already ranked-finishers-then-partials; the category filter
  // never reorders, so partials stay at the bottom.
  const rows = useMemo(
    () => (event ? event.results.filter((a) => inCategory(a, category)) : []),
    [event, category],
  )

  // Split ranks share the SAME pool as the visible rows, mirroring the KM
  // Results tab. Partial participants are in the pool on purpose: ranking the
  // legs they did against the full field is what makes their row useful.
  const splitRankLookup = useMemo(() => {
    if (!event || (event.format !== 'triathlon' && event.format !== 'duathlon')) return null
    const out: Record<string, SplitRanks> = {}
    computeSplitRanks(rows, event.format).forEach((v, k) => { out[k] = v })
    return out
  }, [event, rows])

  // Mirrors the visible table: rank within the selected category, partials
  // with their legs label instead of a total.
  const exportCsv = useCallback(() => {
    if (!event) return
    const eventSegs = FORMAT_SEGMENTS[event.format] ?? []
    const headers = [
      category === 'all' ? t('overall_rank', lang) : t('class_rank', lang),
      t('name', lang), t('club', lang), t('gender', lang), t('total_time', lang),
      ...eventSegs.map((s) => t(s.labelKey, lang)),
    ]
    const csvRows = [headers.map(csvEscape).join(',')]
    rows.forEach((a) => {
      const isPartial = a.Status === 'partial'
      const csvRank = category === 'all' ? a.Overall_Rank : a.Class_Rank
      csvRows.push([
        csvEscape(!isPartial && csvRank > 0 ? csvRank : ''),
        csvEscape(a.Name),
        csvEscape(a.Club),
        csvEscape(a.Class),
        csvEscape(isPartial ? completedLegsLabel(a, event, lang) : a.Total_Time),
        ...eventSegs.map((s) => csvEscape((a[s.timeKey] as string | undefined) ?? '')),
      ].join(','))
    })
    const blob = new Blob([csvRows.join('\n')], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `extra_${event.date}_${category}.csv`
    link.click()
    URL.revokeObjectURL(url)
  }, [event, rows, category, lang])

  return (
    <div className="space-y-3">
      <div className="bg-white rounded-lg shadow-sm border border-gray-100 px-4 py-3">
        <h2 className="text-sm font-semibold text-red-700 mb-0.5">{t('extra_events_title', lang)}</h2>
        <p className="text-xs text-gray-500 leading-relaxed">{t('extra_events_text1', lang)}</p>
        <p className="text-xs text-gray-500 leading-relaxed mt-1">{t('extra_events_text2', lang)}</p>
      </div>

      {events.length === 0 ? (
        <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-8 text-center text-xs text-gray-400">
          {t('no_extra_events', lang)}
        </div>
      ) : (
        <>
          {/* Filters */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-100 px-4 py-2.5 flex flex-wrap items-end gap-4">
            <div>
              <label htmlFor="extra-event" className="block text-[11px] font-medium text-gray-500 uppercase tracking-wide mb-1">{t('select_event', lang)}</label>
              <select id="extra-event" value={event.file}
                onChange={(e) => {
                  const date = events.find((ev) => ev.file === e.target.value)?.date
                  if (date) onEventChange(date)
                }}
                className="border border-gray-200 rounded px-2 py-1 text-xs bg-white focus-visible:ring-2 focus-visible:ring-red-700 focus-visible:ring-offset-1">
                {events.map((e) => (
                  <option key={e.file} value={e.file}>{e.title[lang]} — {formatEventDate(e.date, lang)}</option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="extra-category" className="block text-[11px] font-medium text-gray-500 uppercase tracking-wide mb-1">{t('select_category', lang)}</label>
              <select id="extra-category" value={category} onChange={(e) => onCategoryChange(e.target.value as ExtraCategory)}
                className="border border-gray-200 rounded px-2 py-1 text-xs bg-white focus-visible:ring-2 focus-visible:ring-red-700 focus-visible:ring-offset-1">
                <option value="all">{t('overall', lang)}</option>
                <option value="men">{t('men_only', lang)}</option>
                <option value="women">{t('women_only', lang)}</option>
              </select>
            </div>
            <div className="flex items-center gap-3 ml-auto self-center">
              {event.location && <span className="text-xs text-gray-500">📍 {event.location}</span>}
              <span className="text-xs text-gray-500" aria-live="polite">{rows.length} {t('total_results', lang)}</span>
              <button onClick={exportCsv}
                className="text-[11px] text-gray-500 hover:text-red-700 border border-gray-200 rounded px-2 py-0.5 transition-colors focus-visible:ring-2 focus-visible:ring-red-700 focus-visible:ring-offset-1">
                {t('export_csv', lang)}
              </button>
            </div>
          </div>

          {/* Event context: format, distances, who it's for (from the manifest) */}
          {event.description?.[lang] && (
            <div className="bg-white rounded-lg shadow-sm border border-gray-100 px-4 py-3">
              <h3 className="text-xs font-semibold text-gray-700 mb-0.5">{event.title[lang]} — {formatEventDate(event.date, lang)}</h3>
              <p className="text-xs text-gray-500 leading-relaxed">{event.description[lang]}</p>
            </div>
          )}

          {segs.length > 0 && (
            <p className="text-[11px] text-gray-500 sm:hidden px-1">{t('split_times_hint', lang)}</p>
          )}

          {/* Results table */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-100 overflow-x-auto">
            {rows.length === 0 ? (
              <p className="p-8 text-center text-xs text-gray-400">{t('no_data_available', lang)} {t(event.format, lang)}</p>
            ) : (
              <table className="min-w-full text-xs">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200 text-[11px] uppercase tracking-wider text-gray-500">
                    <th scope="col" className="px-3 py-2 text-left font-semibold">
                      {category === 'all' ? t('overall_rank', lang) : t('class_rank', lang)}
                    </th>
                    <th scope="col" className="px-3 py-2 text-left font-semibold">{t('name', lang)}</th>
                    <th scope="col" className={`px-3 py-2 text-left font-semibold ${D}`}>{t('club', lang)}</th>
                    <th scope="col" className={`px-3 py-2 text-left font-semibold ${D}`}>{t('gender', lang)}</th>
                    <th scope="col" className="px-3 py-2 text-left font-semibold">{t('total_time', lang)}</th>
                    {segs.map((s) => (
                      <Fragment key={s.labelKey}>
                        <th scope="col" className={`px-2 py-2 text-left font-semibold border-l border-gray-100 ${D}`}>{t(s.labelKey, lang)}</th>
                        <th scope="col" className={`px-2 py-2 text-center font-semibold text-gray-300 ${D}`}>#</th>
                      </Fragment>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {rows.map((a, i) => {
                    const isPartial = a.Status === 'partial'
                    // Class_Rank from the CSV is the rank within Herr/Dam, so
                    // single-gender views renumber without recomputation.
                    const csvRank = category === 'all' ? a.Overall_Rank : a.Class_Rank
                    const rank = !isPartial && csvRank > 0 ? csvRank : null
                    const sr = splitRankLookup?.[athleteKey(a)] ?? {}
                    const bg = rank === 1 ? 'bg-amber-50/60'
                             : rank === 2 ? 'bg-slate-50/80'
                             : rank === 3 ? 'bg-orange-50/50'
                             : a.is_club_member ? 'bg-red-50/30'
                             : i % 2 === 0 ? 'bg-white' : 'bg-gray-50/40'
                    return (
                      <tr key={`${a.Name}-${i}`}
                        className={`${bg} border-b border-gray-100 hover:bg-blue-50/20 transition-colors`}>
                        <th scope="row" className="px-3 py-1.5 font-semibold tabular-nums">
                          {rank !== null
                            ? <span style={MEDAL[rank] ?? { color: '#6B7280' }}>{rank}</span>
                            : <span className="text-gray-400 font-normal">—</span>}
                        </th>
                        <td className="px-3 py-1.5 whitespace-nowrap font-medium text-gray-800">{a.Name}</td>
                        <td className={`px-3 py-1.5 text-gray-500 ${D}`}>{a.Club}</td>
                        <td className={`px-3 py-1.5 text-gray-500 ${D}`}>{a.Class}</td>
                        <td className="px-3 py-1.5 font-mono font-semibold text-gray-800">
                          {isPartial
                            ? <span className="font-sans font-normal text-gray-400">{completedLegsLabel(a, event, lang)}</span>
                            : fmt(a.Total_Time)}
                        </td>
                        {segs.map((s) => (
                          <Fragment key={s.labelKey}>
                            <td className={`px-2 py-1.5 font-mono text-gray-500 border-l border-gray-100 ${D}`}>
                              {fmt(a[s.timeKey] as string | undefined)}
                            </td>
                            <td className={`px-2 py-1.5 text-center ${D}`}>
                              <RankCell n={sr[s.rankKey]} />
                            </td>
                          </Fragment>
                        ))}
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            )}
          </div>
        </>
      )}
    </div>
  )
}
