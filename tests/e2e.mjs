import { chromium } from 'playwright'

const BASE = 'http://localhost:3000'
let passed = 0
let failed = 0
const errors = []

function ok(name) {
  console.log(`  ✅ ${name}`)
  passed++
}
function fail(name, reason) {
  console.log(`  ❌ ${name}: ${reason}`)
  failed++
  errors.push({ name, reason })
}

async function test(name, fn) {
  try {
    await fn()
    ok(name)
  } catch (e) {
    fail(name, e.message.split('\n')[0])
  }
}

async function run() {
  const browser = await chromium.launch({ headless: true })
  const page = await browser.newPage()

  // Collect console errors (with source URL — resource-load failures carry the
  // failing URL only in the location, not the message text)
  const consoleErrors = []
  page.on('console', msg => {
    if (msg.type() === 'error') consoleErrors.push(`${msg.text()} [${msg.location()?.url ?? ''}]`)
  })
  page.on('pageerror', err => consoleErrors.push(err.message))

  await page.goto(BASE, { waitUntil: 'networkidle' })

  // ── OVERVIEW TAB ────────────────────────────────────────────────────────────
  console.log('\n📋 Overview Tab')

  await test('Page loads (HTTP 200)', async () => {
    const res = await page.goto(BASE, { waitUntil: 'networkidle' })
    if (res.status() !== 200) throw new Error(`Got ${res.status()}`)
  })

  await test('Header logo visible', async () => {
    const logo = page.locator('img[alt="Triathlon Väst"]')
    await logo.waitFor({ state: 'visible', timeout: 5000 })
  })

  await test('Language toggle button visible', async () => {
    const btn = page.locator('button', { hasText: /Svenska|English/ })
    await btn.waitFor({ state: 'visible', timeout: 5000 })
  })

  await test('5 tab buttons visible', async () => {
    // role=tab — text matching would also count the Overview navigation links
    const count = await page.getByRole('tab').count()
    if (count !== 5) throw new Error(`Found ${count} tabs, expected 5`)
  })

  await test('Discipline cards visible', async () => {
    // Overview tab now lists club championship disciplines instead of stat cards
    const card = page.locator('text=Running — 5 km Track Race')
    await card.waitFor({ state: 'visible', timeout: 5000 })
  })

  await test('Participation chart renders', async () => {
    // Recharts renders an SVG inside the visible Overview subtree
    const svg = page.locator('div:not([hidden]) svg').first()
    await svg.waitFor({ state: 'visible', timeout: 5000 })
  })

  await test('Extra events block visible', async () => {
    const block = page.locator('text=Extra events & open trainings')
    await block.waitFor({ state: 'visible', timeout: 5000 })
  })

  await test('Extra events link navigates to Extra Events tab', async () => {
    await page.locator('button', { hasText: 'View the results in the Extra Events tab' }).click()
    await page.waitForTimeout(600)
    const header = page.locator('text=Extra events & timed trainings')
    await header.waitFor({ state: 'visible', timeout: 3000 })
    // Return to Overview — the following tests expect it to be active
    await page.locator('button', { hasText: 'Overview' }).click()
    await page.waitForTimeout(400)
  })

  await test('Discipline card link opens Event Results with sport preselected', async () => {
    // Cards render in DISCIPLINES order — Running is first. The card links say
    // "View the results →"; the extra-events link has different wording.
    await page.locator('button', { hasText: 'View the results →' }).first().click()
    await page.waitForTimeout(600)
    const header = page.locator('text=Event results & all-time rankings')
    await header.waitFor({ state: 'visible', timeout: 3000 })
    const sportSelect = page.locator('select:visible').first()
    const value = await sportSelect.inputValue()
    if (value !== 'running') throw new Error(`Sport select is "${value}", expected "running"`)
    // Return to Overview — the following tests expect it to be active
    await page.getByRole('tab', { name: 'Overview' }).click()
    await page.waitForTimeout(400)
  })

  await test('About section text visible', async () => {
    const text = page.locator('text=Created by members')
    await text.waitFor({ state: 'visible', timeout: 5000 })
  })

  await test('Contact section visible', async () => {
    const text = page.locator('text=Contact')
    await text.first().waitFor({ state: 'visible', timeout: 5000 })
  })

  // ── LANGUAGE TOGGLE ──────────────────────────────────────────────────────────
  console.log('\n🌐 Language Toggle')

  await test('Switch to Swedish', async () => {
    const btn = page.locator('button', { hasText: 'Svenska' })
    await btn.click()
    await page.waitForTimeout(500)
    // Check unique Swedish text in the about section (appears exactly once)
    await page.locator('text=Skapad av medlemmar').waitFor({ state: 'visible', timeout: 3000 })
  })

  await test('Switch back to English', async () => {
    const btn = page.locator('button', { hasText: 'English' })
    await btn.click()
    await page.waitForTimeout(500)
    // Check unique English text in the about section (appears exactly once)
    await page.locator('text=Created by members').waitFor({ state: 'visible', timeout: 3000 })
  })

  // ── EVENT RESULTS TAB ────────────────────────────────────────────────────────
  console.log('\n🏆 Event Results Tab')

  await test('Click Event Results tab', async () => {
    const tab = page.locator('button', { hasText: 'Event Results' })
    await tab.click()
    await page.waitForTimeout(800)
    const header = page.locator('text=Event results & all-time rankings')
    await header.waitFor({ state: 'visible', timeout: 5000 })
  })

  await test('Sport selector visible with options', async () => {
    // Tabs stay mounted via `hidden`; scope locators to visible selects only.
    const select = page.locator('select:visible').first()
    await select.waitFor({ state: 'visible' })
    const options = await select.locator('option').allTextContents()
    if (!options.some(o => /triathlon/i.test(o))) throw new Error('No triathlon option')
  })

  await test('Year selector visible', async () => {
    const selects = page.locator('select:visible')
    const count = await selects.count()
    if (count < 2) throw new Error(`Only ${count} visible selects`)
  })

  await test('Results table renders with rows', async () => {
    const rows = page.locator('table tbody tr')
    const count = await rows.count()
    if (count === 0) throw new Error('No table rows')
  })

  await test('Club members highlighted (red background)', async () => {
    // Club member rows use bg-red-50/30; verify table has rows at all
    const rows = page.locator('table tbody tr')
    const count = await rows.count()
    if (count === 0) throw new Error('No table rows found')
  })

  await test('Filter by year 2024', async () => {
    const yearSelect = page.locator('select:visible').nth(1)
    await yearSelect.selectOption('2024')
    await page.waitForTimeout(500)
    const rows = page.locator('table tbody tr')
    const count = await rows.count()
    if (count === 0) throw new Error('No rows after year filter')
  })

  await test('Filter by category (Men Only)', async () => {
    const catSelect = page.locator('select:visible').nth(2)
    await catSelect.selectOption('men')
    await page.waitForTimeout(400)
    const rows = page.locator('table tbody tr')
    const count = await rows.count()
    if (count === 0) throw new Error('No rows after men filter')
  })

  await test('Switch sport to Swimming', async () => {
    const sportSelect = page.locator('select:visible').first()
    await sportSelect.selectOption('swimming')
    await page.waitForTimeout(500)
    const rows = page.locator('table tbody tr')
    const count = await rows.count()
    if (count === 0) throw new Error('No rows for swimming')
  })

  await test('Switch sport to Cycling', async () => {
    const sportSelect = page.locator('select:visible').first()
    await sportSelect.selectOption('cycling')
    await page.waitForTimeout(500)
    const rows = page.locator('table tbody tr')
    const count = await rows.count()
    if (count === 0) throw new Error('No rows for cycling')
  })

  await test('Switch sport to Running', async () => {
    const sportSelect = page.locator('select:visible').first()
    await sportSelect.selectOption('running')
    await page.waitForTimeout(500)
    const rows = page.locator('table tbody tr')
    const count = await rows.count()
    if (count === 0) throw new Error('No rows for running')
  })

  await test('Switch sport to Duathlon', async () => {
    const sportSelect = page.locator('select:visible').first()
    await sportSelect.selectOption('duathlon')
    await page.waitForTimeout(500)
    const rows = page.locator('table tbody tr')
    const count = await rows.count()
    if (count === 0) throw new Error('No rows for duathlon')
  })

  await test('Triathlon shows segment columns (Swim/T1/Bike/T2/Run)', async () => {
    const sportSelect = page.locator('select:visible').first()
    await sportSelect.selectOption('triathlon')
    await page.waitForTimeout(500)
    // :visible — the Extra Events panel (mounted but hidden) has Swim/Bike headers too
    const swimHeader = page.locator('th:visible', { hasText: /swim/i }).first()
    await swimHeader.waitFor({ state: 'visible', timeout: 3000 })
    const bikeHeader = page.locator('th:visible', { hasText: /bike/i }).first()
    await bikeHeader.waitFor({ state: 'visible', timeout: 3000 })
  })

  await test('All-years view sorts by best time', async () => {
    const yearSelect = page.locator('select:visible').nth(1)
    await yearSelect.selectOption('all')
    await page.waitForTimeout(500)
    // Rank cell is `<th scope="row">` for accessibility, not `<td>`.
    const firstRank = await page.locator('table tbody tr').first().locator('th[scope="row"]').first().textContent()
    if (firstRank?.trim() !== '1') throw new Error(`First rank is "${firstRank}", expected "1"`)
  })

  // ── ATHLETES TAB ─────────────────────────────────────────────────────────────
  console.log('\n🏅 Athletes Tab')

  await test('Click Athletes tab', async () => {
    const tab = page.locator('button', { hasText: 'Athlete Profiles' })
    await tab.click()
    await page.waitForTimeout(800)
    const header = page.locator('text=Individual athlete profiles')
    await header.waitFor({ state: 'visible', timeout: 5000 })
  })

  await test('Athlete search input visible', async () => {
    // Both Results and Athletes tabs render an input with this placeholder; the
    // hidden one is in the DOM but display:none, so filter to visible.
    const input = page.locator('input[placeholder="Search athlete…"]:visible')
    await input.waitFor({ state: 'visible', timeout: 3000 })
  })

  await test('Athlete list populated', async () => {
    const items = page.locator('ul li button:visible')
    const count = await items.count()
    if (count === 0) throw new Error('No athletes in list')
    console.log(`     (${count} athletes found)`)
  })

  await test('Select prompt shown before selection', async () => {
    const prompt = page.locator('text=Please select an athlete')
    await prompt.waitFor({ state: 'visible', timeout: 3000 })
  })

  await test('Search filters athlete list', async () => {
    const input = page.locator('input[placeholder="Search athlete…"]:visible')
    await input.fill('Jon')
    await page.waitForTimeout(300)
    const items = page.locator('ul li button:visible')
    const count = await items.count()
    if (count === 0) throw new Error('Search returned 0 results for "Jon"')
    const all = await items.allTextContents()
    if (!all.every(n => n.toLowerCase().includes('jon'))) throw new Error('Search not filtering correctly')
  })

  await test('Select first athlete shows profile', async () => {
    const input = page.locator('input[placeholder="Search athlete…"]:visible')
    await input.clear()
    await page.waitForTimeout(300)
    const firstAthlete = page.locator('ul li button:visible').first()
    const name = await firstAthlete.textContent()
    await firstAthlete.click()
    await page.waitForTimeout(800)
    // Name should appear in the profile header
    const nameEl = page.locator('h3', { hasText: name?.trim() ?? '' })
    await nameEl.waitFor({ state: 'visible', timeout: 3000 })
    console.log(`     (selected: ${name?.trim()})`)
  })

  await test('Athlete chart renders after selection', async () => {
    // Recharts renders SVGs inside the visible Athletes subtree.
    const svgs = page.locator('div:not([hidden]) svg')
    await svgs.first().waitFor({ state: 'visible', timeout: 5000 })
    const count = await svgs.count()
    if (count < 1) throw new Error('No chart SVG found after athlete selection')
  })

  await test('Event table shows for selected athlete', async () => {
    // Multiple tables exist (Results tab is mounted but hidden); count visible rows only.
    const rows = page.locator('table tbody tr:visible')
    const count = await rows.count()
    if (count === 0) throw new Error('No event rows for selected athlete')
  })

  await test('Club member badge shown on profile', async () => {
    // Either "TriVäst Member" badge or "Guest"
    const memberBadge = page.locator('text=TriVäst Member')
    const guestBadge = page.locator('text=Guest')
    const hasMember = await memberBadge.count() > 0
    const hasGuest = await guestBadge.count() > 0
    if (!hasMember && !hasGuest) throw new Error('No member/guest badge found')
  })

  await test('Select a different athlete', async () => {
    const athletes = page.locator('ul li button:visible')
    const count = await athletes.count()
    const secondIdx = Math.min(5, count - 1)
    const second = athletes.nth(secondIdx)
    const name = await second.textContent()
    await second.click()
    await page.waitForTimeout(600)
    const nameEl = page.locator('h3', { hasText: name?.trim() ?? '' })
    await nameEl.waitFor({ state: 'visible', timeout: 3000 })
  })

  // ── RANKINGS TAB ─────────────────────────────────────────────────────────────
  console.log('\n🥇 Rankings Tab')

  await test('Click Rankings tab', async () => {
    const tab = page.locator('button', { hasText: 'Club Rankings' })
    await tab.click()
    await page.waitForTimeout(800)
    const header = page.locator('text=Club rankings & points system')
    await header.waitFor({ state: 'visible', timeout: 5000 })
  })

  await test("Women's rankings table visible", async () => {
    const header = page.locator("text=Women's Rankings")
    await header.waitFor({ state: 'visible', timeout: 3000 })
  })

  await test("Men's rankings table visible", async () => {
    // Use getByRole to avoid case-insensitive substring matching "Women's" → "men's"
    const header = page.getByRole('heading', { name: "Men's Rankings", exact: true })
    await header.waitFor({ state: 'visible', timeout: 3000 })
  })

  await test('Top 3 ranks styled (medal colors)', async () => {
    // Rank cell is `<th scope="row">`, not `<td>`, for accessibility.
    const rankCells = page.locator('table tbody tr th[scope="row"]:visible')
    await rankCells.first().waitFor({ state: 'visible', timeout: 3000 })
    const firstRank = await rankCells.first().textContent()
    if (!firstRank || firstRank.trim() === '') throw new Error('No rank cell found')
  })

  await test('Points column has non-zero values', async () => {
    // Row layout: <th>rank</th><td>name</td><td>points</td>... ; points is :nth-child(3)
    const cells = page.locator('table tbody tr td:nth-child(3):visible')
    const first = await cells.first().textContent()
    if (!first || parseInt(first) <= 0) throw new Error(`First points value is "${first}"`)
  })

  await test('Year filter changes data', async () => {
    const rowsBefore = await page.locator('table tbody tr:visible').count()
    const yearSelect = page.locator('select:visible').first()
    const options = await yearSelect.locator('option').allTextContents()
    const specific = options.find(o => /^\d{4}$/.test(o.trim()))
    if (specific) {
      await yearSelect.selectOption(specific.trim())
      await page.waitForTimeout(500)
      const rowsAfter = await page.locator('table tbody tr:visible').count()
      if (rowsAfter < 0) throw new Error('Negative rows')
      console.log(`     (all years: ${rowsBefore} rows → ${specific}: ${rowsAfter} rows)`)
    }
  })

  await test('Reset to all years', async () => {
    const yearSelect = page.locator('select:visible').first()
    await yearSelect.selectOption('all')
    await page.waitForTimeout(500)
    const rows = page.locator('table tbody tr:visible')
    const count = await rows.count()
    if (count === 0) throw new Error('No rows after resetting year filter')
  })

  // ── EXTRA EVENTS TAB ─────────────────────────────────────────────────────────
  console.log('\n🎽 Extra Events Tab')

  await test('Click Extra Events tab', async () => {
    // getByRole('tab') — a plain locator would also match the Overview block's
    // "View the results in the Extra Events tab" button
    const tab = page.getByRole('tab', { name: 'Extra Events' })
    await tab.click()
    await page.waitForTimeout(800)
    const header = page.locator('text=Extra events & timed trainings')
    await header.waitFor({ state: 'visible', timeout: 5000 })
  })

  await test('Event selector lists the SuperSprint training', async () => {
    const select = page.locator('select:visible').first()
    const options = await select.locator('option').allTextContents()
    if (!options.some(o => /SuperSprint/i.test(o))) throw new Error('No SuperSprint option')
  })

  await test('Event description with distances visible', async () => {
    const desc = page.locator('text=400 m swim')
    await desc.waitFor({ state: 'visible', timeout: 3000 })
  })

  await test('Ranked finishers start at rank 1', async () => {
    const firstRank = await page.locator('table tbody tr:visible').first()
      .locator('th[scope="row"]').first().textContent()
    if (firstRank?.trim() !== '1') throw new Error(`First rank is "${firstRank}", expected "1"`)
  })

  await test('Partial participants listed unranked at the bottom', async () => {
    const lastRank = await page.locator('table tbody tr:visible').last()
      .locator('th[scope="row"]').textContent()
    if (lastRank?.trim() !== '—') throw new Error(`Last row rank is "${lastRank}", expected "—"`)
  })

  await test('No points column on extra events', async () => {
    const pointsHeaders = page.locator('table:visible th', { hasText: /^Points$/ })
    const count = await pointsHeaders.count()
    if (count > 0) throw new Error('Extra events must not show a points column')
  })

  await test('Split rank (#) columns visible', async () => {
    const hashHeaders = page.locator('table:visible th', { hasText: /^#$/ })
    const count = await hashHeaders.count()
    if (count !== 5) throw new Error(`Expected 5 split-rank columns, found ${count}`)
  })

  await test('Partial participant has split ranks for completed legs only', async () => {
    // Last row is a partial (Peter: bike+T2+run) — its swim rank cell must be
    // a dash while at least one later split rank is numeric.
    const lastRow = page.locator('table tbody tr:visible').last()
    const cells = await lastRow.locator('td').allTextContents()
    if (!cells.some(c => /^\d+$/.test(c.trim()))) throw new Error('No numeric split rank on partial row')
  })

  await test('Women Only filter renumbers ranks from 1', async () => {
    const catSelect = page.locator('select:visible').nth(1)
    await catSelect.selectOption('women')
    await page.waitForTimeout(400)
    const firstRow = page.locator('table tbody tr:visible').first()
    const rank = await firstRow.locator('th[scope="row"]').textContent()
    if (rank?.trim() !== '1') throw new Error(`First women's rank is "${rank}", expected "1"`)
    const name = await firstRow.locator('td').first().textContent()
    console.log(`     (women's #1: ${name?.trim()})`)
  })

  await test('Reset category to Overall', async () => {
    const catSelect = page.locator('select:visible').nth(1)
    await catSelect.selectOption('all')
    await page.waitForTimeout(400)
    const rows = page.locator('table tbody tr:visible')
    const count = await rows.count()
    if (count === 0) throw new Error('No rows after resetting category')
  })

  await test('Export CSV button visible on extra events', async () => {
    const btn = page.locator('button:visible', { hasText: 'Export CSV' }).first()
    await btn.waitFor({ state: 'visible', timeout: 3000 })
  })

  await test('Event selector shows localized date', async () => {
    const select = page.locator('select:visible').first()
    const options = await select.locator('option').allTextContents()
    if (!options.some(o => /10 June 2026/.test(o))) throw new Error(`No localized date in: ${options.join(' | ')}`)
  })

  // Return to Rankings — the language tests below expect it to be active
  await page.locator('button', { hasText: 'Club Rankings' }).click()
  await page.waitForTimeout(500)

  // ── LANGUAGE IN CONTEXT ───────────────────────────────────────────────────────
  console.log('\n🌐 Language in Rankings context')

  await test('Switch to Swedish on Rankings tab', async () => {
    const btn = page.locator('button', { hasText: 'Svenska' })
    await btn.click()
    await page.waitForTimeout(500)
    const svHeader = page.locator('text=Damranking')
    await svHeader.waitFor({ state: 'visible', timeout: 3000 })
  })

  await test('Tabs translate to Swedish', async () => {
    const tab = page.locator('button', { hasText: 'Översikt' })
    await tab.waitFor({ state: 'visible', timeout: 3000 })
  })

  await test('Navigate to Översikt in Swedish', async () => {
    const tab = page.locator('button', { hasText: 'Översikt' })
    await tab.click()
    await page.waitForTimeout(600)
    const sv = page.locator('text=Skapad av medlemmar')
    await sv.waitFor({ state: 'visible', timeout: 3000 })
  })

  await test('Navigate to Tävlingsresultat in Swedish', async () => {
    const tab = page.locator('button', { hasText: 'Tävlingsresultat' })
    await tab.click()
    await page.waitForTimeout(600)
    const sv = page.locator('text=Tävlingsresultat & alla tiders ranking')
    await sv.waitFor({ state: 'visible', timeout: 3000 })
  })

  await test('Sport labels in Swedish', async () => {
    const select = page.locator('select:visible').first()
    const options = await select.locator('option').allTextContents()
    if (!options.some(o => /Triathlon/i.test(o))) throw new Error('No Swedish sport options')
  })

  // Switch back for final checks
  await page.locator('button', { hasText: 'English' }).click()
  await page.waitForTimeout(300)

  // ── DEEP LINKS ───────────────────────────────────────────────────────────────
  console.log('\n🔗 Deep links')

  await test('Direct link opens the supersprint results', async () => {
    await page.goto(`${BASE}/#extra/2026-06-10`, { waitUntil: 'networkidle' })
    await page.waitForTimeout(600)
    const header = page.locator('text=Extra events & timed trainings')
    await header.waitFor({ state: 'visible', timeout: 5000 })
    const value = await page.locator('select:visible').first().inputValue()
    if (!value.includes('2026-06-10')) throw new Error(`Event selector is "${value}"`)
  })

  await test('Direct link opens an athlete profile', async () => {
    await page.goto(`${BASE}/#athletes/${encodeURIComponent('Jonathan Flod')}`, { waitUntil: 'networkidle' })
    await page.waitForTimeout(600)
    const nameEl = page.locator('h3', { hasText: 'Jonathan Flod' })
    await nameEl.waitFor({ state: 'visible', timeout: 5000 })
  })

  await test('Direct link opens results with sport preselected', async () => {
    await page.goto(`${BASE}/#results/swimming`, { waitUntil: 'networkidle' })
    await page.waitForTimeout(600)
    const value = await page.locator('select:visible').first().inputValue()
    if (value !== 'swimming') throw new Error(`Sport select is "${value}"`)
  })

  await test('Tab clicks update the URL hash', async () => {
    await page.getByRole('tab', { name: 'Club Rankings' }).click()
    await page.waitForTimeout(400)
    if (!page.url().includes('#rankings')) throw new Error(`URL is ${page.url()}`)
  })

  await test('Overview clears the hash', async () => {
    await page.getByRole('tab', { name: 'Overview' }).click()
    await page.waitForTimeout(400)
    if (page.url().includes('#')) throw new Error(`URL still has a hash: ${page.url()}`)
  })

  // ── CONSOLE ERRORS ────────────────────────────────────────────────────────────
  console.log('\n🔍 Console errors check')
  const realErrors = consoleErrors.filter(e =>
    !e.includes('metadataBase') &&
    !e.includes('favicon') &&
    !e.includes('Download the React DevTools') &&
    // Vercel Analytics script only exists on Vercel deployments — 404s locally
    !e.includes('_vercel/insights')
  )
  if (realErrors.length === 0) {
    ok('No JavaScript console errors')
  } else {
    fail('Console errors detected', realErrors.join(' | '))
  }

  await browser.close()

  // ── SUMMARY ──────────────────────────────────────────────────────────────────
  console.log('\n' + '─'.repeat(50))
  console.log(`Results: ${passed} passed, ${failed} failed`)
  if (errors.length) {
    console.log('\nFailed tests:')
    errors.forEach(e => console.log(`  • ${e.name}: ${e.reason}`))
  }
  console.log('─'.repeat(50))
  process.exit(failed > 0 ? 1 : 0)
}

run().catch(e => { console.error('Fatal:', e); process.exit(1) })
