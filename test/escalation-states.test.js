'use strict';
// ES-01..ES-09 — escalation is DERIVED: stage × decision status (6.2 batch A-3).
//
// Three states per review family, in `review.reviewLoop` and `status`:
//   pending        active bundle, an escalation with no owner decision  → `status --escalation` exits 3
//   acknowledged   the owner's reframe is on record: still shown, does not exit 3 by itself
//                  (C8/R4 still judge convergence on their own terms)
//   historical     archived bundle: shown as history, never exits 3 (RL-43); evidence corruption
//                  in an archived bundle still errors (RL-44)
//
// The hand-written `escalation:` scalar is retired, correctly: absent or `none`/`n/a` is fine;
// any other content in an ACTIVE bundle is a pending decision the machine has no reading for —
// a structural migration refusal at C3/R1 and review-ready, and a hard stop until it is moved
// to `## Open` (or answered by a reframe) and the field deleted. In an archived bundle it is
// history. `apriori new` no longer writes the field.
//
// The matrix below asserts status exit code AND gate AND archive on the SAME fixtures.

const { test } = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const review = require('../lib/review');
const gateLib = require('../lib/gate');
const rd = require('../lib/readiness');
const status = require('../lib/status');

const BIN = path.join(__dirname, '..', 'bin', 'apriori.js');
const run = (args, cwd) => spawnSync('node', [BIN, ...args], { encoding: 'utf8', cwd });
const w = (p, s) => { fs.mkdirSync(path.dirname(p), { recursive: true }); fs.writeFileSync(p, s); return p; };

const STORE = '### Requirement: Alpha\n\n#### Scenario: XA-01 base\n- t\n';
const ADDED = '## ADDED Requirements\n\n### Requirement: Beta\n\n#### Scenario: XB-01 new\n- t\n';
const MERGED = STORE + '\n### Requirement: Beta\n\n#### Scenario: XB-01 new\n- t\n';
const TAP2 = 'node -e "console.log(\'TAP version 13\');console.log(\'1..2\');console.log(\'ok 1 - XA-01 a\');console.log(\'ok 2 - XB-01 b\')"';
const ACCEPT = 'VERDICT: no major issues';
const REVISE = 'VERDICT: 3 issues open';
const FIVE = [REVISE, REVISE, REVISE, REVISE, REVISE];
const REFRAME = (decision = 'accept-risk') => `  - 2026-08-23T12:00 owner: reframe code-review round 5 ${decision} — the owner takes it\n`;

// One fixture shape: flow-state (+ optional scalar / gates / open) and a review family of N rounds.
function project({ rounds = [ACCEPT], scalar = null, gates = '', open = '', archived = false } = {}) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'apriori-es-'));
  const dir = archived
    ? path.join(root, 'apriori', 'changes', 'archive', '2026-01-01T0000-c')
    : path.join(root, 'apriori', 'changes', 'c');
  w(path.join(root, 'apriori', 'specs', 'kv', 'spec.md'), archived ? MERGED : STORE);
  w(path.join(dir, 'specs', 'kv', 'spec.md'), ADDED);
  w(path.join(dir, 'flow-state.md'),
    `change: c\nlineage: v6\nphase: review\n${scalar === null ? '' : `escalation: ${scalar}\n`}`
    + `\n## Open\n${open}\n\ngates:\n  - 2026-08-23T00:00 note: scaffolded\n${gates}`);
  rounds.forEach((v, i) => {
    w(path.join(dir, 'review', `code-review-v${i + 1}.md`), `# review\n\n${v}\n`);
    w(path.join(dir, 'review', `code-review-v${i + 1}-raw.txt`), 'raw\n');
  });
  return { root, dir };
}
const gate = (p, extra = []) => run(['gate', '--change', 'c', '--test-cmd', TAP2, '--no-cas', ...extra], p.root);
const archive = (p, extra = []) => run(['archive', '--change', 'c', '--no-cas', ...extra], p.root);
const esc = (p) => run(['status', '--change', 'c', '--escalation'], p.root);
const escJson = (p) => JSON.parse(run(['status', '--change', 'c', '--escalation', '--json'], p.root).stdout);
const statusText = (p) => run(['status', '--change', 'c'], p.root).stdout;
const statusJson = (p) => JSON.parse(run(['status', '--change', 'c', '--json'], p.root).stdout);
const line = (out, id) => (out.split('\n').find((l) => l.includes(` ${id} `)) || '').trim();
const MIGRATE = /escalation: carries a pending decision \('owner must decide production target'\) — move it to ## Open as `- <ID>: owner must decide production target` \(or record the owner's reframe if it answers a review round\), then delete the field/;

// ---------------------------------------------------------------------------
// Astra R1 row 1 — the hand-written scalar in an ACTIVE bundle
// ---------------------------------------------------------------------------

test('ES-01 an active bundle with a hand-written escalation: is a migration refusal at C3/R1, review-ready and the hard stop', () => {
  const p = project({ rounds: [ACCEPT], scalar: 'owner must decide production target' });
  // status: exit 3, and the reason is the migration, not a silent echo
  const e = esc(p);
  assert.strictEqual(e.status, 3, e.stdout);
  assert.match(e.stdout, MIGRATE);
  const j = escJson(p);
  assert.strictEqual(j.escalations.length, 1);
  assert.match(j.escalations[0], MIGRATE);
  assert.deepStrictEqual(j.acknowledged, []);
  assert.deepStrictEqual(j.historical, []);
  assert.match(statusText(p), /^ESCALATION: {3}owner must decide production target {3}\(declared in flow-state — migrate: move it to ## Open/m);
  // gate: C3 refuses; nothing else about this bundle is wrong
  const g = gate(p);
  assert.strictEqual(g.status, 1, g.stdout);
  assert.match(line(g.stdout, 'C3'), /BLOCKED — flow-state: escalation: carries a pending decision/);
  assert.match(line(g.stdout, 'C8'), /^✓ C8/);
  assert.match(line(g.stdout, 'C9'), /^✓ C9/);
  // review-ready: `open` refuses with the same words
  const rr = gate(p, ['--review-ready']);
  assert.strictEqual(rr.status, 1, rr.stdout);
  assert.match(rr.stdout, /✗ open {2}flow-state: escalation: carries a pending decision/);
  // archive: R1 refuses, structural, never forceable
  const r = rd.readinessOf({ bundleDir: p.dir, name: 'c' });
  assert.strictEqual(r.ready, false);
  assert.deepStrictEqual(r.blockers.map((b) => [b.rule, b.class, b.forceable]), [['R1', 'legality', false]]);
  assert.match(r.blockers[0].detail, MIGRATE);
  const a = archive(p, ['--force']);
  assert.strictEqual(a.status, 1);
  assert.match(a.stderr, /archive: R1 .*escalation: carries a pending decision/);
  assert.doesNotMatch(a.stdout, /ARCHIVE DECLARES/);
});

test('ES-02 absent, `none` and `n/a` are fine; in an ARCHIVED bundle the scalar is history only', () => {
  for (const scalar of [null, 'none', 'n/a', 'N/A']) {
    const p = project({ scalar });
    assert.strictEqual(esc(p).status, 0, `scalar ${scalar}: ${esc(p).stdout}`);
    assert.strictEqual(gate(p).status, 0, `scalar ${scalar}: ${gate(p).stdout}`);
    assert.strictEqual(gate(p, ['--review-ready']).status, 0, `scalar ${scalar}`);
    assert.strictEqual(rd.readinessOf({ bundleDir: p.dir, name: 'c' }).ready, true, `scalar ${scalar}`);
  }
  const arch = project({ scalar: 'owner must decide production target', archived: true });
  const e = esc(arch);
  assert.strictEqual(e.status, 0, e.stdout);
  assert.match(e.stdout, /^ESCALATION: none$/m);
  const j = escJson(arch);
  assert.deepStrictEqual(j.escalations, []);
  assert.deepStrictEqual(j.historical, ['flow-state: owner must decide production target (archived history)']);
  assert.match(statusText(arch), /^ESCALATION: {3}owner must decide production target {3}\(declared in flow-state — archived history\)/m);
  const g = gate(arch);
  assert.strictEqual(g.status, 0, g.stdout);
  assert.match(line(g.stdout, 'C3'), /^✓ C3 legal/);
});

// ---------------------------------------------------------------------------
// Astra R1 rows 2–5 — round 5, with and without a decision, active and archived
// ---------------------------------------------------------------------------

test('ES-03 active, round 5, no decision → pending: exit 3, C8 blocked, archive blocked even with --force', () => {
  const p = project({ rounds: FIVE });
  const l = review.reviewLoop(review.reviewFacts(p.dir), fs.readFileSync(path.join(p.dir, 'flow-state.md'), 'utf8'), 'in-flight');
  assert.deepStrictEqual(l.escalation.map((x) => [x.family, x.round, x.state, x.acknowledged]), [['code-review', 5, 'pending', false]]);
  assert.strictEqual(l.families[0].stopped, true);
  const e = esc(p);
  assert.strictEqual(e.status, 3, e.stdout);
  assert.match(e.stdout, /code-review round 5 \(round 5 is the stop-loss\) — a human decides/);
  const j = escJson(p);
  assert.strictEqual(j.escalations.length, 1);
  assert.deepStrictEqual(j.acknowledged, []);
  assert.deepStrictEqual(j.historical, []);
  assert.strictEqual(statusJson(p).escalation[0].state, 'pending');
  const g = gate(p);
  assert.strictEqual(g.status, 1, g.stdout);
  assert.match(line(g.stdout, 'C8'), /BLOCKED — .*ESCALATION code-review round 5/);
  assert.strictEqual(archive(p).status, 1);
  const forced = archive(p, ['--force']);
  assert.strictEqual(forced.status, 1, 'no recorded decision: --force alone opens nothing');
  assert.match(forced.stderr, /--force needs a pre-recorded human decision/);
});

test('ES-04 archived, round 5, no decision → historical: exit 0, shown, C8 not blocked (RL-43)', () => {
  const p = project({ rounds: FIVE, archived: true });
  const l = review.reviewLoop(review.reviewFacts(p.dir), fs.readFileSync(path.join(p.dir, 'flow-state.md'), 'utf8'), 'archived');
  assert.deepStrictEqual(l.escalation.map((x) => [x.state, x.acknowledged]), [['historical', false]]);
  assert.strictEqual(l.families[0].stopped, false);
  const e = esc(p);
  assert.strictEqual(e.status, 0, e.stdout);
  assert.match(e.stdout, /^ESCALATION: none$/m);
  const j = escJson(p);
  assert.deepStrictEqual(j.escalations, []);
  assert.strictEqual(j.historical.length, 1);
  assert.match(j.historical[0], /code-review round 5 \(round 5 is the stop-loss\) — a human decides \(archived history\)/);
  assert.match(statusText(p), /^ESCALATION: {3}code-review round 5 \(round 5 is the stop-loss\) — a human decides {3}\(archived history\)/m);
  const g = gate(p);
  assert.strictEqual(g.status, 0, g.stdout);
  assert.match(line(g.stdout, 'C8'), /ESCALATION code-review round 5/);
  assert.match(line(g.stdout, 'C8'), /do not apply retroactively/);
  // not an active change: there is nothing to archive
  assert.strictEqual(archive(p).status, 2);
});

test('ES-05 active, round 5, accept-risk on record → acknowledged: shown, exit 0 by itself; C8 passes; archive needs --force', () => {
  const p = project({ rounds: FIVE, gates: REFRAME('accept-risk') });
  const l = review.reviewLoop(review.reviewFacts(p.dir), fs.readFileSync(path.join(p.dir, 'flow-state.md'), 'utf8'), 'in-flight');
  assert.deepStrictEqual(l.escalation.map((x) => [x.state, x.acknowledged, x.decision]), [['acknowledged', true, 'accept-risk']]);
  const e = esc(p);
  assert.strictEqual(e.status, 0, e.stdout);
  assert.match(e.stdout, /^ESCALATION: none$/m, 'nothing is pending');
  assert.match(e.stdout, /^acknowledged: code-review round 5 \(round 5 is the stop-loss\) — owner decision on record: accept-risk$/m, 'the answered escalation never leaves the report');
  const j = escJson(p);
  assert.deepStrictEqual(j.escalations, []);
  assert.strictEqual(j.acknowledged.length, 1);
  assert.match(statusText(p), /^ESCALATION: {3}code-review round 5 .* — owner decision on record: accept-risk$/m);
  assert.strictEqual(statusJson(p).escalation[0].state, 'acknowledged');
  const g = gate(p);
  assert.strictEqual(g.status, 0, g.stdout);
  assert.match(line(g.stdout, 'C8'), /^✓ C8 .*owner decision on record: accept-risk/);
  // the double action stays: the recorded decision AND an explicit --force
  assert.strictEqual(archive(p).status, 1);
  const forced = archive(p, ['--force']);
  assert.strictEqual(forced.status, 0, forced.stderr);
  assert.match(forced.stdout, /forced: R4 code-review round 5/);
});

test('ES-06 active, round 5, a reframe that is NOT accept-risk → acknowledged, but the floor still judges convergence', () => {
  const p = project({ rounds: FIVE, gates: REFRAME('redo') });
  assert.strictEqual(esc(p).status, 0, esc(p).stdout);
  assert.deepStrictEqual(escJson(p).escalations, []);
  assert.strictEqual(escJson(p).acknowledged.length, 1);
  const g = gate(p);
  assert.strictEqual(g.status, 1, g.stdout);
  assert.match(line(g.stdout, 'C8'), /BLOCKED — .*the independent review has not resolved/, 'acknowledged is not converged');
  assert.strictEqual(archive(p, ['--force']).status, 1);
});

test('ES-07 archived, round 5, accept-risk on record → historical', () => {
  const p = project({ rounds: FIVE, gates: REFRAME('accept-risk'), archived: true });
  const l = review.reviewLoop(review.reviewFacts(p.dir), fs.readFileSync(path.join(p.dir, 'flow-state.md'), 'utf8'), 'archived');
  assert.deepStrictEqual(l.escalation.map((x) => [x.state, x.acknowledged]), [['historical', true]]);
  assert.strictEqual(esc(p).status, 0);
  const j = escJson(p);
  assert.deepStrictEqual(j.escalations, []);
  assert.deepStrictEqual(j.acknowledged, []);
  assert.match(j.historical[0], /owner decision on record: accept-risk \(archived history\)/);
  assert.strictEqual(gate(p).status, 0, gate(p).stdout);
});

// ---------------------------------------------------------------------------
// the migration itself — a pending item with no review family never disappears
// ---------------------------------------------------------------------------

test('ES-08 a hand-written pending decision with no review family survives the migration, until the owner answers it', () => {
  const p = project({ rounds: [ACCEPT], scalar: 'owner must decide production target' });
  const before = esc(p);
  assert.strictEqual(before.status, 3);
  assert.match(before.stdout, /owner must decide production target/);
  // the migration the refusal asks for: move it to ## Open, delete the field
  const fp = path.join(p.dir, 'flow-state.md');
  fs.writeFileSync(fp, fs.readFileSync(fp, 'utf8')
    .replace('escalation: owner must decide production target\n', '')
    .replace('## Open\n', '## Open\n- ESC-1: owner must decide production target'));
  const after = esc(p);
  assert.strictEqual(after.status, 3, 'still a hard stop — the decision is still pending');
  assert.match(after.stdout, /open item ESC-1 is pending: owner must decide production target/);
  const g = gate(p);
  assert.match(line(g.stdout, 'C3'), /^✓ C3 legal/);
  assert.match(line(g.stdout, 'C9'), /BLOCKED — open item ESC-1 is pending/);
  assert.strictEqual(gate(p, ['--review-ready']).status, 0, 'a pending item is what the review is for');
  // the owner answers it, in the closed grammar
  fs.appendFileSync(fp, '  - 2026-08-23T13:00 owner: evidence-accept ESC-1 — production target is staging until Q4\n');
  assert.strictEqual(esc(p).status, 0);
  assert.strictEqual(gate(p).status, 0, gate(p).stdout);
  assert.strictEqual(archive(p).status, 0, archive(p).stderr);
});

test('ES-09 `apriori new` writes no escalation: field, and status reads a fresh scaffold as nothing pending', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'apriori-es-new-'));
  assert.strictEqual(run(['new', 'hello'], root).status, 0);
  const flow = fs.readFileSync(path.join(root, 'apriori', 'changes', 'hello', 'flow-state.md'), 'utf8');
  assert.doesNotMatch(flow, /^escalation:/m);
  assert.strictEqual(run(['status', '--change', 'hello', '--escalation'], root).status, 0);
  assert.doesNotMatch(status.formatOne(status.changeStatus(root, 'hello')), /ESCALATION/);
});
