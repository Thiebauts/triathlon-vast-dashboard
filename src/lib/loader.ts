// SERVER-ONLY: uses fs — import only from Server Components / page.tsx
import fs from 'fs'
import path from 'path'
import Papa from 'papaparse'
import type { AthleteResult, CompetitionsData, SportType } from './types'

/** Normalise historical class-name variations to a single canonical form. */
function normalizeClass(cls: string): string {
  switch (cls.trim().toLowerCase()) {
    case 'damer': return 'Dam'
    case 'herrar': return 'Herr'
    case 'man':   return 'Herr'
    default: return cls.trim()
  }
}

function readCsv(filePath: string): Record<string, string>[] {
  try {
    const content = fs.readFileSync(filePath, 'utf-8')
    const result = Papa.parse<Record<string, string>>(content, { header: true, skipEmptyLines: true })
    if (result.errors.length > 0) {
      console.error(`CSV parse errors in ${filePath}:`, result.errors)
    }
    return result.data
  } catch (err) {
    console.error(`Failed to read CSV ${filePath}:`, err)
    return []
  }
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
      const rows = readCsv(path.join(base, file))
      for (const row of rows) {
        data[sport].push({
          ...row,
          Class: normalizeClass(row.Class ?? ''),
          Total_Time_Seconds: parseFloat(row.Total_Time_Seconds ?? '0') || 0,
          Overall_Rank: parseInt(row.Overall_Rank ?? '0', 10) || 0,
          Class_Rank: parseInt(row.Class_Rank ?? '0', 10) || 0,
          Competition_Year: year,
          Competition_Type: sport.charAt(0).toUpperCase() + sport.slice(1),
        } as AthleteResult)
      }
    }
  }

  cached = data
  return data
}
