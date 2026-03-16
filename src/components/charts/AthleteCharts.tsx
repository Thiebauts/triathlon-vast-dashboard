'use client'
import { useState, useMemo } from 'react'
import {
  ComposedChart, Area, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer,
} from 'recharts'
import type { Lang, SportType, CompetitionsData } from '@/lib/types'
import { t } from '@/lib/translations'

const RED  = '#d32f2f'
const BLUE = '#4A7FA5'
const BAND = '#9CA3AF'

// Fixed widths so both charts have identical plot-area widths
const LEFT_W  = 38   // rank axis (short integers)
const RIGHT_W = 58   // time axis (labels like "1h21")

// Shared outer margins
const MARGIN = { top: 8, right: 12, left: 12, bottom: 4 }

// Axis tick: round to nearest minute → "Xh YY" (e.g. "0h34", "1h21")
function fmtTickTime(totalSeconds: number): string {
  const mins = Math.round(totalSeconds / 60)
  const h = Math.floor(mins / 60)
  const m = mins % 60
  return `${h}h${String(m).padStart(2, '0')}`
}

// Tooltip: exact "H:MM:SS" or "MM:SS"
function fmtExactTime(seconds: number): string {
  const s = Math.round(seconds)
  if (s <= 0) return '—'
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  const sec = s % 60
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`
  return `${m}:${String(sec).padStart(2, '0')}`
}

interface RankChartProps {
  events: Record<string, {
    type: string; year: string; rank: number | string
    time_seconds: number; time: string
    gender_class: string; class_total: number
  }>
  allData: CompetitionsData
  lang: Lang
}

export function AthleteRankChart({ events, allData, lang }: RankChartProps) {
  const availableSports = [...new Set(Object.values(events).map((e) => e.type as SportType))].sort()
  const [sport, setSport] = useState<string>(availableSports[0] ?? 'triathlon')
  const [prevSports, setPrevSports] = useState(availableSports)

  if (availableSports.join() !== prevSports.join()) {
    setPrevSports(availableSports)
    setSport(availableSports[0] ?? 'triathlon')
  }

  const allYears = useMemo(() => {
    const years = new Set<string>()
    for (const athletes of Object.values(allData)) {
      for (const a of athletes) years.add(a.Competition_Year)
    }
    return [...years].sort()
  }, [allData])

  // Athlete's own data for the selected sport
  const byYear: Record<string, { rank: number; time_seconds: number; gender_class: string }> = {}
  for (const e of Object.values(events)) {
    if (e.type !== sport) continue
    const r = typeof e.rank === 'number' ? e.rank : parseInt(String(e.rank), 10)
    if (!r || isNaN(r) || r <= 0) continue
    byYear[e.year] = { rank: r, time_seconds: e.time_seconds, gender_class: e.gender_class }
  }

  // Derive athlete class for this sport (use any year that has data)
  const athleteClass = Object.values(byYear)[0]?.gender_class ?? null

  // Class-wide stats for ALL years where the sport was held (independent of athlete participation)
  const classStats: Record<string, { minTime: number; maxTime: number; classSize: number }> = {}
  if (athleteClass) {
    for (const year of allYears) {
      const peers = allData[sport as SportType].filter(
        (a) => a.Competition_Year === year
          && a.Class === athleteClass
          && a.Total_Time_Seconds > 0
          && a.Status?.toLowerCase() === 'ok',
      )
      if (!peers.length) continue
      const times = peers.map((a) => a.Total_Time_Seconds)
      classStats[year] = { minTime: Math.min(...times), maxTime: Math.max(...times), classSize: peers.length }
    }
  }

  const hasAthlete = Object.keys(byYear).length > 0
  const hasBand    = Object.keys(classStats).length > 0

  // ── Domains ──────────────────────────────────────────────────────────────────
  const allSizes    = Object.values(classStats).map((s) => s.classSize)
  const maxRank     = allSizes.length ? Math.max(...allSizes) : 10
  // Rank domain: 1 at top, maxRank at bottom (no top padding — rank 1 should be at the very edge)
  const rankDomain: [number, number] = [1, maxRank + Math.max(1, Math.round(maxRank * 0.05))]

  const allMin      = Object.values(classStats).map((s) => s.minTime)
  const allMax      = Object.values(classStats).map((s) => s.maxTime)
  const globalBest  = allMin.length ? Math.min(...allMin) : 0
  const globalWorst = allMax.length ? Math.max(...allMax) : 0
  const timePad     = Math.max(Math.round((globalWorst - globalBest) * 0.05), 60)
  // Time domain: best time at top (smallest seconds), worst time at bottom
  const timeDomain: [number, number] = [Math.max(0, globalBest - timePad), globalWorst + timePad]

  // ── Data rows (fixed 2021–2025 X-axis) ───────────────────────────────────────
  const data = allYears.map((year) => {
    const s = classStats[year]
    return {
      year,
      rank:         byYear[year]?.rank ?? null,
      time_seconds: (byYear[year]?.time_seconds ?? 0) > 0 ? byYear[year].time_seconds : null,
      classSize:    s?.classSize ?? null,
      classMinTime: s?.minTime   ?? null,
      classMaxTime: s?.maxTime   ?? null,
    }
  })

  if (!hasAthlete && !hasBand) return (
    <div>
      <SportButtons sports={availableSports} selected={sport} onSelect={setSport} lang={lang} />
      <p className="text-gray-400 text-xs text-center py-8">No data</p>
    </div>
  )

  return (
    <div>
      <SportButtons sports={availableSports} selected={sport} onSelect={setSport} lang={lang} />

      {/* ── Rank chart ─────────────────────────────────────────────────────── */}
      <p className="text-[10px] text-gray-400 uppercase tracking-wide mb-1">{t('class_rank', lang)}</p>
      <ResponsiveContainer width="100%" height={160}>
        <ComposedChart data={data} margin={MARGIN}>
          {/*
            Band: fills from classSize down toward baseValue=1 (the top of the reversed axis).
            With reversed axis, rank 1 is at the TOP. Area fills between classSize and 1,
            creating a grey stripe that spans the class performance range each year.
          */}
          <Area
            yAxisId="rank" type="linear" dataKey="classSize" baseValue={1}
            fill={BAND} fillOpacity={0.18} stroke={BAND} strokeOpacity={0.45} strokeWidth={1}
            legendType="none" connectNulls isAnimationActive={false}
          />
          {/* Grid rendered after the band so lines are visible on top of the fill */}
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
          <XAxis dataKey="year" tick={false} axisLine={false} tickLine={false} />
          {/* Left axis for rank (fixed width for alignment with time chart's left axis) */}
          <YAxis yAxisId="rank" orientation="left" width={RIGHT_W}
            reversed allowDecimals={false} domain={rankDomain}
            allowDataOverflow tick={{ fontSize: 11 }} />
          {/* Hidden right placeholder to match the time chart's right placeholder */}
          <YAxis yAxisId="rph" orientation="right" width={LEFT_W} hide />
          <Tooltip
            formatter={(value, name) => {
              if (name === 'rank')      return [`${value}`, t('class_rank', lang)]
              if (name === 'classSize') return [`${value}`, t('class_size', lang)]
              return null
            }}
          />
          <Line yAxisId="rank" type="linear" dataKey="rank" name="rank"
            stroke={RED} strokeWidth={2} dot={{ r: 4, fill: RED }} connectNulls isAnimationActive={false} />
        </ComposedChart>
      </ResponsiveContainer>

      {/* ── Time chart ─────────────────────────────────────────────────────── */}
      <p className="text-[10px] text-gray-400 uppercase tracking-wide mt-3 mb-1">{t('total_time', lang)}</p>
      <ResponsiveContainer width="100%" height={180}>
        <ComposedChart data={data} margin={MARGIN}>
          {/*
            Band: "cover" technique for a stripe between classMinTime and classMaxTime.
            With reversed axis, classMinTime (best/smallest) is near the TOP.
            Step 1 – gray area from classMaxTime up to baseValue=timeDomain[0] (chart top):
              fills the entire upper region (from the worst class time all the way to the top) in gray.
            Step 2 – white area from classMinTime up to baseValue=timeDomain[0] (chart top):
              covers the "above the band" region with white, leaving only the band visible.
            Grid lines are drawn AFTER so they remain visible on top of the white cover.
          */}
          <Area
            yAxisId="time" type="linear" dataKey="classMaxTime" baseValue={timeDomain[0]}
            fill={BAND} fillOpacity={0.22} stroke={BAND} strokeOpacity={0.45} strokeWidth={1}
            legendType="none" connectNulls isAnimationActive={false}
          />
          <Area
            yAxisId="time" type="linear" dataKey="classMinTime" baseValue={timeDomain[0]}
            fill="white" fillOpacity={1} stroke={BAND} strokeOpacity={0.45} strokeWidth={1}
            legendType="none" connectNulls isAnimationActive={false}
          />
          {/* Grid on top of white fill so lines stay visible */}
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
          <XAxis dataKey="year" tick={{ fontSize: 11 }} />
          {/* Left axis for time (fixed width for alignment) */}
          <YAxis yAxisId="time" orientation="left" width={RIGHT_W}
            reversed domain={timeDomain}
            allowDataOverflow tickFormatter={(v) => fmtTickTime(v as number)}
            tick={{ fontSize: 11 }} />
          {/* Hidden right placeholder to match the rank chart's right placeholder width */}
          <YAxis yAxisId="tph" orientation="right" width={LEFT_W} hide />
          <Tooltip
            formatter={(value, name) => {
              if (name === 'time_seconds') return [fmtExactTime(value as number), t('total_time', lang)]
              if (name === 'classMinTime') return [fmtExactTime(value as number), t('class_best', lang)]
              if (name === 'classMaxTime') return [fmtExactTime(value as number), t('class_worst', lang)]
              return null
            }}
          />
          <Line yAxisId="time" type="linear" dataKey="time_seconds" name="time_seconds"
            stroke={BLUE} strokeWidth={2}
            dot={{ r: 4, fill: BLUE }} connectNulls isAnimationActive={false} />
        </ComposedChart>
      </ResponsiveContainer>

      {/* Legend */}
      <div className="flex flex-wrap gap-4 justify-center mt-2">
        <span className="flex items-center gap-1 text-[10px] text-gray-500">
          <span className="inline-block w-5 h-0.5 bg-red-700 rounded" />
          {t('class_rank', lang)}
        </span>
        <span className="flex items-center gap-1 text-[10px] text-gray-500">
          <span className="inline-block w-5 h-0.5 bg-[#4A7FA5] rounded" />
          {t('total_time', lang)}
        </span>
        <span className="flex items-center gap-1 text-[10px] text-gray-500">
          <span className="inline-block w-5 h-3 rounded-sm bg-gray-400/30 border border-gray-400/50" />
          {t('class_range', lang)}
        </span>
      </div>
    </div>
  )
}

// ── Sport filter buttons ──────────────────────────────────────────────────────

function SportButtons({ sports, selected, onSelect, lang }: {
  sports: string[]; selected: string; onSelect: (s: string) => void; lang: Lang
}) {
  return (
    <div className="flex flex-wrap gap-1 mb-3">
      {sports.map((s) => (
        <button
          key={s}
          onClick={() => onSelect(s)}
          className={`px-2 py-0.5 text-[10px] rounded border font-medium transition-colors ${
            selected === s
              ? 'bg-red-700 text-white border-red-700'
              : 'bg-white text-gray-500 border-gray-200 hover:border-gray-400'
          }`}
        >
          {t(s, lang)}
        </button>
      ))}
    </div>
  )
}
