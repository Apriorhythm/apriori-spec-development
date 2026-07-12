'use strict';
// resolver-trust — RS-01..05: trust roots, entries, semantic names, structured defects
const { test } = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawnSync } = require('node:child_process');
const resolve = require('../lib/resolve');

const BIN = path.join(__dirname, '..', 'bin', 'apriori.js');
function run(args, cwd) { return spawnSync('node', [BIN, ...args], { encoding: 'utf8', cwd }); }

const STORE = '### Requirement: Alpha\n\n#### Scenario: XA-01 a\n- t\n';
const FLOW = (n) => `change: ${n}\ntier: medium\ntrack: harden\ntrack-rationale: r\nlineage: x\ncurrent-step: DONE\nnext-action: n\ngates:\n  - 2026-01-01T00:00 note: n\n`;
const LEDGER = '| ID | Issue | Risk | Round found | Status |\n|---|---|---|---|---|\n';

function mk(files) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'apriori-rt-'));
  for (const [rel, c] of Object.entries(files)) {
    const p = path.join(root, rel);
    fs.mkdirSync(path.dirname(p), { recursive: true });
    fs.writeFileSync(p, c);
  }
  return root;
}
function archivedBundle(root, stamp, name) {
  const d = path.join(root, 'apriori/changes/archive', `${stamp}-${name}`);
  fs.mkdirSync(path.join(d, 'review'), { recursive: true });
  fs.mkdirSync(path.join(d, 'specs/kv'), { recursive: true });
  fs.writeFileSync(path.join(d, 'flow-state.md'), FLOW(name));
  fs.writeFileSync(path.join(d, 'tasks.md'), '- [x] T1\n');
  fs.writeFileSync(path.join(d, 'review/issues.md'), LEDGER);
  fs.writeFileSync(path.join(d, 'specs/kv/spec.md'), '## ADDED Requirements\n\n### Requirement: B\n\n#### Scenario: XB-01 b\n- t\n');
  return d;
}
const canSymlink = (() => {
  try {
    const d = fs.mkdtempSync(path.join(os.tmpdir(), 'apriori-sym-'));
    fs.symlinkSync(d, path.join(d, 'probe'), 'dir');
    return true;
  } catch { return false; }
})();

test('RS-01 trust roots are validated before use', () => {
  // a plain FILE at the archive root
  const root = mk({ 'apriori/specs/kv/spec.md': STORE, 'apriori/changes/archive': 'A FILE' });
  const r = run(['status', '--change', 'c'], root);
  assert.strictEqual(r.status, 2, r.stdout + r.stderr);
  if (canSymlink) {
    // archive root symlinked outside changes/
    const root2 = mk({ 'apriori/specs/kv/spec.md': STORE, 'outside/keep.txt': 'x' });
    fs.mkdirSync(path.join(root2, 'apriori/changes'), { recursive: true });
    fs.symlinkSync(path.join(root2, 'outside'), path.join(root2, 'apriori/changes/archive'), 'dir');
    archivedBundle(root2, '2026-07-10T1200', 'c');   // creates THROUGH the link into outside/
    const r2 = run(['status', '--change', 'c'], root2);
    assert.strictEqual(r2.status, 2, r2.stdout + r2.stderr);
    const g2 = run(['gate', '--change', 'c', '--test-cmd', 'node -e "console.log(1)"'], root2);
    assert.strictEqual(g2.status, 2, g2.stdout + g2.stderr);
    // changes root ITSELF symlinked
    const root3 = mk({ 'apriori/specs/kv/spec.md': STORE, 'elsewhere/x.txt': 'x' });
    fs.mkdirSync(path.join(root3, 'apriori'), { recursive: true });
    fs.symlinkSync(path.join(root3, 'elsewhere'), path.join(root3, 'apriori/changes'), 'dir');
    assert.strictEqual(run(['status', '--change', 'c'], root3).status, 2);
  }
});

test('RS-02 broken entries never fall back, at either stage', () => {
  if (!canSymlink) return;
  // dangling active entry beside a valid archived bundle: structural, never fallback
  const root = mk({ 'apriori/specs/kv/spec.md': STORE });
  archivedBundle(root, '2026-07-10T1200', 'c');
  fs.symlinkSync(path.join(root, 'no-such-target'), path.join(root, 'apriori/changes/c'));
  const r = run(['status', '--change', 'c'], root);
  assert.strictEqual(r.status, 2, r.stdout + r.stderr);
  assert.doesNotMatch(r.stdout, /archived/);
  // active symlink to a REAL directory: equally structural
  const root2 = mk({ 'apriori/specs/kv/spec.md': STORE, 'real/flow-state.md': FLOW('c') });
  fs.mkdirSync(path.join(root2, 'apriori/changes'), { recursive: true });
  fs.symlinkSync(path.join(root2, 'real'), path.join(root2, 'apriori/changes/c'), 'dir');
  assert.strictEqual(run(['status', '--change', 'c'], root2).status, 2);
  // matching ARCHIVED candidate as a symlink
  const root3 = mk({ 'apriori/specs/kv/spec.md': STORE });
  const target = archivedBundle(root3, '2026-07-10T1200', 'other');
  fs.mkdirSync(path.join(root3, 'apriori/changes/archive'), { recursive: true });
  fs.symlinkSync(target, path.join(root3, 'apriori/changes/archive/2026-07-11T1200-c'), 'dir');
  assert.strictEqual(run(['status', '--change', 'c'], root3).status, 2);
});

test('RS-03 the reserved name and date-prefixed names are rejected on every surface', () => {
  const root = mk({
    'apriori/specs/kv/spec.md': STORE,
    'apriori/changes/archive/flow-state.md': FLOW('archive'),
    'apriori/changes/archive/tasks.md': '- [x] T1\n',
    'apriori/changes/archive/review/issues.md': LEDGER,
    'apriori/changes/archive/specs/kv/spec.md': '## ADDED Requirements\n\n### Requirement: B\n\n#### Scenario: XB-01 b\n- t\n',
    'store.md': STORE, 'delta.md': '## ADDED Requirements\n\n### Requirement: B\n\n#### Scenario: XB-01 b\n- t\n',
  });
  for (const [name, kindRe] of [['archive', /reserved/], ['2026-07-10T1200-x', /date.?prefix/i]]) {
    const g = run(['gate', '--change', name, '--test-cmd', 'node -e "console.log(1)"'], root);
    assert.strictEqual(g.status, 2, `gate ${name}`);
    assert.match(g.stdout + g.stderr, kindRe, `gate ${name} names the kind`);
    const s = run(['status', '--change', name], root);
    assert.strictEqual(s.status, 2, `status ${name}`);
    assert.match(s.stdout + s.stderr, kindRe, `status ${name} names the kind`);
    const a1 = run(['archive', '--change', name, '--write'], root);
    assert.notStrictEqual(a1.status, 0, `archive ${name}`);
    assert.match(a1.stdout + a1.stderr, kindRe, `archive ${name} names the kind`);
    const a2 = run(['archive', '--store', 'store.md', '--delta', 'delta.md', '--change', name, '--write'], root);
    assert.notStrictEqual(a2.status, 0, `archive single ${name}`);
    assert.match(a2.stdout + a2.stderr, kindRe, `archive single ${name} names the kind`);
  }
});

test('RS-04 pseudo-timestamps neither sort nor resolve', () => {
  const root = mk({ 'apriori/specs/kv/spec.md': STORE });
  archivedBundle(root, '2026-07-10T1200', 'c');
  archivedBundle(root, '9999-99-99T9999', 'c');
  const r = run(['status', '--change', 'c'], root);
  assert.strictEqual(r.status, 2, r.stdout + r.stderr);
  assert.match(r.stderr, /9999/);
  const root2 = mk({ 'apriori/specs/kv/spec.md': STORE });
  archivedBundle(root2, '2026-02-31T1200', 'c');
  assert.strictEqual(run(['status', '--change', 'c'], root2).status, 2);
  // leap day is legal
  const root3 = mk({ 'apriori/specs/kv/spec.md': STORE });
  archivedBundle(root3, '2024-02-29T1200', 'c');
  assert.strictEqual(run(['status', '--change', 'c'], root3).status, 0);
});

test('RS-05 read defects speak kinds, not string prefixes', () => {
  const root = mk({ 'bundle/flow-state.md': 'x', 'outside.md': 'y' });
  const bundle = path.join(root, 'bundle');
  assert.strictEqual(resolve.fileReadDefect(bundle, path.join(bundle, 'flow-state.md')), null);
  assert.strictEqual(resolve.fileReadDefect(bundle, path.join(bundle, 'missing.md')).kind, 'missing');
  if (canSymlink) {
    fs.symlinkSync(path.join(root, 'outside.md'), path.join(bundle, 'linked.md'));
    assert.strictEqual(resolve.fileReadDefect(bundle, path.join(bundle, 'linked.md')).kind, 'symlink');
    fs.symlinkSync(path.join(root, 'nowhere'), path.join(bundle, 'gone'));
    const d = resolve.fileReadDefect(bundle, path.join(bundle, 'gone', 'issues.md'));
    assert.strictEqual(d.kind, 'bad-ancestor');
    assert.ok(d.path, 'defect carries the offending path');
    // escaping target: a real file reached through a parent symlinked OUTSIDE the bundle (RTIMPL-2)
    fs.mkdirSync(path.join(root, 'outdir'), { recursive: true });
    fs.writeFileSync(path.join(root, 'outdir', 'file.md'), 'x');
    fs.symlinkSync(path.join(root, 'outdir'), path.join(bundle, 'sub'), 'dir');
    const e = resolve.fileReadDefect(bundle, path.join(bundle, 'sub', 'file.md'));
    assert.strictEqual(e.kind, 'escape', JSON.stringify(e));
  }
});
