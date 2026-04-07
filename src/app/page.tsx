export const dynamic = 'force-static'

import { loadAllCompetitions } from '@/lib/loader'
import {
  getAllAthleteNames,
  getParticipationByYear,
} from '@/lib/data'
import { Dashboard } from '@/components/Dashboard'

export default function Home() {
  const data = loadAllCompetitions()
  const athleteNames = getAllAthleteNames(data)
  const participationByYear = getParticipationByYear(data)

  return (
    <main id="main">
      <Dashboard
        data={data}
        athleteNames={athleteNames}
        participationByYear={participationByYear}
      />
    </main>
  )
}
