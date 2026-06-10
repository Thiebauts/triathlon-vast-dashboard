export const dynamic = 'force-static'

import { loadAllCompetitions, loadExtraEvents } from '@/lib/loader'
import { getAllAthleteNames, getClubRankings } from '@/lib/data'
import { Dashboard } from '@/components/Dashboard'

export default function Home() {
  const data = loadAllCompetitions()
  const athleteNames = getAllAthleteNames(data)
  const allTimeRankings = getClubRankings(data, 'all', 'all')
  const extraEvents = loadExtraEvents()

  return (
    <main id="main">
      <Dashboard
        data={data}
        athleteNames={athleteNames}
        allTimeRankings={allTimeRankings}
        extraEvents={extraEvents}
      />
    </main>
  )
}
