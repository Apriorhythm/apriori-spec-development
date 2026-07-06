'use strict';
// PR scenarios are protocol/doc behaviors — made executable as assertions over the runbook text.
const { test } = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.join(__dirname, '..');
const EN = fs.readFileSync(path.join(ROOT, 'RUNBOOK.md'), 'utf8');
const CN = fs.readFileSync(path.join(ROOT, 'RUNBOOK_cn.md'), 'utf8');
const README = fs.readFileSync(path.join(ROOT, 'README.md'), 'utf8');
const README_CN = fs.readFileSync(path.join(ROOT, 'README_cn.md'), 'utf8');

test('PR-01 STEP5 exit adds a deterministic spec-runner gate', () => {
  assert.match(EN, /`apriori verify` GREEN/);
  assert.match(EN, /Exit — ALL of:[\s\S]*apriori verify. GREEN/);
  assert.match(CN, /`apriori verify` GREEN/);
});

test('PR-02 P8 scope narrows to semantic faithfulness', () => {
  assert.match(EN, /Semantic faithfulness/);
  assert.match(EN, /already proven the mechanical/);
  assert.match(CN, /语义忠实/);
});

test('PR-03 archive action is native plain-files, no adapter', () => {
  assert.match(EN, /`apriori archive`/);
  assert.doesNotMatch(EN, /\/opsx:/);
  assert.doesNotMatch(CN, /\/opsx:/);
});

test('PR-04 the interface is single-path plain-files (runbook AND handbook)', () => {
  for (const doc of [EN, CN, README, README_CN]) {
    assert.doesNotMatch(doc, /\(adapter:/);
    assert.doesNotMatch(doc, /openspec\//);
    assert.doesNotMatch(doc, /\/opsx:/);
  }
});

test('PR-05 the disposable prototype rule still holds', () => {
  assert.match(EN, /prototype is disposable|`spike\/` is deleted/);
  assert.match(CN, /原型是一次性|`spike\/`/);
});
