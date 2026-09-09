'use strict';
// ADM-01..04 — bundle `--write` moves the change dir by DEFAULT (batch C row 8).
//
// The declaration always said one thing — "archive merges the delta specs into apriori/specs
// and moves the bundle" (runbook Review & Deliver; the MERGED line prints `change archived →`)
// — but the behaviour moved only under an explicit `--changes-dir` (P6: declaration-behaviour
// mismatch). The behaviour is aligned TO the declaration: `--write` moves, `--changes-dir`
// stays an optional location override. The machine check enumerates the three registered path
// classes — normal / preflight-refused / CAS-refused — and pins, for each, the before/after
// positions of the active dir, the archive dir and the store against the printed declaration:
// "moved but not declared frozen" and "declared frozen but not moved" are both rollback
// triggers, and a failed run never prints the frozen declaration early.

const { test } = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const { readyFiles } = require('./helpers/ready-bundle');

const BIN = path.join(__dirname, '..', 'bin', 'apriori.js');
const run = (args, cwd) => spawnSync('node', [BIN, ...args], { encoding: 'utf8', cwd });

const STORE_A = '### Requirement: Alpha\n\n#### Scenario: XA-01 a\n- t\n';
const ADD_A = '## ADDED Requirements\n\n### Requirement: Alpha2\n\n#### Scenario: XA-09 n\n- t\n';
const MOD_A = '## MODIFIED Requirements\n\n### Requirement: Alpha\n\n#### Scenario: XA-01 a\n- t\n- changed\n';
const CONFLICT = '## MODIFIED Requirements\n\n### Requirement: NoSuch\n\n#### Scenario: XN-01 x\n- t\n';

function project(delta) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'apriori-adm-'));
  for (const [rel, content] of Object.entries({
    ...readyFiles('c'),
    'apriori/specs/a/spec.md': STORE_A,
    'apriori/changes/c/specs/a/spec.md': delta,
  })) {
    const p = path.join(root, rel);
    fs.mkdirSync(path.dirname(p), { recursive: true });
    fs.writeFileSync(p, content);
  }
  return root;
}
const active = (root) => path.join(root, 'apriori', 'changes', 'c');
const archiveDirs = (root) => {
  const d = path.join(root, 'apriori', 'changes', 'archive');
  return fs.existsSync(d) ? fs.readdirSync(d) : [];
};
const store = (root) => fs.readFileSync(path.join(root, 'apriori', 'specs', 'a', 'spec.md'), 'utf8');

test('ADM-01 normal path: --write moves the bundle by default — frozen declaration and the move co-occur', () => {
  const root = project(ADD_A);
  const before = store(root);
  const r = run(['archive', '--change', 'c', '--write', '--no-cas'], root);
  assert.strictEqual(r.status, 0, r.stdout + r.stderr);
  // the printed declaration…
  assert.match(r.stdout, /ARCHIVE DECLARES \(frozen; a later defect becomes an outcome note or a new change\):/);
  const m = /change archived → (\S+)/.exec(r.stdout);
  assert.ok(m, `MERGED must declare the move without an explicit --changes-dir: ${r.stdout}`);
  // …matches the actual positions: active gone, archive dir holds the stamped bundle, whole
  assert.ok(!fs.existsSync(active(root)), 'declared frozen but not moved — the active dir is still there');
  const dirs = archiveDirs(root);
  assert.strictEqual(dirs.length, 1, `exactly one archived bundle, got ${dirs.join(', ')}`);
  assert.match(dirs[0], /^\d{4}-\d{2}-\d{2}T\d{4}-c$/);
  assert.ok(m[1].includes(dirs[0]), `the printed destination (${m[1]}) names the real dir (${dirs[0]})`);
  const moved = path.join(root, 'apriori', 'changes', 'archive', dirs[0]);
  assert.ok(fs.existsSync(path.join(moved, 'flow-state.md')), 'the bundle moved whole');
  assert.ok(fs.existsSync(path.join(moved, 'specs', 'a', 'spec.md')), 'the delta moved with it');
  // and the store really was rewritten (moved AND merged, never one without the other)
  assert.notStrictEqual(store(root), before);
  assert.match(store(root), /Alpha2/);
});

test('ADM-02 an explicit --changes-dir is a location override, not the move switch — same result', () => {
  const root = project(ADD_A);
  const r = run(['archive', '--change', 'c', '--write', '--no-cas', '--changes-dir', 'apriori/changes'], root);
  assert.strictEqual(r.status, 0, r.stdout + r.stderr);
  assert.match(r.stdout, /change archived → /);
  assert.ok(!fs.existsSync(active(root)));
  assert.strictEqual(archiveDirs(root).length, 1);
  // and dry-run STILL moves nothing, with or without the flag: the declaration is a preview
  const root2 = project(ADD_A);
  const rd = run(['archive', '--change', 'c', '--no-cas'], root2);
  assert.strictEqual(rd.status, 0, rd.stdout + rd.stderr);
  assert.match(rd.stdout, /dry-run/);
  assert.doesNotMatch(rd.stdout, /change archived → /);
  assert.ok(fs.existsSync(active(root2)), 'dry-run must not move');
  assert.deepStrictEqual(archiveDirs(root2), []);
});

test('ADM-03 preflight refusal: nothing moves, nothing merges, and the frozen declaration is never printed early', () => {
  const root = project(CONFLICT);
  const before = store(root);
  const r = run(['archive', '--change', 'c', '--write', '--no-cas'], root);
  assert.strictEqual(r.status, 1, r.stdout + r.stderr);
  assert.match(r.stdout, /RESULT: FAILED PREFLIGHT — nothing written/);
  assert.doesNotMatch(r.stdout, /ARCHIVE DECLARES/, 'a failed run printed the frozen declaration early');
  assert.doesNotMatch(r.stdout, /change archived → /);
  assert.ok(fs.existsSync(active(root)), 'the active bundle must stay in place');
  assert.deepStrictEqual(archiveDirs(root), [], 'no archive entry may appear');
  assert.strictEqual(store(root), before, 'the store must be untouched');
});

test('ADM-04 CAS refusal: an unstamped mutation is denied — positions unchanged, no early frozen declaration', () => {
  const root = project(MOD_A);                       // MODIFIED with no base stamp, no waiver
  const before = store(root);
  const r = run(['archive', '--change', 'c', '--write'], root);
  assert.strictEqual(r.status, 1, r.stdout + r.stderr);
  assert.match(r.stderr, /unstamped mutation delta/);
  assert.match(r.stdout, /RESULT: FAILED PREFLIGHT — nothing written/);
  assert.doesNotMatch(r.stdout, /ARCHIVE DECLARES/, 'a failed run printed the frozen declaration early');
  assert.doesNotMatch(r.stdout, /change archived → /);
  assert.ok(fs.existsSync(active(root)), 'the active bundle must stay in place');
  assert.deepStrictEqual(archiveDirs(root), [], 'no archive entry may appear');
  assert.strictEqual(store(root), before, 'the store must be untouched');
});
