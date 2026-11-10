// Pure computation — safe to import from both Server and Client Components
//
// Per-race extras for the Results page: the PB / Debut tag on each finisher
// and the "fastest of the day" for men and women (finish time and splits).

import { athleteKey, isFinisher, isReliableSplit, splitUpperBound, isRelay, racesOverall } from './data.ts'
import { sameCourse } from './courses.ts'
import { parseClock } from './season.ts'
import type { AthleteResult, SportType } from './types'

export type ResultTag = 'pb' | 'debut'

const isAdult = (a: AthleteResult) => a.class_lower === 'herr' || a.class_lower === 'dam'

/**
 * Tag per finisher of one race (keyed by athleteKey):
 * - 'debut': the athlete's first start in this championship sport (any year, any class);
 * - 'pb': an adult result faster than the athlete's best earlier adult result
 *   on the same course (official HH:MM:SS times, so 23:35 vs 23:35 is no PB).
 * Relay teams get no tag. `rows` is every result of the sport, all years.
 */
export function getResultTags(rows: AthleteResult[], sport: SportType, year: string): Map<string, ResultTag> {
  const out = new Map<string, ResultTag>()
  for (const a of rows) {
    if (a.Competition_Year !== year || !isFinisher(a) || isRelay(a)) continue
    const earlier = rows.filter((b) => b.Name === a.Name && b.Competition_Year < year)
    if (earlier.length === 0) {
      out.set(athleteKey(a), 'debut')
      continue
    }
    if (!isAdult(a)) continue
    const best = earlier
      .filter((b) => isFinisher(b) && isAdult(b) && sameCourse(sport, b.Competition_Year, year))
      .reduce<number | null>((m, b) => {
        const s = parseClock(b.Total_Time)
        return m === null || s < m ? s : m
      }, null)
    if (best !== null && parseClock(a.Total_Time) < best) out.set(athleteKey(a), 'pb')
  }
  return out
}

export type LegKey = 'finish' | 'swim' | 'bike' | 'run' | 'run1' | 'run2'
export interface FastestEntry { name: string; time: string; guest: boolean }
export interface FastestLeg { leg: LegKey; men: FastestEntry | null; women: FastestEntry | null }

const LEGS: Record<SportType, Array<{ leg: LegKey; time: keyof AthleteResult; secs: keyof AthleteResult }>> = {
  triathlon: [
    { leg: 'swim', time: 'Swim_Time', secs: 'Swim_Seconds' },
    { leg: 'bike', time: 'Bike_Time', secs: 'Bike_Seconds' },
    { leg: 'run', time: 'Run_Time', secs: 'Run_Seconds' },
  ],
  duathlon: [
    { leg: 'run1', time: 'Run1_Time', secs: 'Run1_Seconds' },
    { leg: 'bike', time: 'Bike_Time', secs: 'Bike_Seconds' },
    { leg: 'run2', time: 'Run2_Time', secs: 'Run2_Seconds' },
  ],
  swimming: [], cycling: [], running: [], swimrun: [],
}

/**
 * Fastest finish and fastest split of one race, separately for men and women.
 * Only adult individual finishers count (youth race a shorter course, relay
 * teams share it); guests count too — it is the fastest of the day — and are
 * flagged so the page can say so.
 */
export function getFastestOfDay(rows: AthleteResult[], sport: SportType, year: string): FastestLeg[] {
  const field = rows.filter((a) => a.Competition_Year === year && isFinisher(a) && racesOverall(a) && isAdult(a))
  const pick = (cls: string, time: keyof AthleteResult, secs: keyof AthleteResult): FastestEntry | null => {
    let best: AthleteResult | null = null
    // The most an athlete WITHOUT a usable split can have taken (see splitUpperBound)
    let unknownAtMost = Infinity
    for (const a of field) {
      if (a.class_lower !== cls) continue
      // A split that swallowed a missed timing mat is not a real split time
      if (secs !== 'Total_Time_Seconds' && !isReliableSplit(a, secs, sport as 'triathlon' | 'duathlon')) {
        unknownAtMost = Math.min(unknownAtMost, splitUpperBound(a, secs, sport as 'triathlon' | 'duathlon') ?? Infinity)
        continue
      }
      const s = Number(a[secs]) || 0
      if (s <= 0) continue
      if (!best || s < (Number(best[secs]) || 0)) best = a
    }
    // Someone whose split wasn't recorded was certainly faster: the fastest is unknown
    if (best && unknownAtMost < (Number(best[secs]) || 0)) return null
    return best ? { name: best.Name, time: String(best[time] ?? ''), guest: !best.is_club_member } : null
  }
  const legs = [{ leg: 'finish' as LegKey, time: 'Total_Time' as keyof AthleteResult, secs: 'Total_Time_Seconds' as keyof AthleteResult }, ...LEGS[sport]]
  return legs.map(({ leg, time, secs }) => ({ leg, men: pick('herr', time, secs), women: pick('dam', time, secs) }))
}
