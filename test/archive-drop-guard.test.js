'use strict';
// archive-drop-guard — AM-123..AM-126 (S4): a store scenario is never dropped by an archive without a
// fingerprint-bound owner decision AND --force; ambiguous keys are never forceable; title changes and
// body rewrites are not drops; the single-file form never drops at all.
const { test } = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawnSync } = require('node:child_process');
const BIN = path.join(__dirname, '..', 'bin', 'apriori.js');
const am = require('../lib/archive-merge');
const rd = require('../lib/readiness');
const { readyFiles } = require('./helpers/ready-bundle');

const STORE = '### Requirement: R-K\nkeep me\n\n#### Scenario: KV-01 one\n- WHEN w\n- THEN t\n\n#### Scenario: KV-02 two\n- b\n';
const DROP = '## MODIFIED Requirements\n\n### Requirement: R-K\nkeep me\n\n#### Scenario: KV-01 one\n- WHEN w\n- THEN t\n';
const RETITLE = '## MODIFIED Requirements\n\n### Requirement: R-K\nkeep me\n\n#### Scenario: KV-01 one renamed\n- WHEN w\n- THEN t\n\n#### Scenario: KV-02 two\n- b changed\n';
const STORE_DUP = '### Requirement: R-K\nkeep me\n\n#### Scenario: KV-01 one\n- a\n\n#### Scenario: KV-01 one again\n- a2\n\n#### Scenario: KV-02 two\n- b\n';
const AMBIG = '## MODIFIED Requirements\n\n### Requirement: R-K\nkeep me\n\n#### Scenario: KV-01 one\n- a\n\n#### Scenario: KV-02 two\n- b\n';
const stamped = (delta, store = STORE) => `<!-- apriori-base: ${am.fingerprint(store)} -->\n\n` + delta;

function proj(delta, { gates = '', store = STORE } = {}) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'apriori-adg-'));
  const files = { ...readyFiles('c'), 'apriori/specs/m/spec.md': store, 'apriori/changes/c/specs/m/spec.md': stamped(delta, store) };
  for (const [rel, c] of Object.entries(files)) {
    fs.mkdirSync(path.dirname(path.join(root, rel)), { recursive: true });
    fs.writeFileSync(path.join(root, rel), c);
  }
  if (gates) fs.appendFileSync(path.join(root, 'apriori/changes/c/flow-state.md'), gates);
  return root;
}
const run = (root, args) => spawnSync('node', [BIN, ...args], { encoding: 'utf8', cwd: root });
const storeOf = (root) => fs.readFileSync(path.join(root, 'apriori/specs/m/spec.md'), 'utf8');
const fpOf = (root) => (run(root, ['archive', '--change', 'c']).stdout.match(/manifest (sha256:[0-9a-f]{64})/) || [])[1];
const entry = (fp, actor = 'owner', target = 'c', reason = 'the second scenario is retired with the owner\'s consent') =>
  `  - 2026-09-25T10:00 ${actor}: archive-drop ${target} ${fp} — ${reason}\n`;

test('AM-123 a delta that drops a store scenario is refused with zero writes, and the report names the deletion, its fingerprint and the cure', () => {
  for (const write of [false, true]) {
    const root = proj(DROP);
    const before = storeOf(root);
    const r = run(root, ['archive', '--change', 'c', ...(write ? ['--write'] : [])]);
    assert.strictEqual(r.status, 1, r.stdout + r.stderr);
    assert.match(r.stdout, /— DROPPED SCENARIOS —\n  m\/spec\.md · R-K · KV-02\n  manifest sha256:[0-9a-f]{64}/);
    assert.match(r.stdout, /RESULT: REFUSED — nothing written/);
    assert.match(r.stderr, /1 store scenario\(s\) would be DROPPED and no owner decision names this exact input/);
    assert.match(r.stderr, /- <YYYY-MM-DDTHH:MM> owner: archive-drop c sha256:[0-9a-f]{64} — <the human's reason, verbatim>/);
    assert.strictEqual(storeOf(root), before, 'zero writes');
    assert.ok(fs.existsSync(path.join(root, 'apriori/changes/c')), 'the bundle was not moved');
  }
  // the manifest is deterministic and binds target, stores, deltas and the sorted drop list
  const root = proj(DROP);
  const d = am.discoverDeltas(path.join(root, 'apriori/changes'), 'c');
  const p = am.buildProjection(path.join(root, 'apriori/specs'), d.files, 'c');
  const entries = am.integrityEntries(p.modifiedBlocks, () => require('../lib/spec-runner').makeIdMatcher(/[A-Z]+-\d+/), root).entries;
  const man = am.dropManifest('c', p.sources, entries);
  assert.strictEqual(man.fingerprint, fpOf(root));
  assert.match(man.text, /^apriori archive-drop manifest v1\ntarget: "c"\nstore "m\/spec\.md": sha256:[0-9a-f]{64}\ndelta "m\/spec\.md": sha256:[0-9a-f]{64}\ndrop "m\/spec\.md" "R-K" "KV-02"\n$/);
  // zero writes means zero staging too: no temp artifact anywhere under the store root
  const rootT = proj(DROP);
  run(rootT, ['archive', '--change', 'c', '--write']);
  const walk = (d) => fs.readdirSync(d, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? walk(path.join(d, e.name)) : [path.join(d, e.name)]));
  assert.deepStrictEqual(walk(path.join(rootT, 'apriori/specs')).filter((f) => f.includes('.tmp-archive')), []);
});

test('AM-127 the manifest binds fields unambiguously and the content digests normalize line endings', () => {
  const S = require('../lib/spec-runner');
  const factory = () => S.makeIdMatcher(/[A-Z]+-\d+/);
  const manifestOf = (root) => {
    const d = am.discoverDeltas(path.join(root, 'apriori/changes'), 'c');
    const p = am.buildProjection(path.join(root, 'apriori/specs'), d.files, 'c');
    return am.dropManifest('c', p.sources, am.integrityEntries(p.modifiedBlocks, factory, root).entries);
  };
  const base = manifestOf(proj(DROP));
  // control characters in a field cannot collide with a sibling (fields are JSON-encoded; the manifest is hashed raw)
  const a = am.dropManifest('c', new Map([['m\ra/spec.md', { storeText: STORE, storeExists: true, deltaText: DROP }]]), [{ file: 'm\ra/spec.md', name: 'R-K', dropped: [{ id: 'KV-02', title: 'KV-02 two' }], ambiguous: [] }]);
  const b = am.dropManifest('c', new Map([['m\na/spec.md', { storeText: STORE, storeExists: true, deltaText: DROP }]]), [{ file: 'm\na/spec.md', name: 'R-K', dropped: [{ id: 'KV-02', title: 'KV-02 two' }], ambiguous: [] }]);
  assert.notStrictEqual(a.fingerprint, b.fingerprint, 'a CR and an LF inside a path are different locators');
  assert.match(a.text, /store "m\\ra\/spec\.md":/);
  // the same delta written with CRLF fingerprints identically (content digests normalize)
  const crlf = proj(DROP.replace(/\n/g, '\r\n'));
  assert.strictEqual(manifestOf(crlf).fingerprint, base.fingerprint);
  // an existing empty store is content; an absent store is `new`
  const empty = am.dropManifest('c', new Map([['x/spec.md', { storeText: '', storeExists: true, deltaText: 'd' }]]), []);
  const absent = am.dropManifest('c', new Map([['x/spec.md', { storeText: '', storeExists: false, deltaText: 'd' }]]), []);
  assert.match(empty.text, /store "x\/spec\.md": sha256:[0-9a-f]{64}/);
  assert.match(absent.text, /store "x\/spec\.md": new/);
  assert.notStrictEqual(empty.fingerprint, absent.fingerprint);
  // the last matching decision wins, and the forced line carries that full entry
  const fp = fpOf(proj(DROP));
  const root = proj(DROP, { gates: entry(fp, 'owner', 'c', 'first matching decision') + entry(fp, 'owner', 'c', 'second matching decision')
    + entry('sha256:' + 'b'.repeat(64), 'owner', 'c', 'a later decision for other content') });
  const r = run(root, ['archive', '--change', 'c', '--write', '--force']);
  assert.strictEqual(r.status, 0, r.stdout + r.stderr);
  assert.match(r.stdout, new RegExp(`forced: dropped 1 scenario\\(s\\) — owner decision on record: - 2026-09-25T10:00 owner: archive-drop c ${fp} — second matching decision`));
  assert.doesNotMatch(r.stdout, /first matching decision|other content/);
});

test('AM-124 the double action: a fingerprint-bound owner decision AND --force merge; either alone, a stale fingerprint, or a non-owner actor refuse', () => {
  const fp = fpOf(proj(DROP));
  // decision + --force: merged, the dropped scenario is gone, the forced line names the entry
  let root = proj(DROP, { gates: entry(fp) });
  let r = run(root, ['archive', '--change', 'c', '--write', '--force']);
  assert.strictEqual(r.status, 0, r.stdout + r.stderr);
  assert.match(r.stdout, /forced: dropped 1 scenario\(s\) — owner decision on record: .*archive-drop c sha256:/);
  assert.ok(!storeOf(root).includes('KV-02') && storeOf(root).includes('KV-01'));
  // decision without --force: refused, and the message says the flag is what is missing
  root = proj(DROP, { gates: entry(fp) });
  r = run(root, ['archive', '--change', 'c', '--write']);
  assert.strictEqual(r.status, 1);
  assert.match(r.stderr, /on record but --force was not given/);
  assert.ok(storeOf(root).includes('KV-02'));
  // --force without a decision: refused
  root = proj(DROP);
  r = run(root, ['archive', '--change', 'c', '--write', '--force']);
  assert.strictEqual(r.status, 1);
  assert.match(r.stderr, /no owner decision names this exact input/);
  // the fingerprint is stale after the delta changes (a second scenario now dropped) — refused
  root = proj('## MODIFIED Requirements\n\n### Requirement: R-K\nkeep me\n', { gates: entry(fp) });
  r = run(root, ['archive', '--change', 'c', '--write', '--force']);
  assert.strictEqual(r.status, 1, r.stdout + r.stderr);
  assert.match(r.stderr, /no owner decision names this exact input/);
  // ... and after the STORE changes under the same delta (a different base — the CAS stamp is re-issued, the drop fingerprint moves too)
  const store2 = STORE + '\n#### Scenario: KV-03 three\n- c\n';
  root = proj(DROP, { gates: entry(fp), store: store2 });
  r = run(root, ['archive', '--change', 'c', '--write', '--force']);
  assert.strictEqual(r.status, 1, r.stdout + r.stderr);
  assert.match(r.stderr, /no owner decision names this exact input/);
  // the canonical entry only: another actor, another target, no reason
  for (const g of [entry(fp, 'note'), entry(fp, 'agent'), entry(fp, 'owner', 'other-change'), entry(fp, 'owner', 'c', '')]) {
    root = proj(DROP, { gates: g });
    r = run(root, ['archive', '--change', 'c', '--write', '--force']);
    assert.strictEqual(r.status, 1, g);
    assert.ok(storeOf(root).includes('KV-02'), g);
  }
  // a valid decision + --force bypasses nothing else: a pending ## Open item still refuses under R5, store untouched
  root = proj(DROP, { gates: entry(fp) });
  const fsPath = path.join(root, 'apriori/changes/c/flow-state.md');
  fs.writeFileSync(fsPath, fs.readFileSync(fsPath, 'utf8').replace('\n## Open\n\n', '\n## Open\n- OP-1: still unverified\n\n'));
  r = run(root, ['archive', '--change', 'c', '--write', '--force']);
  assert.strictEqual(r.status, 1, r.stdout + r.stderr);
  assert.match(r.stdout, /RESULT: NOT READY — nothing written/);
  assert.ok(storeOf(root).includes('KV-02'));
  // the parser, directly
  assert.strictEqual(rd.dropGrant(`gates:\n${entry(fp)}`, 'c', fp).granted, true);
  assert.strictEqual(rd.dropGrant(`gates:\n${entry(fp)}`, 'c', 'sha256:' + '0'.repeat(64)), null);
  assert.strictEqual(rd.dropGrant(`gates:\n${entry(fp, 'owner', 'c', '——')}`, 'c', fp), null, 'no reason is no grant');
});

test('AM-125 a title change or a body rewrite is not a drop; an ambiguous key is refused and never forceable', () => {
  // retitle + body change: merged without any decision, the report shows titleChanged / missing lines only
  let root = proj(RETITLE);
  let r = run(root, ['archive', '--change', 'c', '--write']);
  assert.strictEqual(r.status, 0, r.stdout + r.stderr);
  assert.match(r.stdout, /titleChanged: KV-01 one -> KV-01 one renamed/);
  assert.doesNotMatch(r.stdout, /DROPPED SCENARIOS/);
  assert.ok(storeOf(root).includes('KV-01 one renamed') && storeOf(root).includes('- b changed'));
  // ambiguous: KV-01 occurs twice in the STORE block (a delta-side duplicate is already refused by the
  // structural preflight) — the guard cannot tell kept from dropped and refuses; a decision + --force does not change that
  root = proj(AMBIG, { store: STORE_DUP });
  r = run(root, ['archive', '--change', 'c', '--write']);
  assert.strictEqual(r.status, 1, r.stdout + r.stderr);
  assert.match(r.stderr, /scenario key 'KV-01' is ambiguous \(old; old 2\/new 1\) — disambiguate the delta before archiving; not forceable/);
  assert.doesNotMatch(r.stdout, /DROPPED SCENARIOS/);
  const anyFp = 'sha256:' + 'a'.repeat(64);
  root = proj(AMBIG, { store: STORE_DUP, gates: entry(anyFp) });
  r = run(root, ['archive', '--change', 'c', '--write', '--force']);
  assert.strictEqual(r.status, 1);
  assert.match(r.stderr, /ambiguous/);
  assert.ok(storeOf(root).includes('one again'));
});

test('AM-126 the single-file form never drops a store scenario and points at the high-level form', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'apriori-adg-sf-'));
  const store = path.join(root, 'store.md'), delta = path.join(root, 'delta.md');
  fs.writeFileSync(store, STORE);
  fs.writeFileSync(delta, stamped(DROP));
  for (const args of [[], ['--write']]) {
    const r = spawnSync('node', [BIN, 'archive', '--store', store, '--delta', delta, '--change', 'c', ...args], { encoding: 'utf8', cwd: root });
    assert.strictEqual(r.status, 1, r.stdout + r.stderr);
    assert.match(r.stderr, /scenario KV-02 would be DROPPED — the single-file form never drops a store scenario; use the high-level form with an owner archive-drop decision/);
    assert.match(r.stdout, /RESULT: REFUSED — nothing written/);
    assert.strictEqual(fs.readFileSync(store, 'utf8'), STORE);
  }
  // a retitle passes the single-file form as before
  fs.writeFileSync(delta, stamped(RETITLE));
  const ok = spawnSync('node', [BIN, 'archive', '--store', store, '--delta', delta, '--change', 'c', '--write'], { encoding: 'utf8', cwd: root });
  assert.strictEqual(ok.status, 0, ok.stdout + ok.stderr);
  assert.ok(fs.readFileSync(store, 'utf8').includes('KV-01 one renamed'));
});
