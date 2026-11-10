'use client'
import { useState, useMemo, useCallback, useDeferredValue, Fragment } from 'react'
import { plural, t, tf } from '@/lib/translations'
import type { AthleteResult, CompetitionsData, SportType, Lang, ResultsCategory } from '@/lib/types'
import { athleteKey, computeSplitRanks, computeEventPoints, isFinisher, isReliableSplit, isRelay, type SplitRanks } from '@/lib/data'
import { COURSE_HISTORY, courseIndex } from '@/lib/courses'
import { classLabel } from '@/lib/classes'
import { matchesSearch } from '@/lib/search'
import { formatDate } from '@/lib/dates'
import { displayTime, getSeasonSummary } from '@/lib/season'
import { getFastestOfDay, getResultTags, type LegKey, type ResultTag } from '@/lib/raceDay'
import { ShareButton, ShareDialog, type ShareData } from '@/components/share/ShareResult'
import { BTN_PRIMARY, CARD_MIST, CARD_NAVY, Eyebrow, FIELD, H_SECTION, LINK_BTN, MEDAL_COLORS, PageTitle } from '@/components/ui/brand'
import { csvEscape, toCsvFile } from '@/lib/csv'

const SPORTS: SportType[] = ['triathlon', 'duathlon', 'swimming', 'cycling', 'running', 'swimrun']

const GREEN = 'font-bold text-[#1b7a3a]'

function fmt(v: string | undefined) {
  return v && v !== 'N/A' ? displayTime(v) : '—'
}

const splitOk = (a: AthleteResult, timeKey: string) => isReliableSplit(a, timeKey.replace('_Time', '_Seconds'))

/** A split time, or a dash when it can't be trusted (see isReliableSplit). */
function splitText(a: AthleteResult, timeKey: string) {
  return splitOk(a, timeKey) ? fmt((a as unknown as Record<string, string>)[timeKey]) : '—'
}

/** Split column key → the leg in getFastestOfDay(). */
const LEG_OF: Record<string, LegKey> = { Swim_Time: 'swim', Bike_Time: 'bike', Run_Time: 'run', Run1_Time: 'run1', Run2_Time: 'run2' }

/** Times of the day's fastest splits, per class ('herr' / 'dam') and split column. */
type BestSplits = Record<string, Record<string, string>>

const isBestSplit = (a: AthleteResult, timeKey: string, best: BestSplits | null) =>
  !!best && !!best[a.class_lower]?.[timeKey] && splitOk(a, timeKey) && (a as unknown as Record<string, string>)[timeKey] === best[a.class_lower][timeKey]

/** PB / Debut tag: club-styled label with the one rounded corner. */
function Tag({ tag, lang }: { tag: ResultTag; lang: Lang }) {
  return tag === 'pb' ? (
    <span title={t('res_tag_pb_long', lang)}
      className="inline-flex h-[22px] items-center rounded-[2px_2px_8px_2px] bg-brand px-2 font-display text-xs font-semibold tracking-[0.04em] text-white">
      {t('res_tag_pb', lang)}<span className="sr-only">: {t('res_tag_pb_long', lang)}</span>
    </span>
  ) : (
    <span title={t('res_tag_debut_long', lang)}
      className="inline-flex h-5 items-center rounded-[2px_2px_8px_2px] border border-navy bg-white px-[7px] font-display text-xs font-semibold tracking-[0.04em] text-navy">
      {t('res_tag_debut', lang)}<span className="sr-only">: {t('res_tag_debut_long', lang)}</span>
    </span>
  )
}


/**
 * Classes that raced a shorter, separate course and are therefore shown as
 * their own labelled block under Youth — never ranked among the youth field.
 * Distances are organiser-provided (not part of the NyTaTime export); keyed by
 * class_lower. Revisit if a class is ever reused at a different distance.
 */
const SEPARATE_RACE_DISTANCE: Record<string, string> = {
  'barn 0-10': '150 m',
}

interface ClassBlock {
  cls: string
  /** Small grey caption next to the class name explaining why it sits apart. */
  note: string
  rows: Array<{ athlete: AthleteResult; rank: number | null }>
}

/**
 * Group results into per-class blocks, ranked WITHIN the class (tied times
 * share a rank) with non-finishers last and unranked — used for every class
 * that is shown apart from the main ranked field.
 */
function buildClassBlocks(list: AthleteResult[], note: (members: AthleteResult[]) => string): ClassBlock[] {
  const byClass = new Map<string, AthleteResult[]>()
  for (const a of list) {
    if (!byClass.has(a.Class)) byClass.set(a.Class, [])
    byClass.get(a.Class)!.push(a)
  }

  return [...byClass.entries()].map(([cls, members]) => {
    const finishers = members.filter(isFinisher).sort((a, b) => a.Total_Time_Seconds - b.Total_Time_Seconds)
    const rows: ClassBlock['rows'] = []
    finishers.forEach((athlete, i) => {
      const tied = i > 0 && athlete.Total_Time_Seconds === finishers[i - 1].Total_Time_Seconds
      rows.push({ athlete, rank: tied ? rows[i - 1].rank : i + 1 })
    })
    for (const athlete of members.filter((a) => !isFinisher(a))) rows.push({ athlete, rank: null })
    return { cls, note: note(members), rows }
  })
}

type Seg = { timeKey: string; rankKey: string; label: string }

interface RowProps {
  a: AthleteResult
  rank: number | null
  i: number
  lang: Lang
  yearValue: string
  segs: readonly Seg[]
  splitRank: SplitRanks
  points: number
  tag: ResultTag | undefined
  best: BestSplits | null
  onAthleteClick?: (name: string) => void
  /** Opens the share picture; only for adult individual finishers of one race. */
  onShare?: () => void
}

/** Only adult (Herr/Dam) members who finished earn club points. */
const earnsPoints = (a: AthleteResult, rank: number | null) =>
  rank !== null && a.is_club_member && (a.class_lower === 'herr' || a.class_lower === 'dam')

function NameButton({ a, onAthleteClick, className = '' }: { a: AthleteResult; onAthleteClick?: (name: string) => void; className?: string }) {
  return onAthleteClick ? (
    <button type="button" onClick={() => onAthleteClick(a.Name)}
      className={`rounded text-left font-semibold text-navy hover:text-brand hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand ${className}`}>
      {a.Name}
    </button>
  ) : <span className={`font-semibold text-navy ${className}`}>{a.Name}</span>
}

/**
 * One result row. Shared by the main ranked field and the separate-course
 * blocks so every table renders the exact same columns (and therefore the same
 * column widths). `rank` is null for a non-finisher; points/split-rank cells
 * fall back to a dash when they don't apply (e.g. youth/children).
 */
function ResultRow({ a, rank, i, lang, yearValue, segs, splitRank, points, tag, best, onAthleteClick, onShare }: RowProps) {
  const finished = rank !== null
  return (
    <tr className={`border-b border-line ${i % 2 ? 'bg-[#f9f9fb]' : 'bg-white'} hover:bg-mist`}>
      <th scope="row" className="py-2.5 pl-4 pr-2 text-left font-display font-semibold tabular-nums">
        {rank !== null
          ? <span style={{ color: MEDAL_COLORS[rank - 1] ?? '#4a4e57' }}>{rank}</span>
          : <span className="font-normal text-muted">—</span>}
      </th>
      {/* One line per finisher: name, tag and "guest" stay together so every row has the same height */}
      <td className="px-2 py-1.5">
        <span className={`flex items-center gap-x-2 ${isRelay(a) ? 'min-w-[220px]' : 'whitespace-nowrap'}`}>
          <NameButton a={a} onAthleteClick={onAthleteClick} className="inline-flex min-h-9 items-center" />
          {tag && <Tag tag={tag} lang={lang} />}
          {!a.is_club_member && <span className="text-sm italic text-muted">{t('guest', lang)}</span>}
        </span>
      </td>
      <td className="px-2 py-2.5">{classLabel(a.Class, lang)}</td>
      {yearValue === 'all' && <td className="px-2 py-2.5 text-muted">{a.Competition_Year}</td>}
      {segs.map((s) => {
        const fastest = isBestSplit(a, s.timeKey, best)
        return (
          <Fragment key={s.label}>
            <td className={`border-l border-line py-2.5 pl-1.5 pr-1 text-right tabular-nums ${fastest ? GREEN : ''}`}>
              {splitText(a, s.timeKey)}{fastest && <span className="sr-only"> ({t('res_best_split_sr', lang)})</span>}
            </td>
            <td className="py-2.5 pl-1 pr-1.5 text-right text-xs tabular-nums text-muted">
              {(splitRank as Record<string, number | undefined>)[s.rankKey] ?? '—'}
            </td>
          </Fragment>
        )
      })}
      <td className="border-l border-line px-2 py-2.5 text-right font-display font-semibold tabular-nums text-navy">
        {finished ? fmt(a.Total_Time) : <span className="font-sans text-muted">{t('dnf', lang)}</span>}
      </td>
      {/* Points only for one race: across all years the column would just
          repeat 40, 35, 30… for every year's winners */}
      {yearValue !== 'all' && (
        <td className="px-2 py-2.5 text-right font-display font-semibold tabular-nums">
          {earnsPoints(a, rank)
            ? <span className={points > 0 ? 'text-brand' : 'text-muted'}>{points}</span>
            : <span className="text-muted">—</span>}
        </td>
      )}
      {yearValue !== 'all' && (
        <td className="py-0.5 pl-1 pr-2 text-right">{onShare && <ShareButton name={a.Name} lang={lang} onClick={onShare} />}</td>
      )}
    </tr>
  )
}

/** Phone layout: one card per finisher, splits underneath. */
function ResultCard({ a, rank, lang, yearValue, segs, points, tag, best, onAthleteClick, onShare }: Omit<RowProps, 'i' | 'splitRank'>) {
  const podium = rank !== null && rank <= 3
  return (
    <li className={`rounded-[4px_4px_24px_4px] border border-line px-3 pb-2.5 pt-3 ${podium ? 'bg-mist' : 'bg-white'}`}>
      <div className="grid grid-cols-[34px_minmax(0,1fr)_auto] items-start gap-x-2.5">
        <span className="font-display text-xl font-semibold leading-tight" style={{ color: rank ? (MEDAL_COLORS[rank - 1] ?? '#4a4e57') : '#4a4e57' }}>{rank ?? '—'}</span>
        <span className="min-w-0">
          <NameButton a={a} onAthleteClick={onAthleteClick} className="text-base leading-snug" />
          <span className="mt-1 flex flex-wrap items-center gap-1.5 text-[13px] text-muted">
            <span className={a.is_club_member ? '' : 'italic'}>
              {classLabel(a.Class, lang)} · {a.is_club_member ? a.Club : t('guest', lang)}{yearValue === 'all' ? ` · ${a.Competition_Year}` : ''}
            </span>
            {tag && <Tag tag={tag} lang={lang} />}
          </span>
        </span>
        <span className="text-right">
          <span className="block font-display text-lg font-semibold text-navy">{rank !== null ? fmt(a.Total_Time) : t('dnf', lang)}</span>
          {yearValue !== 'all' && (
            <span className="block font-display text-sm font-semibold text-brand">
              {earnsPoints(a, rank) ? `${points} ${t('season_points_unit', lang)}` : <span className="font-sans font-normal text-muted">{t('res_no_points', lang)}</span>}
            </span>
          )}
        </span>
      </div>
      {(segs.length > 0 || onShare) && (
        <div className="mt-2.5 flex items-center gap-2 border-t border-line pt-2">
          {segs.length > 0 && (
            <dl className="m-0 grid flex-1 grid-cols-5 gap-1 text-[13px]">
              {segs.map((s) => (
                <div key={s.label}>
                  <dt className="text-muted">{s.label}</dt>
                  <dd className={`m-0 tabular-nums ${isBestSplit(a, s.timeKey, best) ? GREEN : 'font-semibold text-navy'}`}>{splitText(a, s.timeKey)}{isBestSplit(a, s.timeKey, best) && <span className="sr-only"> ({t('res_best_split_sr', lang)})</span>}</dd>
                </div>
              ))}
            </dl>
          )}
          {onShare && <span className="ml-auto"><ShareButton name={a.Name} lang={lang} onClick={onShare} /></span>}
        </div>
      )}
    </li>
  )
}

/**
 * Whether an athlete belongs to the selected category section. `all` is the
 * adult mixed field (Herr + Dam); `youth` is its own section (Ungdom plus the
 * older children's classes) because it races a shorter course. Children's
 * classes that swim a *separate*, still-shorter course (SEPARATE_RACE_DISTANCE,
 * e.g. Barn 0–10) are excluded here — they get their own labelled block instead
 * of being ranked among the youth field. Shared by the visible rows AND the
 * per-split rankings so both rank over exactly the same pool.
 */
function inCategory(a: AthleteResult, category: ResultsCategory): boolean {
  switch (category) {
    case 'men':   return a.class_lower === 'herr'
    case 'women': return a.class_lower === 'dam'
    case 'youth': return a.class_lower === 'ungdom'
      || (a.class_lower.startsWith('barn') && !Object.hasOwn(SEPARATE_RACE_DISTANCE, a.class_lower))
    case 'all':   return a.class_lower === 'herr' || a.class_lower === 'dam'
  }
}

interface Props {
  data: CompetitionsData
  lang: Lang
  /** ISO date of the newest result on the dashboard. */
  lastUpdated: string
  /** Race day per "<sport>-<year>". */
  raceDates: Record<string, string>
  onAthleteClick?: (name: string) => void
  /**
   * Sport/year/category are owned by the Dashboard (controlled) so the URL
   * can mirror the full selection: #results/<sport>/<year>/<category>.
   */
  sport: SportType
  year: string
  category: ResultsCategory
  onSportChange: (sport: SportType) => void
  onYearChange: (year: string) => void
  onCategoryChange: (category: ResultsCategory) => void
}

export function ResultsTab({ data, lang, lastUpdated, raceDates, onAthleteClick, sport, year, category, onSportChange, onYearChange, onCategoryChange }: Props) {
  const [search, setSearch] = useState('')
  const deferredSearch = useDeferredValue(search)
  // A name typed for one sport is stale in the next
  const [searchSport, setSearchSport] = useState(sport)
  if (sport !== searchSport) {
    setSearchSport(sport)
    setSearch('')
  }

  const isMultiSport = sport === 'triathlon' || sport === 'duathlon'

  const years = useMemo(() => {
    const ys = new Set<string>()
    for (const a of data[sport]) ys.add(a.Competition_Year)
    // Newest first, "All years" last
    return [...[...ys].sort().reverse(), 'all']
  }, [data, sport])

  // A deep link can name a year this sport never ran: fall back to the latest
  const yearValue = years.includes(year) ? year : years[0]

  // Split ranks share the SAME pool as the visible rows: sport, category and
  // the year filter (guests always included). With one year selected, each split is ranked
  // within that year's field; with "All Years (Combined)" the splits are ranked
  // across every year at once, so the # columns line up with the all-time
  // overall rank (one true fastest Run 1, etc.). Category keeps e.g. "Men Only"
  // ranking among men, not across the whole mixed-distance field. Search is
  // deliberately excluded — typing a name must not renumber anyone.
  const splitRankLookup = useMemo(() => {
    if (!isMultiSport) return null
    let pool = data[sport].filter((a) => inCategory(a, category))
    if (yearValue !== 'all') pool = pool.filter((a) => a.Competition_Year === yearValue)
    const out: Record<string, SplitRanks> = {}
    // Like the finish ranks below: never across a course change
    for (let c = 0; c < COURSE_HISTORY[sport].length; c++) {
      computeSplitRanks(pool.filter((a) => courseIndex(sport, a.Competition_Year) === c), sport as 'triathlon' | 'duathlon')
        .forEach((v, k) => { out[k] = v })
    }
    return out
  }, [data, sport, isMultiSport, category, yearValue])

  // Club points each athlete earned in their event, keyed by athleteKey().
  // Computed over the FULL field for the sport (every member in their adult
  // class that year), so the number is independent of the category/search
  // filters here and always matches the Rankings tab and athlete profiles.
  // Guests are listed but never ranked for points: non-members and youth earn 0.
  const pointsLookup = useMemo(() => {
    const out: Record<string, number> = {}
    computeEventPoints(data[sport]).forEach((v, k) => { out[k] = v })
    return out
  }, [data, sport])

  // Sort and assign rank WITHOUT the search applied. Year and category define
  // the ranking pool — guests included, since this is the race's real order; search is just a lookup that mustn't renumber.
  // Rank = position among FINISHERS in the visible pool (DNFs are listed last,
  // unranked) and equal times share a rank (competition ranking: 1, 1, 3, …).
  const ranked = useMemo(() => {
    let list = data[sport]
    if (yearValue !== 'all') list = list.filter((a) => a.Competition_Year === yearValue)
    list = list.filter((a) => inCategory(a, category))
    // Times on different courses can't be compared, so the all-years list is
    // one ranked list per course (today's course first), never one mixed list.
    const out: Array<{ athlete: AthleteResult; rank: number | null; course: number }> = []
    for (let course = COURSE_HISTORY[sport].length - 1; course >= 0; course--) {
      const onCourse = list.filter((a) => courseIndex(sport, a.Competition_Year) === course)
      const finishers = onCourse.filter(isFinisher)
        .sort((a, b) => a.Total_Time_Seconds - b.Total_Time_Seconds)
      const start = out.length
      finishers.forEach((athlete, i) => {
        const tiedWithPrev = i > 0 && athlete.Total_Time_Seconds === finishers[i - 1].Total_Time_Seconds
        out.push({ athlete, rank: tiedWithPrev ? out[start + i - 1].rank : i + 1, course })
      })
      for (const athlete of onCourse.filter((a) => !isFinisher(a))) out.push({ athlete, rank: null, course })
    }
    return out
  }, [data, sport, yearValue, category])

  // Course headings between the lists — only in the all-years view of a sport
  // that has moved (triathlon, swimrun)
  const showCourses = yearValue === 'all' && COURSE_HISTORY[sport].length > 1
  const courseHeading = useCallback((course: number) => {
    const c = COURSE_HISTORY[sport][course]
    const years = c.to === undefined ? tf('course_since', lang, { year: c.from }) : c.to === c.from ? String(c.from) : `${c.from}–${c.to}`
    return `${c.place} · ${years}`
  }, [sport, lang])

  // Search filter kept separate so typing never re-sorts the pool.
  const rows = useMemo(() => {
    if (!deferredSearch.trim()) return ranked
    return ranked.filter((r) => matchesSearch(r.athlete.Name, deferredSearch))
  }, [ranked, deferredSearch])

  // Separate-course children's classes (e.g. Barn 0–10, a shorter 150 m race)
  // shown under Youth as their own labelled block, ranked WITHIN their class so
  // the shorter distance is never compared to the youth field. Same year/guest
  // pool as the main table.
  const separateRaces = useMemo(() => {
    if (category !== 'youth') return []
    let list = data[sport].filter((a) => Object.hasOwn(SEPARATE_RACE_DISTANCE, a.class_lower))
    if (yearValue !== 'all') list = list.filter((a) => a.Competition_Year === yearValue)

    return buildClassBlocks(
      list,
      (members) => `${SEPARATE_RACE_DISTANCE[members[0].class_lower]} · ${t('separate_race', lang)}`,
    )
  }, [data, sport, yearValue, category, lang])

  // Relay teams (Staffet): three athletes share the adult course, so the team
  // is shown as its own labelled block under the mixed field rather than being
  // ranked against individuals. Same year/guest pool as the main table.
  const relayTeams = useMemo(() => {
    if (category !== 'all') return []
    let list = data[sport].filter(isRelay)
    if (yearValue !== 'all') list = list.filter((a) => a.Competition_Year === yearValue)

    return buildClassBlocks(list, () => t('relay_team', lang))
  }, [data, sport, yearValue, category, lang])

  // Only one of the two applies per category, so they share one rendered list.
  const classBlocks = useMemo(
    () => [...separateRaces, ...relayTeams],
    [separateRaces, relayTeams],
  )

  const segs = useMemo(() => {
    if (sport === 'triathlon') return [
      { timeKey: 'Swim_Time',  rankKey: 'swim',  label: t('swim', lang) },
      { timeKey: 'T1_Time',    rankKey: 't1',    label: t('t1', lang) },
      { timeKey: 'Bike_Time',  rankKey: 'bike',  label: t('bike', lang) },
      { timeKey: 'T2_Time',    rankKey: 't2',    label: t('t2', lang) },
      { timeKey: 'Run_Time',   rankKey: 'run',   label: t('run', lang) },
    ] as const
    if (sport === 'duathlon') return [
      { timeKey: 'Run1_Time',  rankKey: 'run1',  label: t('run_1', lang) },
      { timeKey: 'T1_Time',    rankKey: 't1',    label: t('t1', lang) },
      { timeKey: 'Bike_Time',  rankKey: 'bike',  label: t('bike', lang) },
      { timeKey: 'T2_Time',    rankKey: 't2',    label: t('t2', lang) },
      { timeKey: 'Run2_Time',  rankKey: 'run2',  label: t('run_2', lang) },
    ] as const
    return [] as const
  }, [sport, lang])

  // ── One race (a single year selected): podium, fastest of the day, tags ──
  const oneYear = yearValue !== 'all'
  const race = useMemo(
    () => (oneYear ? getSeasonSummary(data, yearValue).races.find((r) => r.sport === sport) ?? null : null),
    [data, sport, yearValue, oneYear],
  )
  const tags = useMemo(
    () => (oneYear ? getResultTags(data[sport], sport, yearValue) : new Map<string, ResultTag>()),
    [data, sport, yearValue, oneYear],
  )
  const fastest = useMemo(
    () => (oneYear ? getFastestOfDay(data[sport], sport, yearValue) : []),
    [data, sport, yearValue, oneYear],
  )
  const bestSplits = useMemo<BestSplits | null>(() => {
    if (!oneYear || !isMultiSport) return null
    const out: BestSplits = { herr: {}, dam: {} }
    for (const s of segs) {
      const leg = fastest.find((f) => f.leg === LEG_OF[s.timeKey])
      if (leg?.men) out.herr[s.timeKey] = leg.men.time
      if (leg?.women) out.dam[s.timeKey] = leg.women.time
    }
    return out
  }, [oneYear, isMultiSport, segs, fastest])

  // Counted over the rows on screen, so the line matches the class filter
  const tagCounts = useMemo(() => {
    let pb = 0, debut = 0
    for (const { athlete } of ranked) {
      const v = tags.get(athleteKey(athlete))
      if (v === 'pb') pb++; else if (v === 'debut') debut++
    }
    return { pb, debut }
  }, [tags, ranked])

  // Points of a podium name, from the same lookup as the table
  const pointsOf = useCallback((name: string) => {
    const a = data[sport].find((r) => r.Name === name && r.Competition_Year === yearValue)
    return a ? pointsLookup[athleteKey(a)] ?? 0 : 0
  }, [data, sport, yearValue, pointsLookup])

  const subtitle = useMemo(() => {
    if (!oneYear) return t(COURSE_HISTORY[sport].length > 1 ? 'res_sub_all_courses' : 'res_sub_all', lang)
    const list = data[sport].filter((a) => a.Competition_Year === yearValue)
    const finishers = list.filter((a) => isFinisher(a) && !isRelay(a)).length
    const relays = list.filter(isRelay).length
    const date = raceDates[`${sport}-${yearValue}`]
    let txt = tf('res_finishers', lang, { n: finishers })
    if (relays) txt += relays === 1 ? t('res_relay_one', lang) : tf('res_relay_n', lang, { n: relays })
    if (relays && race) txt += tf('res_starts', lang, { n: race.starts.total })
    return date ? `${formatDate(date, lang)} · ${txt}` : txt
  }, [oneYear, data, sport, yearValue, raceDates, race, lang])

  const legLabel = (leg: LegKey) =>
    leg === 'finish' ? t('res_leg_finish', lang) : t(leg === 'run1' ? 'run_1' : leg === 'run2' ? 'run_2' : leg, lang)

  // ── Share picture ──
  const [shareData, setShareData] = useState<ShareData | null>(null)
  const canShareRow = (a: AthleteResult) => oneYear && isFinisher(a) && !isRelay(a) && (a.class_lower === 'herr' || a.class_lower === 'dam')
  const openShare = useCallback((a: AthleteResult) => {
    const field = data[sport]
      .filter((b) => b.Competition_Year === yearValue && b.class_lower === a.class_lower && isFinisher(b) && !isRelay(b))
      .sort((x, y) => x.Total_Time_Seconds - y.Total_Time_Seconds)
    const date = raceDates[`${sport}-${yearValue}`]
    const tag = tags.get(athleteKey(a)) ?? null
    setShareData({
      name: a.Name,
      sportLabel: t(sport, lang),
      year: yearValue,
      dateLabel: date ? formatDate(date, lang) : yearValue,
      time: displayTime(a.Total_Time),
      place: field.findIndex((b) => athleteKey(b) === athleteKey(a)) + 1,
      fieldSize: field.length,
      gender: a.class_lower === 'dam' ? 'women' : 'men',
      points: a.is_club_member ? pointsLookup[athleteKey(a)] ?? 0 : null,
      tag,
      splits: segs.filter((s) => LEG_OF[s.timeKey]).map((s) => ({
        label: s.label,
        time: splitText(a, s.timeKey),
        fastest: isBestSplit(a, s.timeKey, bestSplits),
      })),
      raceLabel: t(`discipline_${sport}_title`, lang),
    })
  }, [data, sport, yearValue, raceDates, tags, lang, pointsLookup, segs, bestSplits])

  const exportCsv = useCallback(() => {
    const headers = [
      yearValue === 'all' ? t('all_time_rank', lang) : t('overall_rank', lang),
      t('name', lang), t('club', lang),
      t('gender', lang), t('year', lang), t('total_time', lang), t('points', lang),
    ]
    const csvRows = [headers.map(csvEscape).join(',')]
    rows.forEach(({ athlete: a, rank }) => {
      csvRows.push([
        rank ?? 'DNF',
        csvEscape(a.Name),
        csvEscape(a.is_club_member ? a.Club : t('guest', lang)),
        csvEscape(a.Class),
        csvEscape(a.Competition_Year),
        csvEscape(a.Total_Time),
        pointsLookup[athleteKey(a)] ?? 0,
      ].join(','))
    })
    const blob = new Blob([toCsvFile(csvRows)], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `${sport}_${yearValue}_${category}.csv`
    link.click()
    URL.revokeObjectURL(url)
  }, [rows, sport, yearValue, category, lang, pointsLookup])

  // Six base columns either way: one race has Points, all years has Year instead
  const colCount = 7 + segs.length * 2
  const selectCls = 'h-12 min-w-[130px] rounded border border-line bg-mist px-3 text-[15px] font-medium text-navy focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand'
  const labelCls = 'flex flex-col gap-1 text-sm font-semibold text-navy'
  const showRaceBlocks = oneYear && category !== 'youth' && race !== null

  return (
    <div className="flex flex-col gap-9">
      <div className="flex flex-col items-start gap-6">
        <PageTitle
          eyebrow={t('res_eyebrow', lang)}
          title={oneYear ? `${t(sport, lang)} ${yearValue}` : tf('res_title_all', lang, { sport: t(sport, lang) })}
          subtitle={subtitle}
        />
        <form className="flex flex-wrap items-end gap-3" onSubmit={(e) => e.preventDefault()}>
          <label className={labelCls}>{t('res_filter_sport', lang)}
            <select value={sport} onChange={(e) => onSportChange(e.target.value as SportType)} className={selectCls}>
              {SPORTS.map((s) => <option key={s} value={s}>{t(s, lang)}</option>)}
            </select>
          </label>
          <label className={labelCls}>{t('res_filter_year', lang)}
            <select value={yearValue} onChange={(e) => onYearChange(e.target.value)} className={selectCls}>
              {years.map((y) => <option key={y} value={y}>{y === 'all' ? t('all_years', lang) : y}</option>)}
            </select>
          </label>
          <label className={labelCls}>{t('res_filter_category', lang)}
            <select value={category} onChange={(e) => onCategoryChange(e.target.value as ResultsCategory)} className={selectCls}>
              <option value="all">{t('all_mixed', lang)}</option>
              <option value="men">{t('men_only', lang)}</option>
              <option value="women">{t('women_only', lang)}</option>
              <option value="youth">{t('youth_only', lang)}</option>
            </select>
          </label>
          <button type="button" onClick={exportCsv} className={BTN_PRIMARY}>{t('export_csv', lang)}</button>
        </form>
      </div>

      <p className="-mt-4 mb-0 text-sm text-muted">
        {lastUpdated && <>{t('last_updated', lang)} <strong className="text-navy">{formatDate(lastUpdated, lang)}</strong>. </>}
        {t('results_correction', lang)}
      </p>

      {showRaceBlocks && race && (
        <>
          <section aria-label={t('res_podium', lang)} className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,280px),1fr))] gap-5">
            {(['men', 'women'] as const).filter((g) => race.podium[g].length > 0 && (category === 'all' || category === g)).map((g) => (
              <div key={g} className={`${CARD_MIST} px-6 py-5`}>
                <Eyebrow className="text-xl">{t('res_podium', lang)}</Eyebrow>
                <h3 className="mb-2.5 mt-0.5 font-display text-2xl font-semibold text-navy">{t(g, lang)}</h3>
                <ol className="m-0 list-none p-0">
                  {race.podium[g].map((p, i) => (
                    <li key={p.name} className="grid grid-cols-[22px_minmax(0,1fr)_auto_auto] items-baseline gap-2.5 border-b border-line py-1.5 text-[15px] last:border-b-0">
                      <span className="font-display font-semibold" style={{ color: MEDAL_COLORS[i] }}>{i + 1}</span>
                      <span className="font-semibold text-navy">{p.name}</span>
                      <span className="tabular-nums">{displayTime(p.time)}</span>
                      <span className="font-display font-semibold text-brand">{pointsOf(p.name)} {t('season_points_unit', lang)}</span>
                    </li>
                  ))}
                </ol>
              </div>
            ))}
          </section>

          {fastest.some((f) => f.men || f.women) && (
            <section aria-labelledby="fastest-title" className={`${CARD_NAVY} px-6 pb-7 pt-6 sm:px-8 lg:rounded-[4px_4px_48px_4px]`}>
              <div className="mb-3.5 flex flex-wrap items-baseline justify-between gap-x-6 gap-y-2">
                <div>
                  <Eyebrow light>{t('res_fastest_eyebrow', lang)}</Eyebrow>
                  <h3 id="fastest-title" className="mb-0 mt-0.5 font-display text-[26px] font-semibold leading-tight sm:text-[30px]">
                    {isMultiSport ? t('res_fastest_splits', lang) : t('res_fastest_title', lang)}
                  </h3>
                </div>
                <span className="text-sm text-[#c3c6d1]">{t('res_fastest_note', lang)}</span>
              </div>
              {/* Phones: one block per leg, men then women */}
              <dl className="m-0 sm:hidden">
                {[...fastest.map((f) => ({ key: f.leg, label: legLabel(f.leg), men: f.men, women: f.women })),
                  ...(race.courseRecords ? [{
                    key: 'record', label: t('res_course_record', lang),
                    men: race.courseRecords.men && { name: `${race.courseRecords.men.name} (${race.courseRecords.men.year})`, time: race.courseRecords.men.time, guest: false },
                    women: race.courseRecords.women && { name: `${race.courseRecords.women.name} (${race.courseRecords.women.year})`, time: race.courseRecords.women.time, guest: false },
                  }] : [])].map((f) => (
                  <div key={f.key} className="border-t border-[#3a4250] py-2">
                    <dt className="text-xs font-bold uppercase tracking-[0.06em] text-[#c3c6d1]">{f.label}</dt>
                    {([['men', f.men], ['women', f.women]] as const).map(([g, e]) => (
                      <dd key={g} className="m-0 grid grid-cols-[minmax(0,1fr)_auto] gap-x-2.5 text-sm">
                        <span><span className="sr-only">{t(g, lang)}: </span>{e ? e.name : '—'}{e?.guest && <span className="text-[#c3c6d1]"> ({t('res_guest_mark', lang)})</span>}</span>
                        <span className="font-display font-semibold tabular-nums">{e ? displayTime(e.time) : ''}</span>
                      </dd>
                    ))}
                  </div>
                ))}
              </dl>
              <div className="hidden overflow-x-auto sm:block">
                <table className="w-full min-w-[480px] text-[15px]">
                  <thead>
                    <tr className="text-left font-display text-sm text-[#c3c6d1]">
                      <th scope="col" className="static w-[22%] py-2 pr-3 font-semibold"><span className="sr-only">{t('res_category', lang)}</span></th>
                      <th scope="col" className="static px-3 py-2 font-semibold">{t('men', lang)}</th>
                      <th scope="col" className="static px-3 py-2 font-semibold">{t('women', lang)}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {fastest.map((f) => (
                      <tr key={f.leg} className="border-t border-[#3a4250]">
                        <th scope="row" className="py-2.5 pr-3 text-left font-semibold text-[#c3c6d1]">{legLabel(f.leg)}</th>
                        {[f.men, f.women].map((e, i) => (
                          <td key={i} className="px-3 py-2.5">
                            {e ? <>
                              <span className="font-semibold">{e.name}</span>
                              {e.guest && <span className="text-[#c3c6d1]"> ({t('res_guest_mark', lang)})</span>}
                              <span className="ml-1.5 font-display font-semibold tabular-nums">{displayTime(e.time)}</span>
                            </> : '—'}
                          </td>
                        ))}
                      </tr>
                    ))}
                    {race.courseRecords && (
                      <tr className="border-t border-[#3a4250] text-[#c3c6d1]">
                        <th scope="row" className="py-2.5 pr-3 text-left font-semibold">{t('res_course_record', lang)}</th>
                        {[race.courseRecords.men, race.courseRecords.women].map((r, i) => (
                          <td key={i} className="px-3 py-2.5">
                            {r ? <>
                              <span className="font-semibold">{r.name} ({r.year})</span>
                              <span className="ml-1.5 font-display font-semibold tabular-nums text-white">{displayTime(r.time)}</span>
                            </> : '—'}
                          </td>
                        ))}
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </section>
          )}
        </>
      )}

      <section aria-labelledby="all-finishers">
        <div className="mb-3 flex flex-wrap items-end justify-between gap-3">
          <h3 id="all-finishers" className={H_SECTION}>{t('res_all_finishers', lang)}</h3>
          <div className="flex flex-wrap items-center gap-3">
            <label className="sr-only" htmlFor="results-search">{t('search_athlete', lang)}</label>
            <input id="results-search" type="search" value={search} onChange={(e) => setSearch(e.target.value)}
              placeholder={t('search_athlete', lang)}
              className={`${FIELD} w-48`} />
            <span className="text-sm text-muted" aria-live="polite">{tf(rows.length === 1 ? 'res_shown_one' : 'res_shown', lang, { n: rows.length })}</span>
          </div>
        </div>
        <p className="mb-3 mt-0 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-sm text-muted">
          {oneYear && tagCounts.pb + tagCounts.debut > 0 && <>
            <span className="inline-flex items-center gap-2"><Tag tag="pb" lang={lang} />{t('res_tag_pb_long', lang)}</span>
            <span className="inline-flex items-center gap-2"><Tag tag="debut" lang={lang} />{t('res_tag_debut_long', lang)}</span>
            <span>· {tf('res_tag_summary', lang, { pb: plural(tagCounts.pb, 'res_n_pb', lang), debut: plural(tagCounts.debut, 'res_n_debut', lang) })}</span>
          </>}
          {bestSplits && rows.length > 0 && <span className="basis-full sm:basis-auto"><span className={GREEN}>{t('res_best_split', lang)}</span></span>}
          {oneYear && rows.length > 0 && <span className="basis-full">{t('res_no_points_note', lang)}</span>}
        </p>

        {rows.length === 0 && separateRaces.length === 0 ? (
          <div className={`${CARD_MIST} p-8 text-center text-[15px] text-muted`}>
            {deferredSearch.trim() && ranked.length > 0 ? (
              <>
                <p className="m-0">{tf('res_no_match', lang, { q: deferredSearch.trim() })}</p>
                <button type="button" onClick={() => setSearch('')} className={`${LINK_BTN} mt-1`}>{t('res_clear_search', lang)}</button>
              </>
            ) : <p className="m-0">{tf('res_empty', lang, { sport: t(sport, lang) })}</p>}
          </div>
        ) : (
          <>
            {/* Phones: one card per finisher */}
            <ol className="m-0 flex list-none flex-col gap-2.5 p-0 sm:hidden">
              {rows.map(({ athlete: a, rank, course }, i) => (
                <Fragment key={`${a.Name}-${a.Competition_Year}-${i}`}>
                  {showCourses && (i === 0 || rows[i - 1].course !== course) && (
                    <li className={`${i === 0 ? '' : 'mt-3 '}text-xs font-bold uppercase tracking-[0.06em] text-muted`}>{courseHeading(course)}</li>
                  )}
                  <ResultCard a={a} rank={rank} lang={lang} yearValue={yearValue} segs={segs}
                    points={pointsLookup[athleteKey(a)] ?? 0} tag={tags.get(athleteKey(a))} best={bestSplits} onAthleteClick={onAthleteClick}
                    onShare={canShareRow(a) ? () => openShare(a) : undefined} />
                </Fragment>
              ))}
              {classBlocks.map((group) => (
                <Fragment key={group.cls}>
                  <li className="mt-3 text-xs font-bold uppercase tracking-[0.06em] text-muted">{classLabel(group.cls, lang)} <span className="font-normal normal-case tracking-normal">· {group.note}</span></li>
                  {group.rows.map(({ athlete: a, rank }, i) => (
                    <ResultCard key={`${a.Name}-${a.Competition_Year}-${i}`} a={a} rank={rank} lang={lang} yearValue={yearValue} segs={segs}
                      points={0} tag={undefined} best={null} onAthleteClick={onAthleteClick} />
                  ))}
                </Fragment>
              ))}
            </ol>

            {/* Wider screens: the full table */}
            <div tabIndex={0} role="region" aria-label={t('res_all_finishers', lang)} className="hidden overflow-x-auto focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand sm:block 2xl:overflow-visible">
              <table className={`min-w-full ${segs.length > 0 ? 'text-sm' : 'text-[15px]'}`}>
                <thead>
                  <tr className="bg-navy text-left font-display text-sm text-white">
                    <th scope="col" className="bg-navy py-3 pl-4 pr-2 font-semibold">{t('rank', lang)}</th>
                    <th scope="col" className="bg-navy px-2 py-3 font-semibold">{t('name', lang)}</th>
                    <th scope="col" className="bg-navy px-2 py-3 font-semibold">{t('res_filter_category', lang)}</th>
                    {yearValue === 'all' && <th scope="col" className="bg-navy px-2 py-3 font-semibold">{t('year', lang)}</th>}
                    {segs.map((s) => (
                      <Fragment key={s.label}>
                        <th scope="col" className="border-l border-[#3a4250] bg-navy py-3 pl-2 pr-1 text-right font-semibold">{s.label}</th>
                        <th scope="col" className="bg-navy py-3 pl-1 pr-2 text-right font-semibold text-[#c3c6d1]">
                          <span aria-hidden="true">#</span><span className="sr-only">{tf('res_split_rank', lang, { leg: s.label })}</span>
                        </th>
                      </Fragment>
                    ))}
                    <th scope="col" className="border-l border-[#3a4250] bg-navy px-2 py-3 text-right font-semibold">{t('res_time', lang)}</th>
                    {oneYear && <th scope="col" className="bg-navy px-2 py-3 text-right font-semibold">{t('points', lang)}</th>}
                    {oneYear && <th scope="col" className="bg-navy px-2 py-3"><span className="sr-only">{t('share_title', lang)}</span></th>}
                  </tr>
                </thead>
                <tbody>
                  {rows.map(({ athlete: a, rank, course }, i) => (
                    <Fragment key={`${a.Name}-${a.Competition_Year}-${i}`}>
                      {showCourses && (i === 0 || rows[i - 1].course !== course) && (
                        <tr className="border-y border-line bg-mist">
                          <td colSpan={colCount} className="px-4 py-2 text-xs font-bold uppercase tracking-[0.06em] text-muted">{courseHeading(course)}</td>
                        </tr>
                      )}
                      <ResultRow
                        a={a} rank={rank} i={i} lang={lang} yearValue={yearValue} segs={segs}
                        splitRank={splitRankLookup?.[athleteKey(a)] ?? {}}
                        points={pointsLookup[athleteKey(a)] ?? 0}
                        tag={tags.get(athleteKey(a))} best={bestSplits}
                        onAthleteClick={onAthleteClick}
                        onShare={canShareRow(a) ? () => openShare(a) : undefined} />
                    </Fragment>
                  ))}

                  {/* Classes shown apart from the ranked field — separate-course
                      children's classes (e.g. Barn 0–10, 150 m) and relay teams:
                      a labelled section within the SAME table so the columns line
                      up, ranked within the class rather than against the field. */}
                  {classBlocks.map((group) => (
                    <Fragment key={group.cls}>
                      <tr className="border-y border-line bg-mist">
                        <td colSpan={colCount} className="px-4 py-2">
                          <span className="text-xs font-bold uppercase tracking-[0.06em] text-muted">{classLabel(group.cls, lang)}</span>
                          <span className="ml-2 text-[13px] text-muted">{group.note}</span>
                        </td>
                      </tr>
                      {group.rows.map(({ athlete: a, rank }, i) => (
                        <ResultRow key={`${a.Name}-${a.Competition_Year}-${i}`}
                          a={a} rank={rank} i={i} lang={lang} yearValue={yearValue} segs={segs}
                          splitRank={{}} points={0} tag={undefined} best={null} onAthleteClick={onAthleteClick} />
                      ))}
                    </Fragment>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </section>
      {shareData && <ShareDialog data={shareData} lang={lang} onClose={() => setShareData(null)} />}
    </div>
  )
}
