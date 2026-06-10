// Refresh the README screenshots in public/.
// Usage: npm run build && npm start  (in one terminal — use a PRODUCTION
//        server, the dev server adds a devtools badge to every shot)
//        node scripts/capture-screenshots.mjs  (in another)
// Set BASE to target a non-default port, e.g. BASE=http://localhost:3100
import { chromium } from 'playwright'

const BASE = process.env.BASE ?? 'http://localhost:3000'

// CSS-px viewports; images come out at 2×. The results tab is wider so the
// full split + points columns fit without clipping.
const SHOTS = [
  { tab: 'results',  file: 'public/screenshot-event-results.png',    width: 1420, height: 635 },
  { tab: 'athletes', file: 'public/screenshot-athlete-profiles.png', width: 1140, height: 577 },
  { tab: 'rankings', file: 'public/screenshot-club-rankings.png',    width: 1140, height: 658 },
]

const browser = await chromium.launch({ headless: true })
const page = await browser.newPage({ deviceScaleFactor: 2, viewport: { width: 1140, height: 700 } })
await page.goto(BASE, { waitUntil: 'networkidle' })

for (const { tab, file, width, height } of SHOTS) {
  await page.setViewportSize({ width, height })
  await page.click(`#tab-${tab}`)

  if (tab === 'results') {
    await page.waitForSelector('#tabpanel-results table')
  }
  if (tab === 'athletes') {
    // Pick the current top-ranked woman so the profile shows a rich history
    await page.fill('#athlete-search', 'Josefine')
    // Scope to this panel — athlete-name links also exist in other (hidden) tabs
    await page.click('#tabpanel-athletes ul button:has-text("Josefine Flod")')
    await page.waitForSelector('#tabpanel-athletes svg') // charts rendered
    await page.waitForTimeout(600) // chart layout settle
  }
  if (tab === 'rankings') {
    await page.waitForSelector('#tabpanel-rankings table')
  }

  // Align the tab bar with the top of the viewport so each shot shows the
  // active tab plus its content, like the original screenshots.
  await page.evaluate(() => {
    const tablist = document.querySelector('[role="tablist"]')
    if (tablist) window.scrollTo(0, tablist.getBoundingClientRect().top + window.scrollY - 6)
  })
  await page.waitForTimeout(200)
  await page.screenshot({ path: file })
  console.log(`captured ${file}`)
}

await browser.close()
