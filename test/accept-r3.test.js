'use strict';
// AR3-01..AR3-03 — Astra round 3 residual: the normal path and the error views must normalize
// flags → {view, change, json} through ONE function. `status` read `f['--change'] || null` on the
// normal path (an empty-string change is "no change": the list view) but `'--change' in f` on the
// error path (the 26-field change view with change ""). Same rule on all three legs now: the
// normal path, the strict-parser rejection, and the top-level exception handler.

const { test } = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const { readyFiles } = require('./helpers/ready-bundle');
const status = require('../lib/status');
const gateLib = require('../lib/gate');

const BIN = path.join(__dirname, '..', 'bin', 'apriori.js');
const run = (a, cwd) => spawnSync('node', [BIN, ...a], { encoding: 'utf8', cwd });
const w = (p, s) => { fs.mkdirSync(path.dirname(p), { recursive: true }); fs.writeFileSync(p, s); return p; };
const parse = (r, label) => { try { return JSON.parse(r.stdout); } catch { assert.fail(`${label}: not JSON:\n${r.stdout}\n${r.stderr}`); } };
function project() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'apriori-ar3-'));
  for (const [rel, c] of Object.entries(readyFiles('c'))) w(path.join(root, rel), c);
  w(path.join(root, 'apriori', 'specs', 'kv', 'spec.md'), '### Requirement: Alpha\n\n#### Scenario: XA-01 base\n- t\n');
  return root;
}
// apriori/changes replaced by a regular file: readdir throws a real ENOTDIR out of the list view
function breakChanges(root) {
  fs.rmSync(path.join(root, 'apriori', 'changes'), { recursive: true, force: true });
  fs.writeFileSync(path.join(root, 'apriori', 'changes'), 'not a directory\n');
}

test('AR3-00 status normalizes flags through ONE function on both paths: an empty-string change is no change', () => {
  assert.strictEqual(typeof status.requestOf, 'function');
  assert.deepStrictEqual(status.requestOf({ '--change': '', '--json': true }), { change: null, json: true, esc: false });
  assert.deepStrictEqual(status.requestOf({ '--change': 'c', '--escalation': true }), { change: 'c', json: false, esc: true });
  assert.deepStrictEqual(status.requestOf({}), { change: null, json: false, esc: false });
  // gate carries the same normalization for its error view
  assert.strictEqual(typeof gateLib.requestOf, 'function');
  assert.deepStrictEqual(gateLib.requestOf({ '--change': '', '--json': true, '--review-ready': true }), { change: null, json: true, reviewReady: true });
});

for (const [label, argv] of [
  ['`status --change \'\' --json`', ['status', '--change', '', '--json']],
  ['`status --change c --change \'\' --json` (last wins → empty)', ['status', '--change', 'c', '--change', '', '--json']],
]) {
  test(`AR3-01 ${label}: the LIST view on the normal path, the strict-parser rejection and a real ENOTDIR alike`, () => {
    // normal path
    const root = project();
    const n = run(argv, root);
    assert.strictEqual(n.status, 0, n.stdout + n.stderr);
    const nj = parse(n, 'normal');
    assert.deepStrictEqual(Object.keys(nj).sort(), ['changes', 'errors']);
    assert.deepStrictEqual(nj.changes.map((c) => c.change), ['c']);
    assert.deepStrictEqual(nj.errors, []);
    // strict-parser rejection
    const b = run([...argv, '--bad'], root);
    assert.strictEqual(b.status, 2, b.stdout + b.stderr);
    const bj = parse(b, 'parser');
    assert.deepStrictEqual(Object.keys(bj).sort(), ['changes', 'errors'], 'the list view, not the 26-field change view');
    assert.deepStrictEqual(bj.changes, []);
    assert.match(bj.errors[0], /unknown flag '--bad'/);
    // top-level exception handler, on a real ENOTDIR
    breakChanges(root);
    const e = run(argv, root);
    assert.strictEqual(e.status, 2, e.stdout + e.stderr);
    const ej = parse(e, 'ENOTDIR');
    assert.deepStrictEqual(Object.keys(ej).sort(), ['changes', 'errors']);
    assert.deepStrictEqual(ej.changes, []);
    assert.match(ej.errors[0], /ENOTDIR/);
  });
}

test('AR3-02 `--escalation` keeps its rule: with an empty change it is still the escalation view (needs --change), on every leg', () => {
  const root = project();
  for (const [label, argv, code] of [
    ['normal', ['status', '--change', '', '--escalation', '--json'], 2],
    ['parser', ['status', '--change', '', '--escalation', '--json', '--bad'], 2],
  ]) {
    const r = run(argv, root);
    assert.strictEqual(r.status, code, `${label}: ${r.stdout}${r.stderr}`);
    const j = parse(r, label);
    assert.deepStrictEqual(Object.keys(j).sort(), ['acknowledged', 'change', 'errors', 'escalations', 'historical'], label);
    assert.strictEqual(j.change, null, `${label}: an empty change is no change`);
    assert.strictEqual(j.errors.length, 1, label);
  }
});

test('AR3-03 gate: an empty-string --change is no change on both legs (usage error on the normal path, change null in the error view)', () => {
  const root = project();
  const n = run(['gate', '--change', '', '--json'], root);
  assert.strictEqual(n.status, 2, n.stdout + n.stderr);
  const nj = parse(n, 'normal');
  assert.strictEqual(nj.change, null);
  assert.match(nj.errors[0], /usage: apriori gate/);
  const b = run(['gate', '--change', 'c', '--change', '', '--json', '--bad'], root);
  assert.strictEqual(b.status, 2);
  const bj = parse(b, 'parser');
  assert.deepStrictEqual(Object.keys(bj).sort(), ['blocked', 'change', 'checks', 'errors', 'result', 'stage']);
  assert.strictEqual(bj.change, null, 'last wins → empty → no change, exactly as the normal path reads it');
});
