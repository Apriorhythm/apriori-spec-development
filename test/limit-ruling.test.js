'use strict';
// limit-ruling — GT-60..66 / ST-44 / AM-136 / PR-61..62: at the owner's review-round limit the
// loop no longer stops for the owner. The producer rules on every open finding (`note: ruling …`),
// ONE independent re-review follows and answers each ruled id (`- <ID>: ADDRESSED|NOT ADDRESSED —
// <basis>`), and only what it leaves unresolved (a pending ## Open item), an `escalate` verdict or a
// round past that one re-review reaches the owner. Human-approved DA-CONSENSUS §三 (2026-09-27).
const { test } = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawnSync } = require('node:child_process');

const review = require('../lib/review');
const gate = require('../lib/gate');
const config = require('../lib/config');
const rd = require('../lib/readiness');

const ROOT = path.join(__dirname, '..');
const BIN = path.join(ROOT, 'bin', 'apriori.js');
const run = (args, cwd) => spawnSync('node', [BIN, ...args], { encoding: 'utf8', cwd });

const STORE = '### Requirement: Alpha\n\n#### Scenario: XA-01 base\n- t\n';
const DELTA = '## ADDED Requirements\n\n### Requirement: Beta\n\n#### Scenario: XB-01 new\n- t\n';
const TAP_OK = `node -e "${['ok 1 - XA-01 a', 'ok 2 - XB-01 b'].map((l) => `console.log('${l}')`).join(';')}"`;
const REVISE = 'VERDICT: 3 issues open';
const ACCEPT = 'VERDICT: no spec-vs-code gaps';
const PROV = (session) => `<!-- provenance: provider=codex model=gpt-6-astra session=${session} date=2026-09-27 -->`;
const FAM = 'spec-review';

// a change whose spec-review family sits at the limit (3): rounds 1-2 revise, round 3 revise opening
// R-01..R-03 in the reviewer's session S1. `open` is the ## Open body, `gates` extra gates: lines.
function atLimit({ open = '', gates = '', session3 = 'S1', phase = 'build', limit = 3 } = {}) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'apriori-lr-'));
  const w = (rel, body) => { const p = path.join(root, rel); fs.mkdirSync(path.dirname(p), { recursive: true }); fs.writeFileSync(p, body); };
  w('apriori/specs/kv/spec.md', STORE);
  w('apriori/changes/c/specs/kv/spec.md', DELTA);
  w('apriori/process-config.md', `| Field | Value |\n|---|---|\n| review-round-limit | ${limit} |\n`);
  const bundle = path.join(root, 'apriori', 'changes', 'c');
  const flow = () => `change: c\nmode: standard\nphase: ${phase}\n\n## Open\n${open}\n\ngates:\n`
    + '  - 2026-09-27T01:00 note: scaffolded\n'
    + `  - 2026-09-27T02:00 note: review-progress ${FAM} round 3 — issues: none; actions: fixed the round-2 findings; evidence: apriori/specs/kv/spec.md; approach: kept — same plan\n`
    + gates;
  w('apriori/changes/c/flow-state.md', flow());
  const rev = (rel, body) => w(`apriori/changes/c/review/${rel}`, body);
  for (const n of [1, 2]) { rev(`${FAM}-v${n}.md`, `# review\n\nfindings…\n\n${REVISE}\n`); rev(`${FAM}-v${n}-raw.txt`, 'raw\n'); }
  const r3 = '# review round 3\n\n- R-01 TTL expiry untested\n- R-02 delete on a missing key is not specified\n- R-03 no hit counters\n\n' + REVISE + '\n';
  if (session3) rev(`${FAM}-v3.md`, `${PROV(session3)}\n${r3}`);
  else { rev(`${FAM}-v3.md`, r3); rev(`${FAM}-v3-raw.txt`, 'raw\n'); }
  return { root, bundle, rev, setOpen: (o) => { open = o; w('apriori/changes/c/flow-state.md', flow()); },
    addGates: (g) => { gates += g; w('apriori/changes/c/flow-state.md', flow()); } };
}
const ruling = (id, kind, basis = 'the basis', { actor = 'note', round = 3, min = 10 } = {}) =>
  `  - 2026-09-27T03:${String(min).padStart(2, '0')} ${actor}: ruling ${FAM} round ${round} — ${id}: ${kind} — ${basis}\n`;
const RULED = ruling('R-01', 'fixed', 'test/kv.test.js now proves TTL expiry', { min: 1 })
  + ruling('R-02', 'rejected', 'the delta spec XB-01 leaves a missing key to the caller', { min: 2 })
  + ruling('R-03', 'follow-up', 'kv-metrics carries the counters', { min: 3 });
const FOLLOW_UP_R03 = '- R-03: follow-up → kv-metrics — expose hit counters\n';
const reReview = (p, lines, verdict = ACCEPT, session = 'S1', extra = '') =>
  p.rev(`${FAM}-v4.md`, `${session === null ? '' : PROV(session) + '\n'}# re-review round 4\n\n${lines.join('\n')}\n${extra}\n${verdict}\n`)
  || (session === null && p.rev(`${FAM}-v4-raw.txt`, 'raw\n'));
const c8 = (root) => gate.runGate({ cwd: root, change: 'c', testCmd: TAP_OK }).checks.find((x) => x.id === 'C8');
const c9 = (root) => gate.runGate({ cwd: root, change: 'c', testCmd: TAP_OK }).checks.find((x) => x.id === 'C9');
const flowOf = (bundle) => fs.readFileSync(path.join(bundle, 'flow-state.md'), 'utf8');
const loopOf = (p) => review.reviewLoop(review.reviewFacts(p.bundle), flowOf(p.bundle), 'in-flight',
  { limit: config.resolveReviewRoundLimit(p.root), cwd: p.root });
const fam = (l) => l.families.find((f) => f.family === FAM);
const escStatus = (root) => run(['status', '--change', 'c', '--escalation'], root).status;

test('GT-60 rulings are required at the limit, one per open finding, in the exact grammar', () => {
  const p = atLimit();
  let c = c8(p.root);
  assert.strictEqual(c.status, 'blocked', c.detail);
  assert.match(c.detail, /ruling spec-review round 3 — the round is at the review-round limit \(3\) and still revising: record one ruling per open finding/);
  assert.match(c.detail, /note: ruling spec-review round 3 — <ID>: <fixed\|rejected\|follow-up\|owner> — <basis>/);
  assert.doesNotMatch(c.detail, /owner: reframe|ESCALATION/);
  assert.strictEqual(fam(loopOf(p)).stopped, false);
  assert.strictEqual(loopOf(p).escalation, null);
  assert.strictEqual(escStatus(p.root), 0);

  const cases = [
    [ruling('R-01', 'fixed', 'x', { min: 1 }) + ruling('R-02', 'rejected', 'y', { min: 2 }), /ruling spec-review round 3 — does not cover R-03 from round 3's summary/],
    [RULED.replace('R-03: follow-up', 'R-03: parked'), /ruling spec-review round 3 — R-03: 'parked' is not a ruling kind \(fixed, rejected, follow-up, owner\)/],
    [RULED.replace('— kv-metrics carries the counters', '—  '), /ruling spec-review round 3 — R-03: the basis is missing/],
    [RULED + ruling('R-01', 'rejected', 'changed my mind', { min: 4 }), /ruling spec-review round 3 — R-01 carries two different rulings \(fixed, rejected\)/],
    [RULED.replace(/ note: ruling/g, ' owner: ruling'), /ruling spec-review round 3 — the round is at the review-round limit/],
  ];
  for (const [g, want] of cases) {
    const q = atLimit({ gates: g, open: FOLLOW_UP_R03 });
    c = c8(q.root);
    assert.strictEqual(c.status, 'blocked', c.detail);
    assert.match(c.detail, want);
    assert.doesNotMatch(c.detail, /owner: reframe/);
    assert.strictEqual(escStatus(q.root), 0, String(want));
  }
  const ok = atLimit({ gates: RULED, open: FOLLOW_UP_R03 });
  c = c8(ok.root);
  assert.strictEqual(c.status, 'blocked', c.detail);
  assert.match(c.detail, /ruling spec-review round 3 — rulings recorded; one independent re-review is owed as round 4/);
  assert.doesNotMatch(c.detail, /does not cover|not a ruling kind|basis is missing|two different/);
  assert.strictEqual(escStatus(ok.root), 0);
});

test('GT-61 the re-review decides per id, and a ruled id never disappears', () => {
  const p = atLimit({ gates: RULED, open: FOLLOW_UP_R03 });
  reReview(p, ['- R-01: ADDRESSED — the TTL test fails on the old code', '- R-02: ADDRESSED — XB-01 is silent by design']);
  let c = c8(p.root);
  assert.strictEqual(c.status, 'blocked', c.detail);
  assert.match(c.detail, /re-review spec-review round 4 — R-03 \(follow-up\) has no ADDRESSED line and is not a pending ## Open item/);
  reReview(p, ['- R-01: ADDRESSED — ok', '- **R-02**: ADDRESSED — ok', '- `R-03`: **ADDRESSED** — a separate change is right']);
  c = c8(p.root);
  assert.strictEqual(c.status, 'pass', c.detail);
  assert.match(c.detail, /ruling spec-review: rulings at round 3, re-review round 4 — 3 addressed, 0 pending for the owner/);
  const f = fam(loopOf(p));
  assert.strictEqual(f.ruling.state, 'closed');
  reReview(p, ['- R-01: ADDRESSED — ok', '- R-02: ADDRESSED — ok', '- R-02: NOT ADDRESSED — on reflection no', '- R-03: ADDRESSED — ok']);
  c = c8(p.root);
  assert.strictEqual(c.status, 'blocked', c.detail);
  assert.match(c.detail, /re-review spec-review round 4 — R-02 carries both ADDRESSED and NOT ADDRESSED/);
  // near misses of the fixed format are not conclusions
  for (const bad of ['- R-01 ADDRESSED — no colon', '- R-01: addressed — lower case', '- R-01: ADDRESSED - hyphen, not em dash', '- R-011: ADDRESSED — a superstring id', '* R-01: ADDRESSED — star bullet']) {
    reReview(p, [bad, '- R-02: ADDRESSED — ok', '- R-03: ADDRESSED — ok']);
    assert.match(c8(p.root).detail, /R-01 \(fixed\) has no ADDRESSED line/, bad);
  }
});

test('GT-62 what the re-review leaves unresolved goes to the owner as a pending item', () => {
  const p = atLimit({ gates: RULED, open: FOLLOW_UP_R03, phase: 'review' });
  reReview(p, ['- R-01: ADDRESSED — ok', '- R-02: NOT ADDRESSED — the spec does promise an error', '- R-03: ADDRESSED — ok'],
    'VERDICT: 1 issues open', 'S1', '\n- R-04 the fix broke the eviction order\n');
  let c = c8(p.root);
  assert.strictEqual(c.status, 'blocked', c.detail);
  assert.match(c.detail, /R-02 \(rejected\) has no ADDRESSED line and is not a pending ## Open item/);
  assert.match(c.detail, /R-04 is a new finding of the re-review: it must be a pending ## Open item/);
  p.setOpen(FOLLOW_UP_R03 + '- R-02: delete on a missing key — the rejection was not upheld; the owner decides\n- R-04: eviction order after the fix — the owner decides\n');
  c = c8(p.root);
  assert.strictEqual(c.status, 'pass', c.detail);
  assert.match(c.detail, /2 addressed, 2 pending for the owner/);
  assert.doesNotMatch(c.detail, /ACCEPT|converged/);
  assert.strictEqual(c9(p.root).status, 'blocked');
  assert.strictEqual(escStatus(p.root), 3, 'the pending items are what a human is waited on for');
  const rdy = rd.readinessOf({ bundleDir: p.bundle, name: 'c', cwd: p.root });
  assert.ok(!rdy.blockers.some((b) => b.rule === 'R4'), JSON.stringify(rdy.blockers));
  assert.ok(rdy.blockers.some((b) => b.rule === 'R5' && /R-02/.test(b.detail)));
});

test('GT-63 an owner ruling belongs to the owner whatever the re-review says', () => {
  const g = ruling('R-01', 'owner', 'dropping TTL changes the commitment', { min: 1 })
    + ruling('R-02', 'fixed', 'x', { min: 2 }) + ruling('R-03', 'fixed', 'y', { min: 3 });
  const p = atLimit({ gates: g });
  reReview(p, ['- R-01: ADDRESSED — agreed it is the owner\'s', '- R-02: ADDRESSED — ok', '- R-03: ADDRESSED — ok']);
  let c = c8(p.root);
  assert.strictEqual(c.status, 'blocked', c.detail);
  assert.match(c.detail, /R-01 was ruled owner: it must be a pending ## Open item whatever the re-review says/);
  p.setOpen('- R-01: drop TTL? — the owner decides\n');
  c = c8(p.root);
  assert.strictEqual(c.status, 'pass', c.detail);
});

test('GT-64 a re-review whose session is not proven the same hands rejections and follow-ups to the owner', () => {
  const lines = ['- R-01: ADDRESSED — ok', '- R-02: ADDRESSED — ok', '- R-03: ADDRESSED — ok'];
  for (const [label, opts, s4] of [['different session', {}, 'S2'], ['round 3 without provenance', { session3: null }, 'S1'],
    ['re-review session unknown', {}, 'unknown'], ['re-review without provenance', {}, null]]) {
    const p = atLimit({ gates: RULED, open: FOLLOW_UP_R03, ...opts });
    reReview(p, lines, ACCEPT, s4);
    let c = c8(p.root);
    assert.strictEqual(c.status, 'blocked', `${label}: ${c.detail}`);
    assert.match(c.detail, /the re-review is not proven to run in round 3's reviewer session/, label);
    assert.match(c.detail, /R-02 \(rejected\) must be a pending ## Open item for the owner/, label);
    assert.match(c.detail, /R-03 \(follow-up\) must be a pending ## Open item for the owner/, label);
    assert.doesNotMatch(c.detail, /R-01 \(fixed\)/, label);
    p.setOpen('- R-02: delete on a missing key — the owner decides\n- R-03: hit counters — the owner decides\n');
    c = c8(p.root);
    assert.strictEqual(c.status, 'pass', `${label}: ${c.detail}`);
  }
});

test('GT-65 a round past the one re-review needs the owner', () => {
  const p = atLimit({ gates: RULED, open: FOLLOW_UP_R03 });
  reReview(p, ['- R-01: ADDRESSED — ok', '- R-02: NOT ADDRESSED — no', '- R-03: ADDRESSED — ok'], 'VERDICT: 1 issues open');
  p.setOpen(FOLLOW_UP_R03 + '- R-02: pending for the owner\n');
  p.rev(`${FAM}-v5.md`, `${PROV('S1')}\n# round 5\n\n${ACCEPT}\n`);
  let l = loopOf(p);
  assert.ok(l.escalation && l.escalation.some((e) => e.round === 5 && /the one automatic re-review is spent/.test(e.reason)), JSON.stringify(l.escalation));
  let c = c8(p.root);
  assert.strictEqual(c.status, 'blocked', c.detail);
  assert.strictEqual(escStatus(p.root), 3);
  // the owner releases the family past its re-review; round 5 is then an ordinary round (its record is owed)
  p.addGates('  - 2026-09-27T05:00 owner: reframe spec-review round 4 tests — add the missing-key test and review again\n'
    + `  - 2026-09-27T05:10 note: review-progress ${FAM} round 5 — issues: R-01, R-02, R-03; actions: added the missing-key test for R-02, R-01 and R-03 already addressed; evidence: apriori/specs/kv/spec.md; approach: kept — same plan\n`);
  l = loopOf(p);
  assert.strictEqual(l.escalation, null, JSON.stringify(l.escalation));
  assert.strictEqual(fam(l).stopped, false);
  assert.strictEqual(c8(p.root).status, 'pass', c8(p.root).detail);
  p.rev(`${FAM}-v6.md`, `${PROV('S1')}\n# round 6\n\n- R-05 regression\n\nVERDICT: 1 issues open\n`);
  l = loopOf(p);
  assert.ok(l.escalation && l.escalation.some((e) => e.round === 6 && !e.acknowledged), JSON.stringify(l.escalation));
});

test('GT-66 the re-review round needs no review-progress record', () => {
  const p = atLimit({ gates: RULED, open: FOLLOW_UP_R03 });
  reReview(p, ['- R-01: ADDRESSED — ok', '- R-02: ADDRESSED — ok', '- R-03: ADDRESSED — ok']);
  const l = loopOf(p);
  assert.deepStrictEqual(l.progress, []);
  assert.strictEqual(c8(p.root).status, 'pass');
  // the owner later raises the limit: the round that followed the rulings was still the re-review
  fs.writeFileSync(path.join(p.root, 'apriori', 'process-config.md'), '| Field | Value |\n|---|---|\n| review-round-limit | 6 |\n');
  const l2 = loopOf(p);
  assert.deepStrictEqual(l2.progress, [], JSON.stringify(l2.progress));
});

test('GT-67 raising the limit permits more review but never closes what the re-review left open', () => {
  // review round 1, LR-01: a fresh-session re-review ACCEPTs, the rejected / follow-up ids are not pending
  const p = atLimit({ gates: RULED, open: FOLLOW_UP_R03 });
  reReview(p, ['- R-01: ADDRESSED — ok', '- R-02: ADDRESSED — ok', '- R-03: ADDRESSED — ok'], ACCEPT, 'S2');
  assert.match(c8(p.root).detail, /R-02 \(rejected\) must be a pending ## Open item for the owner/);
  // the owner raises the limit: the obligation stands, the round is still checked as the re-review
  fs.writeFileSync(path.join(p.root, 'apriori', 'process-config.md'), '| Field | Value |\n|---|---|\n| review-round-limit | 6 |\n');
  let c = c8(p.root);
  assert.strictEqual(c.status, 'blocked', c.detail);
  assert.match(c.detail, /R-02 \(rejected\) must be a pending ## Open item for the owner/);
  assert.match(c.detail, /R-03 \(follow-up\) must be a pending ## Open item for the owner/);
  // handed to the owner, the family closes; a later ordinary round under the raised limit is released
  p.setOpen('- R-02: delete on a missing key — the owner decides\n- R-03: hit counters — the owner decides\n');
  c = c8(p.root);
  assert.strictEqual(c.status, 'pass', c.detail);
  p.addGates(`  - 2026-09-27T06:00 note: review-progress ${FAM} round 5 — issues: R-01, R-02, R-03; actions: none needed; evidence: apriori/specs/kv/spec.md; approach: kept — same plan\n`);
  p.rev(`${FAM}-v5.md`, `${PROV('S1')}\n# round 5\n\n${ACCEPT}\n`);
  const l = loopOf(p);
  assert.strictEqual(l.escalation, null, 'a raised limit is a release');
  assert.strictEqual(c8(p.root).status, 'pass', c8(p.root).detail);
});

test('GT-69 a later review the owner released can discharge a residual; the historical verdict stands', () => {
  // review round 2, LR-04: round 4 leaves R-01 NOT ADDRESSED (pending); the owner raises the limit and
  // authorizes the fix; round 5 answers R-01 ADDRESSED — the pending line may then be removed
  const p = atLimit({ gates: RULED, open: FOLLOW_UP_R03 + '- R-01: TTL expiry — the owner decides\n' });
  reReview(p, ['- R-01: NOT ADDRESSED — still untested', '- R-02: ADDRESSED — ok', '- R-03: ADDRESSED — ok'], 'VERDICT: 1 issues open');
  assert.strictEqual(c8(p.root).status, 'pass', c8(p.root).detail);
  fs.writeFileSync(path.join(p.root, 'apriori', 'process-config.md'), '| Field | Value |\n|---|---|\n| review-round-limit | 6 |\n');
  p.addGates(`  - 2026-09-27T06:00 note: review-progress ${FAM} round 5 — issues: R-01, R-02, R-03; actions: added the TTL test; evidence: apriori/specs/kv/spec.md; approach: kept — same plan\n`);
  // round 5 does not answer R-01 yet: removing the pending line is refused
  p.rev(`${FAM}-v5.md`, `${PROV('S1')}\n# round 5\n\n${ACCEPT}\n`);
  p.setOpen(FOLLOW_UP_R03);
  let c = c8(p.root);
  assert.strictEqual(c.status, 'blocked', c.detail);
  assert.match(c.detail, /R-01 \(fixed\) has no ADDRESSED line and is not a pending ## Open item/);
  // round 5 answers it: the residual is discharged, and round 4's NOT ADDRESSED is still on record
  p.rev(`${FAM}-v5.md`, `${PROV('S1')}\n# round 5\n\n- R-01: ADDRESSED — the TTL test now fails on the old code\n\n${ACCEPT}\n`);
  c = c8(p.root);
  assert.strictEqual(c.status, 'pass', c.detail);
  assert.match(fs.readFileSync(path.join(p.bundle, 'review', `${FAM}-v4.md`), 'utf8'), /R-01: NOT ADDRESSED/);
  // an owner ruling is never discharged by a review: it stays the owner's
  const q = atLimit({ gates: ruling('R-01', 'owner', 'drops a commitment', { min: 1 }) + ruling('R-02', 'fixed', 'x', { min: 2 }) + ruling('R-03', 'fixed', 'y', { min: 3 }) });
  reReview(q, ['- R-01: ADDRESSED — ok', '- R-02: ADDRESSED — ok', '- R-03: ADDRESSED — ok']);
  fs.writeFileSync(path.join(q.root, 'apriori', 'process-config.md'), '| Field | Value |\n|---|---|\n| review-round-limit | 6 |\n');
  q.addGates(`  - 2026-09-27T06:00 note: review-progress ${FAM} round 5 — issues: R-01, R-02, R-03; actions: none; evidence: apriori/specs/kv/spec.md; approach: kept — same plan\n`);
  q.rev(`${FAM}-v5.md`, `${PROV('S1')}\n# round 5\n\n- R-01: ADDRESSED — fine\n\n${ACCEPT}\n`);
  assert.match(c8(q.root).detail, /R-01 was ruled owner: it must be a pending ## Open item whatever the re-review says/);
});

test('GT-70 the current cycle is still checked once the family is past its re-review', () => {
  // review round 2, LR-05: conflicting rulings at round 3, rounds 4 and 5 accept, the owner released round 5
  const g = ruling('R-01', 'fixed', 'x', { min: 1 }) + ruling('R-01', 'rejected', 'y', { min: 2 })
    + ruling('R-02', 'fixed', 'z', { min: 3 }) + ruling('R-03', 'fixed', 'w', { min: 4 })
    + '  - 2026-09-27T05:00 owner: reframe spec-review round 4 tests — one more look\n'
    + `  - 2026-09-27T05:10 note: review-progress ${FAM} round 5 — issues: R-01, R-02, R-03; actions: none; evidence: apriori/specs/kv/spec.md; approach: kept — same plan\n`;
  const p = atLimit({ gates: g, phase: 'review' });
  reReview(p, ['- R-01: ADDRESSED — ok', '- R-02: ADDRESSED — ok', '- R-03: ADDRESSED — ok']);
  p.rev(`${FAM}-v5.md`, `${PROV('S1')}\n# round 5\n\n${ACCEPT}\n`);
  const c = c8(p.root);
  assert.strictEqual(c.status, 'blocked', c.detail);
  assert.match(c.detail, /ruling spec-review round 3 — R-01 carries two different rulings \(fixed, rejected\)/);
  const rdy = rd.readinessOf({ bundleDir: p.bundle, name: 'c', cwd: p.root });
  assert.ok(rdy.blockers.some((b) => b.rule === 'R4' && b.forceable === false && /two different rulings/.test(b.detail)));
  // review round 3, LR-05: NO ruling note at all, or only unreadable ones — the same rounds, still refused
  const rel = '  - 2026-09-27T05:00 owner: reframe spec-review round 4 tests — one more look\n'
    + `  - 2026-09-27T05:10 note: review-progress ${FAM} round 5 — issues: R-01, R-02, R-03; actions: none; evidence: apriori/specs/kv/spec.md; approach: kept — same plan\n`;
  for (const [label, extra, want] of [
    ['no ruling at all', '', /ruling spec-review round 3 — the round is at the review-round limit \(3\) and still revising/],
    ['only unreadable rulings', `  - 2026-09-27T03:01 note: ruling ${FAM} round 3 — everything is fine\n`, /ruling spec-review round 3 — unreadable ruling line/],
  ]) {
    const q = atLimit({ gates: extra + rel, phase: 'review' });
    reReview(q, ['- R-01: ADDRESSED — ok', '- R-02: ADDRESSED — ok', '- R-03: ADDRESSED — ok']);
    q.rev(`${FAM}-v5.md`, `${PROV('S1')}\n# round 5\n\n${ACCEPT}\n`);
    const cq = c8(q.root);
    assert.strictEqual(cq.status, 'blocked', `${label}: ${cq.detail}`);
    assert.match(cq.detail, want, label);
    const rq = rd.readinessOf({ bundleDir: q.bundle, name: 'c', cwd: q.root });
    assert.ok(rq.blockers.some((b) => b.rule === 'R4' && b.forceable === false && want.test(b.detail)), label);
  }
});

test('GT-71 an escalated re-review keeps the family on the floor, also after a limit raise', () => {
  // review round 4, LR-06: rulings at round 3, the re-review ESCALATEs, the owner answers `tests` and raises the limit
  const p = atLimit({ gates: RULED + '  - 2026-09-27T05:00 owner: reframe spec-review round 4 tests — add coverage\n', open: FOLLOW_UP_R03, phase: 'review' });
  reReview(p, ['- R-01: ADDRESSED — ok'], 'VERDICT: escalate');
  fs.writeFileSync(path.join(p.root, 'apriori', 'process-config.md'), '| Field | Value |\n|---|---|\n| review-round-limit | 6 |\n');
  const c = c8(p.root);
  assert.strictEqual(c.status, 'blocked', c.detail);
  assert.match(c.detail, /the independent review has not resolved/);
  const rdy = rd.readinessOf({ bundleDir: p.bundle, name: 'c', cwd: p.root, force: true });
  assert.ok(rdy.blockers.some((b) => b.rule === 'R4' && b.class === 'review' && b.forceable === false), JSON.stringify(rdy.blockers));
  const a = run(['archive', '--change', 'c', '--no-cas', '--force'], p.root);
  assert.strictEqual(a.status, 1, 'tests is not accept-risk: --force cannot ship an unresolved review');
  // and on the current path, before any raise
  const q = atLimit({ gates: RULED + '  - 2026-09-27T05:00 owner: reframe spec-review round 4 tests — add coverage\n', open: FOLLOW_UP_R03 });
  reReview(q, ['- R-01: ADDRESSED — ok'], 'VERDICT: escalate');
  assert.match(c8(q.root).detail, /the independent review has not resolved/);
});

test('GT-68 a ruling note below the limit buys no exemption and is held to the ruling checks', () => {
  // review round 1, LR-02: default limit 8, rounds 1-2 revise, round 3 accept, one stray ruling at round 2
  const p = atLimit({ limit: 8, gates: ruling('R-01', 'parked', 'x', { round: 2 }) });
  p.rev(`${FAM}-v2.md`, `# review round 2\n\n- R-01 still open\n\n${REVISE}\n`);
  p.rev(`${FAM}-v3.md`, `${PROV('S1')}\n# review round 3\n\n${ACCEPT}\n`);
  // the fixture's round-3 progress record would satisfy round 3: drop it so the exemption is what is tested
  fs.writeFileSync(path.join(p.bundle, 'flow-state.md'), flowOf(p.bundle).replace(/^.*review-progress spec-review round 3.*\n/m, ''));
  const c = c8(p.root);
  assert.strictEqual(c.status, 'blocked', c.detail);
  assert.match(c.detail, /ruling spec-review round 2 — R-01: 'parked' is not a ruling kind/);
  assert.match(c.detail, /review-progress spec-review round 3 — missing before round 3/);
});

test('ST-44 a family at the limit shows the rulings owed and is not an escalation', () => {
  const json = (root) => JSON.parse(run(['status', '--change', 'c', '--json'], root).stdout);
  let p = atLimit();
  let t = run(['status', '--change', 'c'], p.root).stdout;
  assert.match(t, /review progress: ruling spec-review round 3 — the round is at the review-round limit \(3\)/);
  assert.ok(json(p.root).review.progress.some((s) => /ruling spec-review round 3/.test(s)));
  let e = run(['status', '--change', 'c', '--escalation'], p.root);
  assert.strictEqual(e.status, 0);
  assert.match(e.stdout, /ESCALATION: none/);
  p = atLimit({ gates: RULED, open: FOLLOW_UP_R03 });
  t = run(['status', '--change', 'c'], p.root).stdout;
  assert.match(t, /review progress: ruling spec-review round 3 — rulings recorded; one independent re-review is owed as round 4/);
  e = run(['status', '--change', 'c', '--escalation'], p.root);
  assert.strictEqual(e.status, 0);
});

test('AM-136 rulings at the limit archive without --force and are listed after the three states', () => {
  const g = ruling('R-01', 'fixed', 'x', { min: 1 }) + ruling('R-02', 'rejected', 'y', { min: 2 }) + ruling('R-03', 'fixed', 'z', { min: 3 });
  const p = atLimit({ gates: g, phase: 'review' });
  reReview(p, ['- R-01: ADDRESSED — ok', '- R-02: ADDRESSED — ok', '- R-03: ADDRESSED — ok']);
  // review round 1, LR-03: the real archive, not the dry-run preview
  const a = run(['archive', '--change', 'c', '--no-cas', '--write'], p.root);
  assert.strictEqual(a.status, 0, a.stdout + a.stderr);
  assert.match(a.stdout, /RESULT: MERGED — 1 module store\(s\) rewritten; change archived →/);
  assert.ok(!fs.existsSync(p.bundle), 'the change moved out of apriori/changes/c');
  const moved = fs.readdirSync(path.join(p.root, 'apriori', 'changes', 'archive')).filter((n) => /-c$/.test(n));
  assert.strictEqual(moved.length, 1);
  assert.match(fs.readFileSync(path.join(p.root, 'apriori', 'specs', 'kv', 'spec.md'), 'utf8'), /XB-01 new/, 'the delta merged into the store');
  const decl = a.stdout.slice(a.stdout.indexOf('ARCHIVE DECLARES')).split('\n');
  assert.strictEqual(decl.slice(1, 4).filter((l) => /^ {2}\w/.test(l)).length, 3);
  assert.match(decl[1], /implementation:/);
  assert.match(decl[3], /delivery:/);
  assert.match(a.stdout, /note: ruling spec-review round 3 — R-01: fixed \(re-review: ADDRESSED\)/);
  assert.match(a.stdout, /note: ruling spec-review round 3 — R-02: rejected \(re-review: ADDRESSED\)/);
  assert.doesNotMatch(a.stdout, /forced:/);
});

// ---- the text surfaces ----
const rdText = (p) => fs.readFileSync(path.join(ROOT, p), 'utf8');
test('PR-61 the rest of the runbook agrees, and the rulings are disclosed', () => {
  for (const [file, re] of [
    ['RUNBOOK.md', {
      principle: /^9\. End an unproductive review loop by the existing rules: log `review-progress` from round 3 on; at the owner's review-round limit, rule on each open finding and get one re-review instead of stopping; stop only on `escalate`, a decision that is the owner's, or what that re-review leaves unresolved\.$/m,
      r1: /^3\. \*\*A review family past its one automatic re-review \(reframe\)\.\*\*/m,
      disclose: /The rulings and the one re-review let the loop go on without waiting, but they do not guarantee the approach is right; the owner may reframe or raise the limit at any time\. The final report and the archive declaration list every ruling\./,
      noStop: /still `revise` at the effective limit, or `VERDICT: escalate` at any round → the loop stops/,
    }],
    ['RUNBOOK_cn.md', {
      principle: /^9\. 按既有规则终止无效评审循环:第 3 轮起记 `review-progress`;到了所有者的评审轮次上限,对每条未决发现逐条裁决、再做一次复核,而不是停下;只在 `escalate`、属于所有者的决定、或那次复核仍未解决的问题上停。$/m,
      r1: /^3\. \*\*某个评审 family 越过了它唯一一次自动复核\(reframe\)。\*\*/m,
      disclose: /逐条裁决与那一次复核让循环不必停等,但不保证方法本身正确;所有者随时可以 reframe 或提高上限。最终报告与归档声明逐条列出全部裁决。/,
      noStop: /在有效上限仍是 `revise`,或任一轮 `VERDICT: escalate` → 该循环停止/,
    }],
  ]) {
    const s = rdText(file);
    assert.match(s, re.principle, `${file}: principle 9`);
    assert.match(s, re.r1, `${file}: R1 third class`);
    assert.match(s, re.disclose, `${file}: disclosure`);
    assert.doesNotMatch(s, re.noStop, `${file}: the Specify exit no longer stops at the limit`);
  }
});

test('PR-62 one /goal carries a change from Build & Test to archive, and the templates follow', () => {
  for (const f of ['docs/operator.md', 'docs/operator_cn.md']) {
    const s = rdText(f);
    assert.match(s, /\*\*(Build → Review → Archive, one goal|Build → Review → Archive,一条 goal)/, `${f}: the one-goal recipe`);
    assert.match(s, /note: ruling/, `${f}: the recipe rules at the limit`);
    assert.doesNotMatch(s, /a family still `revise` at the owner's review-round limit|到了所有者评审轮次上限仍是 `revise` 的 family/, `${f}: the decision list`);
  }
  assert.match(rdText('templates/command.md'), /a review family past its one automatic\nre-review|a review family past its one automatic re-review/);
  assert.doesNotMatch(rdText('templates/command.md'), /still revising at its round limit/);
  assert.match(rdText('templates/process-config.md'), /^\| review-round-limit \| 8 \|/m);
});
