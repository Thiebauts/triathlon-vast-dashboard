import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  athleteKey,
  calculateClubMemberRank,
  calculatePoints,
  computeEventPoints,
  computeSplitRanks,
  getAllAthleteNames,
  getAthleteEvents,
  getClubRankings,
  getParticipationByYear,
  getSummaryStats,
  isClubMember,
  isFinisher,
} from '../data.ts'
import type { AthleteResult, CompetitionsData } from '../types.ts'

function mk(partial: Partial<AthleteResult> & { Name: string; Class: string; Club: string; Competition_Year: string }): AthleteResult {
  const cls = partial.Class
  return {
    Bib: '1',
    Total_Time: '00:00:00',
    Total_Time_Seconds: 0,
    Status: 'ok',
    Overall_Rank: 0,
    Class_Rank: 0,
    class_lower: cls.toLowerCase(),
    is_club_member: ['triväst', 'triathlon väst', 'tv'].includes(partial.Club.toLowerCase().trim()),
    ...partial,
  }
}

const empty: CompetitionsData = {
  triathlon: [], duathlon: [], swimming: [], cycling: [], running: [], swimrun: [],
}

// ─── calculatePoints ────────────────────────────────────────────────────────

test('calculatePoints: top 3 use the special table', () => {
  assert.equal(calculatePoints(1), 40)
  assert.equal(calculatePoints(2), 35)
  assert.equal(calculatePoints(3), 30)
})

test('calculatePoints: ranks 4-32 follow 33 - rank', () => {
  assert.equal(calculatePoints(4), 29)
  assert.equal(calculatePoints(10), 23)
  assert.equal(calculatePoints(32), 1)
})

test('calculatePoints: rank > 32 returns 0', () => {
  assert.equal(calculatePoints(33), 0)
  assert.equal(calculatePoints(100), 0)
})

test('calculatePoints: invalid input returns 0', () => {
  assert.equal(calculatePoints(0), 0)
  assert.equal(calculatePoints(-1), 0)
  assert.equal(calculatePoints('not-a-number'), 0)
})

test('calculatePoints: numeric string is parsed', () => {
  assert.equal(calculatePoints('1'), 40)
  assert.equal(calculatePoints('5'), 28)
})

// ─── isClubMember ───────────────────────────────────────────────────────────

test('isClubMember: string overload accepts all known aliases', () => {
  assert.equal(isClubMember('TriVäst'), true)
  assert.equal(isClubMember('triathlon väst'), true)
  assert.equal(isClubMember('  TV  '), true)
  assert.equal(isClubMember('Medlem'), true)
  assert.equal(isClubMember('Other Club'), false)
  assert.equal(isClubMember(''), false)
})

// ─── isFinisher ─────────────────────────────────────────────────────────────

test('isFinisher: ok status with a real time counts', () => {
  const a = mk({ Name: 'A', Class: 'Herr', Club: 'TriVäst', Competition_Year: '2024', Total_Time_Seconds: 1500 })
  assert.equal(isFinisher(a), true)
})

test('isFinisher: rejects dnf/dns status, sentinel times, and missing times', () => {
  const base = { Name: 'A', Class: 'Herr', Club: 'TriVäst', Competition_Year: '2024' }
  assert.equal(isFinisher(mk({ ...base, Status: 'dnf', Total_Time_Seconds: 999999 })), false)
  assert.equal(isFinisher(mk({ ...base, Status: 'dns', Total_Time_Seconds: 1500 })), false)
  assert.equal(isFinisher(mk({ ...base, Status: 'ok', Total_Time_Seconds: 999999 })), false)
  assert.equal(isFinisher(mk({ ...base, Status: 'ok', Total_Time_Seconds: 0 })), false)
})

test('isClubMember: AthleteResult overload reads precomputed flag', () => {
  const member = mk({ Name: 'A', Class: 'Herr', Club: 'TriVäst', Competition_Year: '2024' })
  const guest  = mk({ Name: 'B', Class: 'Herr', Club: 'Other',   Competition_Year: '2024' })
  assert.equal(isClubMember(member), true)
  assert.equal(isClubMember(guest), false)
})

// ─── athleteKey ─────────────────────────────────────────────────────────────

test('athleteKey: distinguishes athletes across years', () => {
  const a = mk({ Name: 'Foo', Class: 'Herr', Club: 'TriVäst', Competition_Year: '2024', Bib: '5' })
  const b = mk({ Name: 'Foo', Class: 'Herr', Club: 'TriVäst', Competition_Year: '2025', Bib: '5' })
  assert.notEqual(athleteKey(a), athleteKey(b))
})

// ─── computeSplitRanks ──────────────────────────────────────────────────────

test('computeSplitRanks: ranks each split independently with rank 1 for fastest', () => {
  const a = mk({ Name: 'A', Class: 'Herr', Club: 'TriVäst', Competition_Year: '2024',
    Swim_Seconds: 700, Bike_Seconds: 2000, Run_Seconds: 1100 })
  const b = mk({ Name: 'B', Class: 'Herr', Club: 'TriVäst', Competition_Year: '2024',
    Swim_Seconds: 800, Bike_Seconds: 1900, Run_Seconds: 1200 })
  const c = mk({ Name: 'C', Class: 'Herr', Club: 'TriVäst', Competition_Year: '2024',
    Swim_Seconds: 600, Bike_Seconds: 2100, Run_Seconds: 1000 })

  const ranks = computeSplitRanks([a, b, c], 'triathlon')
  assert.equal(ranks.get(athleteKey(c))!.swim, 1)
  assert.equal(ranks.get(athleteKey(a))!.swim, 2)
  assert.equal(ranks.get(athleteKey(b))!.swim, 3)
  assert.equal(ranks.get(athleteKey(b))!.bike, 1)
  assert.equal(ranks.get(athleteKey(c))!.run, 1)
})

test('computeSplitRanks: zero/missing splits are excluded from ranking', () => {
  const a = mk({ Name: 'A', Class: 'Herr', Club: 'TriVäst', Competition_Year: '2024', Swim_Seconds: 700 })
  const b = mk({ Name: 'B', Class: 'Herr', Club: 'TriVäst', Competition_Year: '2024', Swim_Seconds: 0 })
  const ranks = computeSplitRanks([a, b], 'triathlon')
  assert.equal(ranks.get(athleteKey(a))!.swim, 1)
  assert.equal(ranks.get(athleteKey(b))!.swim, undefined)
})

test('computeSplitRanks: duathlon uses Run1/Run2 fields', () => {
  const a = mk({ Name: 'A', Class: 'Herr', Club: 'TriVäst', Competition_Year: '2024',
    Run1_Seconds: 1000, Run2_Seconds: 800 })
  const b = mk({ Name: 'B', Class: 'Herr', Club: 'TriVäst', Competition_Year: '2024',
    Run1_Seconds: 900,  Run2_Seconds: 850 })
  const ranks = computeSplitRanks([a, b], 'duathlon')
  assert.equal(ranks.get(athleteKey(b))!.run1, 1)
  assert.equal(ranks.get(athleteKey(a))!.run2, 1)
})

// ─── calculateClubMemberRank ────────────────────────────────────────────────

test('calculateClubMemberRank: ranks members by total time within their class', () => {
  const a = mk({ Name: 'A', Class: 'Herr', Club: 'TriVäst', Competition_Year: '2024', Total_Time_Seconds: 4000 })
  const b = mk({ Name: 'B', Class: 'Herr', Club: 'TriVäst', Competition_Year: '2024', Total_Time_Seconds: 3800 })
  const c = mk({ Name: 'C', Class: 'Dam',  Club: 'TriVäst', Competition_Year: '2024', Total_Time_Seconds: 4500 })
  const guest = mk({ Name: 'G', Class: 'Herr', Club: 'OtherClub', Competition_Year: '2024', Total_Time_Seconds: 3500 })

  const all = [a, b, c, guest]
  assert.equal(calculateClubMemberRank(b, all), 1) // fastest member in Herr
  assert.equal(calculateClubMemberRank(a, all), 2)
  assert.equal(calculateClubMemberRank(c, all), 1) // sole woman
  assert.equal(calculateClubMemberRank(guest, all), 999) // not a member
})

test('calculateClubMemberRank: DNF members are unranked and excluded from the pool', () => {
  const dnf = mk({ Name: 'D', Class: 'Herr', Club: 'TriVäst', Competition_Year: '2024',
    Status: 'dnf', Total_Time: 'DNF', Total_Time_Seconds: 999999 })
  const a = mk({ Name: 'A', Class: 'Herr', Club: 'TriVäst', Competition_Year: '2024', Total_Time_Seconds: 4000 })
  const b = mk({ Name: 'B', Class: 'Herr', Club: 'TriVäst', Competition_Year: '2024', Total_Time_Seconds: 3800 })

  const all = [dnf, a, b]
  assert.equal(calculateClubMemberRank(dnf, all), 999) // did not finish
  assert.equal(calculateClubMemberRank(b, all), 1)
  assert.equal(calculateClubMemberRank(a, all), 2) // DNF takes no rank slot
})

test('calculateClubMemberRank: equal times share the rank (1, 1, 3)', () => {
  const a = mk({ Name: 'A', Class: 'Herr', Club: 'TriVäst', Competition_Year: '2024', Total_Time_Seconds: 3800 })
  const b = mk({ Name: 'B', Class: 'Herr', Club: 'TriVäst', Competition_Year: '2024', Total_Time_Seconds: 3800 })
  const c = mk({ Name: 'C', Class: 'Herr', Club: 'TriVäst', Competition_Year: '2024', Total_Time_Seconds: 4000 })

  const all = [a, b, c]
  assert.equal(calculateClubMemberRank(a, all), 1)
  assert.equal(calculateClubMemberRank(b, all), 1)
  assert.equal(calculateClubMemberRank(c, all), 3) // two athletes ahead
})

// ─── computeEventPoints ─────────────────────────────────────────────────────

test('computeEventPoints: awards points by club-member rank within each gender class', () => {
  const a = mk({ Name: 'A', Class: 'Herr', Club: 'TriVäst', Competition_Year: '2024', Total_Time_Seconds: 4000 })
  const b = mk({ Name: 'B', Class: 'Herr', Club: 'TriVäst', Competition_Year: '2024', Total_Time_Seconds: 3800 })
  const c = mk({ Name: 'C', Class: 'Dam',  Club: 'TriVäst', Competition_Year: '2024', Total_Time_Seconds: 4500 })
  const faster_guest = mk({ Name: 'G', Class: 'Herr', Club: 'OtherClub', Competition_Year: '2024', Total_Time_Seconds: 3000 })

  const pts = computeEventPoints([a, b, c, faster_guest])
  assert.equal(pts.get(athleteKey(b)), 40) // fastest Herr member => 1st
  assert.equal(pts.get(athleteKey(a)), 35) // 2nd Herr member; guest doesn't displace
  assert.equal(pts.get(athleteKey(c)), 40) // sole Dam member => 1st in her class
})

test('computeEventPoints: non-members and youth/barn earn 0', () => {
  const member = mk({ Name: 'M', Class: 'Herr',   Club: 'TriVäst',  Competition_Year: '2024', Total_Time_Seconds: 1500 })
  const guest  = mk({ Name: 'G', Class: 'Herr',   Club: 'OtherClub', Competition_Year: '2024', Total_Time_Seconds: 1300 })
  const youth  = mk({ Name: 'Y', Class: 'Ungdom', Club: 'TriVäst',  Competition_Year: '2024', Total_Time_Seconds: 1400 })

  const pts = computeEventPoints([member, guest, youth])
  assert.equal(pts.get(athleteKey(member)), 40)
  assert.equal(pts.get(athleteKey(guest)), 0)
  assert.equal(pts.get(athleteKey(youth)), 0)
})

test('computeEventPoints: DNF members earn 0 and do not displace finishers', () => {
  const dnf = mk({ Name: 'D', Class: 'Herr', Club: 'TriVäst', Competition_Year: '2024',
    Status: 'dnf', Total_Time: 'DNF', Total_Time_Seconds: 999999 })
  const a = mk({ Name: 'A', Class: 'Herr', Club: 'TriVäst', Competition_Year: '2024', Total_Time_Seconds: 4000 })

  const pts = computeEventPoints([dnf, a])
  assert.equal(pts.get(athleteKey(dnf)), 0)
  assert.equal(pts.get(athleteKey(a)), 40)
})

test('computeEventPoints: tied members share the points for their rank', () => {
  const a = mk({ Name: 'A', Class: 'Herr', Club: 'TriVäst', Competition_Year: '2024', Total_Time_Seconds: 3800 })
  const b = mk({ Name: 'B', Class: 'Herr', Club: 'TriVäst', Competition_Year: '2024', Total_Time_Seconds: 3800 })
  const c = mk({ Name: 'C', Class: 'Herr', Club: 'TriVäst', Competition_Year: '2024', Total_Time_Seconds: 4000 })

  const pts = computeEventPoints([a, b, c])
  assert.equal(pts.get(athleteKey(a)), 40) // shared 1st
  assert.equal(pts.get(athleteKey(b)), 40) // shared 1st
  assert.equal(pts.get(athleteKey(c)), 30) // rank 3 after the tie
})

test('computeEventPoints: each year is ranked independently', () => {
  const a23 = mk({ Name: 'A', Class: 'Herr', Club: 'TriVäst', Competition_Year: '2023', Bib: '1', Total_Time_Seconds: 4000 })
  const a24 = mk({ Name: 'A', Class: 'Herr', Club: 'TriVäst', Competition_Year: '2024', Bib: '1', Total_Time_Seconds: 4000 })
  const b24 = mk({ Name: 'B', Class: 'Herr', Club: 'TriVäst', Competition_Year: '2024', Bib: '2', Total_Time_Seconds: 3800 })

  const pts = computeEventPoints([a23, a24, b24])
  assert.equal(pts.get(athleteKey(a23)), 40) // sole member in 2023
  assert.equal(pts.get(athleteKey(b24)), 40) // fastest in 2024
  assert.equal(pts.get(athleteKey(a24)), 35) // 2nd in 2024
})

// ─── getClubRankings ────────────────────────────────────────────────────────

test('getClubRankings: aggregates points across sports and years, sorted by total', () => {
  const data: CompetitionsData = { ...empty }
  data.triathlon = [
    mk({ Name: 'Anna', Class: 'Dam', Club: 'TriVäst', Competition_Year: '2024', Total_Time_Seconds: 3600 }),
    mk({ Name: 'Beth', Class: 'Dam', Club: 'TriVäst', Competition_Year: '2024', Total_Time_Seconds: 3700 }),
  ]
  data.running = [
    mk({ Name: 'Anna', Class: 'Dam', Club: 'TriVäst', Competition_Year: '2024', Total_Time_Seconds: 1500 }),
    mk({ Name: 'Beth', Class: 'Dam', Club: 'TriVäst', Competition_Year: '2024', Total_Time_Seconds: 1400 }),
  ]
  const rankings = getClubRankings(data, 'all', 'all')
  assert.equal(rankings.length, 2)
  // Anna: 1st in triathlon (40), 2nd in running (35) = 75
  // Beth: 2nd in triathlon (35), 1st in running (40) = 75 — tie
  assert.equal(rankings[0].total_points, 75)
  assert.equal(rankings[1].total_points, 75)
  assert.deepEqual(rankings.map((r) => r.name).sort(), ['Anna', 'Beth'])
})

test('getClubRankings: gender filter excludes the other class', () => {
  const data: CompetitionsData = { ...empty }
  data.running = [
    mk({ Name: 'Anna', Class: 'Dam',  Club: 'TriVäst', Competition_Year: '2024', Total_Time_Seconds: 1500 }),
    mk({ Name: 'Carl', Class: 'Herr', Club: 'TriVäst', Competition_Year: '2024', Total_Time_Seconds: 1300 }),
  ]
  const women = getClubRankings(data, 'women', 'all')
  const men   = getClubRankings(data, 'men', 'all')
  assert.deepEqual(women.map((r) => r.name), ['Anna'])
  assert.deepEqual(men.map((r) => r.name), ['Carl'])
})

test('getClubRankings: year filter restricts the dataset', () => {
  const data: CompetitionsData = { ...empty }
  data.running = [
    mk({ Name: 'Anna', Class: 'Dam', Club: 'TriVäst', Competition_Year: '2023', Total_Time_Seconds: 1500 }),
    mk({ Name: 'Beth', Class: 'Dam', Club: 'TriVäst', Competition_Year: '2024', Total_Time_Seconds: 1400 }),
  ]
  const r2024 = getClubRankings(data, 'all', '2024')
  assert.deepEqual(r2024.map((r) => r.name), ['Beth'])
})

test('getClubRankings: warns when the same Name appears in two different Classes', () => {
  const data: CompetitionsData = { ...empty }
  data.running = [
    mk({ Name: 'Twin', Class: 'Herr', Club: 'TriVäst', Competition_Year: '2024', Total_Time_Seconds: 1500 }),
    mk({ Name: 'Twin', Class: 'Dam',  Club: 'TriVäst', Competition_Year: '2024', Total_Time_Seconds: 1400 }),
  ]
  const calls: string[] = []
  const original = console.warn
  console.warn = (msg: unknown) => { calls.push(String(msg)) }
  try {
    getClubRankings(data, 'all', 'all')
  } finally {
    console.warn = original
  }
  assert.equal(calls.length, 1, 'expected exactly one warning')
  assert.match(calls[0], /Name collision/i)
  assert.match(calls[0], /Twin/)
})

test('getClubRankings: does NOT warn for normal one-class members', () => {
  const data: CompetitionsData = { ...empty }
  data.running = [
    mk({ Name: 'Solo', Class: 'Herr', Club: 'TriVäst', Competition_Year: '2023', Total_Time_Seconds: 1500 }),
    mk({ Name: 'Solo', Class: 'Herr', Club: 'TriVäst', Competition_Year: '2024', Total_Time_Seconds: 1400 }),
  ]
  const calls: string[] = []
  const original = console.warn
  console.warn = (msg: unknown) => { calls.push(String(msg)) }
  try {
    getClubRankings(data, 'all', 'all')
  } finally {
    console.warn = original
  }
  assert.equal(calls.length, 0)
})

test('getClubRankings: DNF results earn no points and DNF-only athletes are absent', () => {
  const data: CompetitionsData = { ...empty }
  data.running = [
    mk({ Name: 'Finisher', Class: 'Herr', Club: 'TriVäst', Competition_Year: '2024', Total_Time_Seconds: 1500 }),
    mk({ Name: 'Quitter',  Class: 'Herr', Club: 'TriVäst', Competition_Year: '2024',
      Status: 'dnf', Total_Time: 'DNF', Total_Time_Seconds: 999999 }),
  ]
  const rankings = getClubRankings(data, 'all', 'all')
  assert.deepEqual(rankings.map((r) => r.name), ['Finisher'])
  assert.equal(rankings[0].total_points, 40)
})

test('getClubRankings: non-members are excluded', () => {
  const data: CompetitionsData = { ...empty }
  data.running = [
    mk({ Name: 'Member', Class: 'Herr', Club: 'TriVäst',  Competition_Year: '2024', Total_Time_Seconds: 1500 }),
    mk({ Name: 'Guest',  Class: 'Herr', Club: 'OtherClub', Competition_Year: '2024', Total_Time_Seconds: 1300 }),
  ]
  const rankings = getClubRankings(data, 'all', 'all')
  assert.deepEqual(rankings.map((r) => r.name), ['Member'])
})

// ─── getAthleteEvents ───────────────────────────────────────────────────────

test('getAthleteEvents: returns one event per (sport, year) for the named athlete', () => {
  const data: CompetitionsData = { ...empty }
  data.triathlon = [
    mk({ Name: 'Anna', Class: 'Dam', Club: 'TriVäst', Competition_Year: '2024',
      Total_Time: '01:00:00', Total_Time_Seconds: 3600, Class_Rank: 1, Overall_Rank: 5 }),
    mk({ Name: 'Other', Class: 'Dam', Club: 'TriVäst', Competition_Year: '2024',
      Total_Time: '01:10:00', Total_Time_Seconds: 4200, Class_Rank: 2, Overall_Rank: 6 }),
  ]
  const events = getAthleteEvents(data, 'Anna')
  assert.equal(Object.keys(events).length, 1)
  const e = events['triathlon_2024']
  assert.equal(e.year, '2024')
  assert.equal(e.rank, 1)
  assert.equal(e.is_club_member, true)
  assert.equal(e.points, 40) // first place => 40 points
  assert.equal(e.class_total, 2)
  assert.equal(e.overall_total, 2)
})

test('getAthleteEvents: DNF events have 0 points, finished=false, N/A club rank', () => {
  const data: CompetitionsData = { ...empty }
  data.duathlon = [
    mk({ Name: 'Ida', Class: 'Dam', Club: 'TriVäst', Competition_Year: '2025',
      Status: 'dnf', Total_Time: 'DNF', Total_Time_Seconds: 999999 }),
    mk({ Name: 'Other', Class: 'Dam', Club: 'TriVäst', Competition_Year: '2025',
      Total_Time: '01:10:00', Total_Time_Seconds: 4200, Class_Rank: 1, Overall_Rank: 1 }),
  ]
  const e = getAthleteEvents(data, 'Ida')['duathlon_2025']
  assert.equal(e.finished, false)
  assert.equal(e.points, 0)
  assert.equal(e.club_member_rank, 'N/A')
  assert.equal(e.class_total, 1)   // denominators count finishers only
  assert.equal(e.overall_total, 1)
})

test('getAthleteEvents: guests get 0 points and N/A club rank', () => {
  const data: CompetitionsData = { ...empty }
  data.running = [
    mk({ Name: 'Guest', Class: 'Herr', Club: 'OtherClub', Competition_Year: '2024',
      Total_Time: '00:20:00', Total_Time_Seconds: 1200, Class_Rank: 1, Overall_Rank: 1 }),
  ]
  const events = getAthleteEvents(data, 'Guest')
  const e = events['running_2024']
  assert.equal(e.is_club_member, false)
  assert.equal(e.points, 0)
  assert.equal(e.club_member_rank, 'N/A')
})

// ─── getSummaryStats ────────────────────────────────────────────────────────

test('getSummaryStats: counts unique years, competitions, and members', () => {
  const data: CompetitionsData = { ...empty }
  data.running = [
    mk({ Name: 'A', Class: 'Herr', Club: 'TriVäst',   Competition_Year: '2023', Total_Time_Seconds: 1 }),
    mk({ Name: 'B', Class: 'Herr', Club: 'OtherClub', Competition_Year: '2023', Total_Time_Seconds: 2 }),
    mk({ Name: 'C', Class: 'Herr', Club: 'TriVäst',   Competition_Year: '2024', Total_Time_Seconds: 3 }),
  ]
  const s = getSummaryStats(data)
  assert.equal(s.competitions_count, 2) // running held in 2023 + 2024
  assert.equal(s.total_participants, 3)
  assert.equal(s.total_club_members, 2)
  assert.deepEqual(s.years_covered, ['2024', '2023'])
})

// ─── getAllAthleteNames ─────────────────────────────────────────────────────

test('getAllAthleteNames: returns sorted unique names across sports', () => {
  const data: CompetitionsData = { ...empty }
  data.running = [
    mk({ Name: 'Beth', Class: 'Dam', Club: 'TriVäst', Competition_Year: '2024', Total_Time_Seconds: 1 }),
  ]
  data.triathlon = [
    mk({ Name: 'Anna', Class: 'Dam', Club: 'TriVäst', Competition_Year: '2024', Total_Time_Seconds: 1 }),
    mk({ Name: 'Anna', Class: 'Dam', Club: 'TriVäst', Competition_Year: '2025', Total_Time_Seconds: 1 }),
  ]
  assert.deepEqual(getAllAthleteNames(data), ['Anna', 'Beth'])
})

// ─── getParticipationByYear ─────────────────────────────────────────────────

test('getParticipationByYear: tallies participants per sport per year, sorted ascending', () => {
  const data: CompetitionsData = { ...empty }
  data.triathlon = [
    mk({ Name: 'A', Class: 'Herr', Club: 'TriVäst', Competition_Year: '2024', Total_Time_Seconds: 1 }),
    mk({ Name: 'B', Class: 'Herr', Club: 'TriVäst', Competition_Year: '2024', Total_Time_Seconds: 2 }),
  ]
  data.running = [
    mk({ Name: 'C', Class: 'Herr', Club: 'TriVäst', Competition_Year: '2023', Total_Time_Seconds: 1 }),
  ]
  const out = getParticipationByYear(data)
  assert.deepEqual(out, [
    { year: '2023', triathlon: 0, duathlon: 0, swimming: 0, cycling: 0, running: 1, swimrun: 0 },
    { year: '2024', triathlon: 2, duathlon: 0, swimming: 0, cycling: 0, running: 0, swimrun: 0 },
  ])
})
