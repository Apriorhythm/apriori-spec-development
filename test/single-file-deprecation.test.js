'use strict';
// SFD-01..04 — batch C row 9 took its PRE-REGISTERED exit: the single-file `--store/--delta`
// entry is NOT removed, and is narrowed to a documented deprecation.
//
// The registered criterion: every legal single-file operation (normal / conflict / CAS-refusal)
// must have a bundle-form replay with byte-identical store results — if ANY legal operation
// cannot migrate, the entry stays. The investigation found one whole class that cannot: a store
// file OUTSIDE `apriori/specs` (the existing corpus itself merges into `store.md` at the
// project root — 15 of its ~20 calls). The high-level form hard-codes its store root to
// `apriori/specs`, discovers deltas only inside the changes root, and demands a ready change
// bundle, so one-module surgery outside those walls has no equivalent. SFD-01 pins the blocker;
// SFD-02/03 prove the equivalence that DOES hold for the migratable subclass (so a later round
// can re-judge the row on evidence); SFD-04 pins the deprecation annotation in both doc
// editions. Nothing behavioural changes on this row.

const { test } = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const { readyFiles } = require('./helpers/ready-bundle');

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

test('SFD-01 the migration blocker: a store outside apriori/specs is a legal single-file target with no bundle equivalent', () => {
  // the operation the existing corpus performs most: merge into ./store.md at the project root
  const s = singleFile('store.md', ADD);
  assert.strictEqual(s.r.status, 0, s.r.stdout + s.r.stderr);
  assert.match(s.store(), /Beta/, 'the single-file form serves this operation today');
  // the high-level form cannot produce those bytes at that path: its store root is
  // apriori/specs (hard-coded), so the same delta through a bundle leaves ./store.md untouched
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
    'the bundle form reached outside apriori/specs — the row 9 blocker no longer holds: re-judge the row');
  assert.match(fs.readFileSync(path.join(root, 'apriori', 'specs', 'a', 'spec.md'), 'utf8'), /Beta/,
    'the bundle form writes under its own store root only');
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

test('SFD-04 both doc editions carry the deprecation annotation, and the usage surface is unchanged', () => {
  const en = fs.readFileSync(path.join(ROOT, 'docs', 'cli.md'), 'utf8');
  const cn = fs.readFileSync(path.join(ROOT, 'docs', 'cli_cn.md'), 'utf8');
  assert.match(en, /\*\*Single-file form \(deprecated, kept\)\.\*\*/,
    'docs/cli.md lost the row 9 deprecation annotation');
  assert.match(en, /no bundle-form equivalent/, 'the recorded reason must ride the annotation');
  assert.match(cn, /\*\*单文件形式\(deprecated,保留\)。\*\*/,
    'docs/cli_cn.md lost the row 9 deprecation annotation');
  assert.match(cn, /没有 bundle 形态的等价/, 'the recorded reason must ride the annotation (CN)');
  // the entry itself is untouched: the usage string still teaches both forms
  const usage = run(['archive'], fs.mkdtempSync(path.join(os.tmpdir(), 'apriori-sfd-u-')));
  assert.match(usage.stderr, /--store <f> --delta <f> --change <name>/, 'the single-file usage line must stay while the form exists');
});
