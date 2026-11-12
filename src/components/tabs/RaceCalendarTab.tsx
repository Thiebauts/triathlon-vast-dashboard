'use client'
import { useCallback, useEffect, useId, useMemo, useState } from 'react'
import { t, tf } from '@/lib/translations'
import type { Lang } from '@/lib/types'
import {
  PLAN_STATUSES, deletePlan, loadCalendar, sameName, savePlan,
  type Plan, type PlanInput, type PlanStatus, type Race, type RaceSport,
} from '@/lib/raceCalendar'
import { BTN_PRIMARY, CARD, CARD_MIST, FIELD, H_BLOCK, H_SECTION, LINK_BTN, PageTitle } from '@/components/ui/brand'

const NAME_KEY = 'trivast-calendar-name'

/** Dot colour per status (all pass 3:1 next to text on white). */
const STATUS_DOT: Record<PlanStatus, string> = {
  registered: '#1b7a3a',
  planning: '#212934',
  maybe: '#6b7079',
  looking_for_ticket: '#9a4a00',
  selling_ticket: '#56677a',
}

const SPORT_FILTERS: Array<RaceSport | 'all'> = ['all', 'triathlon', 'running', 'cycling', 'swimming', 'skiing']

function raceDateLabel(r: Race, lang: Lang) {
  if (!r.race_date) return r.date_note ?? t('cal_date_tba', lang)
  const [y, m, d] = r.race_date.split('-').map(Number)
  // A note that is itself a date ("29–30 May") replaces the single day
  if (r.date_note && /^\d/.test(r.date_note)) return r.date_note
  const date = new Intl.DateTimeFormat(lang === 'sv' ? 'sv-SE' : 'en-GB', { weekday: 'short', day: 'numeric', month: 'long' }).format(new Date(y, m - 1, d))
  return r.date_note ? `${date} · ${r.date_note}` : date
}

function monthKey(r: Race) {
  return r.race_date ? r.race_date.slice(0, 7) : 'tba'
}

function monthLabel(key: string, lang: Lang) {
  if (key === 'tba') return t('cal_month_tba', lang)
  const [y, m] = key.split('-').map(Number)
  const s = new Intl.DateTimeFormat(lang === 'sv' ? 'sv-SE' : 'en-GB', { month: 'long', year: 'numeric' }).format(new Date(y, m - 1, 1))
  return s.charAt(0).toUpperCase() + s.slice(1)
}

function Dot({ status }: { status: PlanStatus }) {
  return <span aria-hidden="true" className="inline-block h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: STATUS_DOT[status] }} />
}

/** The add/change form for one race. */
function PlanForm({ race, existing, lang, onSave, onRemove, onCancel, busy }: {
  race: Race
  existing: Plan | undefined
  lang: Lang
  onSave: (input: PlanInput) => void
  onRemove: () => void
  onCancel: () => void
  busy: boolean
}) {
  const id = useId()
  const [status, setStatus] = useState<PlanStatus>(existing?.status ?? (race.registration === 'sold_out' ? 'looking_for_ticket' : 'planning'))
  const [offers, setOffers] = useState(existing?.offers_ride ?? false)
  const [needs, setNeeds] = useState(existing?.needs_ride ?? false)
  const [note, setNote] = useState(existing?.note ?? '')
  return (
    <form className="mt-4 flex flex-col gap-4 rounded-[4px_4px_24px_4px] bg-mist p-4"
      onSubmit={(e) => { e.preventDefault(); onSave({ status, offers_ride: offers, needs_ride: needs, note }) }}>
      <fieldset className="m-0 border-0 p-0">
        <legend className="mb-2 text-sm font-semibold text-navy">{t('cal_your_status', lang)}</legend>
        <div className="flex flex-wrap gap-2">
          {PLAN_STATUSES.map((s) => (
            <label key={s} className={`flex min-h-11 cursor-pointer items-center gap-2 rounded-[4px_4px_14px_4px] px-3.5 text-[15px] font-semibold ring-1 has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-brand ${
              status === s ? 'bg-white text-navy ring-navy' : 'bg-white/60 text-navy ring-line'}`}>
              <input type="radio" name={`${id}-status`} value={s} checked={status === s} onChange={() => setStatus(s)} className="sr-only" />
              <Dot status={s} />{t(`cal_status_${s}`, lang)}
            </label>
          ))}
        </div>
      </fieldset>
      <div className="flex flex-wrap gap-x-6 gap-y-2">
        <label className="flex min-h-11 items-center gap-2.5 text-[15px] text-navy">
          <input type="checkbox" checked={offers} onChange={(e) => setOffers(e.target.checked)} className="h-5 w-5 accent-[#d52435]" />
          {t('cal_offers_ride', lang)}
        </label>
        <label className="flex min-h-11 items-center gap-2.5 text-[15px] text-navy">
          <input type="checkbox" checked={needs} onChange={(e) => setNeeds(e.target.checked)} className="h-5 w-5 accent-[#d52435]" />
          {t('cal_needs_ride', lang)}
        </label>
      </div>
      <label className="flex flex-col gap-1 text-sm font-semibold text-navy">
        {t('cal_note', lang)}
        <textarea value={note} onChange={(e) => setNote(e.target.value)} maxLength={280} rows={2}
          placeholder={t('cal_note_placeholder', lang)}
          className="min-h-11 rounded border border-[#8a8e94] bg-white px-3 py-2 text-[15px] font-normal text-navy placeholder:text-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand" />
      </label>
      <div className="flex flex-wrap items-center gap-3">
        <button type="submit" disabled={busy} className={BTN_PRIMARY}>{existing ? t('cal_save_changes', lang) : t('cal_save', lang)}</button>
        <button type="button" onClick={onCancel} className={`${LINK_BTN} px-2 text-[15px]`}>{t('cal_cancel', lang)}</button>
        {existing && (
          <button type="button" onClick={onRemove} disabled={busy} className={`${LINK_BTN} ml-auto px-2 text-[15px]`}>{t('cal_remove', lang)}</button>
        )}
      </div>
    </form>
  )
}

function RaceCard({ race, plans, lang, myName, onNeedName, onChanged }: {
  race: Race
  plans: Plan[]
  lang: Lang
  myName: string
  onNeedName: () => void
  onChanged: () => Promise<void>
}) {
  const [open, setOpen] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const mine = myName.trim() ? plans.find((p) => sameName(p.person_name, myName)) : undefined
  const byStatus = PLAN_STATUSES.map((s) => ({ s, people: plans.filter((p) => p.status === s) })).filter((g) => g.people.length)
  const offering = plans.filter((p) => p.offers_ride).map((p) => p.person_name)
  const needing = plans.filter((p) => p.needs_ride).map((p) => p.person_name)
  const notes = plans.filter((p) => p.note)

  const run = async (fn: () => Promise<void>) => {
    setBusy(true); setError(null)
    try { await fn(); await onChanged(); setOpen(false) }
    catch (e) {
      const code = (e as { code?: string }).code
      setError(code === '23505' ? t('cal_error_duplicate', lang) : t('cal_error_save', lang))
      await onChanged()
    }
    finally { setBusy(false) }
  }

  const reg = race.registration !== 'unknown' && (
    <span className={`inline-flex h-6 items-center rounded-[2px_2px_10px_2px] px-2 font-display text-xs font-semibold ${
      race.registration === 'open' ? 'bg-[#1b7a3a] text-white' : race.registration === 'sold_out' ? 'bg-brand text-white' : 'border border-navy text-navy'}`}>
      {t(`cal_reg_${race.registration}`, lang)}
    </span>
  )

  return (
    <li className={`${CARD} bg-white px-5 py-5 ring-1 ring-line sm:px-6`}>
      <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-1">
        <div className="min-w-0">
          <div className="text-xs font-bold uppercase tracking-[0.08em] text-muted">{t(race.sport === 'skiing' ? 'cal_sport_skiing' : race.sport, lang)}</div>
          <h4 className={`${H_BLOCK} mt-0.5`}>{race.name}</h4>
          <p className="m-0 mt-1 text-[15px] text-ink">
            {raceDateLabel(race, lang)}{race.place ? ` · ${race.place}` : ''}{race.distance ? ` · ${race.distance}` : ''}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {reg}
          {race.url && <a href={race.url} target="_blank" rel="noopener noreferrer" className={`${LINK_BTN} inline-flex items-center px-1 text-sm`}>{t('cal_website', lang)}</a>}
        </div>
      </div>

      {byStatus.length > 0 ? (
        <dl className="m-0 mt-4 grid gap-1.5">
          {byStatus.map(({ s, people }) => (
            <div key={s} className="flex flex-wrap items-baseline gap-x-2 text-[15px]">
              <dt className="flex items-center gap-2 font-semibold text-navy"><Dot status={s} />{t(`cal_status_${s}`, lang)} ({people.length}):</dt>
              <dd className="m-0">{people.map((p) => p.person_name).join(', ')}</dd>
            </div>
          ))}
          {offering.length > 0 && (
            <div className="flex flex-wrap gap-x-2 text-[15px]"><dt className="font-semibold text-navy">{t('cal_offers_ride', lang)}:</dt><dd className="m-0">{offering.join(', ')}</dd></div>
          )}
          {needing.length > 0 && (
            <div className="flex flex-wrap gap-x-2 text-[15px]"><dt className="font-semibold text-navy">{t('cal_needs_ride', lang)}:</dt><dd className="m-0">{needing.join(', ')}</dd></div>
          )}
        </dl>
      ) : (
        <p className="m-0 mt-3 text-[15px] text-muted">{t('cal_nobody_yet', lang)}</p>
      )}
      {notes.length > 0 && (
        <ul className="m-0 mt-3 list-none space-y-1 border-l-2 border-line p-0 pl-3 text-sm text-ink">
          {notes.map((p) => <li key={p.id}><span className="font-semibold text-navy">{p.person_name}:</span> {p.note}</li>)}
        </ul>
      )}

      {!open && (
        <button type="button" onClick={() => (myName.trim() ? setOpen(true) : onNeedName())}
          className={`${mine ? 'border-2 border-navy bg-white text-navy hover:bg-mist' : 'bg-brand text-white hover:bg-brand-dark'} mt-4 inline-flex min-h-11 items-center rounded px-4 font-display text-[15px] font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-navy focus-visible:ring-offset-2`}>
          {mine ? t('cal_change_plan', lang) : t('cal_add_plan', lang)}
        </button>
      )}
      {open && (
        <PlanForm race={race} existing={mine} lang={lang} busy={busy}
          onCancel={() => setOpen(false)}
          onSave={(input) => run(() => savePlan(race.id, myName, input, mine?.id))}
          onRemove={() => mine && run(() => deletePlan(mine.id))} />
      )}
      {error && <p role="alert" className="mb-0 mt-2 text-sm font-semibold text-brand">{error}</p>}
    </li>
  )
}

export function RaceCalendarTab({ lang }: { lang: Lang }) {
  const nameId = useId()
  const [races, setRaces] = useState<Race[] | null>(null)
  const [plans, setPlans] = useState<Plan[]>([])
  const [loadError, setLoadError] = useState(false)
  const [sport, setSport] = useState<RaceSport | 'all'>('all')
  const [onlyMine, setOnlyMine] = useState(false)
  const [myName, setMyName] = useState('')
  const [nameHint, setNameHint] = useState(false)

  const refresh = useCallback(async () => {
    try {
      const d = await loadCalendar()
      setRaces(d.races); setPlans(d.plans); setLoadError(false)
    } catch { setLoadError(true) }
  }, [])

  useEffect(() => {
    // Reading the saved name and the data after mount (browser-only)
    // eslint-disable-next-line react-hooks/set-state-in-effect
    try { setMyName(localStorage.getItem(NAME_KEY) ?? '') } catch { /* private browsing */ }
    void refresh()
  }, [refresh])

  const changeName = (v: string) => {
    setMyName(v); setNameHint(false)
    try { localStorage.setItem(NAME_KEY, v) } catch { /* private browsing */ }
  }

  const plansByRace = useMemo(() => {
    const m = new Map<string, Plan[]>()
    for (const p of plans) m.set(p.race_id, [...(m.get(p.race_id) ?? []), p])
    return m
  }, [plans])

  const months = useMemo(() => {
    const list = (races ?? [])
      .filter((r) => sport === 'all' || r.sport === sport)
      .filter((r) => !onlyMine || (plansByRace.get(r.id) ?? []).some((p) => sameName(p.person_name, myName)))
    const groups = new Map<string, Race[]>()
    for (const r of list) groups.set(monthKey(r), [...(groups.get(monthKey(r)) ?? []), r])
    // Dated months in order, "date to be announced" last
    return [...groups.entries()].sort(([a], [b]) => (a === 'tba' ? 1 : b === 'tba' ? -1 : a.localeCompare(b)))
  }, [races, sport, onlyMine, plansByRace, myName])

  const askForName = () => {
    setNameHint(true)
    document.getElementById(nameId)?.focus()
    document.getElementById(nameId)?.scrollIntoView({ block: 'center', behavior: 'smooth' })
  }

  const chip = (on: boolean) => `min-h-10 rounded-[4px_4px_14px_4px] px-3.5 text-[15px] font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand ${
    on ? 'bg-brand text-white' : 'bg-white text-navy ring-1 ring-line hover:bg-mist'}`

  return (
    <div className="flex flex-col gap-8">
      <PageTitle eyebrow={t('cal_eyebrow', lang)} title={t('cal_title', lang)} subtitle={t('cal_subtitle', lang)} intro={t('cal_intro', lang)} />

      <section aria-labelledby="cal-you" className={`${CARD_MIST} px-5 py-5 sm:px-6`}>
        <h3 id="cal-you" className={H_BLOCK}>{t('cal_you', lang)}</h3>
        <label htmlFor={nameId} className="mt-3 block text-sm font-semibold text-navy">{t('cal_your_name', lang)}</label>
        <input id={nameId} value={myName} onChange={(e) => changeName(e.target.value)} maxLength={60} autoComplete="name"
          placeholder={t('cal_your_name_placeholder', lang)} aria-describedby={`${nameId}-hint`}
          className={`${FIELD} mt-1 w-full max-w-[360px]`} />
        <p id={`${nameId}-hint`} className={`mb-0 mt-2 text-sm ${nameHint ? 'font-semibold text-brand' : 'text-muted'}`}>
          {nameHint ? t('cal_name_needed', lang) : t('cal_name_help', lang)}
        </p>
        <p className="mb-0 mt-2 text-sm text-muted">{t('cal_test_phase', lang)}</p>
      </section>

      <div className="flex flex-wrap items-center gap-2" role="group" aria-label={t('cal_filter', lang)}>
        {SPORT_FILTERS.map((s) => (
          <button key={s} type="button" aria-pressed={sport === s} onClick={() => setSport(s)} className={chip(sport === s)}>
            {s === 'all' ? t('cal_all_races', lang) : t(s === 'skiing' ? 'cal_sport_skiing' : s, lang)}
          </button>
        ))}
        <button type="button" aria-pressed={onlyMine} disabled={!myName.trim()} onClick={() => setOnlyMine((v) => !v)}
          className={`${chip(onlyMine)} disabled:cursor-default disabled:opacity-50 sm:ml-auto`}>
          {t('cal_only_mine', lang)}
        </button>
      </div>

      {loadError && (
        <p role="alert" className="m-0 rounded bg-mist p-5 text-[15px] text-navy">
          {t('cal_load_error', lang)}{' '}
          <button type="button" onClick={() => void refresh()} className={`${LINK_BTN} px-1`}>{t('cal_retry', lang)}</button>
        </p>
      )}
      {!races && !loadError && <div className="h-40 animate-pulse rounded bg-mist" aria-label={t('cal_loading', lang)} />}

      {races && months.length === 0 && (
        <p className="m-0 text-[15px] text-muted">{onlyMine ? t('cal_none_mine', lang) : t('cal_none', lang)}</p>
      )}

      {months.map(([key, list]) => (
        <section key={key} aria-labelledby={`cal-${key}`}>
          <h3 id={`cal-${key}`} className={`${H_SECTION} mb-3`}>{monthLabel(key, lang)}</h3>
          <ul className="m-0 grid list-none gap-4 p-0 lg:grid-cols-2">
            {list.map((r) => (
              <RaceCard key={r.id} race={r} plans={plansByRace.get(r.id) ?? []} lang={lang}
                myName={myName} onNeedName={askForName} onChanged={refresh} />
            ))}
          </ul>
        </section>
      ))}
      {races && (
        <p className="m-0 text-sm text-muted">{tf('cal_count', lang, { n: races.length })} {t('cal_missing', lang)}</p>
      )}
    </div>
  )
}
