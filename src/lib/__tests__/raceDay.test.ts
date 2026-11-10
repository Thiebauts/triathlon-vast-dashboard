import { test } from 'node:test'
import assert from 'node:assert/strict'
import { getFastestOfDay, getResultTags } from '../raceDay.ts'
import { athleteKey } from '../data.ts'
import type { AthleteResult } from '../types'

const hms = (sec: number) => [3600, 60, 1].map((u) => String(Math.floor(sec / u) % (u === 3600 ? 100 : 60)).padStart(2, '0')).join(':')

function mk(Name: string, Class: string, year: string, seconds: number, extra: Partial<AthleteResult> = {}): AthleteResult {
  return {
    Name, Class, Club: 'TriVäst', Status: 'ok', class_lower: Class.toLowerCase(), is_club_member: true,
    Competition_Year: year, Total_Time_Seconds: seconds, Total_Time: hms(seconds), Overall_Rank: 0, Class_Rank: 0, ...extra,
  }
}

test('debut on a first start, PB only when faster than the best earlier adult time', () => {
  const rows = [
    mk('Ann', 'Dam', '2026', 1200),            // first start ever → debut
    mk('Bo', 'Herr', '2025', 1100), mk('Bo', 'Herr', '2026', 1050),   // faster → PB
    mk('Cy', 'Herr', '2024', 1000), mk('Cy', 'Herr', '2026', 1050),   // slower → nothing
    mk('Di', 'Ungdom', '2025', 900), mk('Di', 'Herr', '2026', 1300),  // raced before, only youth → no tag
    mk('Ed', 'Herr', '2025', 1000.4), mk('Ed', 'Herr', '2026', 1000.1), // same official time → no PB
    mk('Team (A / B / C)', 'Staffet', '2026', 900),                   // relay → no tag
  ]
  const raw = getResultTags(rows, 'running', '2026')
  const byName = new Map(rows.filter((r) => r.Competition_Year === '2026').map((r) => [r.Name, athleteKey(r)]))
  const tags = { get: (n: string) => raw.get(byName.get(n.split('|')[0])!), has: (n: string) => raw.has(byName.get(n.split('|')[0])!), size: raw.size }
  assert.equal(tags.get('Ann|2026'), 'debut')
  assert.equal(tags.get('Bo|2026'), 'pb')
  assert.equal(tags.has('Cy|2026'), false)
  assert.equal(tags.has('Di|2026'), false)
  assert.equal(tags.has('Ed|2026'), false)
  assert.equal(tags.size, 2)
})

test('no PB across a course change (triathlon before 2023)', () => {
  const rows = [mk('Bo', 'Herr', '2022', 5000), mk('Bo', 'Herr', '2023', 4000)]
  assert.equal(getResultTags(rows, 'triathlon', '2023').size, 0)
})

test('fastest of the day per gender, splits included, youth and relays left out', () => {
  const rows = [
    mk('Al', 'Herr', '2026', 4000, { T1_Seconds: 30, T2_Seconds: 20, Swim_Seconds: 700, Swim_Time: '00:11:40', Bike_Seconds: 2000, Bike_Time: '00:33:20', Run_Seconds: 1250, Run_Time: '00:20:50' }),
    mk('Bert', 'Herr', '2026', 4100, { T1_Seconds: 60, T2_Seconds: 40, Swim_Seconds: 600, Swim_Time: '00:10:00', Bike_Seconds: 2200, Bike_Time: '00:36:40', Run_Seconds: 1200, Run_Time: '00:20:00', is_club_member: false }),
    mk('Cia', 'Dam', '2026', 5100, { T1_Seconds: 60, T2_Seconds: 40, Swim_Seconds: 800, Swim_Time: '00:13:20', Bike_Seconds: 2800, Bike_Time: '00:46:40', Run_Seconds: 1400, Run_Time: '00:23:20' }),
    mk('Kid', 'Ungdom', '2026', 2000, { Swim_Seconds: 300, Swim_Time: '00:05:00' }),
    mk('Team (A / B / C)', 'Staffet', '2026', 3900, { Swim_Seconds: 500, Swim_Time: '00:08:20' }),
  ]
  const f = getFastestOfDay(rows, 'triathlon', '2026')
  assert.deepEqual(f.map((l) => l.leg), ['finish', 'swim', 'bike', 'run'])
  assert.equal(f[0].men?.name, 'Al')
  assert.equal(f[1].men?.name, 'Bert')
  assert.equal(f[1].men?.guest, true)
  assert.equal(f[2].men?.name, 'Al')
  assert.equal(f[0].women?.name, 'Cia')
  assert.equal(getFastestOfDay(rows, 'running', '2026').length, 1)
})

test('PB on the old course too: Sätila 2021 → 2022 compares, Sätila → Inseros does not', () => {
  const rows = [mk('Bo', 'Herr', '2021', 5000), mk('Bo', 'Herr', '2022', 4900), mk('Bo', 'Herr', '2023', 4000), mk('Bo', 'Herr', '2024', 3990)]
  assert.equal(getResultTags(rows, 'triathlon', '2022').get(athleteKey(rows[1])), 'pb')
  assert.equal(getResultTags(rows, 'triathlon', '2023').size, 0)
  assert.equal(getResultTags(rows, 'triathlon', '2024').get(athleteKey(rows[3])), 'pb')
  // Swimrun: Sisjön 2025 never compares with Frökens udde 2026, but 2026 → 2027 does
  const sr = [mk('Cy', 'Herr', '2025', 1500), mk('Cy', 'Herr', '2026', 1400), mk('Cy', 'Herr', '2027', 1390)]
  assert.equal(getResultTags(sr, 'swimrun', '2026').size, 0)
  assert.equal(getResultTags(sr, 'swimrun', '2027').get(athleteKey(sr[2])), 'pb')
})

test('fastest split ignores a split that swallowed a missed timing mat', () => {
  const ok = { T1_Seconds: 60, T2_Seconds: 40, Swim_Seconds: 800, Swim_Time: '00:13:20', Bike_Seconds: 2700, Bike_Time: '00:45:00', Run_Seconds: 1500, Run_Time: '00:25:00' }
  const rows = [
    mk('Amy', 'Dam', '2023', 5100, ok),
    // Missed the T1 mat: T1 is 0 and "bike" (53:04) is the clock at bike-in — her real bike was faster than Amy's
    mk('Jo', 'Dam', '2023', 4671, { T1_Seconds: 0, T2_Seconds: 40, Swim_Seconds: 719, Swim_Time: '00:11:59', Bike_Seconds: 3184, Bike_Time: '00:53:04', Run_Seconds: 1448, Run_Time: '00:24:08' }),
  ]
  const f = getFastestOfDay(rows, 'triathlon', '2023')
  assert.equal(f[0].women?.name, 'Jo')   // finish time
  assert.equal(f[1].women?.name, 'Jo')   // her swim was timed correctly
  // Bike: Jo's 53:04 is the clock at bike-in. Minus her swim she rode at most
  // 41:05, faster than Amy's 45:00 — so nobody can be named fastest
  assert.equal(f[2].women, null)
  assert.equal(f[3].women?.name, 'Jo')   // run
  // Had Amy ridden 40:00, she would be the fastest for certain
  const amy = mk('Amy', 'Dam', '2023', 4800, { ...ok, Bike_Seconds: 2400, Bike_Time: '00:40:00' })
  assert.equal(getFastestOfDay([amy, rows[1]], 'triathlon', '2023')[2].women?.name, 'Amy')
})
