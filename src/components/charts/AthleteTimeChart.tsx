'use client'
import { CartesianGrid, LabelList, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { t } from '@/lib/translations'
import type { Lang } from '@/lib/types'
import { INK, TOOLTIP_BOX, timeTicks } from './theme'

export interface TimePoint {
  year: string
  seconds: number
  /** Displayed time, e.g. "22:35". */
  time: string
  /** Place among club members of the same class, when there is one. */
  memberPlace: number | null
  memberField: number
  /** Raced on today's course as an adult, so it compares with the best. */
  comparable: boolean
  best: boolean
}

const BRAND = INK.brand
const NAVY = INK.navy
const GREY = '#a3a8ac'

/** "1:07:22" / "22:35" from seconds, for the axis (ticks are whole steps, so nothing is rounded away). */
function clock(sec: number) {
  const s = Math.floor(sec)
  const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), r = s % 60
  return h ? `${h}:${String(m).padStart(2, '0')}:${String(r).padStart(2, '0')}` : `${m}:${String(r).padStart(2, '0')}`
}

function Dot(props: { cx?: number; cy?: number; payload?: TimePoint }) {
  const { cx, cy, payload } = props
  if (cx === undefined || cy === undefined || !payload) return null
  const fill = payload.best ? BRAND : payload.comparable ? NAVY : GREY
  return <circle cx={cx} cy={cy} r={payload.best ? 8 : 6} fill={fill} stroke="#ffffff" strokeWidth={2} />
}

function TipBox({ active, payload, lang }: { active?: boolean; payload?: Array<{ payload: TimePoint }>; lang: Lang }) {
  if (!active || !payload?.length) return null
  const p = payload[0].payload
  return (
    <div className={TOOLTIP_BOX}>
      <div className="font-display text-base font-semibold">{p.year}: {p.time}</div>
      {p.memberPlace && <div>{t('ath_member_place', lang).replace('{n}', String(p.memberPlace)).replace('{m}', String(p.memberField))}</div>}
      {p.best && <div className="font-semibold text-[#ff9aa4]">{t('ath_best', lang)}</div>}
      {!p.comparable && <div className="text-[#c3c6d1]">{t('ath_not_comparable', lang)}</div>}
    </div>
  )
}

/**
 * Time per year in one sport. Lower is faster; the best time on today's
 * course is red, results that don't compare (old course, youth course) grey.
 */
export function AthleteTimeChart({ points, lang }: { points: TimePoint[]; lang: Lang }) {
  const secs = points.map((p) => p.seconds)
  const min = Math.min(...secs), max = Math.max(...secs)
  const pad = Math.max(30, (max - min) * 0.25)
  // Round, evenly spaced axis values (…15:00, 16:00, 17:00…)
  const ticks = timeTicks(min - pad, max + pad)
  // The line joins only results that compare (same course, adult class);
  // the others are shown as loose grey points.
  const rows = points.map((p) => ({ ...p, onCourse: p.comparable ? p.seconds : null }))
  return (
    <div>
      <div style={{ height: 300 }} aria-hidden="true">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={rows} margin={{ top: 32, right: 32, left: 8, bottom: 4 }} accessibilityLayer={false}>
            <CartesianGrid stroke="#e2e2e2" vertical={false} />
            <XAxis dataKey="year" tick={{ fill: '#4a4e57', fontSize: 14 }} tickLine={false} axisLine={{ stroke: '#e2e2e2' }} padding={{ left: 24, right: 24 }} />
            <YAxis domain={[ticks[0], ticks[ticks.length - 1]]} ticks={ticks} tickFormatter={clock} tick={{ fill: '#4a4e57', fontSize: 13 }} width={64} tickLine={false} axisLine={false} />
            <Tooltip content={<TipBox lang={lang} />} cursor={{ stroke: '#e2e2e2' }} offset={24} />
            <Line type="linear" dataKey="onCourse" stroke={NAVY} strokeWidth={2} dot={false} activeDot={false} connectNulls isAnimationActive={false} />
            <Line dataKey="seconds" stroke="none" dot={<Dot />} activeDot={false} isAnimationActive={false}>
              <LabelList dataKey="time" position="top" offset={12} style={{ fill: NAVY, fontSize: 14, fontWeight: 600 }} />
            </Line>
          </LineChart>
        </ResponsiveContainer>
      </div>
      {/* The same numbers as text, for screen readers */}
      <ul className="sr-only">
        {points.map((p) => <li key={p.year}>{p.year}: {p.time}{p.best ? `, ${t('ath_best', lang)}` : ''}</li>)}
      </ul>
      <p className="mb-0 mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted">
        <span>{t('ath_lower_faster', lang)}</span>
        <span className="inline-flex items-center gap-1.5"><span className="inline-block h-3 w-3 rounded-full" style={{ background: BRAND }} />{t('ath_best', lang)}</span>
        {points.some((p) => !p.comparable) && (
          <span className="inline-flex items-center gap-1.5"><span className="inline-block h-3 w-3 rounded-full" style={{ background: GREY }} />{t('ath_not_comparable', lang)}</span>
        )}
      </p>
    </div>
  )
}
