import { test } from 'node:test'
import assert from 'node:assert/strict'
import { buildHash, parseHash } from '../deeplink.ts'

test('parseHash: tab only', () => {
  assert.deepEqual(parseHash('#rankings'), { tab: 'rankings', params: [] })
})

test('parseHash: tab with segments', () => {
  assert.deepEqual(parseHash('#extra/2026-06-10'), { tab: 'extra', params: ['2026-06-10'] })
  assert.deepEqual(parseHash('#results/swimming/2024/women'), { tab: 'results', params: ['swimming', '2024', 'women'] })
  assert.deepEqual(parseHash('#extra/2026-06-10/men'), { tab: 'extra', params: ['2026-06-10', 'men'] })
})

test('parseHash: decodes encoded athlete names', () => {
  assert.deepEqual(parseHash('#athletes/Jonathan%20Flod'), { tab: 'athletes', params: ['Jonathan Flod'] })
  assert.deepEqual(parseHash('#athletes/Anton%20S%C3%B6fting'), { tab: 'athletes', params: ['Anton Söfting'] })
})

test('parseHash: unknown tab or empty hash returns null', () => {
  assert.equal(parseHash('#nonsense'), null)
  assert.equal(parseHash('#nonsense/param'), null)
  assert.equal(parseHash(''), null)
  assert.equal(parseHash('#'), null)
})

test('parseHash: malformed percent-encoding keeps the raw segment', () => {
  assert.deepEqual(parseHash('#athletes/50%'), { tab: 'athletes', params: ['50%'] })
})

test('buildHash: overview maps to empty (bare URL)', () => {
  assert.equal(buildHash('overview'), '')
  assert.equal(buildHash('overview', ['anything']), '')
})

test('buildHash: trims trailing defaults', () => {
  assert.equal(buildHash('results', ['swimming', 'all', 'all']), '#results/swimming')
  assert.equal(buildHash('extra', ['2026-06-10', 'all']), '#extra/2026-06-10')
  assert.equal(buildHash('rankings', ['all']), '#rankings')
  assert.equal(buildHash('athletes', [null]), '#athletes')
})

test('buildHash: keeps middle defaults as placeholders', () => {
  assert.equal(buildHash('results', ['swimming', 'all', 'women']), '#results/swimming/all/women')
})

test('buildHash: encodes segments and round-trips with parseHash', () => {
  for (const [tab, params] of [
    ['extra', ['2026-06-10', 'women']],
    ['athletes', ['Anton Söfting']],
    ['results', ['swimming', '2024', 'women']],
  ] as const) {
    const hash = buildHash(tab, [...params])
    assert.deepEqual(parseHash(hash), { tab, params: [...params] })
  }
})
