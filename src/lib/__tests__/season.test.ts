import { test } from 'node:test'
import assert from 'node:assert/strict'
import { displayTime, getSeasonSummary, parseClock, relayRunners } from '../season.ts'
import type { AthleteResult, CompetitionsData } from '../types'

function mk(Name: string, Class: string, Club: string, year: string, seconds: number, Status = 'ok'): AthleteResult {
  return {
    Name, Class, Club, Status,
    class_lower: Class.toLowerCase(),
    is_club_member: Club === 'TriVäst',
    Competition_Year: year,
    Total_Time_Seconds: seconds,
    Total_Time: hms(seconds),
    Overall_Rank: 0,
    Class_Rank: 0,
  }
}

/** 1240.6 → "00:20:40" (truncated, like the CSVs). */
const hms = (sec: number) => [3600, 60, 1].map((u) => String(Math.floor(sec / u) % (u === 3600 ? 100 : 60)).padStart(2, '0')).join(':')

const empty = (): CompetitionsData => ({
  triathlon: [], duathlon: [], swimming: [], cycling: [], running: [], swimrun: [],
})

test('parseClock and displayTime use the official HH:MM:SS time', () => {
  assert.equal(parseClock('01:22:20'), 4940)
  assert.equal(displayTime('00:23:35'), '23:35')
  assert.equal(displayTime('01:22:20'), '1:22:20')
})

test('personal bests: gain comes from the displayed times, not raw decimals', () => {
  const d = empty()
  // 38:41.9 → 33:25.0 is 5:16.9 raw, but people compare 38:41 and 33:25: 5:16
  d.swimming = [mk('M', 'Herr', 'TriVäst', '2025', 2321.9), mk('M', 'Herr', 'TriVäst', '2026', 2005.0)]
  assert.equal(getSeasonSummary(d, '2026').races[0].personalBests?.[0].gain, 316)
})

test('relayRunners: reads the runners from the team label', () => {
  assert.deepEqual(relayRunners('Staffet Gänget (Adam Millberg / Josefine Flod / My Forsberg)'), ['Adam Millberg', 'Josefine Flod', 'My Forsberg'])
  assert.deepEqual(relayRunners('Team without runners'), [])
})

test('participation: starts vs distinct people, members vs guests, relay runners counted once each', () => {
  const d = empty()
  d.running = [mk('Anna', 'Dam', 'TriVäst', '2026', 1300), mk('Bo', 'Herr', 'Gäst', '2026', 1200)]
  d.cycling = [mk('Anna', 'Dam', 'TriVäst', '2026', 1700)]
  d.triathlon = [mk('Team (Anna / Cleo / Dan)', 'Staffet', 'TriVäst', '2026', 4000)]
  const s = getSeasonSummary(d, '2026')
  assert.deepEqual(s.participations, { total: 6, members: 5, guests: 1, youth: 0 })
  assert.deepEqual(s.people, { total: 4, members: 3, guests: 1 })
})

test('podium: club members only, with a note when a guest was faster', () => {
  const d = empty()
  d.swimming = [
    mk('Guest', 'Herr', 'Gäst', '2026', 1400),
    mk('A', 'Herr', 'TriVäst', '2026', 1700), mk('B', 'Herr', 'TriVäst', '2026', 1750),
    mk('C', 'Herr', 'TriVäst', '2026', 1800), mk('D', 'Herr', 'TriVäst', '2026', 1900),
    mk('Kid', 'Ungdom', 'TriVäst', '2026', 1500), mk('Quit', 'Herr', 'TriVäst', '2026', 999999, 'dnf'),
  ]
  const race = getSeasonSummary(d, '2026').races[0]
  assert.deepEqual(race.podium.men.map((e) => e.name), ['A', 'B', 'C'])
  assert.equal(race.fasterGuest.men?.name, 'Guest')
  assert.equal(race.starts.youth, 1)
})

test('records: a 2026 club best beats every earlier comparable year', () => {
  const d = empty()
  d.cycling = [mk('Old', 'Herr', 'TriVäst', '2021', 1418), mk('New', 'Herr', 'TriVäst', '2026', 1415)]
  const race = getSeasonSummary(d, '2026').races[0]
  assert.equal(race.records?.length, 1)
  assert.equal(race.records?.[0].name, 'New')
  assert.equal(race.records?.[0].previous?.name, 'Old')
})

test('records: triathlon ignores the Sätila years (2021–22)', () => {
  const d = empty()
  d.triathlon = [
    mk('Satila', 'Herr', 'TriVäst', '2021', 3600), // faster, but another course
    mk('Inseros', 'Herr', 'TriVäst', '2024', 4100),
    mk('Now', 'Herr', 'TriVäst', '2026', 4000),
  ]
  const race = getSeasonSummary(d, '2026').races[0]
  assert.equal(race.records?.[0].name, 'Now')
  assert.equal(race.records?.[0].previous?.name, 'Inseros')
})

test('swimrun: new course, so no records and no improvements', () => {
  const d = empty()
  d.swimrun = [mk('M', 'Herr', 'TriVäst', '2025', 1700), mk('M', 'Herr', 'TriVäst', '2026', 1600)]
  const race = getSeasonSummary(d, '2026').races[0]
  assert.equal(race.records, null)
  assert.equal(race.personalBests, null)
})

test('personal bests: vs best earlier time, in seconds, members only, all listed', () => {
  const d = empty()
  d.running = [
    // Ann: best earlier 1300 (2023), not 1400 (2025) → gain 60
    mk('Ann', 'Dam', 'TriVäst', '2023', 1300), mk('Ann', 'Dam', 'TriVäst', '2025', 1400), mk('Ann', 'Dam', 'TriVäst', '2026', 1240),
    mk('Ben', 'Herr', 'TriVäst', '2025', 1200), mk('Ben', 'Herr', 'TriVäst', '2026', 1100), // gain 100
    mk('Cat', 'Dam', 'TriVäst', '2025', 1500), mk('Cat', 'Dam', 'TriVäst', '2026', 1490), // gain 10
    mk('Dag', 'Herr', 'TriVäst', '2025', 1300), mk('Dag', 'Herr', 'TriVäst', '2026', 1295), // gain 5, 4th
    mk('Eve', 'Dam', 'TriVäst', '2025', 1200), mk('Eve', 'Dam', 'TriVäst', '2026', 1250), // slower
    mk('Gus', 'Herr', 'Gäst', '2025', 1500), mk('Gus', 'Herr', 'Gäst', '2026', 1000), // guest
    mk('New', 'Herr', 'TriVäst', '2026', 1000), // no earlier race
  ]
  const race = getSeasonSummary(d, '2026').races[0]
  // Every member with a PB, biggest gain first — not just the top 3
  assert.deepEqual(race.personalBests?.map((x) => [x.name, x.gain]), [['Ben', 100], ['Ann', 60], ['Cat', 10], ['Dag', 5]])
  assert.equal(race.personalBests?.[1].previousBest.year, '2023')
  assert.equal(race.comparable, 5)
})

test('season facts: every-race members and new members', () => {
  const d = empty()
  d.running = [mk('All', 'Herr', 'TriVäst', '2026', 1000), mk('Close', 'Herr', 'TriVäst', '2026', 1000.4), mk('Vet', 'Herr', 'TriVäst', '2025', 1100)]
  d.cycling = [mk('All', 'Herr', 'TriVäst', '2026', 1500), mk('Vet', 'Herr', 'TriVäst', '2026', 1600)]
  const s = getSeasonSummary(d, '2026')
  assert.deepEqual(s.everyRace, ['All'])
  assert.deepEqual(s.racesPerMember, { 2: 1, 1: 2 })
  assert.equal(s.newMembers, 2) // All and Close; Vet raced in 2025
})
