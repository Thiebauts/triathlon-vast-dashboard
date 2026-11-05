// Pure computation — safe to import from both Server and Client Components
//
// Club records: the fastest adult club member on each course, men and women.

import { isFinisher, racesOverall } from './data.ts'
import { parseClock, SEASON_SPORTS } from './season.ts'
import type { AthleteResult, CompetitionsData, SportType } from './types'

/**
 * Where each championship has been raced. A course change starts a new record
 * list, since times on different courses can't be compared. Keep in line with
 * COURSES in season.ts (which decides what the season recap compares).
 */
export const COURSE_HISTORY: Record<SportType, Array<{ place: string; from: number; to?: number }>> = {
  triathlon: [{ place: 'Sätila', from: 2021, to: 2022 }, { place: 'Inseros', from: 2023 }],
  swimrun: [{ place: 'Sisjön', from: 2025, to: 2025 }, { place: 'Frökens udde', from: 2026 }],
  duathlon: [{ place: 'Gunnebo', from: 2021 }],
  swimming: [{ place: 'Delsjön', from: 2021 }],
  cycling: [{ place: 'Kungsbacka', from: 2021 }],
  running: [{ place: 'Åby / Slottsskogsvallen', from: 2021 }],
}

export interface RecordHolder { name: string; time: string; seconds: number; year: string }
export interface CourseRecords {
  sport: SportType
  place: string
  from: number
  /** Last year raced on this course; undefined while it is the current course. */
  to?: number
  men: RecordHolder | null
  women: RecordHolder | null
}

const inCourse = (year: string, c: { from: number; to?: number }) => Number(year) >= c.from && (c.to === undefined || Number(year) <= c.to)

function fastest(rows: AthleteResult[], cls: string): RecordHolder | null {
  let best: AthleteResult | null = null
  for (const a of rows) {
    if (a.class_lower !== cls) continue
    // Official (displayed) time decides; the earlier year keeps a tie
    if (!best || parseClock(a.Total_Time) < parseClock(best.Total_Time)
      || (parseClock(a.Total_Time) === parseClock(best.Total_Time) && a.Competition_Year < best.Competition_Year)) best = a
  }
  return best ? { name: best.Name, time: best.Total_Time, seconds: best.Total_Time_Seconds, year: best.Competition_Year } : null
}

/**
 * Records per sport and course, current course first. Only adult individual
 * club members who finished count (guests, youth and relay teams don't).
 */
export function getClubRecords(data: CompetitionsData): { current: CourseRecords[]; earlier: CourseRecords[] } {
  const current: CourseRecords[] = []
  const earlier: CourseRecords[] = []
  for (const sport of SEASON_SPORTS) {
    const field = data[sport].filter((a) => a.is_club_member && isFinisher(a) && racesOverall(a)
      && (a.class_lower === 'herr' || a.class_lower === 'dam'))
    for (const c of COURSE_HISTORY[sport]) {
      const rows = field.filter((a) => inCourse(a.Competition_Year, c))
      const rec: CourseRecords = { sport, place: c.place, from: c.from, to: c.to, men: fastest(rows, 'herr'), women: fastest(rows, 'dam') }
      if (c.to === undefined) current.push(rec)
      else if (rec.men || rec.women) earlier.push(rec)
    }
  }
  return { current, earlier }
}

/** People holding at least `min` current records in one gender, most first. */
export function multiRecordHolders(current: CourseRecords[], gender: 'men' | 'women', min = 2): Array<{ name: string; count: number }> {
  const counts = new Map<string, number>()
  for (const r of current) {
    const h = r[gender]
    if (h) counts.set(h.name, (counts.get(h.name) ?? 0) + 1)
  }
  return [...counts].filter(([, n]) => n >= min).map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count || a.name.localeCompare(b.name))
}
