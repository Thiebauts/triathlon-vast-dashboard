// SERVER-ONLY: uses fs — import only from Server Components / page.tsx
import fs from 'fs'
import path from 'path'
// Explicit .ts extension: the node --experimental-strip-types test runner
// resolves runtime imports literally (type-only imports are stripped).
import { CLUB_ALIASES } from './data.ts'
import type { AthleteResult, CompetitionsData, SportType } from './types'

const FIELDS_USED: ReadonlySet<string> = new Set([
  'Name', 'Bib', 'Class', 'Club', 'Total_Time', 'Total_Time_Seconds', 'Status',
  'Overall_Rank', 'Class_Rank',
  'Swim_Time', 'Swim_Seconds', 'T1_Time', 'T1_Seconds',
  'Bike_Time', 'Bike_Seconds', 'T2_Time', 'T2_Seconds',
  'Run_Time', 'Run_Seconds', 'Run1_Time', 'Run1_Seconds', 'Run2_Time', 'Run2_Seconds',
])

const NUMERIC_FIELDS: ReadonlySet<string> = new Set([
  'Total_Time_Seconds', 'Swim_Seconds', 'T1_Seconds',
  'Bike_Seconds', 'T2_Seconds', 'Run_Seconds', 'Run1_Seconds', 'Run2_Seconds',
])
const INT_FIELDS: ReadonlySet<string> = new Set(['Overall_Rank', 'Class_Rank'])

/** Normalise historical class-name variations to a single canonical form. */
function normalizeClass(cls: string): string {
  switch (cls.trim().toLowerCase()) {
    case 'damer':
    case 'kvinna':
    case 'kvinnor': return 'Dam'
    case 'herrar':
    case 'man':
    case 'män': return 'Herr'
    default: return cls.trim()
  }
}

/**
 * Minimal CSV parser. The data files are author-controlled and contain no
 * embedded quotes, commas, or newlines inside fields, so a plain split is safe
 * and avoids the PapaParse dependency.
 */
export function parseCsv(content: string): Record<string, string>[] {
  const lines = content.split(/\r?\n/).filter((l) => l.length > 0)
  if (lines.length < 2) return []
  const headers = lines[0].split(',')
  const out: Record<string, string>[] = []
  for (let i = 1; i < lines.length; i++) {
    const cells = lines[i].split(',')
    const row: Record<string, string> = {}
    for (let j = 0; j < headers.length; j++) {
      row[headers[j]] = cells[j] ?? ''
    }
    out.push(row)
  }
  return out
}

function rowToAthlete(
  row: Record<string, string>,
  year: string,
): AthleteResult {
  const out: Record<string, unknown> = {}
  for (const [key, raw] of Object.entries(row)) {
    if (!FIELDS_USED.has(key)) continue
    if (NUMERIC_FIELDS.has(key)) {
      out[key] = parseFloat(raw) || 0
    } else if (INT_FIELDS.has(key)) {
      out[key] = parseInt(raw, 10) || 0
    } else {
      out[key] = raw
    }
  }
  const cls = normalizeClass(String(out.Class ?? ''))
  const club = String(out.Club ?? '')
  return {
    ...out,
    Class: cls,
    class_lower: cls.toLowerCase(),
    Club: club,
    is_club_member: CLUB_ALIASES.has(club.toLowerCase().trim()),
    Status: String(out.Status ?? '').toLowerCase().trim(),
    Competition_Year: year,
  } as AthleteResult
}

let cached: CompetitionsData | null = null

export function loadAllCompetitions(): CompetitionsData {
  if (cached) return cached

  const base = path.join(process.cwd(), 'data')
  const allFiles = fs.readdirSync(base).sort()
  const sports: SportType[] = ['triathlon', 'duathlon', 'swimming', 'cycling', 'running', 'swimrun']
  const data: CompetitionsData = {
    triathlon: [], duathlon: [], swimming: [], cycling: [], running: [], swimrun: [],
  }

  for (const sport of sports) {
    const pattern = new RegExp(`processed_${sport}_results_(\\d{4}-\\d{2}-\\d{2})\\.csv`)
    const files = allFiles.filter((f) => pattern.test(f))
    for (const file of files) {
      const year = file.match(pattern)![1].split('-')[0]
      const content = fs.readFileSync(path.join(base, file), 'utf-8')
      for (const row of parseCsv(content)) {
        data[sport].push(rowToAthlete(row, year))
      }
    }
  }

  cached = data
  return data
}
