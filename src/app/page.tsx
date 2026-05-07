export const dynamic = 'force-static'

import { loadAllCompetitions } from '@/lib/loader'
import {
  getAllAthleteNames,
  getClubRankings,
  buildAllSplitRanks,
} from '@/lib/data'
import { Dashboard } from '@/components/Dashboard'

export default function Home() {
  const data = loadAllCompetitions()
  const athleteNames = getAllAthleteNames(data)
  const allTimeRankings = getClubRankings(data, 'all', 'all')
  const splitRanks = buildAllSplitRanks(data)

  return (
    <main id="main">
      <Dashboard
        data={data}
        athleteNames={athleteNames}
        allTimeRankings={allTimeRankings}
        splitRanks={splitRanks}
      />
    </main>
  )
}
