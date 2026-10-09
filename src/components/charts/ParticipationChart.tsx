'use client'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts'
import type { Lang } from '@/lib/types'
import { t } from '@/lib/translations'

const SPORT_COLORS: Record<string, string> = {
  triathlon: '#d32f2f',
  duathlon:  '#f57c00',
  swimming:  '#1976d2',
  cycling:   '#388e3c',
  running:   '#7b1fa2',
  swimrun:   '#00838f',
}

const SPORTS = ['triathlon', 'duathlon', 'swimming', 'cycling', 'running', 'swimrun'] as const

interface Props {
  data: Array<{ year: string; triathlon: number; duathlon: number; swimming: number; cycling: number; running: number; swimrun: number }>
  lang: Lang
}

export function ParticipationChart({ data, lang }: Props) {
  return (
    <>
      {/* Screen readers can't read the bars: they get the same figures as a table */}
      <ResponsiveContainer width="100%" height={320} aria-label={t('participation_chart_label', lang)}>
        <BarChart data={data} margin={{ top: 10, right: 20, left: 0, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="year" tick={{ fontSize: 13 }} />
          <YAxis tick={{ fontSize: 13 }} />
          <Tooltip />
          <Legend />
          {SPORTS.map((s) => (
            <Bar key={s} dataKey={s} name={t(s, lang)} stackId="a" fill={SPORT_COLORS[s]} />
          ))}
        </BarChart>
      </ResponsiveContainer>
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
    </>
  )
}
