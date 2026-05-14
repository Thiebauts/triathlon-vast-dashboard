export const dynamic = 'force-static'

import { loadAllCompetitions } from '@/lib/loader'
import { getAllAthleteNames, getClubRankings } from '@/lib/data'
import { Dashboard } from '@/components/Dashboard'

export default function Home() {
  const data = loadAllCompetitions()
  const athleteNames = getAllAthleteNames(data)
  const allTimeRankings = getClubRankings(data, 'all', 'all')

  return (
    <main id="main">
      <Dashboard
        data={data}
        athleteNames={athleteNames}
        allTimeRankings={allTimeRankings}
      />
    </main>
  )
}
