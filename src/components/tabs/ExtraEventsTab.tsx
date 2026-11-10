'use client'
import { useMemo, useCallback, Fragment } from 'react'
import { t, tf } from '@/lib/translations'
import { BTN_PRIMARY, CARD_MIST, H_BLOCK, MEDAL_COLORS, PageTitle } from '@/components/ui/brand'
import { classLabel } from '@/lib/classes'
import { displayTime } from '@/lib/season'
import { athleteKey, computeSplitRanks, type SplitRanks } from '@/lib/data'
import { csvEscape, toCsvFile } from '@/lib/csv'
import { formatDate } from '@/lib/dates'
import type { AthleteResult, ExtraCategory, ExtraEvent, Lang } from '@/lib/types'

/** Same rank colours as the championship results: medal colours for 1–3, grey after. */
const rankColor = (n: number) => ({ color: MEDAL_COLORS[n - 1] ?? '#4a4e57' })

function RankCell({ n }: { n: number | undefined }) {
  if (!n) return <span className="text-muted text-[13px]">—</span>
  const weight = n <= 3 ? 'font-semibold' : 'font-normal'
  return <span style={rankColor(n)} className={`text-[13px] tabular-nums ${weight}`}>{n}</span>
}

/** Times read like everywhere else on the site: 14:35, not 00:14:35. */
function fmt(v: string | undefined) {
  return v && v !== 'N/A' ? displayTime(v) : '—'
}

/** Columns only shown from tablet width up. */
const D = 'hidden sm:table-cell'

/**
 * Class names behind each gender view. Children's events are split by age as
 * well as gender (Pojkar/Flickor, Ungdom herr/Ungdom Dam) rather than using the
 * adult Herr/Dam, so a gender view merges several classes — as the KM Results
 * tab's youth view does, each athlete keeps their own per-class rank and the
 * Class column shows which class it belongs to.
 */
const MEN_CLASSES = new Set(['herr', 'pojkar', 'ungdom herr'])
const WOMEN_CLASSES = new Set(['dam', 'flickor', 'ungdom dam'])

/**
 * Unlike the KM Results tab, 'all' includes every class: every entrant in an
 * extra event runs the same course, so there is no shorter youth course to
 * keep apart.
 */
function inCategory(a: AthleteResult, category: ExtraCategory): boolean {
  switch (category) {
    case 'men':   return MEN_CLASSES.has(a.class_lower)
    case 'women': return WOMEN_CLASSES.has(a.class_lower)
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

  // CSV order is already ranked-finishers-then-partials; the category filter
  // never reorders, so partials stay at the bottom.
  const rows = useMemo(
    () => (event ? event.results.filter((a) => inCategory(a, category)) : []),
    [event, category],
  )

  // A split nobody has a time for (e.g. no transitions timed in the children's
  // race) would be a column of dashes: leave it out
  const segs = useMemo(
    () => (event ? (FORMAT_SEGMENTS[event.format] ?? []) : []).filter((s) => rows.some((a) => ((a[s.secondsKey] as number | undefined) ?? 0) > 0)),
    [event, rows],
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
        csvEscape(a.is_club_member ? a.Club : t('guest', lang)),
        csvEscape(a.Class),
        csvEscape(isPartial ? completedLegsLabel(a, event, lang) : a.Total_Time),
        ...eventSegs.map((s) => csvEscape((a[s.timeKey] as string | undefined) ?? '')),
      ].join(','))
    })
    const blob = new Blob([toCsvFile(csvRows)], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `extra_${event.date}_${category}.csv`
    link.click()
    URL.revokeObjectURL(url)
  }, [event, rows, category, lang])

  return (
    <div className="flex flex-col gap-6">
      <PageTitle eyebrow={t('nav_group_other', lang)} title={t('extra_events_title', lang)} />
      <div className="-mt-2 max-w-[760px]">
        <p className="m-0 text-[15px] leading-relaxed">{t('extra_events_text1', lang)}</p>
        <p className="mb-0 mt-1.5 text-[15px] leading-relaxed text-muted">{t('extra_events_text2', lang)}</p>
      </div>

      {events.length === 0 ? (
        <div className={`${CARD_MIST} p-8 text-center text-[15px] text-muted`}>
          {t('no_extra_events', lang)}
        </div>
      ) : (
        <>
          {/* Filters */}
          <div className="flex flex-wrap items-end gap-4">
            {/* min-w-0 + w-full: a select is as wide as its longest option, and
                the event titles are long enough to overflow a phone screen */}
            <div className="min-w-0 max-w-full">
              <label htmlFor="extra-event" className="mb-1 block text-sm font-semibold text-navy">{t('select_event', lang)}</label>
              <select id="extra-event" value={event.file}
                onChange={(e) => {
                  const date = events.find((ev) => ev.file === e.target.value)?.date
                  if (date) onEventChange(date)
                }}
                className="h-12 w-full max-w-full truncate rounded border border-line bg-mist px-3 text-[15px] font-medium text-navy focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand">
                {events.map((e) => (
                  <option key={e.file} value={e.file}>{e.title[lang]} – {formatDate(e.date, lang)}</option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="extra-category" className="mb-1 block text-sm font-semibold text-navy">{t('select_category', lang)}</label>
              <select id="extra-category" value={category} onChange={(e) => onCategoryChange(e.target.value as ExtraCategory)}
                className="h-12 min-w-[130px] rounded border border-line bg-mist px-3 text-[15px] font-medium text-navy focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand">
                <option value="all">{t('overall', lang)}</option>
                <option value="men">{t('men_only', lang)}</option>
                <option value="women">{t('women_only', lang)}</option>
              </select>
            </div>
            <div className="flex flex-wrap items-center gap-3 ml-auto self-center">
              {event.location && <span className="text-sm text-muted">{event.location}</span>}
              <span className="text-sm text-muted" aria-live="polite">{tf(rows.length === 1 ? 'res_shown_one' : 'res_shown', lang, { n: rows.length })}</span>
              <button onClick={exportCsv}
                className={BTN_PRIMARY}>
                {t('export_csv', lang)}
              </button>
            </div>
          </div>

          {/* Event context: format, distances, who it's for (from the manifest) */}
          {event.description?.[lang] && (
            <div className="rounded-[4px_4px_40px_4px] bg-mist px-6 py-5">
              <h3 className={`${H_BLOCK} mb-1.5`}>{event.title[lang]} – {formatDate(event.date, lang)}</h3>
              <p className="m-0 text-[15px] leading-relaxed">{event.description[lang]}</p>
            </div>
          )}

          {segs.length > 0 && (
            <p className="text-[13px] text-muted sm:hidden px-1">{t('split_times_hint', lang)}</p>
          )}

          {/* Results table */}
          <div tabIndex={0} role="region" aria-label={event.title[lang]} className="overflow-x-auto focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand">
            {rows.length === 0 ? (
              <p className={`${CARD_MIST} m-0 p-8 text-center text-[15px] text-muted`}>{tf('res_empty', lang, { sport: event.title[lang] })}</p>
            ) : (
              <table className="min-w-full text-[15px]">
                <thead>
                  <tr className="text-left font-display text-sm text-white [&>th]:bg-navy">
                    <th scope="col" className="px-2 py-3 text-left font-semibold sm:px-3">{t('rank', lang)}</th>
                    <th scope="col" className="px-2 py-3 text-left font-semibold sm:px-3">{t('name', lang)}</th>
                    <th scope="col" className={`px-3 py-3 text-left font-semibold ${D}`}>{t('club', lang)}</th>
                    <th scope="col" className={`px-3 py-3 text-left font-semibold ${D}`}>{t('res_filter_category', lang)}</th>
                    {segs.map((s) => (
                      <Fragment key={s.labelKey}>
                        <th scope="col" className={`border-l border-[#3a4250] py-3 pl-2 pr-1 text-right font-semibold ${D}`}>{t(s.labelKey, lang)}</th>
                        <th scope="col" className={`py-3 pl-1 pr-2 text-right font-semibold text-[#c3c6d1] ${D}`}>
                          <span aria-hidden="true">#</span><span className="sr-only">{tf('res_split_rank', lang, { leg: t(s.labelKey, lang) })}</span>
                        </th>
                      </Fragment>
                    ))}
                    <th scope="col" className="border-l border-[#3a4250] px-2 py-3 text-right font-semibold sm:px-3">{t('res_time', lang)}</th>
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
                    const bg = i % 2 === 0 ? 'bg-white' : 'bg-[#f9f9fb]'
                    return (
                      <tr key={`${a.Name}-${i}`}
                        className={`${bg} border-b border-line hover:bg-mist`}>
                        <th scope="row" className="px-2 py-2.5 text-left font-display font-semibold tabular-nums sm:px-3">
                          {rank !== null
                            ? <span style={rankColor(rank)}>{rank}</span>
                            : <span className="text-muted font-normal">—</span>}
                        </th>
                        {/* Names wrap on phones so the time next to them always stays on screen */}
                        <td className="px-2 py-2.5 font-semibold text-navy sm:whitespace-nowrap sm:px-3">{a.Name}</td>
                        <td className={`px-3 py-2.5 text-muted ${D}`}>{a.is_club_member ? t('club_member_short', lang) : t('guest', lang)}</td>
                        <td className={`px-3 py-2.5 text-muted ${D}`}>{classLabel(a.Class, lang)}</td>
                        {segs.map((s) => (
                          <Fragment key={s.labelKey}>
                            <td className={`border-l border-line py-2.5 pl-2 pr-1 text-right tabular-nums ${D}`}>
                              {fmt(a[s.timeKey] as string | undefined)}
                            </td>
                            <td className={`py-2.5 pl-1 pr-2 text-right ${D}`}>
                              <RankCell n={sr[s.rankKey]} />
                            </td>
                          </Fragment>
                        ))}
                        <td className="border-l border-line px-2 py-2.5 text-right font-display font-semibold tabular-nums text-navy sm:px-3">
                          {isPartial
                            ? <span className="font-sans text-sm font-normal text-muted">{completedLegsLabel(a, event, lang)}</span>
                            : fmt(a.Total_Time)}
                        </td>
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
