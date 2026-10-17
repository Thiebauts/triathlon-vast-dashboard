// Prints a season recap as Markdown, for checking every number before it is
// published (email, Season tab). Run from the repo root:
//   node --experimental-strip-types scripts/season-review.ts 2026 > SEASON_2026_REVIEW.md
import { loadAllCompetitions } from '../src/lib/loader.ts'
import { COURSES, getSeasonSummary } from '../src/lib/season.ts'
import { seasonStory } from '../src/lib/seasonStory.ts'

const year = process.argv[2] ?? String(new Date().getFullYear())
const s = getSeasonSummary(loadAllCompetitions(), year)
const mmss = (sec: number) => {
  const t = Math.floor(sec); const h = Math.floor(t / 3600); const m = Math.floor((t % 3600) / 60); const x = t % 60
  return h ? `${h}:${String(m).padStart(2, '0')}:${String(x).padStart(2, '0')}` : `${m}:${String(x).padStart(2, '0')}`
}
const gainStr = (sec: number) => `−${mmss(sec)}`
const out: string[] = []
const p = (l = '') => out.push(l)

p(`# Season ${year} — review before publishing`)
p()
p(`Generated from \`src/lib/season.ts\` (the same code the Season tab and email will use).`)
p(`Name, club and time corrections already applied. Check every line; tell Claude what is wrong.`)
p()
const story = seasonStory(s, 'en')
p(`## Summary text (as shown on the Season tab)`)
p()
p(`> ${story.short}`)
p()
story.long.forEach((para, i) => { p(`> ${para}`); if (i < story.long.length - 1) p('>') })
p()
p(`## Participation`)
p()
p(`| | Total | Members | Guests |`)
p(`|---|---|---|---|`)
p(`| Participations (one per person per race) | ${s.participations.total} | ${s.participations.members} | ${s.participations.guests} |`)
p(`| Distinct people | ${s.people.total} | ${s.people.members} | ${s.people.guests} |`)
p()
p(`Youth/children starts (included above): ${s.participations.youth}. A relay team counts as its three runners.`)
p()
p(`## Per race`)
p()
p(`| Race | Starts | Men | Women | Youth | Members | Guests | ${Number(year) - 1} starts |`)
p(`|---|---|---|---|---|---|---|---|`)
for (const r of s.races) {
  const st = r.starts
  p(`| ${r.sport}${st.relayTeams ? ` (+${st.relayTeams} relay)` : ''} | ${st.total} | ${st.men} | ${st.women} | ${st.youth} | ${st.members} | ${st.guests} | ${r.startsPreviousYear ?? '—'} |`)
}
p()
p(`Starts include relay runners; Men/Women/Youth/Members/Guests count individual starts only.`)
for (const r of s.races) {
  p()
  p(`### ${r.sport}`)
  p()
  for (const g of ['men', 'women'] as const) {
    p(`**Club podium, ${g}:** ${r.podium[g].map((e, i) => `${i + 1}. ${e.name} ${e.time}`).join(' · ') || '—'}`)
    if (r.fasterGuest[g]) p(`  _Note: guest ${r.fasterGuest[g]!.name} was faster (${r.fasterGuest[g]!.time})._`)
    p()
  }
  const c = COURSES[r.sport]
  if (r.records === null) {
    p(`**Records / improvements:** not computed — ${c.excluded ? 'new course this season, no earlier time to compare' : 'course not comparable'}.`)
  } else {
    const scope = c.since ? ` (course since ${c.since})` : ''
    const cr = r.courseRecords!
    p(`**Course records${scope}:** ${(['men', 'women'] as const).map((g) => `${g}: ${cr[g] ? `${cr[g]!.name} ${cr[g]!.time} (${cr[g]!.year})${cr[g]!.setThisSeason ? ' NEW' : ''}` : '—'}`).join(' · ')}`)
    p()
    p(`**Club records broken:** ${r.records.length ? r.records.map((x) => `${x.gender}: ${x.name} ${x.time} (was ${x.previous.name} ${x.previous.time}, ${x.previous.year})`).join(' · ') : 'none'}`)
    p()
    const pbs = r.personalBests!
    p(`**Personal bests — ${pbs.length} of ${r.comparable} members who had raced this course before** (vs their best earlier time, biggest improvement first):`)
    p()
    if (pbs.length) {
      p(`| # | Member | 2026 | Previous best | Improvement |`)
      p(`|---|---|---|---|---|`)
      pbs.forEach((x, i) => p(`| ${i + 1} | ${x.name} | ${x.time} | ${x.previousBest.time} (${x.previousBest.year}) | ${gainStr(x.gain)} |`))
    } else p(`none`)
  }
}
p()
p(`## Season facts`)
p()
p(`- Members who raced all ${s.races.length} championships: ${s.everyRace.join(', ') || 'none'}`)
p(`- Members by number of championships: ${Object.entries(s.racesPerMember).map(([n, c]) => `${n} race${n === '1' ? '' : 's'}: ${c}`).join(' · ')}`)
p(`- Members at their first club championship ever: ${s.newMembers}`)
p(`- Points ranking — men: ${s.pointsPodium.men.map((x, i) => `${i + 1}. ${x.name} ${x.points}`).join(' · ')}`)
p(`- Points ranking — women: ${s.pointsPodium.women.map((x, i) => `${i + 1}. ${x.name} ${x.points}`).join(' · ')}`)
console.log(out.join('\n'))
