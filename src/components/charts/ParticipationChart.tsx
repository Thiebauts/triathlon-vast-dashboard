'use client'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import type { Lang } from '@/lib/types'
import { t } from '@/lib/translations'
import { INK, SPORT_COLOR, TOOLTIP_BOX } from './theme'

const SPORTS = ['triathlon', 'duathlon', 'swimming', 'cycling', 'running', 'swimrun'] as const
type Row = { year: string } & Record<typeof SPORTS[number], number>

interface Props {
  data: Row[]
  lang: Lang
}

function TipBox({ active, payload, label, lang }: { active?: boolean; payload?: Array<{ payload: Row }>; label?: string; lang: Lang }) {
  if (!active || !payload?.length) return null
  const row = payload[0].payload
  const raced = SPORTS.filter((s) => row[s] > 0)
  return (
    <div className={TOOLTIP_BOX}>
      <div className="font-display text-base font-semibold">{label}: {raced.reduce((n, s) => n + row[s], 0)}</div>
      {raced.map((s) => (
        <div key={s} className="flex items-center gap-2">
          <span aria-hidden="true" className="inline-block h-2.5 w-2.5 rounded-sm" style={{ background: SPORT_COLOR[s] }} />
          <span className="flex-1">{t(s, lang)}</span>
          <span className="tabular-nums">{row[s]}</span>
        </div>
      ))}
    </div>
  )
}

/** Starts per year, stacked by sport. */
export function ParticipationChart({ data, lang }: Props) {
  return (
    <figure className="m-0" aria-label={t('participation_chart_label', lang)}>
      {/* Legend in the page's own text colour: the swatch carries the series, never the text */}
      <ul aria-hidden="true" className="m-0 mb-3 flex list-none flex-wrap gap-x-4 gap-y-1 p-0 text-sm text-muted">
        {SPORTS.map((s) => (
          <li key={s} className="flex items-center gap-1.5">
            <span className="inline-block h-3 w-3 rounded-sm" style={{ background: SPORT_COLOR[s] }} />{t(s, lang)}
          </li>
        ))}
      </ul>
      {/* Screen readers can't read the bars: they get the same figures as the table below */}
      <div aria-hidden="true">
        <ResponsiveContainer width="100%" height={320}>
          <BarChart data={data} margin={{ top: 10, right: 8, left: 0, bottom: 5 }} accessibilityLayer={false} barCategoryGap="28%">
            <CartesianGrid stroke={INK.line} vertical={false} />
            <XAxis dataKey="year" tick={{ fill: INK.text, fontSize: 14 }} tickLine={false} axisLine={{ stroke: INK.line }} />
            <YAxis tick={{ fill: INK.text, fontSize: 13 }} tickLine={false} axisLine={false} width={40} />
            <Tooltip content={<TipBox lang={lang} />} cursor={{ fill: '#f2f3f5' }} />
            {SPORTS.map((s) => (
              // White outline = the 2px gap that keeps neighbouring segments apart
              <Bar key={s} dataKey={s} name={t(s, lang)} stackId="a" fill={SPORT_COLOR[s]} stroke="#ffffff" strokeWidth={2} isAnimationActive={false} />
            ))}
          </BarChart>
        </ResponsiveContainer>
      </div>
      {/* sr-only on a wrapper: a <table> ignores the 1px width and would
          widen the page on phones */}
      <div className="sr-only">
        <table>
          <caption>{t('participation_table_caption', lang)}</caption>
          <thead>
            <tr>
              <th scope="col">{t('year', lang)}</th>
              {SPORTS.map((s) => <th key={s} scope="col">{t(s, lang)}</th>)}
              <th scope="col">{t('total', lang)}</th>
            </tr>
          </thead>
          <tbody>
            {data.map((row) => (
              <tr key={row.year}>
                <th scope="row">{row.year}</th>
                {SPORTS.map((s) => <td key={s}>{row[s]}</td>)}
                <td>{SPORTS.reduce((sum, s) => sum + row[s], 0)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </figure>
  )
}
