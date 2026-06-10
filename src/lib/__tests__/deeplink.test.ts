import { test } from 'node:test'
import assert from 'node:assert/strict'
import { buildHash, parseHash } from '../deeplink.ts'

test('parseHash: tab only', () => {
  assert.deepEqual(parseHash('#rankings'), { tab: 'rankings', param: null })
})

test('parseHash: tab with param', () => {
  assert.deepEqual(parseHash('#extra/2026-06-10'), { tab: 'extra', param: '2026-06-10' })
  assert.deepEqual(parseHash('#results/swimming'), { tab: 'results', param: 'swimming' })
})

test('parseHash: decodes encoded athlete names', () => {
  assert.deepEqual(parseHash('#athletes/Jonathan%20Flod'), { tab: 'athletes', param: 'Jonathan Flod' })
  assert.deepEqual(parseHash('#athletes/Anton%20S%C3%B6fting'), { tab: 'athletes', param: 'Anton Söfting' })
})

test('parseHash: unknown tab or empty hash returns null', () => {
  assert.equal(parseHash('#nonsense'), null)
  assert.equal(parseHash('#nonsense/param'), null)
  assert.equal(parseHash(''), null)
  assert.equal(parseHash('#'), null)
})

test('parseHash: malformed percent-encoding keeps the raw param', () => {
  assert.deepEqual(parseHash('#athletes/50%'), { tab: 'athletes', param: '50%' })
})

test('buildHash: overview maps to empty (bare URL)', () => {
  assert.equal(buildHash('overview'), '')
  assert.equal(buildHash('overview', 'anything'), '')
})

test('buildHash: encodes params and round-trips with parseHash', () => {
  for (const [tab, param] of [
    ['extra', '2026-06-10'],
    ['athletes', 'Anton Söfting'],
    ['results', 'swimming'],
    ['rankings', null],
  ] as const) {
    const hash = buildHash(tab, param)
    assert.deepEqual(parseHash(hash), { tab, param })
  }
})
