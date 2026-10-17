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
  const num = (n: number) => n.toLocaleString(lang === 'sv' ? 'sv-SE' : 'en-GB', { maximumFractionDigits: 1 })
  const cap = (text: string) => text.charAt(0).toUpperCase() + text.slice(1)

  // 1. The season's winners first: points standings and congratulations
  const [m1, m2, m3] = s.pointsPodium.men
  const [w1, w2, w3] = s.pointsPodium.women
  if (m1 && m2 && m3 && w1 && w2 && w3) {
    long.push(`${tf('season_story_points', lang, {
      m1: m1.name, mp: m1.points, m2: m2.name, m3: m3.name, w1: w1.name, wp: w1.points, w2: w2.name, w3: w3.name,
    })} ${tf('season_story_congrats', lang, { m: m1.name, w: w1.name, year: s.year })}`)
  }

  // 2. The season against earlier years
  const now = s.history[s.history.length - 1]
  const earlierYears = s.history.slice(0, -1)
  const prev = earlierYears[earlierYears.length - 1]
  if (now) {
    const trend = [earlierYears.length && earlierYears.every((h) => h.starts < now.starts)
      ? tf('season_story_trend_record', lang, { starts: now.starts, year: now.year, first: s.history[0].year })
      : tf('season_story_trend', lang, { year: now.year, starts: now.starts })]
    if (prev) {
      const older = earlierYears.slice(0, -1)
      const min = Math.min(...older.map((h) => h.starts))
      const max = Math.max(...older.map((h) => h.starts))
      const earlier = !older.length ? ''
        : min === max
          ? tf('season_story_trend_earlier_same', lang, { min, from: older.length > 1 ? `${older[0].year}–${older[older.length - 1].year}` : older[0].year })
        : tf('season_story_trend_earlier', lang, { min, max, from: older[0].year, to: older[older.length - 1].year })
      trend.push(tf('season_story_trend_prev', lang, { prevStarts: prev.starts, prev: prev.year, earlier }))
      const avg = Math.round((now.starts / now.races) * 10) / 10
      const prevAvg = Math.round((prev.starts / prev.races) * 10) / 10
      const key = avg > prevAvg ? 'season_story_trend_avg_up' : avg < prevAvg ? 'season_story_trend_avg_down' : 'season_story_trend_avg_same'
      trend.push(tf(key, lang, { avg: num(avg), prevAvg: num(prevAvg), prev: prev.year }))
    }
    long.push(trend.join(' '))
  }

  // 3. Race by race against last year, in words
  const changed = s.races
    .filter((r) => r.startsPreviousYear !== null && r.startsPreviousYear !== r.starts.total)
    .map((r) => ({ sport: sportName(r.sport, lang), a: r.startsPreviousYear!, b: r.starts.total }))
  const grew = changed.filter((c) => c.b > c.a).sort((x, y) => (y.b - y.a) - (x.b - x.a))
  const fewer = changed.filter((c) => c.b < c.a).sort((x, y) => (x.b - x.a) - (y.b - y.a))
  const items = (cs: typeof changed) => list(cs.map((c) => tf('season_story_change_item', lang, c)), lang)
  const races: string[] = []
  if (grew.length) races.push(tf('season_story_grew_most', lang, { sport: cap(grew[0].sport), a: grew[0].a, b: grew[0].b }))
  const rest = grew.slice(1)
  if (rest.length && fewer.length) races.push(tf('season_story_also_grew_fewer', lang, { grew: cap(items(rest)), fewer: items(fewer) }))
  else if (rest.length) races.push(tf('season_story_also_grew', lang, { grew: cap(items(rest)) }))
  else if (fewer.length) races.push(tf('season_story_fewer', lang, { fewer: cap(items(fewer)) }))
  if (races.length) long.push(races.join(' '))

  // 4. Loyalty
  const fourPlus = Object.entries(s.racesPerMember).filter(([n]) => Number(n) >= 4).reduce((k, [, c]) => k + c, 0)
  long.push(s.everyRace.length
    ? tf('season_story_loyalty_all', lang, { names: list(s.everyRace, lang), n: s.races.length, k: fourPlus })
    : tf('season_story_loyalty', lang, { k: fourPlus }))

  // 5. Each race: club champions, record, every personal best
  for (const r of s.races) {
    const winners = [r.podium.men[0]?.name, r.podium.women[0]?.name].filter((n): n is string => !!n)
    const parts = [tf('season_story_race_winners', lang, { sport: t(r.sport, lang), winners: list(winners, lang) })]
    for (const rec of r.records ?? []) parts.push(tf('season_story_race_record', lang, { name: rec.name, time: displayTime(rec.time) }))
    const pbs = r.personalBests
    if (pbs === null) parts.push(t('season_story_race_new_course', lang))
    else if (pbs.length === 0) parts.push(t('season_story_race_no_pbs', lang))
    else {
      const names = list(pbs.map((p) => `${p.name} (−${gain(p.gain)})`), lang)
      parts.push(tf(pbs.length === 1 ? 'season_story_race_pb_one' : 'season_story_race_pbs', lang, { n: pbs.length, list: names }))
    }
    long.push(parts.join(' '))
  }

  // 6. Newcomers last: always good to welcome them by name
  const { members: newM, guests: newG } = s.newcomers
  if (newM.length || newG.length) {
    const guests = newG.length ? tf('season_story_welcome_guests', lang, { names: list(newG, lang) }) : ''
    long.push(newG.length
      ? tf('season_story_welcome', lang, { n: newM.length + newG.length, m: newM.length, g: newG.length, year: s.year, members: list(newM, lang), guests })
      : tf('season_story_welcome_members', lang, { n: newM.length, year: s.year, members: list(newM, lang) }))
  }

  return { short, long }
}
