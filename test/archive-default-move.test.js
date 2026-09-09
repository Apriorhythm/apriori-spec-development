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
const am = require('../lib/archive-merge');

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
  // the destination is a PATH, and a temp root with a space in it is a normal temp root
  // (the c5dafbf precedent): capture the whole printed line, never up to the first blank
  const m = /change archived → ([^\r\n]+)/.exec(r.stdout);
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

// ---------------------------------------------------------------------------
// ADM-05..08 — a failed run NEVER carries the frozen success declaration (P3 acceptance r1).
// The declaration is computed early (the INCOMPLETE backstop needs it) but PUBLISHED only
// after the move actually succeeded; dry-run keeps printing it as a documented preview.
// Each case asserts the real store/active/archive positions AND that the printed report
// agrees with them — including the failures AFTER the old declaration point:
// occupied archive path, stage failure, commit failure, move failure.
// ---------------------------------------------------------------------------

test('ADM-05 archive path occupied by a plain file: refused before any write, no frozen declaration', () => {
  const root = project(ADD_A);
  const before = store(root);
  const occupied = path.join(root, 'apriori', 'changes', 'archive');
  fs.writeFileSync(occupied, 'NOT A DIRECTORY');
  const r = run(['archive', '--change', 'c', '--write', '--no-cas'], root);
  assert.strictEqual(r.status, 2, r.stdout + r.stderr);
  assert.match(r.stderr, /archive.*not a directory/i);
  assert.doesNotMatch(r.stdout, /ARCHIVE DECLARES/, 'a failed run printed the frozen declaration');
  assert.doesNotMatch(r.stdout, /change archived → /);
  assert.strictEqual(store(root), before, 'the store must be untouched — refusal comes before any write');
  assert.ok(fs.existsSync(active(root)), 'the active bundle must stay in place');
  assert.strictEqual(fs.readFileSync(occupied, 'utf8'), 'NOT A DIRECTORY', 'the occupying file stays untouched');
});

test('ADM-06 stage failure: stores untouched, temps removed, no frozen declaration', () => {
  const root = project(ADD_A);
  const before = store(root);
  const ops = {
    writeFileSync: () => { throw new Error('injected stage failure'); },
    renameSync: fs.renameSync.bind(fs), rmSync: fs.rmSync.bind(fs),
  };
  const r = am.archiveChange({ cwd: root, change: 'c', write: true, noCas: true, ops });
  const out = r.out.join('\n'), err = r.err.join('\n');
  assert.strictEqual(r.code, 1, out + err);
  assert.match(err, /staging failed \(injected stage failure\)/);
  assert.doesNotMatch(out, /ARCHIVE DECLARES/, 'a failed run carried the frozen declaration');
  assert.doesNotMatch(out, /RESULT: MERGED/);
  assert.strictEqual(store(root), before, 'the store must be untouched');
  assert.ok(fs.existsSync(active(root)), 'the active bundle must stay in place');
  assert.deepStrictEqual(archiveDirs(root), [], 'no archive entry may appear');
  assert.ok(!fs.existsSync(path.join(root, 'apriori', 'specs', 'a', 'spec.md.tmp-archive')),
    'this run\'s temp files are removed on stage failure');
});

test('ADM-07 commit failure: diagnosis names the temp for recovery, no frozen declaration', () => {
  const root = project(ADD_A);
  const before = store(root);
  const ops = {
    writeFileSync: fs.writeFileSync.bind(fs), rmSync: fs.rmSync.bind(fs),
    renameSync: () => { throw new Error('injected commit failure'); },
  };
  const r = am.archiveChange({ cwd: root, change: 'c', write: true, noCas: true, ops });
  const out = r.out.join('\n'), err = r.err.join('\n');
  assert.strictEqual(r.code, 1, out + err);
  assert.match(err, /COMMIT FAILED at a\/spec\.md \(injected commit failure\)/);
  assert.match(err, /temp files remaining for manual completion/);
  assert.doesNotMatch(out, /ARCHIVE DECLARES/, 'a failed run carried the frozen declaration');
  assert.doesNotMatch(out, /RESULT: MERGED/);
  assert.strictEqual(store(root), before, 'the store must be untouched');
  assert.ok(fs.existsSync(path.join(root, 'apriori', 'specs', 'a', 'spec.md.tmp-archive')),
    'the staged temp stays for manual completion, exactly as the diagnosis says');
  assert.ok(fs.existsSync(active(root)), 'the active bundle must stay in place');
  assert.deepStrictEqual(archiveDirs(root), [], 'no archive entry may appear');
});

test('ADM-08 move failure: committed stores stay and are SAID to stay — no frozen declaration, no nothing-written claim', () => {
  const root = project(ADD_A);
  let renames = 0;
  const ops = {
    writeFileSync: fs.writeFileSync.bind(fs), rmSync: fs.rmSync.bind(fs),
    // one module: rename #1 commits the store, rename #2 is the move — fail the move
    renameSync: (a, b) => { renames++; if (renames === 2) throw new Error('injected move failure'); fs.renameSync(a, b); },
  };
  const r = am.archiveChange({ cwd: root, change: 'c', write: true, noCas: true, ops });
  const out = r.out.join('\n'), err = r.err.join('\n');
  assert.strictEqual(r.code, 1, out + err);
  assert.match(err, /stores committed but the change-dir move failed: injected move failure — rerun to complete/);
  assert.doesNotMatch(err, /nothing written/, 'the store IS committed — the report must not claim otherwise');
  assert.doesNotMatch(out, /ARCHIVE DECLARES/, 'a failed run carried the frozen declaration');
  assert.doesNotMatch(out, /change archived → /);
  assert.doesNotMatch(out, /RESULT: MERGED/);
  assert.match(store(root), /Alpha2/, 'committed stores stay committed, exactly as the diagnosis says');
  assert.ok(fs.existsSync(active(root)), 'the move failed — the active bundle is still in place');
  assert.deepStrictEqual(archiveDirs(root), [], 'no archive entry may appear');
});
