'use strict';
// hotfix-lane T5 — a scoped verdict judges a named scenario set and nothing else
// (SR-69..SR-72). The whole-store verdict keeps its own meaning, unchanged.
const test = require('node:test');
const assert = require('node:assert');

const { scopedEvaluate } = require('../lib/spec-runner.js');

// store projection: id -> [titles]; results: id -> {pass,fail,skip}
const store = (ids) => new Map(ids.map((id) => [id, [`Scenario: ${id}`]]));
const res = (o) => new Map(Object.entries(o).map(([id, [p, f, s]]) => [id, { pass: p, fail: f, skip: s || 0 }]));

test('SR-69 the scope is judged and the rest of the store is not', () => {
  const byId = store(['A-01', 'A-02', 'A-03', 'A-04', 'A-05']);
  const results = res({ 'A-01': [1, 0], 'A-02': [0, 1], 'A-03': [0, 1] });   // A-04/A-05 unbound store-wide
  const v = scopedEvaluate(byId, results, ['A-01']);
  assert.strictEqual(v.clean, true, 'scope clean');
  assert.deepStrictEqual(v.boundGreen, ['A-01']);
  assert.deepStrictEqual({ red: v.boundRed, unbound: v.unbound, missing: v.missing }, { red: [], unbound: [], missing: [] });
});

test('SR-70 red and unbound inside the scope dirty the scoped verdict', () => {
  const byId = store(['A-01', 'A-02', 'A-03']);
  const results = res({ 'A-01': [0, 1], 'A-03': [0, 0, 2] });               // A-02 has no result; A-03 only skips

  const red = scopedEvaluate(byId, results, ['A-01']);
  assert.deepStrictEqual({ clean: red.clean, boundRed: red.boundRed }, { clean: false, boundRed: ['A-01'] });

  const noResult = scopedEvaluate(byId, results, ['A-02']);
  assert.deepStrictEqual({ clean: noResult.clean, unbound: noResult.unbound }, { clean: false, unbound: ['A-02'] });

  const skipOnly = scopedEvaluate(byId, results, ['A-03']);
  assert.deepStrictEqual({ clean: skipOnly.clean, unbound: skipOnly.unbound }, { clean: false, unbound: ['A-03'] }, 'skips prove nothing');
});

test('SR-71 out-of-scope results are not orphans and an empty scope is clean', () => {
  const byId = store(['A-01', 'A-02']);
  const results = res({ 'A-01': [1, 0], 'A-02': [1, 0], 'Z-99': [0, 1] });  // Z-99 absent from the store
  const v = scopedEvaluate(byId, results, ['A-01']);
  assert.strictEqual(v.clean, true, 'an out-of-scope orphan does not dirty a scoped run');
  assert.deepStrictEqual(v.orphan, [], 'orphan is not a scope class');

  const empty = scopedEvaluate(byId, results, []);
  assert.strictEqual(empty.clean, true, 'empty scope is clean by construction');
  assert.deepStrictEqual([empty.boundGreen, empty.boundRed, empty.unbound, empty.missing], [[], [], [], []]);
});

test('SR-72 a scope member absent from the projection is a caller error', () => {
  const byId = store(['A-01']);
  const results = res({ 'A-01': [1, 0], 'B-01': [1, 0] });
  const v = scopedEvaluate(byId, results, ['A-01', 'B-01']);
  assert.deepStrictEqual(v.missing, ['B-01'], 'unknown target surfaces as missing');
  assert.strictEqual(v.clean, false, 'never silently satisfied — even with a passing TAP result');
});
