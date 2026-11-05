import { test } from 'node:test'
import assert from 'node:assert/strict'
import { getClubRecords, multiRecordHolders } from '../records.ts'
import type { AthleteResult, CompetitionsData } from '../types'

const hms = (sec: number) => [3600, 60, 1].map((u) => String(Math.floor(sec / u) % (u === 3600 ? 100 : 60)).padStart(2, '0')).join(':')
function mk(Name: string, Class: string, year: string, seconds: number, member = true): AthleteResult {
  return { Name, Class, Club: member ? 'TriVäst' : 'Other', Status: 'ok', class_lower: Class.toLowerCase(), is_club_member: member,
    Competition_Year: year, Total_Time_Seconds: seconds, Total_Time: hms(seconds), Overall_Rank: 0, Class_Rank: 0 }
}
const empty = (): CompetitionsData => ({ triathlon: [], duathlon: [], swimming: [], cycling: [], running: [], swimrun: [] })

test('records count members only and split by course', () => {
  const d = empty()
  d.running = [mk('Fast Guest', 'Herr', '2025', 800, false), mk('Al', 'Herr', '2024', 950), mk('Bo', 'Herr', '2026', 940), mk('Kid', 'Ungdom', '2026', 700), mk('Cia', 'Dam', '2025', 1130)]
  d.triathlon = [mk('Al', 'Herr', '2022', 3600), mk('Bo', 'Herr', '2024', 3900)]
  const { current, earlier } = getClubRecords(d)
  const running = current.find((r) => r.sport === 'running')!
  assert.equal(running.men?.name, 'Bo')
  assert.equal(running.women?.name, 'Cia')
  const tri = current.find((r) => r.sport === 'triathlon')!
  assert.equal(tri.place, 'Inseros')
  assert.equal(tri.men?.name, 'Bo')                  // 2022 Sätila time doesn't count on Inseros
  assert.equal(earlier.find((r) => r.sport === 'triathlon')?.men?.name, 'Al')
  assert.equal(current.find((r) => r.sport === 'cycling')?.men, null)
})

test('multi-record holders', () => {
  const d = empty()
  d.running = [mk('Em', 'Dam', '2025', 1130)]
  d.cycling = [mk('Em', 'Dam', '2025', 1600)]
  d.swimming = [mk('Jo', 'Dam', '2025', 1900)]
  const { current } = getClubRecords(d)
  assert.deepEqual(multiRecordHolders(current, 'women'), [{ name: 'Em', count: 2 }])
})
