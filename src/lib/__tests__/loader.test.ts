import { test } from 'node:test'
import assert from 'node:assert/strict'
import { parseCsv, loadAllCompetitions, loadExtraEvents } from '../loader.ts'

// ─── parseCsv ───────────────────────────────────────────────────────────────

test('parseCsv: returns header-keyed rows', () => {
  const out = parseCsv('A,B,C\n1,2,3\n4,5,6\n')
  assert.deepEqual(out, [
    { A: '1', B: '2', C: '3' },
    { A: '4', B: '5', C: '6' },
  ])
})

test('parseCsv: handles CRLF line endings', () => {
  const out = parseCsv('A,B\r\n1,2\r\n')
  assert.deepEqual(out, [{ A: '1', B: '2' }])
})

test('parseCsv: skips empty lines', () => {
  const out = parseCsv('A,B\n1,2\n\n3,4\n')
  assert.equal(out.length, 2)
})

test('parseCsv: missing trailing cells become empty strings', () => {
  const out = parseCsv('A,B,C\n1,2\n')
  assert.deepEqual(out, [{ A: '1', B: '2', C: '' }])
})

test('parseCsv: empty input returns empty array', () => {
  assert.deepEqual(parseCsv(''), [])
  assert.deepEqual(parseCsv('A,B,C\n'), []) // header only
})

// ─── loadAllCompetitions ────────────────────────────────────────────────────
// Integration test against the real CSVs in data/. Verifies the wiring of the
// loader without mocking the filesystem.

test('loadAllCompetitions: parses every sport and at least one year', () => {
  const data = loadAllCompetitions()
  for (const sport of ['triathlon', 'duathlon', 'swimming', 'cycling', 'running', 'swimrun'] as const) {
    assert.ok(data[sport].length > 0, `${sport} should have entries`)
  }
})

test('loadAllCompetitions: precomputes is_club_member and class_lower on every row', () => {
  const data = loadAllCompetitions()
  for (const sport of Object.keys(data) as Array<keyof typeof data>) {
    for (const a of data[sport]) {
      assert.equal(typeof a.is_club_member, 'boolean', `${sport}: is_club_member must be boolean`)
      assert.equal(a.class_lower, a.Class.toLowerCase(), `${sport}: class_lower must match Class`)
    }
  }
})

test('loadAllCompetitions: normalizes legacy class names', () => {
  const data = loadAllCompetitions()
  const classes = new Set<string>()
  for (const sport of Object.keys(data) as Array<keyof typeof data>) {
    for (const a of data[sport]) classes.add(a.Class)
  }
  // After normalization there should be no raw legacy variants — they all map
  // to either 'Dam' or 'Herr'.
  for (const legacy of ['Damer', 'Herrar', 'Man', 'Män', 'Kvinna', 'Kvinnor']) {
    assert.equal(classes.has(legacy), false, `Class "${legacy}" should be normalized away`)
  }
})

test('loadAllCompetitions: returns the same reference on repeat call (caching)', () => {
  const a = loadAllCompetitions()
  const b = loadAllCompetitions()
  assert.equal(a, b)
})

test('loadAllCompetitions: Total_Time_Seconds is numeric', () => {
  const data = loadAllCompetitions()
  for (const a of data.triathlon) {
    assert.equal(typeof a.Total_Time_Seconds, 'number')
    assert.ok(!Number.isNaN(a.Total_Time_Seconds))
  }
})

test('loadAllCompetitions: Competition_Year is set to the file year', () => {
  const data = loadAllCompetitions()
  for (const a of data.triathlon) {
    assert.match(a.Competition_Year, /^\d{4}$/)
  }
})

test('loadAllCompetitions: Status is lowercased and trimmed', () => {
  const data = loadAllCompetitions()
  for (const sport of Object.keys(data) as Array<keyof typeof data>) {
    for (const a of data[sport]) {
      // Either empty string or already lowercased — never mixed-case or padded
      assert.equal(a.Status, a.Status.toLowerCase().trim())
    }
  }
})

// ─── loadExtraEvents ────────────────────────────────────────────────────────
// Integration tests against data/extra/. Extra events must never leak into
// the KM competitions data (they earn no points and stay out of rankings).

test('loadExtraEvents: parses the manifest and its CSVs', () => {
  const events = loadExtraEvents()
  assert.ok(events.length > 0, 'should have at least one extra event')
  for (const e of events) {
    assert.match(e.date, /^\d{4}-\d{2}-\d{2}$/)
    assert.ok(e.title.en.length > 0 && e.title.sv.length > 0)
    assert.ok(e.results.length > 0, `${e.file} should have rows`)
  }
})

test('loadExtraEvents: events are sorted newest first', () => {
  const events = loadExtraEvents()
  for (let i = 1; i < events.length; i++) {
    assert.ok(events[i - 1].date >= events[i].date)
  }
})

test('loadExtraEvents: ranked finishers come before partial rows', () => {
  for (const e of loadExtraEvents()) {
    const firstPartial = e.results.findIndex((a) => a.Status === 'partial')
    if (firstPartial === -1) continue
    for (const a of e.results.slice(firstPartial)) {
      assert.equal(a.Status, 'partial', `${e.file}: ranked row after partial rows`)
    }
  }
})

test('loadExtraEvents: partial rows carry no total time and no rank', () => {
  for (const e of loadExtraEvents()) {
    for (const a of e.results.filter((x) => x.Status === 'partial')) {
      assert.equal(a.Total_Time_Seconds, 0, `${e.file}: ${a.Name}`)
      assert.equal(a.Overall_Rank, 0, `${e.file}: ${a.Name}`)
    }
  }
})

test('loadExtraEvents: extra event files are not picked up by loadAllCompetitions', () => {
  // 'partial' status only exists in extra-event CSVs (KM statuses are
  // ok/dnf/dns) — if data/extra/ ever leaked into the KM loader, its partial
  // rows would surface here.
  const competitions = loadAllCompetitions()
  for (const sport of Object.keys(competitions) as Array<keyof typeof competitions>) {
    for (const a of competitions[sport]) {
      assert.notEqual(a.Status, 'partial', `${sport}: extra-event row leaked into KM data`)
    }
  }
})

test('loadExtraEvents: returns the same reference on repeat call (caching)', () => {
  assert.equal(loadExtraEvents(), loadExtraEvents())
})
