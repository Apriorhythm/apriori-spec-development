'use strict';
const { test } = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const nw = require('../lib/new');

function tmp() { return fs.mkdtempSync(path.join(os.tmpdir(), 'apriori-nw-')); }
const NOW = new Date(2026, 6, 7, 3, 5); // 2026-07-07T03:05

test('NW-01 scaffolds flow-state skeleton and specs dir', () => {
  const root = tmp();
  const r = nw.scaffoldChange(root, 'add-playback', NOW);
  assert.strictEqual(r.ok, true);
  const flow = fs.readFileSync(path.join(root, 'apriori', 'changes', 'add-playback', 'flow-state.md'), 'utf8');
  assert.match(flow, /^change: add-playback$/m);
  assert.match(flow, /^current-step: STEP0$/m);
  assert.match(flow, /tier: <trivial \| medium \| large>/);       // placeholders, not guesses
  assert.match(flow, /track: <harden \| explore>/);
  assert.match(flow, /lineage: <target branch\/line/);
  assert.match(flow, /2026-07-07T03:05 note: change scaffolded by `apriori new`/);
  assert.ok(fs.existsSync(path.join(root, 'apriori', 'changes', 'add-playback', 'specs')));
});

test('NW-02 refuses an existing change or the reserved archive name', () => {
  const root = tmp();
  assert.strictEqual(nw.scaffoldChange(root, 'dup', NOW).ok, true);
  const dup = nw.scaffoldChange(root, 'dup', NOW);
  assert.strictEqual(dup.ok, false);
  assert.match(dup.error, /already exists/);
  const reserved = nw.scaffoldChange(root, 'archive', NOW);
  assert.strictEqual(reserved.ok, false);
  assert.match(reserved.error, /reserved/);
});

test('NW-03 enforces bare kebab-case names (dates stamped at archive time, not here)', () => {
  const root = tmp();
  for (const bad of ['Add-Playback', 'add playback', '2026-07-07T0305-add-playback', '2026-07-07-add-playback', '', '-lead', 'a--b', 'a-']) {
    const r = nw.scaffoldChange(root, bad, NOW);
    assert.strictEqual(r.ok, false, `should refuse '${bad}'`);
  }
  // the date-prefix error explains the rule
  assert.match(nw.scaffoldChange(root, '2026-07-late', NOW).error, /archive time/);
  assert.strictEqual(nw.scaffoldChange(root, 'ok-name-2', NOW).ok, true); // digits inside are fine
});
