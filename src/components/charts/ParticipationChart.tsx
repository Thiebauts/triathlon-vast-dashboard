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

interface Props {
  data: Array<{ year: string; triathlon: number; duathlon: number; swimming: number; cycling: number; running: number; swimrun: number }>
  lang: Lang
}

export function ParticipationChart({ data, lang }: Props) {
  const sports = ['triathlon', 'duathlon', 'swimming', 'cycling', 'running', 'swimrun']
  return (
    <ResponsiveContainer width="100%" height={320} aria-label="Participation trends by sport and year">
      <BarChart data={data} margin={{ top: 10, right: 20, left: 0, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="year" tick={{ fontSize: 13 }} />
        <YAxis tick={{ fontSize: 13 }} />
        <Tooltip />
        <Legend />
        {sports.map((s) => (
          <Bar key={s} dataKey={s} name={t(s, lang)} stackId="a" fill={SPORT_COLORS[s]} />
        ))}
      </BarChart>
    </ResponsiveContainer>
  )
}
