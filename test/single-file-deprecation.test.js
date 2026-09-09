'use strict';
// SFD-01..06 — batch C row 9 took its PRE-REGISTERED exit: the single-file `--store/--delta`
// entry is NOT removed, and is narrowed to a documented deprecation.
//
// The registered criterion: every legal single-file operation (normal / conflict / CAS-refusal)
// must have a bundle-form replay with byte-identical store results — if ANY legal operation
// cannot migrate, the entry stays. What the evidence actually shows (P3 acceptance r1
// corrected the first claim):
//
//   - a store file outside `apriori/specs` is NOT categorically out of reach for the bundle
//     form: a ROOT-MAPPED workspace — `apriori/specs` symlinked to the store's own directory —
//     replays the AM-24/25 corpus shapes byte-identically at the SAME absolute path. SFD-05
//     records that replay and its two necessary preconditions (symlink support; the loose
//     delta migrated INTO the bundle — left beside the store it reads as a second store
//     module carrying the same scenario id, and is refused).
//   - what still has no bundle route, per case: a non-`*.md` store target (bundle discovery
//     reads `*.md` deltas only — SFD-06), and any caller that cannot adopt a mapped
//     workspace plus a ready change bundle.
//
// SFD-01 pins the DEFAULT route only (a default bundle run never reaches a root store.md) —
// it is not a sentinel for the deprecation's blocking conditions and claims nothing beyond
// its own assertions. SFD-02/03 prove the equivalence that holds for the migratable subclass;
// SFD-04 pins the (narrowed) deprecation annotation in both doc editions. Nothing behavioural
// changes on this row; the entry stays until the per-case migration list above is empty.

const { test } = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const { readyFiles } = require('./helpers/ready-bundle');
const { canSymlink } = require('./helpers/can-symlink');

const ROOT = path.join(__dirname, '..');
const BIN = path.join(ROOT, 'bin', 'apriori.js');
const run = (args, cwd) => spawnSync('node', [BIN, ...args], { encoding: 'utf8', cwd });
const w = (p, s) => { fs.mkdirSync(path.dirname(p), { recursive: true }); fs.writeFileSync(p, s); return p; };

const STORE = '### Requirement: Alpha\n\n#### Scenario: XA-01 a\n- t\n';
const ADD = '## ADDED Requirements\n\n### Requirement: Beta\n\n#### Scenario: XB-09 n\n- t\n';
const MOD = '## MODIFIED Requirements\n\n### Requirement: Alpha\n\n#### Scenario: XA-01 a\n- t\n- changed\n';
const CONFLICT = '## MODIFIED Requirements\n\n### Requirement: NoSuch\n\n#### Scenario: XN-01 x\n- t\n';

// a single-file run in its own root: store at an ARBITRARY path, delta outside apriori/changes
function singleFile(storeRel, delta, extra = []) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'apriori-sfd-'));
  w(path.join(root, storeRel), STORE);
  w(path.join(root, 'delta.md'), delta);
  const r = run(['archive', '--store', storeRel, '--delta', 'delta.md', '--change', 'c', '--write', ...extra], root);
  return { root, r, store: () => fs.readFileSync(path.join(root, storeRel), 'utf8') };
}

// the closest bundle-form replay of the same operation: same store text under apriori/specs/a/,
// same delta text as the bundle's delta, a ready bundle around it
function bundleReplay(delta, extra = []) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'apriori-sfd-b-'));
  for (const [rel, content] of Object.entries({
    ...readyFiles('c'),
    'apriori/specs/a/spec.md': STORE,
    'apriori/changes/c/specs/a/spec.md': delta,
  })) w(path.join(root, rel), content);
  const r = run(['archive', '--change', 'c', '--write', ...extra], root);
  return { root, r, store: () => fs.readFileSync(path.join(root, 'apriori', 'specs', 'a', 'spec.md'), 'utf8') };
}

// a root-mapped workspace: apriori/specs is a symlink to `target`, the bundle carries `delta`
// as specs/store.md (so the delta's suffix names <target>/store.md)
function mappedWorkspace(target, delta) {
  const wroot = fs.mkdtempSync(path.join(os.tmpdir(), 'apriori-sfd-w-'));
  for (const [rel, content] of Object.entries({
    ...readyFiles('c'),
    'apriori/changes/c/specs/store.md': delta,
  })) w(path.join(wroot, rel), content);
  fs.symlinkSync(target, path.join(wroot, 'apriori', 'specs'));
  return wroot;
}

test('SFD-01 default-route pin: a default bundle run writes only under apriori/specs and leaves a root store.md alone', () => {
  // the operation the existing corpus performs most: merge into ./store.md at the project root
  const s = singleFile('store.md', ADD);
  assert.strictEqual(s.r.status, 0, s.r.stdout + s.r.stderr);
  assert.match(s.store(), /Beta/, 'the single-file form serves this operation today');
  // a DEFAULT bundle run (no root mapping) does not produce those bytes at that path: its
  // store root is apriori/specs. This pins the default route ONLY — SFD-05 shows a
  // root-mapped workspace CAN reach the same absolute path, so this test is not a sentinel
  // for the deprecation's blocking conditions and must not be read as one.
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'apriori-sfd-mb-'));
  for (const [rel, content] of Object.entries({
    ...readyFiles('c'),
    'store.md': STORE,                                   // the single-file target
    'apriori/changes/c/specs/a/spec.md': ADD,
  })) w(path.join(root, rel), content);
  fs.mkdirSync(path.join(root, 'apriori', 'specs'), { recursive: true });   // an empty store root
  const r = run(['archive', '--change', 'c', '--write', '--no-cas'], root);
  assert.strictEqual(r.status, 0, r.stdout + r.stderr);
  assert.strictEqual(fs.readFileSync(path.join(root, 'store.md'), 'utf8'), STORE,
    'a DEFAULT bundle run reached outside apriori/specs — re-judge this route pin');
  assert.match(fs.readFileSync(path.join(root, 'apriori', 'specs', 'a', 'spec.md'), 'utf8'), /Beta/,
    'the default bundle form writes under its own store root only');
});

test('SFD-02 the migratable subclass IS equivalent: normal and conflict runs give byte-identical stores', () => {
  // normal: same delta, byte-identical result under both forms
  const sf = singleFile('anywhere/store.md', ADD, ['--no-cas']);
  const bf = bundleReplay(ADD, ['--no-cas']);
  assert.strictEqual(sf.r.status, 0, sf.r.stdout + sf.r.stderr);
  assert.strictEqual(bf.r.status, 0, bf.r.stdout + bf.r.stderr);
  assert.strictEqual(sf.store(), bf.store(), 'the two forms drifted on the same merge');
  // conflict: both refuse, both stores byte-identical to the original
  const sfc = singleFile('anywhere/store.md', CONFLICT, ['--no-cas']);
  const bfc = bundleReplay(CONFLICT, ['--no-cas']);
  assert.strictEqual(sfc.r.status, 1, sfc.r.stdout + sfc.r.stderr);
  assert.strictEqual(bfc.r.status, 1, bfc.r.stdout + bfc.r.stderr);
  assert.strictEqual(sfc.store(), STORE, 'single-file conflict must write nothing');
  assert.strictEqual(bfc.store(), STORE, 'bundle conflict must write nothing');
});

test('SFD-03 the CAS class is equivalent too, and --no-cas keeps its meaning in the high-level form', () => {
  // an unstamped mutation is denied by BOTH forms without a waiver…
  const sf = singleFile('anywhere/store.md', MOD);
  const bf = bundleReplay(MOD);
  assert.strictEqual(sf.r.status, 1, sf.r.stdout + sf.r.stderr);
  assert.strictEqual(bf.r.status, 1, bf.r.stdout + bf.r.stderr);
  assert.match(sf.r.stdout + sf.r.stderr, /unstamped mutation delta/);
  assert.match(bf.r.stdout + bf.r.stderr, /unstamped mutation delta/);
  assert.strictEqual(sf.store(), STORE);
  assert.strictEqual(bf.store(), STORE);
  // …and --no-cas waives it identically in both — byte-identical merged stores
  const sfw = singleFile('anywhere/store.md', MOD, ['--no-cas']);
  const bfw = bundleReplay(MOD, ['--no-cas']);
  assert.strictEqual(sfw.r.status, 0, sfw.r.stdout + sfw.r.stderr);
  assert.strictEqual(bfw.r.status, 0, bfw.r.stdout + bfw.r.stderr);
  assert.strictEqual(sfw.store(), bfw.store(), 'the --no-cas semantics drifted between the forms');
  assert.match(sfw.store(), /changed/);
});

test('SFD-04 both doc editions carry the (narrowed) deprecation annotation, and the usage surface is unchanged', () => {
  const en = fs.readFileSync(path.join(ROOT, 'docs', 'cli.md'), 'utf8');
  const cn = fs.readFileSync(path.join(ROOT, 'docs', 'cli_cn.md'), 'utf8');
  assert.match(en, /\*\*Single-file form \(deprecated, kept\)\.\*\*/,
    'docs/cli.md lost the row 9 deprecation annotation');
  // the recorded reason claims exactly what the tests show: a per-case migration list, not a
  // categorical "outside apriori/specs is unreachable" (falsified by the SFD-05 replay)
  assert.match(en, /judged per case/, 'the per-case basis must ride the annotation');
  assert.match(en, /root-mapped workspace/, 'the annotation must name the migration route SFD-05 proved');
  assert.match(en, /non-`\*\.md` store target/, 'the annotation must name a REAL remaining blocker (SFD-06)');
  assert.doesNotMatch(en, /no bundle-form equivalent: a store file outside/,
    'the falsified categorical claim must not survive in docs/cli.md');
  assert.match(cn, /\*\*单文件形式\(deprecated,保留\)。\*\*/,
    'docs/cli_cn.md lost the row 9 deprecation annotation');
  assert.match(cn, /逐例判定/, 'the per-case basis must ride the annotation (CN)');
  assert.match(cn, /根映射工作区/, 'the annotation must name the migration route SFD-05 proved (CN)');
  assert.match(cn, /store 目标不是 `\*\.md`/, 'the annotation must name a REAL remaining blocker (CN)');
  assert.doesNotMatch(cn, /没有 bundle 形态的等价路径:store 文件在/,
    'the falsified categorical claim must not survive in docs/cli_cn.md');
  // the entry itself is untouched: the usage string still teaches both forms
  const usage = run(['archive'], fs.mkdtempSync(path.join(os.tmpdir(), 'apriori-sfd-u-')));
  assert.match(usage.stderr, /--store <f> --delta <f> --change <name>/, 'the single-file usage line must stay while the form exists');
});

test('SFD-05 the root-mapping replay: the AM-24/25 single-file shapes DO migrate onto the same absolute path',
  { skip: canSymlink() ? false : 'platform refuses symlinks' }, () => {
  // ---- AM-25 shape (normal, stamp-free ADD): single-file first, on the original path ----
  const P = fs.mkdtempSync(path.join(os.tmpdir(), 'apriori-sfd-p-'));
  w(path.join(P, 'store.md'), STORE);
  w(path.join(P, 'delta.md'), ADD);
  const sf = run(['archive', '--store', 'store.md', '--delta', 'delta.md', '--change', 'c', '--write'], P);
  assert.strictEqual(sf.status, 0, sf.stdout + sf.stderr);
  const expected = fs.readFileSync(path.join(P, 'store.md'), 'utf8');
  assert.match(expected, /Beta/);
  // restore the initial state; the delta MIGRATES into the bundle (precondition ② below)
  fs.writeFileSync(path.join(P, 'store.md'), STORE);
  fs.rmSync(path.join(P, 'delta.md'));
  // the mapped workspace: apriori/specs IS the store's own directory (the walk follows the
  // root's realpath), and the bundle's specs/store.md suffix names <P>/store.md
  const W = mappedWorkspace(P, ADD);
  const bf = run(['archive', '--change', 'c', '--write'], W);
  assert.strictEqual(bf.status, 0, bf.stdout + bf.stderr);
  assert.strictEqual(fs.readFileSync(path.join(P, 'store.md'), 'utf8'), expected,
    'the bundle replay must produce byte-identical content at the SAME absolute path');

  // ---- AM-24 shape (stale stamp): both forms refuse, the same path untouched by both ----
  const stale = `<!-- apriori-base: sha256:${'0'.repeat(64)} -->\n${ADD}`;
  const P2 = fs.mkdtempSync(path.join(os.tmpdir(), 'apriori-sfd-p-'));
  w(path.join(P2, 'store.md'), STORE);
  w(path.join(P2, 'delta.md'), stale);
  const sf2 = run(['archive', '--store', 'store.md', '--delta', 'delta.md', '--change', 'c', '--write'], P2);
  assert.strictEqual(sf2.status, 1, sf2.stdout + sf2.stderr);
  assert.strictEqual(fs.readFileSync(path.join(P2, 'store.md'), 'utf8'), STORE);
  fs.rmSync(path.join(P2, 'delta.md'));
  const W2 = mappedWorkspace(P2, stale);
  const bf2 = run(['archive', '--change', 'c', '--write'], W2);
  assert.strictEqual(bf2.status, 1, bf2.stdout + bf2.stderr);
  assert.match(bf2.stdout + bf2.stderr, /sha256:/);
  assert.strictEqual(fs.readFileSync(path.join(P2, 'store.md'), 'utf8'), STORE,
    'the refused replay must leave the same absolute path untouched, like the single-file refusal');

  // ---- precondition ②, pinned: the loose delta must migrate INTO the bundle. Left beside
  // the store, the walk reads it as a second store module carrying the same scenario id and
  // the run is refused with nothing written — the migration is not optional cleanup. ----
  const P3 = fs.mkdtempSync(path.join(os.tmpdir(), 'apriori-sfd-p-'));
  w(path.join(P3, 'store.md'), STORE);
  w(path.join(P3, 'delta.md'), ADD);                       // NOT migrated
  const W3 = mappedWorkspace(P3, ADD);
  const bf3 = run(['archive', '--change', 'c', '--write'], W3);
  assert.strictEqual(bf3.status, 1, bf3.stdout + bf3.stderr);
  assert.match(bf3.stdout + bf3.stderr, /XB-09/, 'the refusal names the duplicated scenario id');
  assert.strictEqual(fs.readFileSync(path.join(P3, 'store.md'), 'utf8'), STORE, 'nothing written on the refusal');
});

test('SFD-06 what still cannot migrate: a non-md store target is legal single-file surgery with no bundle route', () => {
  // the single-file form serves a store whose name is not *.md, today, exit 0
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'apriori-sfd-t-'));
  w(path.join(root, 'store.txt'), STORE);
  w(path.join(root, 'delta.md'), ADD);
  const sf = run(['archive', '--store', 'store.txt', '--delta', 'delta.md', '--change', 'c', '--write'], root);
  assert.strictEqual(sf.status, 0, sf.stdout + sf.stderr);
  assert.match(fs.readFileSync(path.join(root, 'store.txt'), 'utf8'), /Beta/);
  // the bundle form has no such operation: delta discovery reads *.md only — a specs/store.txt
  // delta is not a lesser route, it is exit 2 before anything is judged
  const broot = fs.mkdtempSync(path.join(os.tmpdir(), 'apriori-sfd-t-'));
  for (const [rel, content] of Object.entries({
    ...readyFiles('c'),
    'apriori/changes/c/specs/store.txt': ADD,
  })) w(path.join(broot, rel), content);
  fs.mkdirSync(path.join(broot, 'apriori', 'specs'), { recursive: true });
  const bf = run(['archive', '--change', 'c', '--write'], broot);
  assert.strictEqual(bf.status, 2, bf.stdout + bf.stderr);
  assert.match(bf.stderr, /no delta spec files \(\*\.md\)/);
});
