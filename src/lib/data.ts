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
const SPLIT_FIELDS = {
  triathlon: ['Swim_Seconds', 'T1_Seconds', 'Bike_Seconds', 'T2_Seconds', 'Run_Seconds'],
  duathlon: ['Run1_Seconds', 'T1_Seconds', 'Bike_Seconds', 'T2_Seconds', 'Run2_Seconds'],
} as const

/**
 * Whether one split of a multisport result can be trusted. A missed timing mat
 * leaves a leg at 0 and folds its time into the next one (a "bike" of 53:04
 * that is really the clock at bike-in). So a split counts only when it was
 * recorded and the leg before it was too; a row with every leg recorded whose
 * legs don't add up to the finish time has no trustworthy split at all.
 * Untrusted splits are not shown, ranked or eligible for "fastest of the day";
 * the finish time, place and points are unaffected.
 * `field` is the seconds column ('Bike_Seconds'). The sport defaults to what
 * the row's columns say (only duathlon has Run 1).
 */
export function isReliableSplit(a: AthleteResult, field: string, sport?: 'triathlon' | 'duathlon'): boolean {
  const fields: readonly string[] = SPLIT_FIELDS[sport ?? (a.Run1_Seconds !== undefined ? 'duathlon' : 'triathlon')]
  const values = fields.map((f) => Number((a as unknown as Record<string, unknown>)[f]) || 0)
  const i = fields.indexOf(field)
  if (i === -1 || values[i] <= 0 || (i > 0 && values[i - 1] <= 0)) return false
  return values.some((v) => v <= 0) || Math.abs(values.reduce((x, y) => x + y, 0) - a.Total_Time_Seconds) <= 2
}

/**
 * The longest an untrusted split can really have been, in seconds, or null
 * when nothing is known. After a missed mat the next recorded "split" is the
 * race clock at that point, so the legs it swallowed took at most that clock
 * minus the legs timed before the gap. Lets "fastest of the day" notice that
 * someone without a usable split was certainly faster than the best recorded one.
 */
export function splitUpperBound(a: AthleteResult, field: string, sport?: 'triathlon' | 'duathlon'): number | null {
  const fields: readonly string[] = SPLIT_FIELDS[sport ?? (a.Run1_Seconds !== undefined ? 'duathlon' : 'triathlon')]
  const values = fields.map((f) => Number((a as unknown as Record<string, unknown>)[f]) || 0)
  const i = fields.indexOf(field)
  if (i === -1 || isReliableSplit(a, field, sport) || !values.some((v) => v <= 0)) return null
  // The clock reading that covers this leg: itself, or the next one recorded
  const k = values.findIndex((v, j) => j >= i && v > 0)
  if (k === -1) return null
  // Start of the gap (run of missing legs) in front of that reading
  let gap = k
  while (gap > 0 && values[gap - 1] <= 0) gap--
  if (gap > i || gap === k) return null
  const before = fields.slice(0, gap)
  const timedBefore = before.every((f) => isReliableSplit(a, f, sport)) ? values.slice(0, gap).reduce((x, y) => x + y, 0) : 0
  return values[k] - timedBefore
}

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
      .filter((a) => isReliableSplit(a, field, sport))
      .map((a) => ({ a, val: (a[field] as number | undefined) ?? 0 }))
      .sort((a, b) => a.val - b.val)
    // Equal splits share a rank (1, 1, 3, …)
    let rank = 0
    sorted.forEach(({ a, val }, idx) => {
      if (idx === 0 || val !== sorted[idx - 1].val) rank = idx + 1
      result.get(athleteKey(a))![key] = rank
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
export const CLUB_ALIASES: ReadonlySet<string> = new Set(['triväst', 'triathlon väst', 'triathväst', 'tv', 'medlem', 'trivästare'])

/**
 * Club labels confirmed by the club for athletes whose registrations misstate
 * their membership (blank, "Klubblös" or a guest label), keyed by name and
 * applied to every race. Fixes rows already in data/ without hand-editing the
 * CSVs. Mirrors CLUB_CORRECTIONS in nytatime/retrieve_event_results.py, which
 * covers fresh fetches.
 */
export const CLUB_CORRECTIONS: ReadonlyMap<string, string> = new Map([
  ['Erik Arnström', 'TriVäst'],
  // Entered as guests in one race each (cycling 2026, swimming 2023)
  ['Karl Wackerberg', 'TriVäst'],
  ['Jonas Örarbäck', 'TriVäst'],
  // Member since the start; entered as a guest in running 2023
  ['Maria Ernsfors', 'TriVäst'],
  // Member in 2025 and 2026; entered as a guest in cycling 2026
  ['Greg James-Rae', 'TriVäst'],
])

/**
 * Club labels confirmed by the club for one season only, keyed by
 * "name|year": for someone who joined or left, where a result sheet has the
 * wrong label for that year. Wins over CLUB_CORRECTIONS.
 */
export const CLUB_CORRECTIONS_BY_YEAR: ReadonlyMap<string, string> = new Map([
  // Joined in 2026: a guest in 2021, 2023 and 2025 (cycling 2023 said member)
  ['Helena Jakobsson Larsson|2023', 'Gäst'],
])

/**
 * Split times the club has confirmed as timing errors, keyed by
 * "name|sport|year" → the split columns to blank ('Run1' = Run1_Time and
 * Run1_Seconds). The loader clears them, so the split shows as "—" and can't
 * be ranked or win "fastest of the day"; the finish time, place and points
 * are untouched. Fixes rows already in data/ without hand-editing the CSVs.
 */
export const SPLIT_EXCLUSIONS: ReadonlyMap<string, readonly string[]> = new Map([
  // 16:38 for the first 5 km (faster than the race winner) by the 19th finisher,
  // with no T1 recorded: the chip was read early
  ['Armando Hurtado Sandoval|duathlon|2024', ['Run1']],
])

/**
 * Name variants confirmed as the same athlete, mapped to the canonical
 * spelling so one person keeps one profile and one ranking total. Fixes rows
 * already in data/ (older races can't be re-fetched cleanly). Mirrors
 * NAME_CORRECTIONS in nytatime/retrieve_event_results.py, which covers fresh
 * fetches. Club corrections are keyed by the corrected name.
 */
export const NAME_CORRECTIONS: ReadonlyMap<string, string> = new Map([
  ['Fredrik Rosen', 'Fredrik Rosén'],
  ['Greg James rae', 'Greg James-Rae'],
  ['Lars Jacobsen', 'Lars Galberg Jacobsen'],
])

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
 * Relay classes: three athletes share one course, so a team's time is never
 * comparable with an individual's. Mirrors RELAY_CLASSES in
 * nytatime/retrieve_event_results.py; both NyTaTime spellings are matched.
 */
const RELAY_CLASSES = ['staffet', 'stafett', 'relay']

/** Whether this result belongs to a relay team rather than an individual. */
export function isRelay(a: AthleteResult): boolean {
  return RELAY_CLASSES.some((r) => a.class_lower.includes(r))
}

/** Runners of a relay team, from "Team name (A / B / C)". */
export function relayRunners(teamName: string): string[] {
  const m = teamName.match(/\(([^)]*)\)\s*$/)
  return m ? m[1].split('/').map((s) => s.trim()).filter(Boolean) : []
}

/**
 * Whether an athlete competes for an overall placing. Youth (Ungdom) and
 * children (Barn) race a shorter course and relay teams split the course
 * between them, so they are ranked within their class only — never against the
 * full-distance individual field. Mirrors ranks_overall() in
 * nytatime/retrieve_event_results.py, which blanks their CSV Overall_Rank.
 */
export function racesOverall(a: AthleteResult): boolean {
  if (isRelay(a)) return false
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
    // Relay teams race under a team name — they are results, not athletes.
    for (const a of athletes) if (!isRelay(a)) names.add(a.Name)
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
        // Never trust a youth/children/relay row's CSV overall rank: files
        // imported before ranks_overall() existed carry one (e.g. duathlon 2026).
        overall_rank: racesOverall(a) ? a.Overall_Rank : 0,
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

  // Most points first; equal totals in name order, so the list never depends
  // on the order of the result files
  return Object.values(map).sort((a, b) => b.total_points - a.total_points || a.name.localeCompare(b.name, 'sv'))
}

/**
 * Place of each athlete in a list sorted by points, most first. Equal totals
 * share a place and the next one is skipped (1, 2, 2, 4, …).
 */
export function pointsRanks(sorted: ReadonlyArray<{ total_points: number }>): number[] {
  const out: number[] = []
  sorted.forEach((a, i) => out.push(i > 0 && a.total_points === sorted[i - 1].total_points ? out[i - 1] : i + 1))
  return out
}

// ─── Participation chart data ──────────────────────────────────────────────────

export function getParticipationByYear(
  data: CompetitionsData,
): Array<{ year: string; triathlon: number; duathlon: number; swimming: number; cycling: number; running: number; swimrun: number }> {
  const byYear: Record<string, Record<SportType, number>> = {}

  for (const [sport, athletes] of Object.entries(data) as [SportType, AthleteResult[]][]) {
    for (const a of athletes) {
      byYear[a.Competition_Year] = byYear[a.Competition_Year] ?? { triathlon: 0, duathlon: 0, swimming: 0, cycling: 0, running: 0, swimrun: 0 }
      // Every start counts, like everywhere else on the site: a relay team is its runners
      byYear[a.Competition_Year][sport] += isRelay(a) ? Math.max(1, relayRunners(a.Name).length) : 1
    }
  }

  return Object.entries(byYear)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([year, counts]) => ({ year, ...counts }))
}
