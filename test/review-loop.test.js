'use strict';
// RL-01..RL-42 — 6.0 slice 2: the review round is DERIVED from review evidence, PER FAMILY.
//
// The rules come in two phases, and the split is the point:
//
//   PHASE 1 — SEMANTIC CLASSIFICATION: what does this verdict line mean? Tolerant about
//   wording (counts, singular/plural, case, the accept phrasings real reviewers write), and
//   strictly CLOSED — never a prefix matcher, because "no major issues, but 3 blockers
//   remain" starts with an accept and is not one.
//
//   PHASE 2 — EVIDENCE INTEGRITY: is the evidence complete? Strict about what a round needs
//   (summary + verdict + transcript, ordinals contiguous) and quiet about what merely sits in
//   the directory (a repeated identical verdict, a transcript that was never a review round).
//
// Phase 1 being lenient is what stops format pedantry; phase 2 being strict is what stops a
// round from being deleted. Mixing them is what produced the last two rounds of findings.

const { test } = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawnSync } = require('node:child_process');

const review = require('../lib/review');
const gate = require('../lib/gate');
const status = require('../lib/status');
const rd = require('../lib/readiness');
const { canSymlink } = require('./helpers/can-symlink');

const BIN = path.join(__dirname, '..', 'bin', 'apriori.js');
const run = (args, cwd) => spawnSync('node', [BIN, ...args], { encoding: 'utf8', cwd });

const STORE = '### Requirement: Alpha\n\n#### Scenario: XA-01 base\n- t\n';
const DELTA = '## ADDED Requirements\n\n### Requirement: Beta\n\n#### Scenario: XB-01 new\n- t\n';
const TAP_OK = `node -e "${['ok 1 - XA-01 a', 'ok 2 - XB-01 b'].map((l) => `console.log('${l}')`).join(';')}"`;
const LEDGER_OK = '| ID | Issue | Risk | Round found | Status |\n|---|---|---|---|---|\n| Q-1 | a | low | 1 | verified |\n';

const ACCEPT = 'VERDICT: no major issues';
const REVISE = 'VERDICT: 3 issues open';

function project(gates = '  - 2026-08-23T00:00 note: n\n', step = 'STEP5') {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'apriori-rl-'));
  const w = (rel, body) => {
    const p = path.join(root, rel);
    fs.mkdirSync(path.dirname(p), { recursive: true });
    fs.writeFileSync(p, body);
  };
  w('apriori/specs/kv/spec.md', STORE);
  w('apriori/changes/c/flow-state.md',
    `change: c\nmode: standard\nlineage: v6\ncurrent-step: ${step}\nnext-action: x\ngates:\n${gates}`);
  w('apriori/changes/c/tasks.md', '- [x] T1 done\n');
  w('apriori/changes/c/specs/kv/spec.md', DELTA);
  w('apriori/changes/c/review/issues.md', LEDGER_OK);
  return { root, bundle: path.join(root, 'apriori', 'changes', 'c'), w };
}

const doc = (bundle, stem, body) => fs.writeFileSync(path.join(bundle, 'review', `${stem}.md`), body);
const raw = (bundle, stem) => fs.writeFileSync(path.join(bundle, 'review', `${stem}-raw.txt`), 'raw transcript\n');
const landRound = (bundle, stem, verdict) => { doc(bundle, stem, `# review\n\nfindings…\n\n${verdict}\n`); raw(bundle, stem); };
const landFamily = (bundle, family, verdicts) =>
  verdicts.forEach((v, i) => landRound(bundle, `${family}-v${i + 1}`, v));

const facts = (bundle) => review.reviewFacts(bundle);
const flowOf = (bundle) => fs.readFileSync(path.join(bundle, 'flow-state.md'), 'utf8');
const loopOf = (bundle) => review.reviewLoop(review.reviewFacts(bundle), flowOf(bundle));
const famOf = (o, name) => o.families.find((f) => f.family === name);
const kinds = (o) => o.problems.map((p) => p.kind).sort();
const advKinds = (o) => o.advisories.map((a) => a.kind).sort();
const c8 = (root) => gate.runGate({ cwd: root, change: 'c', testCmd: TAP_OK }).checks.find((x) => x.id === 'C8');

// ===========================================================================
// PHASE 1 — semantic classification
// ===========================================================================

test('RL-01 a counted verdict reads its own number, in either vocabulary', () => {
  const cases = [
    ['VERDICT: 0 issues open', 'accept', 0],
    ['VERDICT: 1 issues open', 'revise', 1],
    ['VERDICT: 12 issues open', 'revise', 12],
    ['VERDICT: 0 issues found', 'accept', 0],
    ['VERDICT: 3 issues found', 'revise', 3],      // the variant the real corpus actually uses
    ['VERDICT: 1 issue open', 'revise', 1],        // singular
    ['VERDICT: 1 Issue Found', 'revise', 1],       // case
    ['VERDICT: 4 issues open.', 'revise', 4],      // sentence-final period, 21× in the corpus
    ['VERDICT:   7   issues   open  ', 'revise', 7],
  ];
  for (const [line, cls, n] of cases) {
    const c = review.classifyVerdict(line);
    assert.ok(c, `unclassified: ${line}`);
    assert.strictEqual(c.cls, cls, line);
    assert.strictEqual(c.issuesOpen, n, line);
  }
});

test('RL-02 the accept and revise phrasings are a CLOSED set, not a prefix rule', () => {
  for (const line of [
    'VERDICT: no major issues',
    'VERDICT: no major issues, ready to proceed',                 // 24× in the corpus
    'VERDICT: no major issues, ready to proceed to execution',
    'VERDICT: no spec-vs-code gaps',
    'VERDICT: no findings',
    'VERDICT: extraction accepted',
    'VERDICT: NO MAJOR ISSUES.',
  ]) assert.strictEqual(review.classifyVerdict(line).cls, 'accept', line);

  for (const line of ['VERDICT: gaps found', 'VERDICT: extraction rejected'])
    assert.strictEqual(review.classifyVerdict(line).cls, 'revise', line);
});

test('RL-03 an accept phrase with a contradicting tail is NOT an accept', () => {
  // the exact failure a prefix matcher produces, and the reason the set is closed
  for (const line of [
    'VERDICT: no major issues, but 3 blockers remain',
    'VERDICT: no findings — except the 4 P0s above',
    'VERDICT: no spec-vs-code gaps yet',
    'VERDICT: no major issues, ready to proceed once the migration lands',
  ]) {
    assert.strictEqual(review.classifyVerdict(line), null, `must not classify: ${line}`);
    assert.notStrictEqual(review.classifyVerdict(line) && review.classifyVerdict(line).cls, 'accept');
  }
});

test('RL-03b the hotfix lane\'s structured trailers do not break recognition', () => {
  // the lane writes `<phrase> role=… digest=<64 hex> [boundary=…]`. That is a CLOSED trailer
  // grammar, not free text, so stripping it is not the prefix matcher coming back: a tail that
  // is not one of those three key=value tokens still refuses to classify.
  const d = 'a'.repeat(64);
  assert.strictEqual(review.classifyVerdict(`VERDICT: no findings role=inspection digest=${d}`).cls, 'accept');
  assert.strictEqual(review.classifyVerdict(`VERDICT: no findings role=inspection digest=${d} boundary=within`).cls, 'accept');
  assert.strictEqual(review.classifyVerdict(`VERDICT: gaps found role=p8 digest=${d}`).cls, 'revise');
  assert.strictEqual(review.classifyVerdict(`VERDICT: 2 issues open role=p8 digest=${d}`).issuesOpen, 2);
  // not a lane trailer -> still unclassified
  assert.strictEqual(review.classifyVerdict('VERDICT: no findings notes=whatever'), null);
  assert.strictEqual(review.classifyVerdict('VERDICT: no findings and 3 more'), null);
});

test('RL-04 the unfilled table placeholder is legal prose and never an outcome', () => {
  assert.ok(review.isKnownVerdict('VERDICT: <N> issues open'), 'the docs table still accepts it');
  assert.strictEqual(review.classifyVerdict('VERDICT: <N> issues open'), null);
});

test('RL-05 review.js and check.js classify through ONE semantic classifier', () => {
  const check = require('../lib/check');
  assert.deepStrictEqual([...check.VERDICT_PHRASES].sort(), [...review.VERDICT_PHRASES].sort());
  const src = fs.readFileSync(path.join(__dirname, '..', 'lib', 'check.js'), 'utf8');
  assert.match(src, /isKnownVerdict\(/, 'CK-03 must call the shared classifier');
  assert.doesNotMatch(src, /VERDICT_PHRASES\.some\(/, 'no second matcher in check.js');
  // every canonical table entry is vocabulary the classifier knows
  for (const p of review.VERDICT_PHRASES) assert.ok(review.isKnownVerdict(p), p);
});

// ===========================================================================
// PHASE 2 — evidence integrity
// ===========================================================================

test('RL-06 a round is summary + verdict + transcript; loose files are not rounds', () => {
  const { bundle } = project();
  doc(bundle, 'notes', '# just notes, no verdict\n');
  doc(bundle, 'round-9', '# looks like round 9, says nothing\n');
  const f = facts(bundle);
  assert.deepStrictEqual(f.families, []);
  assert.deepStrictEqual(f.problems, []);

  landRound(bundle, 'req-review-v1', ACCEPT);
  const g = facts(bundle);
  assert.strictEqual(famOf(g, 'req-review').round, 1);
  assert.strictEqual(famOf(g, 'req-review').verdict, 'accept');
});

test('RL-07 a verdict summary with no transcript is not a round, and C5 blocks', () => {
  const { root, bundle } = project();
  doc(bundle, 'req-review-v1', `body\n${ACCEPT}\n`);
  const f = facts(bundle);
  assert.deepStrictEqual(f.families, []);
  assert.deepStrictEqual(f.missingRaw, ['req-review-v1']);
  assert.strictEqual(gate.runGate({ cwd: root, change: 'c', testCmd: TAP_OK })
    .checks.find((x) => x.id === 'C5').status, 'blocked');
});

test('RL-08 a repeated IDENTICAL verdict is an advisory, never a block', () => {
  // 23 documents in this repo's own archive have their body pasted twice. The verdict is the
  // same verdict; refusing them was format pedantry, not evidence integrity.
  const { root, bundle } = project();
  doc(bundle, 'spec-review-v1', `body\n${REVISE}\nmore\n${REVISE}\n`);
  raw(bundle, 'spec-review-v1');
  const f = facts(bundle);
  assert.deepStrictEqual(f.problems, [], 'identical repeats do not block');
  assert.deepStrictEqual(advKinds(f), ['repeated-verdict']);
  assert.strictEqual(famOf(f, 'spec-review').round, 1, 'and it is still one round');
  assert.strictEqual(famOf(f, 'spec-review').verdict, 'revise');
  assert.strictEqual(c8(root).status, 'pass');
});

test('RL-09 verdicts that actually disagree DO block', () => {
  for (const [a, b, why] of [
    [REVISE, ACCEPT, 'different class'],
    ['VERDICT: 3 issues open', 'VERDICT: 4 issues open', 'different count'],
    ['VERDICT: 2 issues open', 'VERDICT: 2 issues found', 'same count, and that is agreement'],
  ]) {
    const { root, bundle } = project();
    doc(bundle, 'spec-review-v1', `body\n${a}\nmore\n${b}\n`);
    raw(bundle, 'spec-review-v1');
    const f = facts(bundle);
    if (why.startsWith('same count')) {
      assert.deepStrictEqual(f.problems, [], why);          // 2 open === 2 found
      assert.strictEqual(famOf(f, 'spec-review').issuesOpen, 2);
      continue;
    }
    assert.deepStrictEqual(kinds(f), ['conflicting-verdict'], why);
    assert.deepStrictEqual(f.families, [], 'a contradicted document is not a round');
    assert.strictEqual(c8(root).status, 'blocked', why);
  }
});

test('RL-10 an unreadable verdict blocks, and asks for the summary to be normalized', () => {
  const { root, bundle } = project();
  landRound(bundle, 'req-review-v1', 'VERDICT: looks good to me');
  const f = facts(bundle);
  assert.deepStrictEqual(kinds(f), ['unclassified']);
  assert.deepStrictEqual(f.families, []);
  const c = c8(root);
  assert.strictEqual(c.status, 'blocked');
  assert.match(c.detail, /req-review-v1/);
  assert.match(c.detail, /normali[sz]e/i);
  assert.doesNotMatch(c.detail, /re-?run the review/i);
});

test('RL-11 no reframe can wave an unreadable or conflicting verdict through', () => {
  const { root, bundle } = project(
    '  - 2026-08-23T10:00 gate⑤ (owner): reframe req-review round 1 redo — try to wave it through\n'
    + '  - 2026-08-23T10:01 gate⑤ (owner): reframe req-review round 5 accept-risk — and again\n');
  landRound(bundle, 'req-review-v1', 'VERDICT: looks good to me');
  assert.strictEqual(c8(root).status, 'blocked');
});

// ---- what a raw transcript is, and is not ---------------------------------

test('RL-12 a transcript that was never a review round is an advisory, not a block', () => {
  // `kb-check-raw.txt` sits in three of this repo's archived bundles with no `kb-check.md`.
  // It is not a review round and never claimed to be — the round rules have no business
  // refusing an archive over it.
  const { root, bundle } = project();
  landRound(bundle, 'req-review-v1', ACCEPT);
  raw(bundle, 'kb-check');
  const f = facts(bundle);
  assert.deepStrictEqual(f.problems, []);
  assert.deepStrictEqual(advKinds(f), ['unrelated-raw']);
  assert.strictEqual(famOf(f, 'req-review').round, 1);
  assert.strictEqual(c8(root).status, 'pass');
});

test('RL-13 a summary whose verdict was deleted still blocks — the transcript proves the round', () => {
  const { root, bundle } = project();
  landFamily(bundle, 'spec-review', [REVISE, REVISE]);
  assert.strictEqual(famOf(facts(bundle), 'spec-review').round, 2);

  doc(bundle, 'spec-review-v2', '# review\n\nfindings only, verdict removed\n');
  const f = facts(bundle);
  assert.ok(kinds(f).includes('verdict-deleted'), `got ${kinds(f)}`);
  const c = c8(root);
  assert.strictEqual(c.status, 'blocked', 'deleting a verdict never turns C8 green');
  assert.match(c.detail, /spec-review-v2/);
});

test('RL-14 a transcript named as a formal round with no summary at all blocks', () => {
  const { root, bundle } = project();
  landFamily(bundle, 'spec-review', [REVISE, REVISE]);
  fs.rmSync(path.join(bundle, 'review', 'spec-review-v2.md'));
  const f = facts(bundle);
  assert.ok(kinds(f).includes('orphan-round-raw'), `got ${kinds(f)}`);
  assert.strictEqual(c8(root).status, 'blocked');
});

// ---- ordinals -------------------------------------------------------------

test('RL-15 a family\'s explicit ordinals must be contiguous from 1', () => {
  for (const [ordinals, ok] of [[[1], true], [[1, 2], true], [[1, 2, 3], true],
    [[2], false], [[1, 3], false], [[2, 5], false], [[1, 2, 4], false]]) {
    const { root, bundle } = project();
    for (const n of ordinals) landRound(bundle, `spec-review-v${n}`, REVISE);
    const f = facts(bundle);
    if (ok) {
      assert.deepStrictEqual(f.problems, [], `ordinals ${ordinals} should be clean`);
      assert.strictEqual(famOf(f, 'spec-review').round, ordinals.length);
    } else {
      assert.ok(kinds(f).includes('ordinal-gap'), `ordinals ${ordinals} must block, got ${kinds(f)}`);
      assert.strictEqual(c8(root).status, 'blocked', `ordinals ${ordinals}`);
    }
  }
});

test('RL-16 a deleted middle round cannot lower the round number', () => {
  const { root, bundle } = project();
  landFamily(bundle, 'spec-review', [REVISE, REVISE]);      // stalled at its own round 2
  assert.strictEqual(c8(root).status, 'blocked');
  // remove round 1 entirely — summary and transcript — hoping to land back at "round 1"
  fs.rmSync(path.join(bundle, 'review', 'spec-review-v1.md'));
  fs.rmSync(path.join(bundle, 'review', 'spec-review-v1-raw.txt'));
  const f = facts(bundle);
  assert.ok(kinds(f).includes('ordinal-gap'), `got ${kinds(f)}`);
  assert.strictEqual(c8(root).status, 'blocked', 'deleting round 1 does not un-stall round 2');
});

test('RL-17 two documents claiming the same family and round are refused deterministically', () => {
  const seen = new Set();
  for (let i = 0; i < 6; i++) {                          // readdir order must not decide
    const { bundle } = project();
    landRound(bundle, 'req-review', ACCEPT);             // -> req-review, ordinal 1
    landRound(bundle, 'req-review-v1', ACCEPT);          // -> req-review, ordinal 1 as well
    const f = facts(bundle);
    assert.deepStrictEqual(kinds(f), ['duplicate-ordinal']);
    assert.deepStrictEqual(f.families, [], 'neither claimant is counted');
    seen.add(f.problems[0].detail);
  }
  assert.strictEqual(seen.size, 1, 'the diagnosis is byte-identical across runs');
});

// ===========================================================================
// PHASE 3 — the loop, per family
// ===========================================================================

test('RL-18 within a family the highest ordinal is the family verdict', () => {
  const { bundle } = project();
  landFamily(bundle, 'req-review', [REVISE, ACCEPT]);
  const f = famOf(facts(bundle), 'req-review');
  assert.strictEqual(f.round, 2);
  assert.strictEqual(f.verdict, 'accept');
});

test('RL-19 three families each keep their own round; nothing is summed', () => {
  const { root, bundle } = project();
  landFamily(bundle, 'req-review', [REVISE, ACCEPT]);
  landFamily(bundle, 'spec-review', [REVISE, ACCEPT]);
  landFamily(bundle, 'step5-review', [ACCEPT]);
  const l = loopOf(bundle);
  assert.deepStrictEqual(l.families.map((f) => [f.family, f.round, f.verdict]),
    [['req-review', 2, 'accept'], ['spec-review', 2, 'accept'], ['step5-review', 1, 'accept']]);
  assert.strictEqual(l.escalation, null, '2 + 2 + 1 is not "round 5"');
  assert.strictEqual(l.status, 'pass', l.detail);
  assert.strictEqual(c8(root).status, 'pass');
});

test('RL-20 one family stalling never stops another family', () => {
  const { root, bundle } = project();
  landFamily(bundle, 'spec-review', [REVISE, REVISE]);
  landFamily(bundle, 'step5-review', [ACCEPT]);
  const l = loopOf(bundle);
  assert.strictEqual(famOf(l, 'spec-review').stopped, true);
  assert.strictEqual(famOf(l, 'step5-review').stopped, false);
  const c = c8(root);
  assert.strictEqual(c.status, 'blocked');
  assert.match(c.detail, /spec-review/);
  assert.doesNotMatch(c.detail, /step5-review round 1[^;]*stops/);
});

test('RL-21 the reframe names the family it answers', () => {
  const { root, bundle } = project(
    '  - 2026-08-23T10:00 gate⑤ (owner): reframe spec-review round 2 split — this is two changes\n');
  landFamily(bundle, 'spec-review', [REVISE, REVISE]);
  landFamily(bundle, 'req-review', [REVISE, REVISE]);
  const c = c8(root);
  assert.strictEqual(c.status, 'blocked', 'req-review is still unanswered');
  assert.match(c.detail, /req-review round 2/);
  assert.doesNotMatch(c.detail, /reframe spec-review round 2 <split/);

  fs.appendFileSync(path.join(bundle, 'flow-state.md'),
    '  - 2026-08-23T11:00 gate⑤ (owner): reframe req-review round 2 tests — add the missing coverage\n');
  assert.strictEqual(c8(root).status, 'pass');
});

test('RL-22 round 1 at REVISE is normal and never stops the loop', () => {
  const { root, bundle } = project();
  landFamily(bundle, 'req-review', [REVISE]);
  assert.strictEqual(famOf(loopOf(bundle), 'req-review').stopped, false);
  assert.strictEqual(c8(root).status, 'pass');
});

test('RL-23 a reframe that does not answer THIS family and round releases nothing', () => {
  for (const entry of [
    'reframe req-review round 2 split — wrong family',
    'reframe spec-review round 1 split — wrong round',
    'reframe spec-review round 2 continue — not a legal decision',
    'reframe spec-review round 2 accept-risk — accept-risk is the round-5 exit',
    'reframe spec-review round 2 redo —',
    'reframe spec-review round 2 redo',
    'reframe round 2 split — the old family-less grammar',
  ]) {
    const { root, bundle } = project(`  - 2026-08-23T10:00 gate⑤ (owner): ${entry}\n`);
    landFamily(bundle, 'spec-review', [REVISE, REVISE]);
    assert.strictEqual(c8(root).status, 'blocked', entry);
  }
});

test('RL-24 split, tests and redo are equal exits at round 2', () => {
  for (const d of ['split', 'tests', 'redo']) {
    const { root, bundle } = project(`  - 2026-08-23T10:00 gate⑤ (owner): reframe spec-review round 2 ${d} — reason\n`);
    landFamily(bundle, 'spec-review', [REVISE, REVISE]);
    assert.strictEqual(c8(root).status, 'pass', d);
  }
});

test('RL-25 a family reaching its own round 5 escalates, whatever the verdict', () => {
  const { root, bundle } = project();
  landFamily(bundle, 'spec-review', [REVISE, REVISE, REVISE, REVISE, ACCEPT]);
  const l = loopOf(bundle);
  assert.strictEqual(famOf(l, 'spec-review').round, 5);
  assert.ok(Array.isArray(l.escalation) && l.escalation.length === 1);
  assert.strictEqual(l.escalation[0].family, 'spec-review');
  assert.strictEqual(l.escalation[0].acknowledged, false);
  const c = c8(root);
  assert.strictEqual(c.status, 'blocked');
  assert.match(c.detail, /ESCALATION/);
});

test('RL-26 the owner decision is acknowledged per family and per round', () => {
  const { root, bundle } = project(
    '  - 2026-08-23T11:00 gate⑤ (owner): reframe spec-review round 5 accept-risk — owner accepts\n');
  landFamily(bundle, 'spec-review', [REVISE, REVISE, REVISE, REVISE, REVISE]);
  const l = loopOf(bundle);
  assert.strictEqual(l.escalation[0].acknowledged, true);
  const c = c8(root);
  assert.strictEqual(c.status, 'pass', c.detail);
  assert.match(c.detail, /ESCALATION/, 'the report is not skippable');

  landRound(bundle, 'spec-review-v6', REVISE);
  const c2 = c8(root);
  assert.strictEqual(c2.status, 'blocked');
  assert.match(c2.detail, /round 6/);
});

test('RL-27 a malformed document never erases an escalation that already exists', () => {
  const { root, bundle } = project();
  landFamily(bundle, 'spec-review', [REVISE, REVISE, REVISE, REVISE, REVISE]);
  landRound(bundle, 'req-review-v1', 'VERDICT: totally fine');
  const l = loopOf(bundle);
  assert.ok(Array.isArray(l.escalation) && l.escalation.length === 1);
  assert.strictEqual(l.escalation[0].family, 'spec-review');
  assert.ok(l.problems.length);

  const j = status.toJson(status.changeStatus(root, 'c', bundle, 'in-flight'));
  assert.ok(j.escalation, 'status --json must not null the escalation out');
  assert.strictEqual(j.escalation[0].family, 'spec-review');
  assert.match(c8(root).detail, /ESCALATION/);
});

test('RL-28 formatting, headings and ledger tidying never move a round', () => {
  const { bundle } = project();
  landFamily(bundle, 'req-review', [REVISE]);
  assert.strictEqual(famOf(facts(bundle), 'req-review').round, 1);

  fs.writeFileSync(path.join(bundle, 'review', 'issues.md'),
    '| ID | Issue | Risk | Round found | Status |\n|---|---|---|---|---|\n'
    + '| Q-1 | a | low | 1 | verified |\n| Q-2 | tidy the table | low | 1 | advisory-acked |\n');
  doc(bundle, 'req-review-v1', '# Review — round one (retitled)\n\n## Findings\n\nreworded\n\n' + REVISE + '\n');
  const flow = path.join(bundle, 'flow-state.md');
  fs.writeFileSync(flow, fs.readFileSync(flow, 'utf8') + '  - 2026-08-23T12:00 note: tidied the ledger\n');

  const f = famOf(facts(bundle), 'req-review');
  assert.strictEqual(f.round, 1);
  assert.strictEqual(f.verdict, 'revise');
});

// ===========================================================================
// Trust boundary and surfaces
// ===========================================================================

test('RL-29 a defective review root produces no round and no escalation, in gate AND status',
  { skip: canSymlink() ? false : 'platform refuses symlinks' }, () => {
  const { root, bundle } = project();
  landFamily(bundle, 'spec-review', [REVISE, REVISE, REVISE, REVISE, REVISE]);
  const outside = fs.mkdtempSync(path.join(os.tmpdir(), 'apriori-outside-'));
  fs.cpSync(path.join(bundle, 'review'), outside, { recursive: true });
  fs.rmSync(path.join(bundle, 'review'), { recursive: true });
  fs.symlinkSync(outside, path.join(bundle, 'review'));

  const r = gate.runGate({ cwd: root, change: 'c', testCmd: TAP_OK });
  assert.strictEqual(r.checks.find((x) => x.id === 'C4').status, 'blocked');
  assert.strictEqual(r.checks.find((x) => x.id === 'C5').status, 'blocked');
  assert.strictEqual(r.checks.find((x) => x.id === 'C8').status, 'n/a');

  const j = status.toJson(status.changeStatus(root, 'c', bundle, 'in-flight'));
  assert.ok(j.review && j.review.defect, 'status names the defect instead of reporting rounds');
  assert.deepStrictEqual(j.review.families, []);
  assert.strictEqual(j.escalation, null);
});

test('RL-30 an unreadable review root leaves C8 without an opinion, not a second block',
  { skip: canSymlink() ? false : 'platform refuses symlinks' }, () => {
  const { root, bundle } = project();
  landRound(bundle, 'req-review-v1', ACCEPT);
  fs.rmSync(path.join(bundle, 'review'), { recursive: true });
  fs.symlinkSync(path.join(root, 'no-such-target'), path.join(bundle, 'review'));
  const r = gate.runGate({ cwd: root, change: 'c', testCmd: TAP_OK });
  assert.strictEqual(r.checks.find((x) => x.id === 'C8').status, 'n/a');
  assert.strictEqual(r.blocked, 2);
});

test('RL-31 status shows every family, its verdict, its open count, advisories and escalation', () => {
  const { root, bundle } = project();
  landFamily(bundle, 'spec-review', [REVISE, REVISE, REVISE, REVISE, REVISE]);
  landFamily(bundle, 'step5-review', [ACCEPT]);
  raw(bundle, 'kb-check');

  const s = status.changeStatus(root, 'c', bundle, 'in-flight');
  const j = status.toJson(s);
  assert.deepStrictEqual(j.review.families.map((f) => [f.family, f.round, f.verdict]),
    [['spec-review', 5, 'revise'], ['step5-review', 1, 'accept']]);
  assert.strictEqual(j.review.families[0].issuesOpen, 3);
  assert.deepStrictEqual(j.review.problems, []);
  assert.strictEqual(j.review.advisories.length, 1);
  assert.strictEqual(j.escalation[0].round, 5);
  assert.strictEqual(j.review.round, undefined, 'there is no global round to report');

  const text = status.formatOne(s);
  assert.match(text, /spec-review round 5/);
  assert.match(text, /step5-review round 1/);
  assert.match(text, /ESCALATION/);

  const cli = run(['status', '--change', 'c', '--json'], root);
  assert.strictEqual(cli.status, 0, cli.stderr);
  assert.strictEqual(JSON.parse(cli.stdout).escalation[0].family, 'spec-review');
});

test('RL-32 a change with no review yet draws no conclusion', () => {
  const { root, bundle } = project();
  const l = loopOf(bundle);
  assert.deepStrictEqual(l.families, []);
  assert.strictEqual(l.escalation, null);
  assert.strictEqual(l.status, 'n/a');
  assert.strictEqual(c8(root).status, 'n/a');
  const j = status.toJson(status.changeStatus(root, 'c', bundle, 'in-flight'));
  assert.deepStrictEqual(j.review.families, []);
  assert.strictEqual(j.escalation, null);
});

test('RL-33 gate prints C8 and exits 1 on a stopped loop', () => {
  const { root, bundle } = project();
  landFamily(bundle, 'spec-review', [REVISE, REVISE]);
  const r = run(['gate', '--change', 'c', '--test-cmd', TAP_OK], root);
  assert.strictEqual(r.status, 1, r.stderr);
  assert.match(r.stdout, /✗ C8 BLOCKED/);
  const j = JSON.parse(run(['gate', '--change', 'c', '--test-cmd', TAP_OK, '--json'], root).stdout);
  assert.strictEqual(j.checks.find((x) => x.id === 'C8').status, 'blocked');
});

// ===========================================================================
// archive — the same loop, through readiness R4
// ===========================================================================

function archiveProject(gates, verdicts, extra) {
  const { root, bundle } = project(gates, 'STEP6');
  for (const [family, list] of Object.entries(verdicts)) landFamily(bundle, family, list);
  if (extra) extra(bundle);
  return { root, bundle };
}
const storeOf = (root) => fs.readFileSync(path.join(root, 'apriori/specs/kv/spec.md'), 'utf8');
const NOTE = '  - 2026-08-23T00:00 note: n\n';

test('RL-34 a blocked loop refuses archive --write: nothing merged, nothing moved', () => {
  const { root } = archiveProject(NOTE, { 'spec-review': [REVISE, REVISE] });
  const before = storeOf(root);
  const r = run(['archive', '--change', 'c', '--write', '--changes-dir', 'apriori/changes'], root);
  assert.strictEqual(r.status, 1, r.stdout + r.stderr);
  assert.match(r.stdout, /RESULT: NOT READY/);
  assert.match(r.stderr, /R4/);
  assert.strictEqual(storeOf(root), before, 'the store was not rewritten');
  assert.ok(fs.existsSync(path.join(root, 'apriori/changes/c')), 'the change was not moved');
  const arch = path.join(root, 'apriori/changes/archive');
  assert.deepStrictEqual(fs.existsSync(arch) ? fs.readdirSync(arch) : [], []);
});

test('RL-35 readinessOf reports R4 through the same loop, not a second parser', () => {
  const { bundle } = archiveProject(NOTE, { 'spec-review': [REVISE, REVISE] });
  const rdy = rd.readinessOf({ bundleDir: bundle, name: 'c' });
  assert.strictEqual(rdy.ready, false);
  const r4 = rdy.blockers.filter((b) => b.rule === 'R4');
  assert.strictEqual(r4.length, 1);
  assert.strictEqual(r4[0].forceable, false, 'a stalled round-2 loop is never forceable');
  assert.match(r4[0].detail, /spec-review/);
  const src = fs.readFileSync(path.join(__dirname, '..', 'lib', 'readiness.js'), 'utf8');
  const body = src.slice(src.indexOf('function readinessOf'), src.indexOf('module.exports'));
  assert.match(body, /reviewFacts\(/, 'R4 must consume the shared scan');
  assert.doesNotMatch(body, /VERDICT/, 'no second verdict parser inside readiness');
});

test('RL-36 archive advisories never block', () => {
  const { root } = archiveProject(NOTE, { 'req-review': [REVISE, ACCEPT] },
    (bundle) => { raw(bundle, 'kb-check'); doc(bundle, 'spec-review-v1', `x\n${ACCEPT}\ny\n${ACCEPT}\n`); raw(bundle, 'spec-review-v1'); });
  const r = run(['archive', '--change', 'c', '--write', '--changes-dir', 'apriori/changes'], root);
  assert.strictEqual(r.status, 0, r.stdout + r.stderr);
  assert.match(r.stdout, /RESULT: MERGED/);
});

test('RL-37 a round-2 stall cannot be forced through archive', () => {
  const { root } = archiveProject(
    NOTE + '  - 2026-08-23T10:00 gate⑤ (owner): archive-force ledger — try everything\n',
    { 'spec-review': [REVISE, REVISE] });
  const before = storeOf(root);
  const r = run(['archive', '--change', 'c', '--write', '--force', '--changes-dir', 'apriori/changes'], root);
  assert.strictEqual(r.status, 1, r.stdout + r.stderr);
  assert.match(r.stdout, /RESULT: NOT READY/);
  assert.strictEqual(storeOf(root), before);
});

test('RL-38 round 5 needs BOTH the recorded human decision and --force', () => {
  const five = { 'spec-review': [REVISE, REVISE, REVISE, REVISE, REVISE] };
  const ACK = '  - 2026-08-23T11:00 gate⑤ (owner): reframe spec-review round 5 accept-risk — owner accepts\n';
  {
    const { root } = archiveProject(NOTE + ACK, five);
    const r = run(['archive', '--change', 'c', '--write', '--changes-dir', 'apriori/changes'], root);
    assert.strictEqual(r.status, 1, 'a gates: line is not the second authorization');
    assert.ok(fs.existsSync(path.join(root, 'apriori/changes/c')));
  }
  {
    const { root } = archiveProject(NOTE, five);
    const r = run(['archive', '--change', 'c', '--write', '--force', '--changes-dir', 'apriori/changes'], root);
    assert.strictEqual(r.status, 1, '--force without the record is not authorization');
    assert.match(r.stderr, /reframe spec-review round 5/);
  }
  {
    const { root } = archiveProject(NOTE + ACK, five);
    const r = run(['archive', '--change', 'c', '--write', '--force', '--changes-dir', 'apriori/changes'], root);
    assert.strictEqual(r.status, 0, r.stdout + r.stderr);
    assert.match(r.stdout, /forced: R4/);
    assert.match(r.stdout, /accept-risk/);
    assert.ok(!fs.existsSync(path.join(root, 'apriori/changes/c')), 'the change moved');
  }
});

test('RL-39 a converged bundle still archives — R4 adds no new tax', () => {
  const { root } = archiveProject(NOTE,
    { 'req-review': [REVISE, ACCEPT], 'spec-review': [ACCEPT], 'step5-review': [ACCEPT] });
  const r = run(['archive', '--change', 'c', '--write', '--changes-dir', 'apriori/changes'], root);
  assert.strictEqual(r.status, 0, r.stdout + r.stderr);
  assert.match(r.stdout, /RESULT: MERGED/);
});

// ===========================================================================
// The real corpus — the rules have to survive contact with what reviewers wrote
// ===========================================================================

test('RL-40 this repository\'s own review corpus produces zero evidence PROBLEMS', () => {
  const root = path.join(__dirname, '..');
  const bundles = [];
  for (const base of ['apriori/changes', 'apriori/changes/archive']) {
    const d = path.join(root, base);
    if (!fs.existsSync(d)) continue;
    for (const name of fs.readdirSync(d)) {
      if (name === 'archive') continue;
      const b = path.join(d, name);
      if (fs.statSync(b).isDirectory() && fs.existsSync(path.join(b, 'review'))) bundles.push(b);
    }
  }
  assert.ok(bundles.length >= 20, `expected the real corpus, found ${bundles.length} bundles`);
  const problems = [];
  let advisories = 0, rounds = 0;
  for (const b of bundles) {
    const f = review.reviewFacts(b);
    advisories += f.advisories.length;
    rounds += f.families.reduce((a, x) => a + x.round, 0);
    for (const p of f.problems) problems.push(`${path.basename(b)}: ${p.kind} — ${p.detail.slice(0, 90)}`);
    for (const m of f.missingRaw) problems.push(`${path.basename(b)}: missing-raw — ${m}`);
  }
  assert.deepStrictEqual(problems, [], 'legal historical evidence must not be refused');
  assert.ok(rounds > 100, `the corpus should derive real rounds, got ${rounds}`);
  assert.ok(advisories > 0, 'and it should still surface its advisories');
});

test('RL-41 a corpus bundle with real damage still blocks', () => {
  // same rules, on a copy of a real bundle: break it three ways and each one must be caught
  const root = path.join(__dirname, '..');
  const src = fs.readdirSync(path.join(root, 'apriori/changes/archive'))
    .map((n) => path.join(root, 'apriori/changes/archive', n))
    .find((b) => {
      if (!fs.existsSync(path.join(b, 'review'))) return false;
      const f = review.reviewFacts(b);
      const fam = f.families.find((x) => x.round >= 2 && x.rounds.every((r) => /-v[1-9]/.test(r.stem)));
      return !!fam;
    });
  assert.ok(src, 'the corpus should contain a multi-round family');
  const fam = review.reviewFacts(src).families.find((x) => x.round >= 2 && x.rounds.every((r) => /-v[1-9]/.test(r.stem)));

  const copyTo = () => {
    const t = fs.mkdtempSync(path.join(os.tmpdir(), 'apriori-corpus-'));
    fs.cpSync(src, t, { recursive: true });
    return t;
  };
  const first = fam.rounds[0].stem;

  // 1. the first round's summary loses its verdict
  {
    const t = copyTo();
    const p = path.join(t, 'review', `${first}.md`);
    fs.writeFileSync(p, fs.readFileSync(p, 'utf8').replace(/^VERDICT:.*$/m, 'no verdict here'));
    assert.ok(review.reviewFacts(t).problems.some((x) => x.kind === 'verdict-deleted'));
  }
  // 2. the first round disappears entirely -> the ordinals no longer start at 1
  {
    const t = copyTo();
    fs.rmSync(path.join(t, 'review', `${first}.md`));
    for (const n of fs.readdirSync(path.join(t, 'review')))
      if (n.startsWith(`${first}-raw`)) fs.rmSync(path.join(t, 'review', n));
    assert.ok(review.reviewFacts(t).problems.some((x) => x.kind === 'ordinal-gap'));
  }
  // 3. a second, contradicting verdict is appended
  {
    const t = copyTo();
    const p = path.join(t, 'review', `${first}.md`);
    fs.appendFileSync(p, '\nVERDICT: 99 issues open\n');
    assert.ok(review.reviewFacts(t).problems.some((x) => x.kind === 'conflicting-verdict'));
  }
});

// ===========================================================================
// The surface the humans read
// ===========================================================================

const readRoot = (rel) => fs.readFileSync(path.join(__dirname, '..', rel), 'utf8');
const LIVE_DOCS = ['templates/process-config.md', 'RUNBOOK.md', 'RUNBOOK_cn.md',
  'docs/concepts.md', 'docs/concepts_cn.md', 'docs/cli.md', 'docs/cli_cn.md'];

test('RL-42 the docs state the two phases, the cure line and the boundary', () => {
  for (const rel of LIVE_DOCS) {
    assert.doesNotMatch(readRoot(rel), /step0-cap/, `${rel} still carries step0-cap`);
    assert.doesNotMatch(readRoot(rel), /step2-cap/, `${rel} still carries step2-cap`);
  }
  const EN = readRoot('RUNBOOK.md'), CN = readRoot('RUNBOOK_cn.md');
  for (const d of [EN, CN]) {
    assert.match(d, /apriori gate/);
    assert.match(d, /reframe <family> round <n> <split\|tests\|redo>/);
    assert.match(d, /C8/);
    assert.match(d, /R4/);
  }
  assert.match(EN, /derived from the review evidence/i);
  assert.match(EN, /never written by hand/i);
  assert.match(EN, /per family/i);
  assert.match(EN, /this repository ships no Stop hook/);
  assert.match(CN, /由评审证据派生/);
  assert.match(CN, /不手写/);
  assert.match(CN, /逐 family/);
  assert.match(CN, /本仓库不附带任何 Stop hook/);
  for (const d of [EN, CN, readRoot('CHANGELOG.md'), readRoot('docs/cli.md'), readRoot('docs/cli_cn.md')]) {
    assert.doesNotMatch(d, /new issues per round/i);
    assert.doesNotMatch(d, /每轮新增问题/);
  }
  for (const rel of ['docs/cli.md', 'docs/cli_cn.md']) {
    const t = readRoot(rel);
    for (const token of ['C8', 'escalation', 'families', 'R4', 'advisor'])
      assert.match(t, new RegExp(token, 'i'), `${rel} does not document ${token}`);
  }
});

// ===========================================================================
// A frozen archive is history, not a change in flight
// ===========================================================================
// The stop and escalation rules exist to change what a producer does NEXT. An archived bundle
// has no next: it is a frozen snapshot of what already happened, and refusing it retroactively
// only punishes history for being written before the rule existed. Evidence integrity is a
// different claim — a bundle whose evidence does not add up is misreporting its own past, and
// that stays blocking at every stage.

const ARCH = '2026-07-10T1200-c';
function archivedFixture(verdicts, extra) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'apriori-rl-arch-'));
  const base = `apriori/changes/archive/${ARCH}`;
  const w = (rel, body) => {
    const p = path.join(root, rel);
    fs.mkdirSync(path.dirname(p), { recursive: true });
    fs.writeFileSync(p, body);
  };
  // the store already carries the merged delta — an archived change verifies against it
  w('apriori/specs/kv/spec.md', STORE + '\n### Requirement: Beta\n\n#### Scenario: XB-01 new\n- t\n');
  w(`${base}/flow-state.md`,
    'change: c\nmode: standard\nlineage: v6\ncurrent-step: DONE\nnext-action: none\n'
    + 'gates:\n  - 2026-07-10T00:00 note: archived\n');
  w(`${base}/tasks.md`, '- [x] T1 done\n');
  w(`${base}/specs/kv/spec.md`, DELTA);
  w(`${base}/review/issues.md`, LEDGER_OK);
  const bundle = path.join(root, base);
  for (const [family, list] of Object.entries(verdicts)) landFamily(bundle, family, list);
  if (extra) extra(bundle);
  return { root, bundle };
}
const FIVE = { 'spec-review': [REVISE, REVISE, REVISE, REVISE, REVISE] };

test('RL-43 a frozen archive is not stopped or escalated retroactively', () => {
  const { root } = archivedFixture(FIVE);
  const r = gate.runGate({ cwd: root, change: 'c', testCmd: TAP_OK });
  assert.strictEqual(r.stage, 'archived');
  const c = r.checks.find((x) => x.id === 'C8');
  assert.notStrictEqual(c.status, 'blocked', `C8 must not block a frozen archive: ${c.detail}`);
  assert.strictEqual(r.blocked, 0, `nothing else may block either: ${JSON.stringify(r.checks)}`);
  assert.strictEqual(r.code, 0, JSON.stringify(r.checks));
  // the history is still reported, not hidden
  assert.match(c.detail, /spec-review round 5/);
  assert.match(c.detail, /ESCALATION/);
});

test('RL-44 the same archive with an evidence problem still blocks', () => {
  // one file changed against RL-43's fixture: round 3's verdict line is gone, its transcript stays
  const { root, bundle } = archivedFixture(FIVE,
    (b) => doc(b, 'spec-review-v3', '# review\n\nfindings only, verdict removed\n'));
  const r = gate.runGate({ cwd: root, change: 'c', testCmd: TAP_OK });
  assert.strictEqual(r.stage, 'archived');
  const c = r.checks.find((x) => x.id === 'C8');
  assert.strictEqual(c.status, 'blocked', 'evidence integrity has no stage exemption');
  assert.match(c.detail, /spec-review-v3/);
  assert.strictEqual(r.code, 1);
});

test('RL-45 the same round-5 fixture in flight still blocks', () => {
  const { root } = project();
  landFamily(path.join(root, 'apriori/changes/c'), 'spec-review', FIVE['spec-review']);
  const r = gate.runGate({ cwd: root, change: 'c', testCmd: TAP_OK });
  assert.strictEqual(r.stage, 'in-flight');
  const c = r.checks.find((x) => x.id === 'C8');
  assert.strictEqual(c.status, 'blocked', 'an in-flight change still owes the owner an answer');
  assert.match(c.detail, /ESCALATION/);
  assert.strictEqual(r.code, 1);
});
