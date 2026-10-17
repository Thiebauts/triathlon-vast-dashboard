// Pure computation — safe to import from both Server and Client Components
//
// The season recap as prose: a short paragraph for the top of the Season tab
// (and later the members' email) and a longer, race-by-race version. Every
// figure comes from getSeasonSummary(), so the text can't drift from the page.

import { tf, t } from './translations.ts'
import { displayTime, type SeasonSummary } from './season.ts'
import type { Lang } from './types'

/** 316 → "5:16" */
function gain(seconds: number): string {
  const m = Math.floor(seconds / 60)
  return `${m}:${String(seconds % 60).padStart(2, '0')}`
}

/** "A", "A and B", "A, B and C" */
function list(items: string[], lang: Lang): string {
  if (items.length <= 1) return items.join('')
  return `${items.slice(0, -1).join(', ')} ${t('season_and', lang)} ${items[items.length - 1]}`
}

const sportName = (sport: string, lang: Lang) => t(sport, lang).toLowerCase()

export function seasonStory(s: SeasonSummary, lang: Lang): { short: string; long: string[] } {
  const comparable = s.races.filter((r) => r.personalBests !== null)
  const pbs = comparable.reduce((n, r) => n + (r.personalBests?.length ?? 0), 0)
  const newRecords = s.races.flatMap((r) => (r.records ?? []).map((rec) => ({ ...rec, sport: r.sport })))

  const records = newRecords.length === 1
    ? tf('season_story_record_one', lang, { name: newRecords[0].name, sport: sportName(newRecords[0].sport, lang) })
    : newRecords.length > 1 ? tf('season_story_record_many', lang, { n: newRecords.length }) : ''

  const short = tf('season_story_short', lang, {
    year: s.year, races: s.races.length, starts: s.participations.total, people: s.people.total,
    members: s.people.members, guests: s.people.guests, newMembers: s.newMembers, pbs, records,
    menWinner: s.pointsPodium.men[0]?.name ?? '—', womenWinner: s.pointsPodium.women[0]?.name ?? '—',
  })

  const long: string[] = []

  const biggest = [...s.races].sort((a, b) => b.starts.total - a.starts.total)[0]
  const changes = s.races
    .filter((r) => r.startsPreviousYear !== null)
    .map((r) => `${sportName(r.sport, lang)} ${r.startsPreviousYear} → ${r.starts.total}`)
  if (biggest) {
    long.push(tf('season_story_participation', lang, {
      sport: sportName(biggest.sport, lang), n: biggest.starts.total, prev: Number(s.year) - 1, changes: changes.join(', '),
    }))
  }

  const fourPlus = Object.entries(s.racesPerMember).filter(([n]) => Number(n) >= 4).reduce((k, [, c]) => k + c, 0)
  long.push(s.everyRace.length
    ? tf('season_story_loyalty_all', lang, { names: list(s.everyRace, lang), n: s.races.length, k: fourPlus })
    : tf('season_story_loyalty', lang, { k: fourPlus }))

  for (const r of s.races) {
    const winners = [r.podium.men[0]?.name, r.podium.women[0]?.name].filter((n): n is string => !!n)
    const parts = [tf('season_story_race_winners', lang, { sport: t(r.sport, lang), winners: list(winners, lang) })]
    for (const rec of r.records ?? []) parts.push(tf('season_story_race_record', lang, { name: rec.name, time: displayTime(rec.time) }))
    if (r.personalBests === null) parts.push(t('season_story_race_new_course', lang))
    else if (r.personalBests.length === 0) parts.push(t('season_story_race_no_pbs', lang))
    else if (r.personalBests.length === 1) parts.push(tf('season_story_race_pb_one', lang, { name: r.personalBests[0].name, gain: gain(r.personalBests[0].gain) }))
    else parts.push(tf('season_story_race_pbs', lang, { n: r.personalBests.length, name: r.personalBests[0].name, gain: gain(r.personalBests[0].gain) }))
    long.push(parts.join(' '))
  }

  const [m1, m2, m3] = s.pointsPodium.men
  const [w1, w2, w3] = s.pointsPodium.women
  if (m1 && m2 && m3 && w1 && w2 && w3) {
    long.push(tf('season_story_points', lang, {
      m1: m1.name, mp: m1.points, m2: m2.name, m3: m3.name, w1: w1.name, wp: w1.points, w2: w2.name, w3: w3.name,
    }))
  }

  return { short, long }
}
