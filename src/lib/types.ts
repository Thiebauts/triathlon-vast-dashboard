export type SportType = 'triathlon' | 'duathlon' | 'swimming' | 'cycling' | 'running' | 'swimrun'
export type Lang = 'en' | 'sv'

/** Results-tab category filter ('all' = the adult mixed field, Herr + Dam). */
export type ResultsCategory = 'all' | 'men' | 'women' | 'youth'
/** Extra-events category filter ('all' = every class — one shared course). */
export type ExtraCategory = 'all' | 'men' | 'women'

export interface AthleteResult {
  Name: string
  Bib?: string
  Class: string
  /** Lowercased + trimmed Class. Precomputed at parse time. */
  class_lower: string
  Club: string
  /** Precomputed at parse time. True iff Club matches a known TriVäst alias. */
  is_club_member: boolean
  Total_Time: string
  Total_Time_Seconds: number
  Status: string
  Overall_Rank: number
  Class_Rank: number
  Competition_Year: string
  // Triathlon / Duathlon segments — only fields the UI actually reads.
  Swim_Time?: string
  Swim_Seconds?: number
  T1_Time?: string
  T1_Seconds?: number
  Bike_Time?: string
  Bike_Seconds?: number
  T2_Time?: string
  T2_Seconds?: number
  Run_Time?: string
  Run_Seconds?: number
  Run1_Time?: string
  Run1_Seconds?: number
  Run2_Time?: string
  Run2_Seconds?: number
}

export interface CompetitionsData {
  triathlon: AthleteResult[]
  duathlon: AthleteResult[]
  swimming: AthleteResult[]
  cycling: AthleteResult[]
  running: AthleteResult[]
  swimrun: AthleteResult[]
}

export interface EventResult {
  type: SportType
  year: string
  rank: number | string
  club_member_rank: number | string
  overall_rank: number | string
  time: string
  time_seconds: number
  club: string
  class_total: number
  overall_total: number
  gender_class: string
  is_club_member: boolean
  /** False for DNF/DNS rows — they earn no points and show no ranks. */
  finished: boolean
  points: number
  // Segments
  swim_time?: string
  bike_time?: string
  run_time?: string
  run1_time?: string
  run2_time?: string
}

/**
 * A timed event that is not an official club championship (e.g. the Rådasjön
 * SuperSprint trainings). Loaded from data/extra/events.json + its CSVs.
 * These earn no club points and stay out of profiles and rankings.
 */
export interface ExtraEvent {
  /** CSV file name within data/extra/ — unique, used as React key. */
  file: string
  /** NyTaTime race id — the import script matches manifest entries by it. */
  race_id?: string
  /** Full event date (YYYY-MM-DD) — extra events can repeat within a year. */
  date: string
  /** Segment layout to display (e.g. 'triathlon' → Swim/T1/Bike/T2/Run). */
  format: SportType
  title: { en: string; sv: string }
  location?: string
  /** Event context shown above the results: format, distances, who it's for. */
  description?: { en: string; sv: string }
  /** Ranked finishers first, then 'partial' rows (some legs only), unranked. */
  results: AthleteResult[]
}

export interface ClubAthlete {
  name: string
  gender: string
  total_points: number
  competitions: Array<{
    type: SportType
    rank: number
    points: number
    year: string
  }>
}

export interface SummaryStats {
  total_participants: number
  total_club_members: number
  competitions_count: number
  years_covered: string[]
}
