'use strict';
// AM-92..AM-98 — the single-file form never touches a change bundle.

const { test } = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawnSync } = require('node:child_process');

const am = require('../lib/archive-merge');
const { canSymlink } = require('./helpers/can-symlink');
const BIN = path.join(__dirname, '..', 'bin', 'apriori.js');
const run = (args, cwd) => spawnSync('node', [BIN, ...args], { encoding: 'utf8', cwd });

const STORE = '### Requirement: Alpha\n\n#### Scenario: XA-01 a\n- t\n';
const ADD = '## ADDED Requirements\n\n### Requirement: Beta\n\n#### Scenario: XB-09 n\n- t\n';
const w = (p, s) => { fs.mkdirSync(path.dirname(p), { recursive: true }); fs.writeFileSync(p, s); return p; };

function project() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'apriori-sfs-'));
  w(path.join(root, 'store.md'), STORE);
  w(path.join(root, 'apriori', 'changes', 'c', 'specs', 'a', 'spec.md'), ADD);
  return root;
}

test('AM-92 the single-file form no longer takes --changes-dir', () => {
  const root = project();
  w(path.join(root, 'delta.md'), ADD);
  const before = fs.readFileSync(path.join(root, 'store.md'), 'utf8');
  const r = run(['archive', '--store', 'store.md', '--delta', 'delta.md', '--change', 'c', '--write', '--changes-dir', 'apriori/changes'], root);
  assert.strictEqual(r.status, 2);
  assert.match(r.stderr, /--changes-dir is not accepted with the single-file form/);
  assert.match(r.stderr, /use the high-level form/);
  assert.strictEqual(fs.readFileSync(path.join(root, 'store.md'), 'utf8'), before, 'nothing written');
  assert.ok(fs.existsSync(path.join(root, 'apriori', 'changes', 'c')), 'nothing moved');
});

test('AM-93 a delta spelled inside the changes root is refused', () => {
  const root = project();
  const spellings = [
    path.join('apriori', 'changes', 'c', 'specs', 'a', 'spec.md'),
    '.' + path.sep + path.join('apriori', 'changes', 'c', 'specs', 'a', 'spec.md'),
    path.join('apriori', 'changes', '..', 'changes', 'c', 'specs', 'a', 'spec.md'),
  ];
  const before = fs.readFileSync(path.join(root, 'store.md'), 'utf8');
  for (const d of spellings) {
    const r = run(['archive', '--store', 'store.md', '--delta', d, '--change', 'c', '--write'], root);
    assert.strictEqual(r.status, 1, d);
    assert.match(r.stderr, /resolves inside apriori\/changes \(lexical measure\)/, d);
    assert.match(r.stderr, /use the high-level form: apriori archive --change c/, d);
    assert.strictEqual(fs.readFileSync(path.join(root, 'store.md'), 'utf8'), before, d);
  }
});

test('AM-94 a sibling directory sharing a prefix is not inside', () => {
  const root = project();
  const d = w(path.join(root, 'apriori', 'changes-other', 'c', 'specs', 'a', 'spec.md'), ADD);
  const r = run(['archive', '--store', 'store.md', '--delta', path.relative(root, d), '--change', 'c', '--write'], root);
  assert.strictEqual(r.status, 0, r.stdout + r.stderr);
  assert.match(fs.readFileSync(path.join(root, 'store.md'), 'utf8'), /Beta/, 'containment is by path segment');
});

test('AM-95 an external symlink into a bundle is refused on the realpath measure', { skip: canSymlink() ? false : 'platform refuses symlinks' }, () => {
  const root = project();
  const link = path.join(root, 'outside-link.md');
  fs.symlinkSync(path.join(root, 'apriori', 'changes', 'c', 'specs', 'a', 'spec.md'), link);
  const before = fs.readFileSync(path.join(root, 'store.md'), 'utf8');
  const r = run(['archive', '--store', 'store.md', '--delta', 'outside-link.md', '--change', 'c', '--write'], root);
  assert.strictEqual(r.status, 1, r.stdout + r.stderr);
  assert.match(r.stderr, /\(realpath measure\)/);
  assert.strictEqual(fs.readFileSync(path.join(root, 'store.md'), 'utf8'), before);
});

test('AM-96 a symlinked root is caught by the lexical measure', { skip: canSymlink() ? false : 'platform refuses symlinks' }, () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'apriori-sfs-'));
  w(path.join(root, 'store.md'), STORE);
  // the real bundles live elsewhere; apriori/changes is a symlink to them
  const real = fs.mkdtempSync(path.join(os.tmpdir(), 'apriori-real-'));
  w(path.join(real, 'c', 'specs', 'a', 'spec.md'), ADD);
  fs.mkdirSync(path.join(root, 'apriori'));
  fs.symlinkSync(real, path.join(root, 'apriori', 'changes'));
  const before = fs.readFileSync(path.join(root, 'store.md'), 'utf8');
  const r = run(['archive', '--store', 'store.md', '--delta', path.join('apriori', 'changes', 'c', 'specs', 'a', 'spec.md'), '--change', 'c', '--write'], root);
  assert.strictEqual(r.status, 1, r.stdout + r.stderr);
  assert.match(r.stderr, /\(lexical measure\)/, 'the realpath measure misses this one — that is why both are kept');
  assert.strictEqual(fs.readFileSync(path.join(root, 'store.md'), 'utf8'), before);
});

test('AM-97 an unresolvable path produces no hit and no new failure', () => {
  // no apriori/changes at all: the realpath measure cannot run, the lexical one does not hit
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'apriori-sfs-'));
  w(path.join(root, 'store.md'), STORE);
  w(path.join(root, 'delta.md'), ADD);
  assert.strictEqual(am.deltaScope(root, 'delta.md').inside, false);
  const ok = run(['archive', '--store', 'store.md', '--delta', 'delta.md', '--change', 'c', '--write'], root);
  assert.strictEqual(ok.status, 0, ok.stdout + ok.stderr);

  // a dangling delta falls through to the pre-existing "cannot read" failure, unchanged
  if (canSymlink()) {
    const root2 = fs.mkdtempSync(path.join(os.tmpdir(), 'apriori-sfs-'));
    w(path.join(root2, 'store.md'), STORE);
    fs.symlinkSync(path.join(root2, 'nope.md'), path.join(root2, 'dangling.md'));
    assert.strictEqual(am.deltaScope(root2, 'dangling.md').inside, false);
    const r2 = run(['archive', '--store', 'store.md', '--delta', 'dangling.md', '--change', 'c'], root2);
    assert.notStrictEqual(r2.status, 0);
    assert.doesNotMatch(r2.stderr, /resolves inside apriori\/changes/, 'the scope check must not claim this one');
  }
});

test('AM-98 surgery outside the changes root is untouched', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'apriori-sfs-'));
  w(path.join(root, 'store.md'), STORE);
  w(path.join(root, 'delta.md'), ADD);
  const dry = run(['archive', '--store', 'store.md', '--delta', 'delta.md', '--change', 'c'], root);
  assert.strictEqual(dry.status, 0, dry.stdout + dry.stderr);
  assert.match(dry.stdout, /merged \(ADDED\)/);
  assert.strictEqual(fs.readFileSync(path.join(root, 'store.md'), 'utf8'), STORE, 'dry-run writes nothing');
  const wr = run(['archive', '--store', 'store.md', '--delta', 'delta.md', '--change', 'c', '--write'], root);
  assert.strictEqual(wr.status, 0, wr.stdout + wr.stderr);
  assert.match(fs.readFileSync(path.join(root, 'store.md'), 'utf8'), /Beta/);
});

test('AM-117 the usage lines say which flags belong to which form', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'apriori-sfs-'));
  const r = run(['archive'], root);
  assert.strictEqual(r.status, 2);
  const [single, high] = r.stderr.split('\n').filter((l) => /apriori archive/.test(l));
  assert.match(single, /--store <f> --delta <f>/);
  assert.doesNotMatch(single, /--changes-dir/, 'the single-file form no longer moves anything');
  assert.doesNotMatch(single, /--force/, 'and has no readiness to override');
  assert.match(high, /--change <name>/);
  assert.match(high, /--changes-dir/);
  assert.match(high, /--force/);
});
