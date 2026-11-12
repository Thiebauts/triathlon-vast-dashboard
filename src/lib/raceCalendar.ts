// Race calendar ("Who's going?"): races the club might go to and members'
// plans, stored in Supabase (see supabase/README.md). Browser-only.

import { createClient, type SupabaseClient } from '@supabase/supabase-js'

// Publishable key: designed to be public; the database's row-level security
// decides what it may do (supabase/migrations).
const SUPABASE_URL = 'https://ebjlwigrbcppugygicoq.supabase.co'
const SUPABASE_KEY = 'sb_publishable_2RZK44DBl1wuqn-tkrKcNw_Wuyrs5K9'

let client: SupabaseClient | null = null
function db(): SupabaseClient {
  client ??= createClient(SUPABASE_URL, SUPABASE_KEY, { auth: { persistSession: false } })
  return client
}

export const PLAN_STATUSES = ['registered', 'planning', 'maybe', 'looking_for_ticket', 'selling_ticket'] as const
export type PlanStatus = (typeof PLAN_STATUSES)[number]
export type RaceSport = 'triathlon' | 'duathlon' | 'swimrun' | 'running' | 'swimming' | 'cycling' | 'skiing' | 'other'

export interface Race {
  id: string
  slug: string
  name: string
  sport: RaceSport
  race_date: string | null
  date_note: string | null
  place: string | null
  distance: string | null
  url: string | null
  registration: 'open' | 'sold_out' | 'not_open' | 'unknown'
}

export interface Plan {
  id: string
  race_id: string
  person_name: string
  status: PlanStatus
  offers_ride: boolean
  needs_ride: boolean
  note: string | null
}

export type PlanInput = Pick<Plan, 'status' | 'offers_ride' | 'needs_ride' | 'note'>

/** Names compare without case or surrounding spaces ("anna " = "Anna"). */
export const sameName = (a: string, b: string) => a.trim().toLowerCase() === b.trim().toLowerCase()

export async function loadCalendar(): Promise<{ races: Race[]; plans: Plan[] }> {
  const [races, plans] = await Promise.all([
    db().from('races').select('*').order('race_date', { ascending: true, nullsFirst: false }).order('name'),
    db().from('plans').select('id, race_id, person_name, status, offers_ride, needs_ride, note').order('created_at'),
  ])
  if (races.error) throw races.error
  if (plans.error) throw plans.error
  return { races: races.data as Race[], plans: plans.data as Plan[] }
}

/** Adds the person's plan for a race, or updates it if they already have one. */
export async function savePlan(raceId: string, personName: string, input: PlanInput, existingId?: string): Promise<void> {
  const row = { ...input, note: input.note?.trim() || null }
  const res = existingId
    ? await db().from('plans').update(row).eq('id', existingId)
    : await db().from('plans').insert({ ...row, race_id: raceId, person_name: personName.trim() })
  if (res.error) throw res.error
}

export async function deletePlan(id: string): Promise<void> {
  const res = await db().from('plans').delete().eq('id', id)
  if (res.error) throw res.error
}
