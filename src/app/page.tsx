export const dynamic = 'force-static'

import { getLatestResultDate, getRaceDates, loadAllCompetitions, loadExtraEvents } from '@/lib/loader'
import { getAllAthleteNames, getClubRankings } from '@/lib/data'
import { Dashboard } from '@/components/Dashboard'

export default function Home() {
  const data = loadAllCompetitions()
  const athleteNames = getAllAthleteNames(data)
  const allTimeRankings = getClubRankings(data, 'all', 'all')
  const extraEvents = loadExtraEvents()
  const lastUpdated = getLatestResultDate()
  const raceDates = getRaceDates()

  // The Dashboard renders the whole page frame (header, side menu, <main>,
  // footer), since the header search and the menu drive its views.
  return (
    <Dashboard
      data={data}
      athleteNames={athleteNames}
      allTimeRankings={allTimeRankings}
      extraEvents={extraEvents}
      lastUpdated={lastUpdated}
      raceDates={raceDates}
    />
  )
}
