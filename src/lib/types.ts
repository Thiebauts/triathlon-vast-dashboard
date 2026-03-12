export type SportType = 'triathlon' | 'duathlon' | 'swimming' | 'cycling' | 'running' | 'swimrun'
export type Lang = 'en' | 'sv'

export interface AthleteResult {
  Name: string
  Bib?: string
  Class: string
  Club: string
  Total_Time: string
  Total_Time_Seconds: number
  Status: string
  Overall_Rank: number
  Class_Rank: number
  Competition_Year: string
  Competition_Type: string
  // Triathlon / Duathlon segments
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
  Total_Transition?: string
  Transition_Seconds?: number
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
  points: number
  // Segments
  swim_time?: string
  bike_time?: string
  run_time?: string
  run1_time?: string
  run2_time?: string
  transitions?: string
}

export interface ClubAthlete {
  name: string
  gender: string
  total_points: number
  avg_rank: number
  best_rank: number
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
