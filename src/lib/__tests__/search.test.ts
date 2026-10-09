import { test } from 'node:test'
import assert from 'node:assert/strict'
import { foldForSearch, matchesSearch } from '../search.ts'

test('foldForSearch: strips Swedish and French accents and lowercases', () => {
  assert.equal(foldForSearch('Erik Arnström'), 'erik arnstrom')
  assert.equal(foldForSearch('Thiébaut'), 'thiebaut')
  assert.equal(foldForSearch('Gårdsby Ekbäck'), 'gardsby ekback')
})

test('foldForSearch: maps letters NFD leaves whole', () => {
  assert.equal(foldForSearch('Embrik Søndrål'), 'embrik sondral')
})

test('matchesSearch: unaccented query finds accented name and vice versa', () => {
  assert.ok(matchesSearch('Erik Arnström', 'arnstrom'))
  assert.ok(matchesSearch('Fredrik Rosen', 'Rosén'))
  assert.ok(matchesSearch('Thiébaut Schirmer', '  THIEBAUT '))
  assert.ok(!matchesSearch('Erik Arnström', 'arnstrand'))
})

test('matchesSearch: empty query matches everything', () => {
  assert.ok(matchesSearch('Anyone', ''))
})
