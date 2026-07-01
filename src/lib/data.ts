// Pure computation — safe to import from both Server and Client Components
import type { AthleteResult, CompetitionsData, ClubAthlete, EventResult, SummaryStats, SportType } from './types'

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

  const fields: Array<[keyof AthleteResult, keyof SplitRanks]> =
    sport === 'triathlon'
      ? [['Swim_Seconds', 'swim'], ['T1_Seconds', 't1'], ['Bike_Seconds', 'bike'], ['T2_Seconds', 't2'], ['Run_Seconds', 'run']]
      : [['Run1_Seconds', 'run1'], ['T1_Seconds', 't1'], ['Bike_Seconds', 'bike'], ['T2_Seconds', 't2'], ['Run2_Seconds', 'run2']]

  for (const [field, key] of fields) {
    const sorted = athletes
      .map((a) => ({ a, val: (a[field] as number | undefined) ?? 0 }))
      .filter((x) => x.val > 0)
      .sort((a, b) => a.val - b.val)
    sorted.forEach(({ a }, idx) => {
      result.get(athleteKey(a))![key] = idx + 1
    })
  }
  return result
}

// ─── Club membership ──────────────────────────────────────────────────────────

/**
 * Club-name spellings that count as TriVäst. 'medlem' (Swedish for "member")
 * and 'trivästare' ("TriVäst member") show up when a result sheet records
 * membership status or a colloquial club name instead of the canonical one.
 * Single source of truth — the loader flags rows against this set.
 */
export const CLUB_ALIASES: ReadonlySet<string> = new Set(['triväst', 'triathlon väst', 'tv', 'medlem', 'trivästare'])

/**
 * Accepts an AthleteResult (uses the precomputed flag) or a raw club string.
 * Prefer passing the AthleteResult — the string overload is for one-off lookups
 * outside the parsed data set.
 */
export function isClubMember(a: AthleteResult | string): boolean {
  if (typeof a === 'string') return CLUB_ALIASES.has(a.toLowerCase().trim())
  return a.is_club_member
}

// ─── Finisher status ──────────────────────────────────────────────────────────

/** The result sheets encode DNF as a 999 999-second total time. */
const DNF_SENTINEL_SECONDS = 999_999

/**
 * Whether a result is a completed race. DNF/DNS rows — and rows whose total
 * time is missing (parses to 0) or the DNF sentinel — must never enter
 * time-based rankings or earn points: the sentinel would otherwise hand a
 * non-finisher a real-looking last-place rank and its points.
 */
export function isFinisher(a: AthleteResult): boolean {
  return a.Status !== 'dnf' && a.Status !== 'dns'
    && a.Total_Time_Seconds > 0
    && a.Total_Time_Seconds < DNF_SENTINEL_SECONDS
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

/**
 * Club points are an adult-category ranking: only Herr/Dam results earn points
 * and enter the club rankings. Youth (Ungdom) and children (Barn) race shorter
 * courses, so their results earn nothing — this also stops a one-person youth/
 * barn class from banking a 40-point "class win". Applied in BOTH getClubRankings
 * and getAthleteEvents so the aggregate total and per-event points always agree.
 */
const ADULT_CLASSES: ReadonlySet<string> = new Set(['herr', 'dam'])

function earnsClubPoints(a: AthleteResult): boolean {
  return a.is_club_member && ADULT_CLASSES.has(a.class_lower) && isFinisher(a)
}

/**
 * Whether an athlete competes for an overall placing. Youth (Ungdom) and
 * children (Barn) race a shorter course, so they are ranked within their class
 * only — never against the full-distance adult field. Mirrors ranks_overall()
 * in nytatime/retrieve_event_results.py, which blanks their CSV Overall_Rank.
 */
export function racesOverall(a: AthleteResult): boolean {
  const c = a.class_lower
  return !c.includes('barn') && !c.includes('ungdom') && !c.includes('youth')
}

// ─── Club-member-only rank ────────────────────────────────────────────────────

/**
 * Rank among club members of the same class who FINISHED the event.
 * Competition ranking: rank = 1 + number of strictly faster members, so equal
 * times share a rank (1, 1, 3, …). Non-finishers get the 999 "unranked" value.
 */
export function calculateClubMemberRank(
  athlete: AthleteResult,
  allInEvent: AthleteResult[],
): number {
  if (!athlete.is_club_member || !isFinisher(athlete)) return 999
  const faster = allInEvent.filter(
    (a) => a.is_club_member && a.Class === athlete.Class && isFinisher(a)
      && a.Total_Time_Seconds < athlete.Total_Time_Seconds,
  ).length
  return faster + 1
}

// ─── Per-event points ─────────────────────────────────────────────────────────

/**
 * Points each athlete earned in their own event, keyed by athleteKey().
 *
 * Mirrors getClubRankings / getAthleteEvents: points are an adult-category club
 * ranking (Herr/Dam members only) computed over the FULL event field — every
 * club member in that class and year — so the value is independent of any UI
 * filtering (category, guests, search) and always agrees across the Results tab,
 * Rankings tab, and athlete profiles. Non-members, youth/barn, and DNFs map to 0.
 */
export function computeEventPoints(athletes: AthleteResult[]): Map<string, number> {
  const out = new Map<string, number>()

  const byYear: Record<string, AthleteResult[]> = {}
  for (const a of athletes) {
    byYear[a.Competition_Year] = byYear[a.Competition_Year] ?? []
    byYear[a.Competition_Year].push(a)
  }

  for (const yearGroup of Object.values(byYear)) {
    for (const a of yearGroup) {
      out.set(athleteKey(a), earnsClubPoints(a)
        ? calculatePoints(calculateClubMemberRank(a, yearGroup))
        : 0)
    }
  }

  return out
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
      total_club_members += yearGroup.filter((a) => a.is_club_member).length
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
): Record<string, EventResult> {
  const events: Record<string, EventResult> = {}

  for (const [sport, athletes] of Object.entries(data) as [SportType, AthleteResult[]][]) {
    const byYear: Record<string, AthleteResult[]> = {}
    for (const a of athletes) {
      byYear[a.Competition_Year] = byYear[a.Competition_Year] ?? []
      byYear[a.Competition_Year].push(a)
    }

    for (const a of athletes) {
      if (a.Name !== athleteName) continue
      const sameYear = byYear[a.Competition_Year]
      // Denominators count finishers only, matching the finisher-based ranks
      // from the result sheets (a DNF carries rank 0, not a place).
      const finishers = sameYear.filter(isFinisher)
      // The overall placing is contested only among the full-distance (adult)
      // field, so its denominator excludes youth/children — matching their
      // blank Overall_Rank.
      const overallFinishers = finishers.filter(racesOverall)
      const finished = isFinisher(a)
      const cmRank = calculateClubMemberRank(a, sameYear)
      const isMember = a.is_club_member
      const key = `${sport}_${a.Competition_Year}`
      events[key] = {
        type: sport,
        year: a.Competition_Year,
        rank: a.Class_Rank,
        club_member_rank: isMember && finished ? cmRank : 'N/A',
        overall_rank: a.Overall_Rank,
        time: a.Total_Time,
        time_seconds: a.Total_Time_Seconds,
        club: a.Club,
        class_total: finishers.filter((x) => x.Class === a.Class).length,
        overall_total: overallFinishers.length,
        gender_class: a.Class,
        is_club_member: isMember,
        finished,
        points: earnsClubPoints(a) ? calculatePoints(cmRank) : 0,
        swim_time: a.Swim_Time,
        bike_time: a.Bike_Time,
        run_time: a.Run_Time,
        run1_time: a.Run1_Time,
        run2_time: a.Run2_Time,
      }
    }
  }
  return events
}

// ─── Club rankings ────────────────────────────────────────────────────────────

/**
 * Aggregates points per club member across sports and years. Only adult
 * (Herr/Dam) results count — see `earnsClubPoints`.
 *
 * Athletes are keyed by `Name`. This assumes member names are unique within
 * the club — verified true for the current dataset. If two distinct people
 * ever share a name, points would erroneously merge into one entry. To catch
 * that case we emit a `console.warn` (visible at build time and in dev) when an
 * existing entry is hit with a different `Class` than first observed. (Youth
 * who also race adult fields, e.g. Simon Flinta as Herr + Ungdom, no longer
 * trip this: their Ungdom results are skipped before the check.)
 */
export function getClubRankings(
  data: CompetitionsData,
  genderFilter: 'all' | 'men' | 'women' = 'all',
  yearFilter: string = 'all',
): ClubAthlete[] {
  const map: Record<string, ClubAthlete> = {}
  const warned = new Set<string>()

  for (const [sport, athletes] of Object.entries(data) as [SportType, AthleteResult[]][]) {
    const byYear: Record<string, AthleteResult[]> = {}
    for (const a of athletes) {
      byYear[a.Competition_Year] = byYear[a.Competition_Year] ?? []
      byYear[a.Competition_Year].push(a)
    }

    for (const [year, yearGroup] of Object.entries(byYear)) {
      if (yearFilter !== 'all' && year !== yearFilter) continue

      for (const a of yearGroup) {
        if (!earnsClubPoints(a)) continue
        const cls = a.class_lower
        if (genderFilter === 'men' && cls !== 'herr') continue
        if (genderFilter === 'women' && cls !== 'dam') continue

        const cmRank = calculateClubMemberRank(a, yearGroup)
        const pts = calculatePoints(cmRank)

        if (!map[a.Name]) {
          map[a.Name] = { name: a.Name, gender: cls, total_points: 0, competitions: [] }
        } else if (map[a.Name].gender !== cls && !warned.has(a.Name)) {
          warned.add(a.Name)
          console.warn(
            `[getClubRankings] Name collision: "${a.Name}" appears in classes ` +
            `"${map[a.Name].gender}" and "${cls}" — points are being merged into one entry. ` +
            `If these are two different athletes, the keying scheme needs to change.`,
          )
        }
        map[a.Name].total_points += pts
        map[a.Name].competitions.push({ type: sport, rank: cmRank, points: pts, year })
      }
    }
  }

  return Object.values(map).sort((a, b) => b.total_points - a.total_points)
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
