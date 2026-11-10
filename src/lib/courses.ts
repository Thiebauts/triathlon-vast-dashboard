// Pure computation — safe to import from both Server and Client Components
//
// Where each championship has been raced. The single source of truth for
// "which times can be compared": records, personal bests and all-time lists
// only ever compare results from the same course.

import type { SportType } from './types'

export interface Course { place: string; from: number; to?: number }

/** A course change starts a new record list; the last entry is today's course. */
export const COURSE_HISTORY: Record<SportType, Course[]> = {
  triathlon: [{ place: 'Sätila', from: 2021, to: 2022 }, { place: 'Inseros', from: 2023 }],
  swimrun: [{ place: 'Sisjön', from: 2025, to: 2025 }, { place: 'Frökens udde', from: 2026 }],
  duathlon: [{ place: 'Gunnebo', from: 2021 }],
  swimming: [{ place: 'Delsjön', from: 2021 }],
  cycling: [{ place: 'Kungsbacka', from: 2021 }],
  // Always a 5 km track race (Åby or Slottsskogsvallen: same distance)
  running: [{ place: 'Åby / Slottsskogsvallen', from: 2021 }],
}

/** First year of the course a sport is raced on today (times before it don't compare). */
export function currentCourseFrom(sport: SportType): number {
  return COURSE_HISTORY[sport][COURSE_HISTORY[sport].length - 1].from
}

export const inCourse = (year: string | number, c: Course) => Number(year) >= c.from && (c.to === undefined || Number(year) <= c.to)

/** Position in COURSE_HISTORY of the course raced that year (the current course for an unknown year). */
export function courseIndex(sport: SportType, year: string | number): number {
  const i = COURSE_HISTORY[sport].findIndex((c) => inCourse(year, c))
  return i === -1 ? COURSE_HISTORY[sport].length - 1 : i
}

/** The course a sport was raced on that year. */
export function courseOf(sport: SportType, year: string | number): Course {
  return COURSE_HISTORY[sport][courseIndex(sport, year)]
}

/** Whether two years of a sport were raced on the same course (so their times compare). */
export function sameCourse(sport: SportType, a: string | number, b: string | number): boolean {
  return courseIndex(sport, a) === courseIndex(sport, b)
}
