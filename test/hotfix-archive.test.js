'use strict';
// hotfix-lane T2.1/T7 — the bundle on disk, the zero-write preflight, and the three-stage
// write set (HF-37..HF-42).
const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const hf = require('../lib/hotfix.js');

const HEAD = 'a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0';
const git = (args) => (args[0] === 'rev-parse' ? { code: 0, out: `${HEAD}\n` } : { code: 0, out: '' });
const dirtyGit = (args) => (args[0] === 'rev-parse' ? { code: 0, out: `${HEAD}\n` } : { code: 0, out: ' M lib/gate.js\n' });

const STORE = `# gate

### Requirement: the binding gate
blast: low

#### Scenario: GT-01 the summary line names the count
- WHEN a gate runs
- THEN the summary names the count
`;

const TRUTH = `# TRUTH — gate

## Contract (code-is-truth)

source-commit: abc1234

## Decisions (doc-is-truth)

- D-GT-1 (active): the gate judges the mechanical face only. Ratified in gate-command (2026-07-11).
`;

function repo(o = {}) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'apriori-hotfix-'));
  fs.mkdirSync(path.join(root, 'apriori', 'specs', 'gate'), { recursive: true });
  fs.mkdirSync(path.join(root, 'apriori', 'truth'), { recursive: true });
  fs.writeFileSync(path.join(root, 'apriori', 'specs', 'gate', 'spec.md'), o.store === undefined ? STORE : o.store);
  fs.writeFileSync(path.join(root, 'apriori', 'truth', 'gate.md'), TRUTH);
  return root;
}

function bundle(root, name, o = {}) {
  const dir = path.join(root, 'apriori', 'changes', name);
  fs.mkdirSync(path.join(dir, 'review'), { recursive: true });
  fs.writeFileSync(path.join(dir, 'hotfix-state.md'), o.state !== undefined ? o.state : [
    `hotfix: ${name}`, 'date: 2026-08-14', 'kinds: 1', 'change-kind: code-trivial',
    'touched-modules: gate', 'fix-ref: a1b2c3d', 'frontend-touched: no', 'backend-touched: yes',
    'affected-scenario-ids: GT-01', '', '## Conclusion', '', 'The summary line said items; the store says rows.', '',
  ].join('\n'));
  if (o.delta) {
    fs.mkdirSync(path.join(dir, 'specs', 'gate'), { recursive: true });
    fs.writeFileSync(path.join(dir, 'specs', 'gate', 'spec.md'), o.delta);
  }
  if (o.decisions) fs.writeFileSync(path.join(dir, 'decisions.md'), o.decisions);
  if (o.flowState) fs.writeFileSync(path.join(dir, 'flow-state.md'), 'change: x\n');
  if (o.round) {
    fs.writeFileSync(path.join(dir, 'review', 'round-1.md'), 'round 1\n');
    fs.writeFileSync(path.join(dir, 'review', 'round-1-raw.txt'), o.round);
  }
  return dir;
}

const run = (root, name, o = {}) => hf.preflight(root, name, { git, verify: false, profile: null, ...o });
const archive = (root, name, o = {}) => hf.archiveHotfix({ cwd: root, name, git, verify: false, profile: null, now: Date.UTC(2026, 7, 14), ...o });
const grab = (r, key) => {
  const m = new RegExp(`${key}:\\s+([0-9a-f]{64})`).exec(r.out.join('\n'));
  assert.ok(m, `${key} present in:\n${r.out.join('\n')}\n${r.err.join('\n')}`);
  return m[1];
};

// A bundle that actually rewrites the store — the only shape whose token has baselines.
// It MODIFIES a block the store already whitelisted: an ADDED block could never carry a
// marker of its own without self-granting, which is exactly what the lane refuses.
const delta = (stamp) => `<!-- apriori-base: ${stamp} -->

## MODIFIED Requirements

### Requirement: the binding gate
blast: low

#### Scenario: GT-01 the summary line names the count of rows
- WHEN a gate runs
- THEN the summary names the count of rows
`;
function deltaBundle(root, name, o = {}) {
  const stamp = require('../lib/archive-merge').fingerprint(fs.readFileSync(path.join(root, 'apriori', 'specs', 'gate', 'spec.md'), 'utf8'));
  const dir = bundle(root, name, { delta: delta(o.stamp || stamp), ...o });
  fs.writeFileSync(path.join(dir, 'hotfix-state.md'), [
    `hotfix: ${name}`, 'date: 2026-08-14', 'kinds: 1', 'change-kind: code-trivial',
    'touched-modules: gate', 'fix-ref: a1b2c3d', 'frontend-touched: no', 'backend-touched: yes',
    'affected-scenario-ids: GT-01', '', '## Conclusion', '', 'The summary line said items; the store says rows.', '',
    '## Bindings', '', 'GT-01: tests: gate.test.js covers the summary noun', '',
  ].join('\n'));
  return dir;
}
// the verdict line must carry the digest the bundle actually hashes to
function stampVerdict(root, name) {
  const digest = grab(archive(root, name), 'digest');
  const raw = path.join(root, 'apriori', 'changes', name, 'review', 'round-1-raw.txt');
  fs.writeFileSync(raw, fs.readFileSync(raw, 'utf8').replace('DIGEST', digest));
  return digest;
}

test('HF-37 the scaffold lands a parseable skeleton and refuses a name that is taken', () => {
  const root = repo();
  const first = hf.scaffoldHotfix(root, 'summary-wording', new Date(2026, 7, 14));
  assert.strictEqual(first.ok, true, `scaffolded: ${first.error || ''}`);
  assert.ok(fs.existsSync(path.join(root, 'apriori', 'changes', 'summary-wording', 'hotfix-state.md')));

  const parsed = hf.parseState(fs.readFileSync(path.join(root, 'apriori', 'changes', 'summary-wording', 'hotfix-state.md'), 'utf8'));
  assert.ok(parsed.problems.some((p) => /placeholder/.test(p)), 'the fresh skeleton flags its own unreplaced conclusion');
  assert.deepStrictEqual(parsed.problems.filter((p) => !/placeholder/.test(p)), [], 'and nothing else');

  const again = hf.scaffoldHotfix(root, 'summary-wording', new Date(2026, 7, 14));
  assert.deepStrictEqual([again.ok, /already exists/.test(again.error)], [false, true]);
  assert.strictEqual(hf.scaffoldHotfix(root, 'Not Kebab', new Date()).ok, false, 'the name rule is the one `apriori new` uses');
});

test('HF-38 a bundle carrying both identities is refused', () => {
  const root = repo();
  bundle(root, 'both', { flowState: true });
  const r = run(root, 'both');
  assert.ok(r.err.some((e) => /BOTH flow-state\.md and hotfix-state\.md/.test(e)), `identity exclusivity: ${r.err}`);
});

test('HF-39 preflight writes nothing, whether it passes or fails', () => {
  const root = repo();
  bundle(root, 'wording');
  const before = fs.readFileSync(path.join(root, 'apriori', 'specs', 'gate', 'spec.md'), 'utf8');
  const listing = fs.readdirSync(path.join(root, 'apriori', 'changes', 'wording')).sort();

  const ok = run(root, 'wording');
  assert.strictEqual(ok.code, 0, `clean R1 bundle: ${ok.err}`);
  assert.ok(ok.out.some((l) => /grade:\s+\(R1, n\/a\)/.test(l)), `graded R1: ${ok.out}`);

  const bad = run(root, 'wording', { git: dirtyGit });
  assert.ok(bad.err.some((e) => /uncommitted changes/.test(e)), `clean-tree condition: ${bad.err}`);

  assert.strictEqual(fs.readFileSync(path.join(root, 'apriori', 'specs', 'gate', 'spec.md'), 'utf8'), before, 'the store is untouched');
  assert.deepStrictEqual(fs.readdirSync(path.join(root, 'apriori', 'changes', 'wording')).sort(), listing, 'the bundle is untouched');
});

test('HF-40 the token is refused when a baseline moved after it was issued', () => {
  const root = repo();
  const dir = deltaBundle(root, 'wording', { round: `transcript\n\n${hf.VERDICT_MARKER}\nVERDICT: no findings role=inspection digest=DIGEST boundary=within\n` });
  fs.writeFileSync(path.join(dir, 'decisions.md'), '## gate\n\n- (active): the summary noun follows the store.\n');
  fs.writeFileSync(path.join(dir, 'hotfix-state.md'), fs.readFileSync(path.join(dir, 'hotfix-state.md'), 'utf8').replace('kinds: 1', 'kinds: 1,3'));
  stampVerdict(root, 'wording');
  const token = grab(archive(root, 'wording'), 'token');

  // the truth doc is a token baseline but carries no CAS stamp of its own — moving it is
  // exactly the case the token exists to catch
  fs.appendFileSync(path.join(root, 'apriori', 'truth', 'gate.md'), '\n- D-GT-2 (active): landed by someone else meanwhile. Ratified in other (2026-08-14).\n');
  const stale = archive(root, 'wording', { approve: token });
  assert.strictEqual(stale.code, 1, 'a moved baseline refuses the token');
  assert.ok(stale.err.some((e) => /does not match/.test(e)), `named: ${stale.err}`);
  assert.ok(fs.existsSync(path.join(root, 'apriori', 'changes', 'wording')), 'and nothing moved');
});

test('HF-41 an approved run writes stores, truth and the bundle move in that order', () => {
  const root = repo();
  const dir = deltaBundle(root, 'wording', {
    round: `transcript\n\n${hf.VERDICT_MARKER}\nVERDICT: no findings role=inspection digest=DIGEST boundary=within\n`,
  });
  fs.writeFileSync(path.join(dir, 'decisions.md'), "## gate\n\n- (active): the summary line speaks the store's noun.\n");
  fs.writeFileSync(path.join(dir, 'hotfix-state.md'),
    fs.readFileSync(path.join(dir, 'hotfix-state.md'), 'utf8').replace('kinds: 1', 'kinds: 1,3'));

  stampVerdict(root, 'wording');
  const ready = archive(root, 'wording');
  assert.strictEqual(ready.code, 0, `ready: ${ready.err}`);
  const token = grab(ready, 'token');

  const done = archive(root, 'wording', { approve: token });
  assert.strictEqual(done.code, 0, `archived: ${done.err}`);

  const store = fs.readFileSync(path.join(root, 'apriori', 'specs', 'gate', 'spec.md'), 'utf8');
  assert.ok(store.includes('GT-01 the summary line names the count of rows'), `stage 1 merged the delta into the store: ${store}`);
  const truth = fs.readFileSync(path.join(root, 'apriori', 'truth', 'gate.md'), 'utf8');
  assert.ok(/- D-GT-2 \(active\): the summary line speaks the store's noun\. Ratified in wording \(2026-08-14\)\./.test(truth), `stage 2 ratified the decision: ${truth}`);
  assert.ok(!fs.existsSync(path.join(root, 'apriori', 'changes', 'wording')), 'stage 3 moved the bundle');
  const archived = fs.readdirSync(path.join(root, 'apriori', 'changes', 'archive'));
  assert.strictEqual(archived.length, 1, `one archived bundle: ${archived}`);
  const approval = fs.readFileSync(path.join(root, 'apriori', 'changes', 'archive', archived[0], 'approval.md'), 'utf8');
  assert.ok(approval.includes('command-owned') && approval.includes(token) && approval.includes('D-GT-2'), `approval record: ${approval}`);
});

test('HF-42 a failing stage names what committed and what did not', () => {
  const root = repo();
  bundle(root, 'wording', { decisions: '## gate\n\n- (active): a fact.\n' });
  fs.writeFileSync(path.join(root, 'apriori', 'changes', 'wording', 'hotfix-state.md'), [
    'hotfix: wording', 'date: 2026-08-14', 'kinds: 1,3', 'change-kind: code-trivial',
    'touched-modules: gate', 'fix-ref: a1b2c3d', 'frontend-touched: no', 'backend-touched: yes',
    'affected-scenario-ids: GT-01', '', '## Conclusion', '', 'A wording fix plus one fact.', '',
  ].join('\n'));
  // strip the truth doc's decisions section: stage 2 has nothing to take an ID prefix from
  fs.writeFileSync(path.join(root, 'apriori', 'truth', 'gate.md'), TRUTH.split('- D-GT-1')[0]);

  const dry = hf.archiveHotfix({ cwd: root, name: 'wording', git, verify: false, profile: null, now: Date.UTC(2026, 7, 14) });
  const token = /token:\s+([0-9a-f]{64})/.exec(dry.out.join('\n'))[1];
  const r = hf.archiveHotfix({ cwd: root, name: 'wording', approve: token, git, verify: false, profile: null, now: Date.UTC(2026, 7, 14) });

  assert.strictEqual(r.code, 1, 'stage 2 failed');
  assert.ok(r.err.some((e) => /no existing decision to take an ID prefix from/.test(e)), `named the cause: ${r.err}`);
  assert.ok(r.out.some((l) => /FAILED at stage 2/.test(l)), `named the stage: ${r.out}`);
  assert.ok(fs.existsSync(path.join(root, 'apriori', 'changes', 'wording')), 'the bundle stayed put for the rerun');
});
