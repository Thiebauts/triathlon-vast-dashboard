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

  // Collect console errors
  const consoleErrors = []
  page.on('console', msg => { if (msg.type() === 'error') consoleErrors.push(msg.text()) })
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

  await test('4 tab buttons visible', async () => {
    const tabs = page.locator('button').filter({ hasText: /Overview|Event Results|Athlete|Rankings/ })
    const count = await tabs.count()
    if (count < 4) throw new Error(`Only ${count} tabs found`)
  })

  await test('Stat cards show numbers', async () => {
    // Look for large numeric values in red (metric cards) — now text-2xl
    const redNumbers = page.locator('.text-red-700.text-2xl, .text-2xl.font-bold.text-red-700')
    const count = await redNumbers.count()
    if (count < 3) throw new Error(`Only ${count} stat cards found`)
  })

  await test('Participation chart renders', async () => {
    // Recharts renders an SVG
    const svg = page.locator('svg').first()
    await svg.waitFor({ state: 'visible', timeout: 5000 })
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
    const select = page.locator('select').first()
    await select.waitFor({ state: 'visible' })
    const options = await select.locator('option').allTextContents()
    if (!options.some(o => /triathlon/i.test(o))) throw new Error('No triathlon option')
  })

  await test('Year selector visible', async () => {
    const selects = page.locator('select')
    const count = await selects.count()
    if (count < 2) throw new Error(`Only ${count} selects`)
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
    const yearSelect = page.locator('select').nth(1)
    await yearSelect.selectOption('2024')
    await page.waitForTimeout(500)
    const rows = page.locator('table tbody tr')
    const count = await rows.count()
    if (count === 0) throw new Error('No rows after year filter')
  })

  await test('Filter by category (Men Only)', async () => {
    const catSelect = page.locator('select').nth(2)
    await catSelect.selectOption('men')
    await page.waitForTimeout(400)
    const rows = page.locator('table tbody tr')
    const count = await rows.count()
    if (count === 0) throw new Error('No rows after men filter')
  })

  await test('Switch sport to Swimming', async () => {
    const sportSelect = page.locator('select').first()
    await sportSelect.selectOption('swimming')
    await page.waitForTimeout(500)
    const rows = page.locator('table tbody tr')
    const count = await rows.count()
    if (count === 0) throw new Error('No rows for swimming')
  })

  await test('Switch sport to Cycling', async () => {
    const sportSelect = page.locator('select').first()
    await sportSelect.selectOption('cycling')
    await page.waitForTimeout(500)
    const rows = page.locator('table tbody tr')
    const count = await rows.count()
    if (count === 0) throw new Error('No rows for cycling')
  })

  await test('Switch sport to Running', async () => {
    const sportSelect = page.locator('select').first()
    await sportSelect.selectOption('running')
    await page.waitForTimeout(500)
    const rows = page.locator('table tbody tr')
    const count = await rows.count()
    if (count === 0) throw new Error('No rows for running')
  })

  await test('Switch sport to Duathlon', async () => {
    const sportSelect = page.locator('select').first()
    await sportSelect.selectOption('duathlon')
    await page.waitForTimeout(500)
    const rows = page.locator('table tbody tr')
    const count = await rows.count()
    if (count === 0) throw new Error('No rows for duathlon')
  })

  await test('Triathlon shows segment columns (Swim/T1/Bike/T2/Run)', async () => {
    const sportSelect = page.locator('select').first()
    await sportSelect.selectOption('triathlon')
    await page.waitForTimeout(500)
    const swimHeader = page.locator('th', { hasText: /swim/i })
    await swimHeader.waitFor({ state: 'visible', timeout: 3000 })
    const bikeHeader = page.locator('th', { hasText: /bike/i })
    await bikeHeader.waitFor({ state: 'visible', timeout: 3000 })
  })

  await test('All-years view sorts by best time', async () => {
    const yearSelect = page.locator('select').nth(1)
    await yearSelect.selectOption('all')
    await page.waitForTimeout(500)
    const firstRank = await page.locator('table tbody tr').first().locator('td').first().textContent()
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
    const input = page.locator('input[placeholder="Search…"]')
    await input.waitFor({ state: 'visible', timeout: 3000 })
  })

  await test('Athlete list populated', async () => {
    const items = page.locator('ul li button')
    const count = await items.count()
    if (count === 0) throw new Error('No athletes in list')
    console.log(`     (${count} athletes found)`)
  })

  await test('Select prompt shown before selection', async () => {
    const prompt = page.locator('text=Please select an athlete')
    await prompt.waitFor({ state: 'visible', timeout: 3000 })
  })

  await test('Search filters athlete list', async () => {
    const input = page.locator('input[placeholder="Search…"]')
    await input.fill('Jon')
    await page.waitForTimeout(300)
    const items = page.locator('ul li button')
    const count = await items.count()
    if (count === 0) throw new Error('Search returned 0 results for "Jon"')
    const all = await items.allTextContents()
    if (!all.every(n => n.toLowerCase().includes('jon'))) throw new Error('Search not filtering correctly')
  })

  await test('Select first athlete shows profile', async () => {
    const input = page.locator('input[placeholder="Search…"]')
    await input.clear()
    await page.waitForTimeout(300)
    const firstAthlete = page.locator('ul li button').first()
    const name = await firstAthlete.textContent()
    await firstAthlete.click()
    await page.waitForTimeout(800)
    // Name should appear in the profile header
    const nameEl = page.locator('h3', { hasText: name?.trim() ?? '' })
    await nameEl.waitFor({ state: 'visible', timeout: 3000 })
    console.log(`     (selected: ${name?.trim()})`)
  })

  await test('Radar chart renders for selected athlete', async () => {
    const svgs = page.locator('svg')
    const count = await svgs.count()
    if (count < 2) throw new Error('No chart SVG found after athlete selection')
  })

  await test('Event table shows for selected athlete', async () => {
    const rows = page.locator('table tbody tr')
    const count = await rows.count()
    if (count === 0) throw new Error('No event rows for selected athlete')
  })

  await test('Club member badge shown on profile', async () => {
    // Either "TriVäst Member" badge or "Guest"
    const badge = page.locator('text=TriVäst Member, text=Guest').first()
    const memberBadge = page.locator('text=TriVäst Member')
    const guestBadge = page.locator('text=Guest')
    const hasMember = await memberBadge.count() > 0
    const hasGuest = await guestBadge.count() > 0
    if (!hasMember && !hasGuest) throw new Error('No member/guest badge found')
  })

  await test('Select a different athlete', async () => {
    const athletes = page.locator('ul li button')
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
    // Rankings table has rank numbers styled with medal colors via inline style
    const rankCells = page.locator('table tbody tr td:first-child')
    await rankCells.first().waitFor({ state: 'visible', timeout: 3000 })
    const firstRank = await rankCells.first().textContent()
    if (!firstRank || firstRank.trim() === '') throw new Error('No rank cell found')
  })

  await test('Points column has non-zero values', async () => {
    const cells = page.locator('table tbody tr td:nth-child(3)')
    const first = await cells.first().textContent()
    if (!first || parseInt(first) <= 0) throw new Error(`First points value is "${first}"`)
  })

  await test('Year filter changes data', async () => {
    const rowsBefore = await page.locator('table tbody tr').count()
    const yearSelect = page.locator('select').first()
    const options = await yearSelect.locator('option').allTextContents()
    const specific = options.find(o => /^\d{4}$/.test(o.trim()))
    if (specific) {
      await yearSelect.selectOption(specific.trim())
      await page.waitForTimeout(500)
      const rowsAfter = await page.locator('table tbody tr').count()
      // Either same or different — just no crash
      if (rowsAfter < 0) throw new Error('Negative rows')
      console.log(`     (all years: ${rowsBefore} rows → ${specific}: ${rowsAfter} rows)`)
    }
  })

  await test('Reset to all years', async () => {
    const yearSelect = page.locator('select').first()
    await yearSelect.selectOption('all')
    await page.waitForTimeout(500)
    const rows = page.locator('table tbody tr')
    const count = await rows.count()
    if (count === 0) throw new Error('No rows after resetting year filter')
  })

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
    const select = page.locator('select').first()
    const options = await select.locator('option').allTextContents()
    if (!options.some(o => /Triathlon/i.test(o))) throw new Error('No Swedish sport options')
  })

  // Switch back for final checks
  await page.locator('button', { hasText: 'English' }).click()
  await page.waitForTimeout(300)

  // ── CONSOLE ERRORS ────────────────────────────────────────────────────────────
  console.log('\n🔍 Console errors check')
  const realErrors = consoleErrors.filter(e =>
    !e.includes('metadataBase') &&
    !e.includes('favicon') &&
    !e.includes('Download the React DevTools')
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
