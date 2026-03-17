// Pure computation — safe to import from both Server and Client Components
import type { AthleteResult, CompetitionsData, ClubAthlete, SummaryStats, SportType } from './types'

// ─── Split ranks ──────────────────────────────────────────────────────────────

export interface SplitRanks {
  swim?: number; t1?: number; bike?: number; t2?: number; run?: number
  run1?: number; run2?: number
}

/** Unique key for an athlete within a specific event (sport + year) */
export function athleteKey(a: AthleteResult): string {
  return `${a.Name}||${a.Club}||${a.Bib ?? ''}||${a.Competition_Year}`
}

/**
 * For a list of athletes in the SAME event (same sport + year), compute each
 * athlete's rank for every split. Rank 1 = fastest.
 * Returns a Map keyed by athleteKey().
 */
export function computeSplitRanks(
  athletes: AthleteResult[],
  sport: 'triathlon' | 'duathlon',
): Map<string, SplitRanks> {
  const result = new Map<string, SplitRanks>()
  for (const a of athletes) result.set(athleteKey(a), {})

  const fields: Array<[string, keyof SplitRanks]> =
    sport === 'triathlon'
      ? [['Swim_Seconds', 'swim'], ['T1_Seconds', 't1'], ['Bike_Seconds', 'bike'], ['T2_Seconds', 't2'], ['Run_Seconds', 'run']]
      : [['Run1_Seconds', 'run1'], ['T1_Seconds', 't1'], ['Bike_Seconds', 'bike'], ['T2_Seconds', 't2'], ['Run2_Seconds', 'run2']]

  for (const [field, key] of fields) {
    const sorted = athletes
      .map((a) => ({ a, val: parseFloat(String((a as unknown as Record<string, unknown>)[field] ?? '0')) || Infinity }))
      .filter((x) => x.val < Infinity)
      .sort((a, b) => a.val - b.val)
    sorted.forEach(({ a }, idx) => {
      result.get(athleteKey(a))![key] = idx + 1
    })
  }
  return result
}

// ─── Club membership ──────────────────────────────────────────────────────────

export function isClubMember(club: string): boolean {
  const c = (club ?? '').toLowerCase().trim()
  return ['triväst', 'triathlon väst', 'tv'].includes(c)
}

// ─── Points system ────────────────────────────────────────────────────────────

export function calculatePoints(rank: number | string): number {
  const r = typeof rank === 'string' ? parseInt(rank, 10) : rank
  if (!r || isNaN(r) || r <= 0) return 0
  if (r === 1) return 40
  if (r === 2) return 35
  if (r === 3) return 30
  if (r <= 32) return 33 - r
  return 0
}

// ─── Club-member-only rank ────────────────────────────────────────────────────

export function calculateClubMemberRank(
  athlete: AthleteResult,
  allInEvent: AthleteResult[],
): number {
  if (!isClubMember(athlete.Club)) return 999
  const sameClass = allInEvent.filter(
    (a) => isClubMember(a.Club) && a.Class === athlete.Class,
  )
  const sorted = [...sameClass].sort(
    (a, b) => (a.Total_Time_Seconds ?? Infinity) - (b.Total_Time_Seconds ?? Infinity),
  )
  const idx = sorted.findIndex((a) => athleteKey(a) === athleteKey(athlete))
  return idx >= 0 ? idx + 1 : 999
}

// ─── Summary stats ────────────────────────────────────────────────────────────

export function getSummaryStats(data: CompetitionsData): SummaryStats {
  let total_participants = 0
  let total_club_members = 0
  let competitions_count = 0
  const years = new Set<string>()

  for (const athletes of Object.values(data)) {
    const byYear: Record<string, AthleteResult[]> = {}
    for (const a of athletes) {
      byYear[a.Competition_Year] = byYear[a.Competition_Year] ?? []
      byYear[a.Competition_Year].push(a)
      years.add(a.Competition_Year)
    }
    for (const yearGroup of Object.values(byYear)) {
      competitions_count++
      total_participants += yearGroup.length
      total_club_members += yearGroup.filter((a) => isClubMember(a.Club)).length
    }
  }

  return {
    total_participants,
    total_club_members,
    competitions_count,
    years_covered: [...years].sort().reverse(),
  }
}

// ─── Athlete list ─────────────────────────────────────────────────────────────

export function getAllAthleteNames(data: CompetitionsData): string[] {
  const names = new Set<string>()
  for (const athletes of Object.values(data)) {
    for (const a of athletes) names.add(a.Name)
  }
  return [...names].sort()
}

// ─── Athlete profile ──────────────────────────────────────────────────────────

export function getAthleteEvents(
  data: CompetitionsData,
  athleteName: string,
): Record<string, {
  type: SportType; year: string; rank: number | string; club_member_rank: number | string
  overall_rank: number | string; time: string; time_seconds: number; club: string
  class_total: number; overall_total: number; gender_class: string
  is_club_member: boolean; points: number
  swim_time?: string; bike_time?: string; run_time?: string
  run1_time?: string; run2_time?: string; transitions?: string
}> {
  const events: ReturnType<typeof getAthleteEvents> = {}

  for (const [sport, athletes] of Object.entries(data) as [SportType, AthleteResult[]][]) {
    const byYear: Record<string, AthleteResult[]> = {}
    for (const a of athletes) {
      byYear[a.Competition_Year] = byYear[a.Competition_Year] ?? []
      byYear[a.Competition_Year].push(a)
    }

    for (const a of athletes) {
      if (a.Name !== athleteName) continue
      const sameYear = byYear[a.Competition_Year]
      const classTotal = sameYear.filter((x) => x.Class === a.Class).length
      const cmRank = calculateClubMemberRank(a, sameYear)
      const isMember = isClubMember(a.Club)
      const key = `${sport}_${a.Competition_Year}`
      events[key] = {
        type: sport,
        year: a.Competition_Year,
        rank: a.Class_Rank,
        club_member_rank: isMember ? cmRank : 'N/A',
        overall_rank: a.Overall_Rank,
        time: a.Total_Time,
        time_seconds: a.Total_Time_Seconds,
        club: a.Club,
        class_total: classTotal,
        overall_total: sameYear.length,
        gender_class: a.Class,
        is_club_member: isMember,
        points: isMember ? calculatePoints(cmRank) : 0,
        swim_time: a.Swim_Time,
        bike_time: a.Bike_Time,
        run_time: a.Run_Time,
        run1_time: a.Run1_Time,
        run2_time: a.Run2_Time,
        transitions: a.Total_Transition,
      }
    }
  }
  return events
}

// ─── Club rankings ────────────────────────────────────────────────────────────

export function getClubRankings(
  data: CompetitionsData,
  genderFilter: 'all' | 'men' | 'women' = 'all',
  yearFilter: string = 'all',
): ClubAthlete[] {
  const map: Record<string, ClubAthlete> = {}

  for (const [sport, athletes] of Object.entries(data) as [SportType, AthleteResult[]][]) {
    const byYear: Record<string, AthleteResult[]> = {}
    for (const a of athletes) {
      byYear[a.Competition_Year] = byYear[a.Competition_Year] ?? []
      byYear[a.Competition_Year].push(a)
    }

    for (const [year, yearGroup] of Object.entries(byYear)) {
      if (yearFilter !== 'all' && year !== yearFilter) continue

      // Pre-compute club member ranks per class (avoids repeated filter+sort per athlete)
      const clubRanksByClass = new Map<string, Map<string, number>>()
      for (const a of yearGroup) {
        if (!isClubMember(a.Club) || clubRanksByClass.has(a.Class)) continue
        const classMembers = yearGroup
          .filter((x) => isClubMember(x.Club) && x.Class === a.Class)
          .sort((x, y) => (x.Total_Time_Seconds ?? Infinity) - (y.Total_Time_Seconds ?? Infinity))
        const rankMap = new Map<string, number>()
        classMembers.forEach((x, i) => rankMap.set(x.Name, i + 1))
        clubRanksByClass.set(a.Class, rankMap)
      }

      for (const a of yearGroup) {
        if (!isClubMember(a.Club)) continue
        const cls = a.Class.toLowerCase()
        if (genderFilter === 'men' && !['herr', 'man', 'men'].includes(cls)) continue
        if (genderFilter === 'women' && !['dam', 'woman', 'women'].includes(cls)) continue

        const cmRank = clubRanksByClass.get(a.Class)?.get(a.Name) ?? 999
        const pts = calculatePoints(cmRank)

        if (!map[a.Name]) {
          map[a.Name] = { name: a.Name, gender: cls, total_points: 0, avg_rank: 0, best_rank: 999, competitions: [] }
        }
        map[a.Name].total_points += pts
        map[a.Name].best_rank = Math.min(map[a.Name].best_rank, cmRank)
        map[a.Name].competitions.push({ type: sport, rank: cmRank, points: pts, year })
      }
    }
  }

  const list = Object.values(map)
  for (const a of list) {
    const validRanks = a.competitions.map((c) => c.rank).filter((r) => r > 0 && r < 999)
    a.avg_rank = validRanks.length ? validRanks.reduce((s, r) => s + r, 0) / validRanks.length : 999
  }

  return list.sort((a, b) => b.total_points - a.total_points)
}

// ─── Participation chart data ──────────────────────────────────────────────────

export function getParticipationByYear(
  data: CompetitionsData,
): Array<{ year: string; triathlon: number; duathlon: number; swimming: number; cycling: number; running: number; swimrun: number }> {
  const byYear: Record<string, Record<SportType, number>> = {}

  for (const [sport, athletes] of Object.entries(data) as [SportType, AthleteResult[]][]) {
    for (const a of athletes) {
      byYear[a.Competition_Year] = byYear[a.Competition_Year] ?? { triathlon: 0, duathlon: 0, swimming: 0, cycling: 0, running: 0, swimrun: 0 }
      byYear[a.Competition_Year][sport]++
    }
  }

  return Object.entries(byYear)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([year, counts]) => ({ year, ...counts }))
}
