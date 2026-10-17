// Pure computation — safe to import from both Server and Client Components
//
// Season recap: participation, club podiums, course records, improvements
// and a few fun facts for one year of club championships. One function feeds
// the Season tab, the members' email and the review table, so every published
// number comes from the same code.

import { getClubRankings, isFinisher, isRelay, racesOverall } from './data.ts'
import type { AthleteResult, CompetitionsData, SportType } from './types'

/** Seasons published on the Season tab, newest first — add a year once its numbers are checked. */
export const SEASON_YEARS: readonly string[] = ['2026']

export const SEASON_SPORTS: readonly SportType[] = ['cycling', 'duathlon', 'swimming', 'triathlon', 'swimrun', 'running']

/**
 * Which years are comparable for records and improvements. A time only counts
 * against times set on the same course.
 * - triathlon: 2021–22 were raced at Sätila; Inseros from 2023 on.
 * - swimrun: moved from Sisjön (2025) to a three-lap course at Frökens udde (2026).
 * - running: always a 5 km track race (Åby or Slottsskogsvallen: same distance).
 */
export const COURSES: Record<SportType, { since?: number; excluded?: boolean }> = {
  cycling: {},
  duathlon: {},
  swimming: {},
  running: {},
  triathlon: { since: 2023 },
  swimrun: { excluded: true },
}

type Gender = 'men' | 'women'
const GENDER_CLASS: Record<Gender, string> = { men: 'herr', women: 'dam' }

export interface PodiumEntry { name: string; time: string; seconds: number }
export interface RecordEntry {
  gender: Gender
  name: string; time: string; seconds: number
  /** The record the season's time beat. */
  previous: { name: string; time: string; seconds: number; year: string }
}
/** Fastest club time ever on the course, up to and including the season. */
export interface CourseRecord {
  name: string; time: string; seconds: number; year: string
  /** Set during this season (then also listed in `records` with the time it beat). */
  setThisSeason: boolean
}
export interface Improvement {
  name: string; gender: Gender
  time: string; seconds: number
  /** Best time in an earlier comparable year. */
  previousBest: { time: string; seconds: number; year: string }
  /** Whole seconds faster than the previous best, from the official times (always > 0). */
  gain: number
}
export interface RaceSummary {
  sport: SportType
  starts: { total: number; members: number; guests: number; men: number; women: number; youth: number; relayTeams: number }
  /** Club members only, fastest first. */
  podium: Record<Gender, PodiumEntry[]>
  /** A guest faster than the club winner, per gender (shown as a note). */
  fasterGuest: Partial<Record<Gender, PodiumEntry>>
  /** Course records broken this season (beat an earlier club record); null when the course isn't comparable. */
  records: RecordEntry[] | null
  /** Current course record per gender (set this season or earlier); null when not comparable. */
  courseRecords: Record<Gender, CourseRecord | null> | null
  /**
   * Every member who beat their best earlier comparable time, biggest gain
   * first (the first three are the race's top improvements); null when the
   * course isn't comparable.
   */
  personalBests: Improvement[] | null
  /** Comparable member results (raced the course before). */
  comparable: number
  startsPreviousYear: number | null
}
export interface SeasonSummary {
  year: string
  /** Every start counts, relay team members included (a relay counts as its runners). */
  participations: { total: number; members: number; guests: number; youth: number }
  people: { total: number; members: number; guests: number }
  races: RaceSummary[]
  /** Members who raced every championship this season (individually). */
  everyRace: string[]
  /** Members by number of championships raced: { 1: 32, 2: 17, … }. */
  racesPerMember: Record<number, number>
  /** Members whose first club championship ever was this season (= newcomers.members.length). */
  newMembers: number
  /** Everyone (relay runners included) whose first club championship ever was this season. */
  newcomers: { members: string[]; guests: string[] }
  /** Participations and different people per year, up to and including this season. */
  history: Array<{ year: string; races: number; starts: number; people: number }>
  pointsPodium: Record<Gender, Array<{ name: string; points: number }>>
}

/** Runners of a relay team, from "Team name (A / B / C)". */
export function relayRunners(teamName: string): string[] {
  const m = teamName.match(/\(([^)]*)\)\s*$/)
  return m ? m[1].split('/').map((s) => s.trim()).filter(Boolean) : []
}

/** "01:22:20" → 4940: whole seconds of an official (displayed) time. */
export function parseClock(time: string): number {
  return time.split(':').reduce((acc, part) => acc * 60 + (parseInt(part, 10) || 0), 0)
}

/** "00:23:35" → "23:35", "01:22:20" → "1:22:20": the official time, without leading zeros. */
export function displayTime(time: string): string {
  return time.replace(/^00:/, '').replace(/^0(\d)/, '$1')
}

/** The people behind one result: the athlete, or a relay team's runners. */
function peopleOf(a: AthleteResult): string[] {
  return isRelay(a) ? relayRunners(a.Name) : [a.Name]
}

function isComparableYear(sport: SportType, year: string): boolean {
  const c = COURSES[sport]
  return !c.excluded && (!c.since || Number(year) >= c.since)
}

/** Adult individual finisher (Herr/Dam, not youth, not relay). */
function adultFinisher(a: AthleteResult): boolean {
  return isFinisher(a) && racesOverall(a) && (a.class_lower === 'herr' || a.class_lower === 'dam')
}

const genderOf = (a: AthleteResult): Gender => (a.class_lower === 'dam' ? 'women' : 'men')
const entry = (a: AthleteResult): PodiumEntry => ({ name: a.Name, time: a.Total_Time, seconds: a.Total_Time_Seconds })
const fastestFirst = (a: AthleteResult, b: AthleteResult) => a.Total_Time_Seconds - b.Total_Time_Seconds

function summarizeRace(sport: SportType, rows: AthleteResult[], year: string): RaceSummary {
  const season = rows.filter((a) => a.Competition_Year === year)
  const individual = season.filter((a) => !isRelay(a))
  const relays = season.filter(isRelay)
  const comparable = isComparableYear(sport, year)

  const podium = { men: [], women: [] } as Record<Gender, PodiumEntry[]>
  const fasterGuest: Partial<Record<Gender, PodiumEntry>> = {}
  const records: RecordEntry[] = []
  const courseRecords = { men: null, women: null } as Record<Gender, CourseRecord | null>
  for (const g of ['men', 'women'] as Gender[]) {
    const field = season.filter((a) => adultFinisher(a) && a.class_lower === GENDER_CLASS[g]).sort(fastestFirst)
    const members = field.filter((a) => a.is_club_member)
    podium[g] = members.slice(0, 3).map(entry)
    if (field[0] && members[0] && !field[0].is_club_member) fasterGuest[g] = entry(field[0])

    if (comparable) {
      const earlier = rows
        .filter((a) => a.Competition_Year < year && isComparableYear(sport, a.Competition_Year)
          && adultFinisher(a) && a.is_club_member && a.class_lower === GENDER_CLASS[g])
        .sort(fastestFirst)[0]
      if (members[0] && (!earlier || members[0].Total_Time_Seconds < earlier.Total_Time_Seconds)) {
        // A first-ever club time is the course record, but only beating an
        // earlier record counts as a record broken
        if (earlier) records.push({ gender: g, ...entry(members[0]), previous: { ...entry(earlier), year: earlier.Competition_Year } })
        courseRecords[g] = { ...entry(members[0]), year, setThisSeason: true }
      } else if (earlier) {
        // No club member raced it this season, or nobody beat the record
        courseRecords[g] = { ...entry(earlier), year: earlier.Competition_Year, setThisSeason: false }
      }
    }
  }

  const improvementsAll: Improvement[] = []
  let comparableCount = 0
  if (comparable) {
    for (const a of season.filter((x) => adultFinisher(x) && x.is_club_member)) {
      const best = rows
        .filter((b) => b.Name === a.Name && b.Competition_Year < year
          && isComparableYear(sport, b.Competition_Year) && adultFinisher(b))
        .sort(fastestFirst)[0]
      if (!best) continue
      comparableCount++
      // From the official times people see, so 38:41 → 33:25 reads as 5:16
      // (raw seconds carry decimals the displayed times truncate)
      const gain = parseClock(best.Total_Time) - parseClock(a.Total_Time)
      if (gain > 0) {
        improvementsAll.push({
          gender: genderOf(a), ...entry(a),
          previousBest: { time: best.Total_Time, seconds: best.Total_Time_Seconds, year: best.Competition_Year },
          gain,
        })
      }
    }
  }
  improvementsAll.sort((x, y) => y.gain - x.gain)

  const prevYear = String(Number(year) - 1)
  const prevRows = rows.filter((a) => a.Competition_Year === prevYear && !isRelay(a))

  return {
    sport,
    starts: {
      total: individual.length + relays.reduce((n, r) => n + Math.max(1, relayRunners(r.Name).length), 0),
      members: individual.filter((a) => a.is_club_member).length,
      guests: individual.filter((a) => !a.is_club_member).length,
      men: individual.filter((a) => a.class_lower === 'herr').length,
      women: individual.filter((a) => a.class_lower === 'dam').length,
      youth: individual.filter((a) => !racesOverall(a)).length,
      relayTeams: relays.length,
    },
    podium,
    fasterGuest,
    records: comparable ? records : null,
    courseRecords: comparable ? courseRecords : null,
    personalBests: comparable ? improvementsAll : null,
    comparable: comparableCount,
    startsPreviousYear: prevRows.length || null,
  }
}

export function getSeasonSummary(data: CompetitionsData, year: string): SeasonSummary {
  const races = SEASON_SPORTS
    .filter((s) => data[s].some((a) => a.Competition_Year === year))
    .map((s) => summarizeRace(s, data[s], year))

  const season = SEASON_SPORTS.flatMap((s) => data[s].filter((a) => a.Competition_Year === year).map((a) => ({ a, s })))
  const individual = season.filter(({ a }) => !isRelay(a))
  const relayPeople = season.filter(({ a }) => isRelay(a)).flatMap(({ a }) => relayRunners(a.Name).map((name) => ({ name, member: a.is_club_member })))

  const people = new Map<string, boolean>()
  for (const { a } of individual) people.set(a.Name, (people.get(a.Name) ?? false) || a.is_club_member)
  for (const p of relayPeople) people.set(p.name, (people.get(p.name) ?? false) || p.member)

  const racesByMember = new Map<string, Set<SportType>>()
  for (const { a, s } of individual) {
    if (!a.is_club_member) continue
    racesByMember.set(a.Name, (racesByMember.get(a.Name) ?? new Set()).add(s))
  }
  const racesPerMember: Record<number, number> = {}
  for (const sports of racesByMember.values()) racesPerMember[sports.size] = (racesPerMember[sports.size] ?? 0) + 1

  const earlierNames = new Set(SEASON_SPORTS.flatMap((s) => data[s].filter((a) => a.Competition_Year < year).flatMap(peopleOf)))
  const newcomers = { members: [] as string[], guests: [] as string[] }
  for (const [name, member] of people) if (!earlierNames.has(name)) newcomers[member ? 'members' : 'guests'].push(name)
  newcomers.members.sort((a, b) => a.localeCompare(b, 'sv'))
  newcomers.guests.sort((a, b) => a.localeCompare(b, 'sv'))

  const history = [...new Set(SEASON_SPORTS.flatMap((s) => data[s].map((a) => a.Competition_Year)))]
    .filter((y) => y <= year)
    .sort()
    .map((y) => {
      const rows = SEASON_SPORTS.flatMap((s) => data[s].filter((a) => a.Competition_Year === y).map((a) => ({ a, s })))
      return {
        year: y,
        races: new Set(rows.map(({ s }) => s)).size,
        starts: rows.reduce((n, { a }) => n + peopleOf(a).length, 0),
        people: new Set(rows.flatMap(({ a }) => peopleOf(a))).size,
      }
    })

  const top3 = (g: Gender) => getClubRankings(data, g, year).slice(0, 3).map((a) => ({ name: a.name, points: a.total_points }))

  return {
    year,
    participations: {
      total: individual.length + relayPeople.length,
      members: individual.filter(({ a }) => a.is_club_member).length + relayPeople.filter((p) => p.member).length,
      guests: individual.filter(({ a }) => !a.is_club_member).length + relayPeople.filter((p) => !p.member).length,
      youth: individual.filter(({ a }) => !racesOverall(a)).length,
    },
    people: {
      total: people.size,
      members: [...people.values()].filter(Boolean).length,
      guests: [...people.values()].filter((m) => !m).length,
    },
    races,
    everyRace: [...racesByMember].filter(([, s]) => s.size === races.length).map(([n]) => n).sort(),
    racesPerMember,
    newMembers: newcomers.members.length,
    newcomers,
    history,
    pointsPodium: { men: top3('men'), women: top3('women') },
  }
}
