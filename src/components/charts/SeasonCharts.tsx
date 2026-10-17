'use client'
// Season recap figures. Plain HTML bars rather than Recharts: they stay
// legible at phone width, carry their numbers as visible text (the youth
// colour is below 3:1 against white, so colour never stands alone) and need
// no client-side chart library.
import { t, tf } from '@/lib/translations'
import { displayTime, type Improvement, type RaceSummary } from '@/lib/season'
import type { Lang } from '@/lib/types'

// Validated categorical palette (dataviz skill, light surface): fixed order.
const COLOR = { men: '#2a78d6', women: '#eb6834', youth: '#1baf7a', relay: '#888780' } as const
const PREVIOUS = '#888780'
const CURRENT = '#2a78d6'

/** 2001 → "33:21", 4861 → "1:21:01" (truncated, like every time on the site). */
export function clock(seconds: number): string {
  const s = Math.floor(seconds)
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  const ss = String(s % 60).padStart(2, '0')
  return h ? `${h}:${String(m).padStart(2, '0')}:${ss}` : `${m}:${ss}`
}

function Legend({ items }: { items: Array<{ color: string; label: string; round?: boolean }> }) {
  return (
    <div className="flex flex-wrap gap-x-4 gap-y-1 mb-2 text-[11px] text-gray-600">
      {items.map((i) => (
        <span key={i.label} className="flex items-center gap-1.5">
          <span aria-hidden="true" className={`inline-block w-2.5 h-2.5 ${i.round ? 'rounded-full' : 'rounded-sm'}`} style={{ background: i.color }} />
          {i.label}
        </span>
      ))}
    </div>
  )
}

/** One stacked bar per race (men / women / youth / relay runners) with a marker for last year's starts. */
export function ParticipationBars({ races, year, lang }: { races: RaceSummary[]; year: string; lang: Lang }) {
  const prevYear = String(Number(year) - 1)
  const max = Math.max(...races.map((r) => Math.max(r.starts.total, r.startsPreviousYear ?? 0)))
  const rows = races.map((r) => {
    const { men, women, youth, total } = r.starts
    return {
      race: r,
      segments: [
        { key: 'men', n: men, color: COLOR.men, label: t('season_men', lang) },
        { key: 'women', n: women, color: COLOR.women, label: t('season_women', lang) },
        { key: 'youth', n: youth, color: COLOR.youth, label: t('season_youth', lang) },
        { key: 'relay', n: total - men - women - youth, color: COLOR.relay, label: t('season_relay', lang) },
      ].filter((s) => s.n > 0),
    }
  })
  return (
    <div>
      <Legend items={[
        { color: COLOR.men, label: t('season_men', lang) },
        { color: COLOR.women, label: t('season_women', lang) },
        { color: COLOR.youth, label: t('season_youth', lang) },
        { color: COLOR.relay, label: t('season_relay', lang) },
        { color: '#1f2937', label: tf('season_prev_year_marker', lang, { y: prevYear }) },
      ]} />
      <div aria-hidden="true" className="space-y-2.5">
        {rows.map(({ race, segments }) => (
          <div key={race.sport} className="grid grid-cols-[4.5rem_minmax(0,1fr)_4.5rem] sm:grid-cols-[6rem_minmax(0,1fr)_6rem] items-center gap-x-2">
            <span className="text-xs text-gray-700 truncate">{t(race.sport, lang)}</span>
            <div className="relative h-5">
              <div className="flex h-full">
                {segments.map((s, i) => (
                  <div
                    key={s.key}
                    title={`${s.label}: ${s.n}`}
                    className={i === segments.length - 1 ? 'rounded-r' : ''}
                    style={{
                      width: `${(s.n / max) * 100}%`,
                      background: s.color,
                      borderRight: i === segments.length - 1 ? undefined : '2px solid #fff',
                    }}
                  />
                ))}
              </div>
              {race.startsPreviousYear && (
                <div
                  title={`${tf('season_prev_year_marker', lang, { y: prevYear })}: ${race.startsPreviousYear}`}
                  className="absolute -top-0.5 -bottom-0.5 w-0.5 bg-gray-800"
                  style={{ left: `calc(${(race.startsPreviousYear / max) * 100}% - 1px)` }}
                />
              )}
            </div>
            <span className="text-xs text-gray-700 tabular-nums">
              <strong>{race.starts.total}</strong>
              {race.startsPreviousYear && <span className="text-gray-500"> ({race.startsPreviousYear})</span>}
            </span>
            {/* Every segment's number in text: colour never carries it alone */}
            <span className="col-start-2 col-span-2 mt-1 text-[11px] text-gray-500 tabular-nums">
              {segments.map((s) => `${s.n} ${s.label.toLowerCase()}`).join(' · ')}
            </span>
          </div>
        ))}
      </div>
      {/* sr-only on a wrapper: a <table> ignores the 1px width and widens the page */}
      <div className="sr-only">
        <table>
          <caption>{t('season_participation', lang)}</caption>
          <thead>
            <tr>
              <th scope="col">{t('season_race', lang)}</th>
              <th scope="col">{t('season_men', lang)}</th>
              <th scope="col">{t('season_women', lang)}</th>
              <th scope="col">{t('season_youth', lang)}</th>
              <th scope="col">{t('season_relay', lang)}</th>
              <th scope="col">{t('total', lang)}</th>
              <th scope="col">{tf('season_prev_year_marker', lang, { y: prevYear })}</th>
            </tr>
          </thead>
          <tbody>
            {races.map((r) => (
              <tr key={r.sport}>
                <th scope="row">{t(r.sport, lang)}</th>
                <td>{r.starts.men}</td>
                <td>{r.starts.women}</td>
                <td>{r.starts.youth}</td>
                <td>{r.starts.total - r.starts.men - r.starts.women - r.starts.youth}</td>
                <td>{r.starts.total}</td>
                <td>{r.startsPreviousYear ?? '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

/** Members by number of championships raced (1…n). */
export function MembersPerRaceCount({ racesPerMember, raceCount, lang }: {
  racesPerMember: Record<number, number>; raceCount: number; lang: Lang
}) {
  const counts = Array.from({ length: raceCount }, (_, i) => racesPerMember[i + 1] ?? 0)
  const max = Math.max(1, ...counts)
  return (
    <div>
      <div aria-hidden="true" className="flex items-end gap-2 h-32 border-b border-gray-300">
        {counts.map((n, i) => (
          <div key={i} className="flex-1 flex flex-col items-center justify-end h-full" title={`${i + 1} ${t('season_loyalty_races', lang)}: ${n} ${t('season_loyalty_members', lang)}`}>
            <span className="text-[11px] text-gray-700 tabular-nums mb-0.5">{n}</span>
            <div className="w-full max-w-[2.5rem] rounded-t" style={{ height: `${(n / max) * 85}%`, minHeight: n ? 2 : 0, background: CURRENT }} />
          </div>
        ))}
      </div>
      <div aria-hidden="true" className="flex gap-2 mt-1">
        {counts.map((_, i) => <span key={i} className="flex-1 text-center text-[11px] text-gray-500 tabular-nums">{i + 1}</span>)}
      </div>
      <p aria-hidden="true" className="text-center text-[11px] text-gray-500">{t('season_loyalty_races', lang)}</p>
      <div className="sr-only">
        <table>
          <caption>{t('season_loyalty', lang)}</caption>
          <thead><tr><th scope="col">{t('season_loyalty_races', lang)}</th><th scope="col">{t('season_loyalty_members', lang)}</th></tr></thead>
          <tbody>{counts.map((n, i) => <tr key={i}><th scope="row">{i + 1}</th><td>{n}</td></tr>)}</tbody>
        </table>
      </div>
    </div>
  )
}

const TICK_STEPS = [15, 30, 60, 120, 300, 600, 900, 1800]

/** Previous best (grey) → this season (blue), one row per member who set a personal best. */
export function PersonalBestChart({ pbs, year, lang, onAthleteClick }: {
  pbs: Improvement[]; year: string; lang: Lang; onAthleteClick?: (name: string) => void
}) {
  const lo = Math.min(...pbs.map((p) => p.seconds))
  const hi = Math.max(...pbs.map((p) => p.previousBest.seconds))
  const pad = Math.max(10, (hi - lo) * 0.06)
  const min = lo - pad
  const max = hi + pad
  const step = TICK_STEPS.find((s) => (max - min) / s <= 5) ?? 3600
  const ticks: number[] = []
  for (let v = Math.ceil(min / step) * step; v <= max; v += step) ticks.push(v)
  const pos = (sec: number) => `${((sec - min) / (max - min)) * 100}%`
  // Phones: name and gain on one line, the track full width below it.
  // Wider: name | track | gain in one row.
  const grid = 'grid grid-cols-[minmax(0,1fr)_auto] sm:grid-cols-[10rem_minmax(0,1fr)_6rem] items-center gap-x-2'
  const trackCell = 'col-span-2 order-last sm:col-span-1 sm:order-none'

  return (
    <div>
      <Legend items={[
        { color: PREVIOUS, label: t('season_pb_prev', lang), round: true },
        { color: CURRENT, label: year, round: true },
      ]} />
      <ul className="space-y-2 sm:space-y-1">
        {pbs.map((p) => (
          <li key={p.name} className={grid}>
            {onAthleteClick ? (
              <button onClick={() => onAthleteClick(p.name)}
                className="min-h-6 text-left text-xs text-gray-800 truncate hover:text-red-700 hover:underline focus-visible:ring-2 focus-visible:ring-red-700 focus-visible:ring-offset-1 rounded">
                {p.name}
              </button>
            ) : <span className="text-xs text-gray-800 truncate">{p.name}</span>}
            <div className={`relative h-5 ${trackCell}`} aria-hidden="true">
              {ticks.map((v) => <div key={v} className="absolute top-0 bottom-0 w-px bg-gray-100" style={{ left: pos(v) }} />)}
              <div className="absolute top-1/2 h-0.5 -translate-y-1/2 bg-gray-300" style={{ left: pos(p.seconds), width: `calc(${pos(p.previousBest.seconds)} - ${pos(p.seconds)})` }} />
              <span title={`${t('season_pb_prev', lang)}: ${displayTime(p.previousBest.time)} (${p.previousBest.year})`}
                className="absolute top-1/2 w-2.5 h-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full ring-2 ring-white" style={{ left: pos(p.previousBest.seconds), background: PREVIOUS }} />
              <span title={`${year}: ${displayTime(p.time)}`}
                className="absolute top-1/2 w-2.5 h-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full ring-2 ring-white" style={{ left: pos(p.seconds), background: CURRENT }} />
            </div>
            <span className="text-right leading-tight">
              <span className="text-xs font-semibold text-gray-800 tabular-nums sm:block">−{clock(p.gain)}</span>
              <span className="text-[11px] text-gray-500 sm:block"><span className="sm:hidden"> · </span>{tf('season_pb_best_year', lang, { y: p.previousBest.year })}</span>
            </span>
          </li>
        ))}
      </ul>
      <div className={`${grid} mt-1`} aria-hidden="true">
        <span className="hidden sm:block" />
        <div className={`relative h-4 ${trackCell}`}>
          {ticks.map((v) => (
            <span key={v} className="absolute -translate-x-1/2 text-[11px] text-gray-500 tabular-nums" style={{ left: pos(v) }}>{clock(v)}</span>
          ))}
        </div>
        <span className="hidden sm:block" />
      </div>
    </div>
  )
}
