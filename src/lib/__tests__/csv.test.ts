import { test } from 'node:test'
import assert from 'node:assert/strict'
import { csvEscape, toCsvFile } from '../csv.ts'

test('csvEscape: wraps plain values in quotes', () => {
  assert.equal(csvEscape('Martin Flinta'), '"Martin Flinta"')
  assert.equal(csvEscape(42), '"42"')
})

test('csvEscape: doubles embedded quotes', () => {
  assert.equal(csvEscape('a"b'), '"a""b"')
})

test('csvEscape: null and undefined become empty cells', () => {
  assert.equal(csvEscape(null), '""')
  assert.equal(csvEscape(undefined), '""')
})

test('csvEscape: formula-leading cells get a quote guard', () => {
  for (const v of ['=SUM(A1)', '+1', '-1', '@cmd', '\tx', '\rx']) {
    assert.ok(csvEscape(v).startsWith('"\''), `${JSON.stringify(v)} must be guarded`)
  }
})

test('csvEscape: minus inside a value is not guarded', () => {
  assert.equal(csvEscape('10-20'), '"10-20"')
})

test('toCsvFile: starts with a UTF-8 BOM and joins lines with newlines', () => {
  const out = toCsvFile(['"a","b"', '"TriVäst",1'])
  assert.equal(out.charCodeAt(0), 0xfeff)
  assert.equal(out.slice(1), '"a","b"\n"TriVäst",1')
})
