'use strict';
// FF-01..FF-15 — slice 3: the fast lane gets a floor.
//
// 6.0's blueprint §3 defines `fast` as "reproducible defect + local fix + none of §6's risk
// signals hit", and its flow as "reproduce → fix → regression → ONE independent review".
// §7 makes a MISSING independent review a blocking condition. Reality-checking 705eadb found
// the opposite: a `mode: fast` bundle with an EMPTY review/ reached `GATE: PASS` (exit 0),
// because C5's empty set is vacuously true — "0 review doc(s), every verdict has raw
// evidence" — and C8 reports `n/a` when no family exists. `archive` merged it too.
//
// So fast could reduce material AND skip the review. These tests pin the two rules that
// close that:
//
//   1. A change DECLARED fast must carry at least one COMPLETE, ATTRIBUTABLE review round —
//      which is exactly what slice 2's scanner already counts as a family: a summary with a
//      classifiable VERDICT line plus its `-raw` transcript. No second counter is introduced.
//   2. The one §6 risk signal apriori can derive MECHANICALLY — the change's own delta
//      declaring a MUTATION of an already-published requirement (MODIFIED / REMOVED /
//      RENAMED) — closes the fast lane: the change is judged as standard, with a short
//      reason. It adds no new artifact kind; it only stops waiving standard's own.
//
// Frozen history is exempt from both: an archived bundle keeps its declared mode and is
// never told, years later, that it needed a round the rule did not exist to ask for.
// Evidence INTEGRITY still refuses at every stage — that claim is unchanged.

const { test } = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawnSync } = require('node:child_process');
const { canSymlink } = require('./helpers/can-symlink');

const BIN = path.join(__dirname, '..', 'bin', 'apriori.js');
const run = (args, cwd) => spawnSync('node', [BIN, ...args], { encoding: 'utf8', cwd });

const mk = () => fs.mkdtempSync(path.join(os.tmpdir(), 'apriori-ff-'));
const w = (p, s) => { fs.mkdirSync(path.dirname(p), { recursive: true }); fs.writeFileSync(p, s); return p; };

// Two published requirements, so a REMOVED delta still leaves the store with something to
// verify — an emptied store is `verify`'s own error and would hide the case under test.
const STORE = '### Requirement: Alpha\n\n#### Scenario: XA-01 base\n- t\n\n'
  + '### Requirement: Gamma\n\n#### Scenario: XG-01 second\n- t\n';
const ADDED = '## ADDED Requirements\n\n### Requirement: Beta\n\n#### Scenario: XB-01 new\n- t\n';
const MODIFIED = '## MODIFIED Requirements\n\n### Requirement: Alpha\n\n#### Scenario: XA-01 base\n- t\n- more\n';
const REMOVED = '## REMOVED Requirements\n\n### Requirement: Gamma\n\n#### Scenario: XG-01 second\n- t\n';
const RENAMED = '## RENAMED Requirements\n\n- Alpha -> Delta\n';
const LEDGER = '| ID | Issue | Risk | Round found | Status |\n|---|---|---|---|---|\n| Q-1 | i | low | 1 | verified |\n';
// the scenario IDs each delta leaves in the projected store — C1 must be GREEN for every case,
// or a fixture's red would masquerade as the rule under test
const BASE_IDS = ['XA-01', 'XG-01'];
const IDS = new Map([[ADDED, [...BASE_IDS, 'XB-01']], [MODIFIED, BASE_IDS], [REMOVED, ['XA-01']], [RENAMED, BASE_IDS]]);
const tapFor = (ids) => 'console.log("TAP version 13");console.log("1..' + ids.length + '");'
  + ids.map((id, i) => `console.log("ok ${i + 1} ${id} t");`).join('') + '\n';

// One complete, attributable review round: a summary carrying a classifiable verdict, and
// the raw transcript that makes it attributable.
function reviewRound(dir, family, n, verdict) {
  w(path.join(dir, 'review', `${family}-v${n}.md`), `# ${family} r${n}\n\nVERDICT: ${verdict}\n`);
  w(path.join(dir, 'review', `${family}-v${n}-raw.txt`), '<!-- provenance: provider=codex model=x session=y date=2026-08-23 -->\nraw transcript\n');
}

// What C9/R5 read. A FAST change with no machine risk owes only the producer's own diff — that
// is the whole fast lane: C1 plus a read diff. A STANDARD change owes one substantive row on top,
// so these fixtures fail on the review floor and the mode rules, never on the evidence predicate.
// A MUTATING delta is a §6 risk the CLI PROVES, so the state must answer it by name whatever the
// declared mode says — that is the one row no fixture can leave out and still be judged ready.
const EVIDENCE = (mode, delta) => '\n## Evidence\n- producer-diff: done — read the whole diff, known P0/P1 zero\n'
  + (mode === 'standard' ? '- data-schema: done — ran against the real schema\n' : '')
  + (delta && /^## (MODIFIED|REMOVED|RENAMED)/m.test(delta)
    ? '- contract-mutation: done — re-ran the published scenarios against the new store text\n' : '')
  + '\n';

// A gate-able project. `archived` places the bundle under changes/archive/<stamp>-<name>.
function project(opts = {}) {
  const { mode = 'fast', delta = ADDED, deltaPath = 'kv/spec.md', phase = 'build',
    tasks = null, ledger = null, review = null, archived = false, gates = '', evidence = null } = opts;
  const root = mk();
  const dir = archived
    ? path.join(root, 'apriori', 'changes', 'archive', '2026-01-01T0000-c')
    : path.join(root, 'apriori', 'changes', 'c');
  // the store lives where the delta points, so a nested delta has a real merge target
  w(path.join(root, 'apriori', 'specs', ...deltaPath.split('/')), STORE);
  fs.mkdirSync(path.join(root, 'apriori', 'changes', 'archive'), { recursive: true });
  if (delta !== null) w(path.join(dir, 'specs', ...deltaPath.split('/')), delta);
  // an archived bundle's deltas are already merged: C1 verifies the STORE, not a projection
  w(path.join(root, 'tap.js'), tapFor(archived || delta === null ? BASE_IDS : IDS.get(delta) || BASE_IDS));
  w(path.join(dir, 'flow-state.md'),
    `change: c\nmode: ${mode}\nlineage: fixture\nphase: ${phase}\n${evidence || EVIDENCE(mode, delta)}`
    + `gates:\n  - 2026-07-11T00:00 note: fixture\n${gates}`);
  if (tasks !== null) w(path.join(dir, 'tasks.md'), tasks);
  if (ledger !== null) w(path.join(dir, 'review', 'issues.md'), ledger);
  else fs.mkdirSync(path.join(dir, 'review'), { recursive: true });
  if (review) review(dir);
  return { root, dir };
}

// `--no-cas` throughout: a mutation delta is also an UNSTAMPED mutation delta, and C7's
// pre-existing refusal would mask the rule under test. CAS is covered by its own suite.
const gate = (root) => run(['gate', '--change', 'c', '--test-cmd', 'node tap.js', '--no-cas'], root);
const line = (stdout, id) => (stdout.split('\n').find((l) => l.includes(` ${id} `)) || '').trim();

// ---------------------------------------------------------------------------
// 1 — fast may not skip the independent review
// ---------------------------------------------------------------------------

test('FF-01 a fast change with no review evidence is refused, and C5 stops claiming a vacuous pass', () => {
  const { root } = project();
  const g = gate(root);
  assert.strictEqual(g.status, 1, `fast + zero review must BLOCK, got exit ${g.status}:\n${g.stdout}${g.stderr}`);
  const c8 = line(g.stdout, 'C8');
  assert.match(c8, /BLOCKED/, `C8 must refuse a fast change with no review round, got: ${c8}`);
  assert.match(c8, /independent review/i, `the refusal must name what is missing, got: ${c8}`);
  // C5 attested "every verdict has raw evidence" over an EMPTY set — a pass it had not earned
  const c5 = line(g.stdout, 'C5');
  assert.doesNotMatch(c5, /^✓/, `C5 must not pass on the empty set, got: ${c5}`);
  assert.doesNotMatch(g.stdout, /GATE: PASS/, 'a fast change with no review must never reach PASS');
});

test('FF-02 a fast change with one complete, attributable review round passes', () => {
  const { root } = project({ review: (d) => reviewRound(d, 'code-review', 1, 'no major issues') });
  const g = gate(root);
  assert.strictEqual(g.status, 0, `a reviewed fast change must PASS, got exit ${g.status}:\n${g.stdout}${g.stderr}`);
  assert.match(g.stdout, /GATE: PASS/);
  assert.match(line(g.stdout, 'C8'), /code-review round 1/);
  // and the round is counted by slice 2's scanner, not by a second counter
  assert.match(line(g.stdout, 'C5'), /^✓ C5 1 review doc/);
});

test('FF-03 a verdict without its raw transcript is not an independent review', () => {
  const { root } = project({
    review: (d) => w(path.join(d, 'review', 'code-review-v1.md'), 'VERDICT: no major issues\n'),
  });
  const g = gate(root);
  assert.strictEqual(g.status, 1, `an unattributable verdict must BLOCK, got exit ${g.status}:\n${g.stdout}`);
  assert.match(line(g.stdout, 'C5'), /BLOCKED/, 'C5 owns the missing-raw claim');
  // it must ALSO fail to satisfy the fast floor — a doc with no transcript is not a round
  assert.match(line(g.stdout, 'C8'), /BLOCKED/, 'a verdict with no transcript must not satisfy the fast floor');
});

test('FF-04 a verdict outside the vocabulary is not an independent review either', () => {
  const { root } = project({
    review: (d) => reviewRound(d, 'code-review', 1, 'looks fine to me, shipping it'),
  });
  const g = gate(root);
  assert.strictEqual(g.status, 1, `an unclassifiable verdict must BLOCK, got exit ${g.status}:\n${g.stdout}`);
  const c8 = line(g.stdout, 'C8');
  assert.match(c8, /BLOCKED/);
  assert.match(c8, /vocabulary/, `the evidence problem must still be named, got: ${c8}`);
  assert.match(c8, /independent review/i, `and the fast floor must still be unmet, got: ${c8}`);
});

test('FF-05 archive refuses a fast bundle that never had a review, and --force cannot buy one', () => {
  const forced = '  - 2026-07-11T00:01 owner: archive-force ledger — owner says ship it\n';
  const { root } = project({ phase: 'review', gates: forced });
  for (const args of [['archive', '--change', 'c'], ['archive', '--change', 'c', '--force']]) {
    const a = run(args, root);
    assert.strictEqual(a.status, 1, `${args.join(' ')} must refuse, got exit ${a.status}:\n${a.stdout}${a.stderr}`);
    assert.match(a.stdout, /RESULT: NOT READY/, a.stdout);
    assert.match(a.stderr, /R4 .*independent review/i, `R4 must name the missing review, got: ${a.stderr}`);
  }
});

test('FF-06 status names the missing round, in text and in JSON', () => {
  const { root } = project();
  const s = run(['status', '--change', 'c'], root);
  assert.strictEqual(s.status, 0, s.stderr);
  assert.match(s.stdout, /independent review/i, `status must say what is missing, got:\n${s.stdout}`);
  const j = JSON.parse(run(['status', '--change', 'c', '--json'], root).stdout);
  assert.ok(j.review, 'the review block must exist');
  assert.match(String(j.review.reviewFloor), /independent review/i,
    `the machine shape must carry the same claim, got: ${JSON.stringify(j.review)}`);
});

test('FF-07 what is fast\'s alone is the WAIVER, not the review', () => {
  // the floor itself belongs to both modes (FF-16); what fast still drops is material
  const { root } = project({ mode: 'fast',
    review: (d) => reviewRound(d, 'code-review', 1, 'no major issues') });
  const g = gate(root);
  assert.strictEqual(g.status, 0, g.stdout);
  assert.match(line(g.stdout, 'C2'), /^– C2 .*no tasks\.md/);
  assert.match(line(g.stdout, 'C4'), /^– C4 .*no ledger/);
});

// ---------------------------------------------------------------------------
// 1b — the review floor is the blueprint's, not the fast lane's (review REVISE 1/2/3)
// ---------------------------------------------------------------------------

test('FF-16 a standard change with no review evidence is refused too', () => {
  // §7 lists "the required independent review is missing" as blocking, and says nothing about
  // mode. Leaving standard exempt would mean editing one word of flow-state to buy the exemption
  // fast was just denied.
  const { root } = project({ mode: 'standard', tasks: '- [x] T1\n', ledger: LEDGER, phase: 'review' });
  const g = gate(root);
  assert.strictEqual(g.status, 1, `standard + zero review must BLOCK, got exit ${g.status}:\n${g.stdout}`);
  assert.match(line(g.stdout, 'C8'), /BLOCKED/);
  assert.match(line(g.stdout, 'C8'), /independent review/i);

  const a = run(['archive', '--change', 'c'], root);
  assert.strictEqual(a.status, 1, `archive must agree, got exit ${a.status}:\n${a.stdout}${a.stderr}`);
  assert.match(a.stdout, /RESULT: NOT READY/);
  assert.match(a.stderr, /R4 .*independent review/i, a.stderr);
});

for (const [label, verdict] of [['gaps found', 'gaps found'], ['a positive open count', '2 issues open']]) {
  test(`FF-17 a fast change whose latest review round says ${label} is not deliverable`, () => {
    const { root } = project({ phase: 'review', review: (d) => reviewRound(d, 'code-review', 1, verdict) });
    const g = gate(root);
    assert.strictEqual(g.status, 1, `an unresolved fast review must BLOCK, got exit ${g.status}:\n${g.stdout}`);
    const c8 = line(g.stdout, 'C8');
    assert.match(c8, /BLOCKED/);
    assert.match(c8, /not resolved/i, `the diagnosis must say the review did not close, got: ${c8}`);

    const a = run(['archive', '--change', 'c'], root);
    assert.strictEqual(a.status, 1, `archive must agree, got exit ${a.status}:\n${a.stdout}${a.stderr}`);
    assert.match(a.stderr, /R4 .*not resolved/i, a.stderr);
  });
}

test('FF-17b a later accepting round converges — the rule reads the LATEST round, not any round', () => {
  const { root } = project({ review: (d) => {
    reviewRound(d, 'code-review', 1, '2 issues open');
    reviewRound(d, 'code-review', 2, '0 issues open');
  } });
  const g = gate(root);
  assert.strictEqual(g.status, 0, `a resolved fast loop must pass, got exit ${g.status}:\n${g.stdout}`);
  assert.match(line(g.stdout, 'C8'), /code-review round 2/);
});

test('FF-18 standard\'s round-1 revise stops at the floor, not at the round-2 control point', () => {
  // The LOOP rule is untouched: round 1 is not the control point, so nothing "stops here". What
  // refuses is the floor — the reviewer's latest word is `revise`, and a full issue ledger cannot
  // stand in for it. This is the exemption an earlier 6.0 draft gave standard and this slice
  // withdrew: a file the producer edits may not outrank the reviewer's own verdict.
  const { root } = project({ mode: 'standard', tasks: '- [x] T1\n', ledger: LEDGER,
    review: (d) => reviewRound(d, 'spec-review', 1, 'gaps found') });
  const g = gate(root);
  assert.strictEqual(g.status, 1, g.stdout);
  const c8 = line(g.stdout, 'C8');
  assert.match(c8, /spec-review round 1 \(revise\)/);
  assert.match(c8, /the independent review has not resolved \(spec-review round 1, revise\)/);
  assert.match(c8, /no ledger state can stand in for it/);
  assert.doesNotMatch(c8, /this review loop stops here/, 'round 1 is not the round-2 control point');
  // a round-2 accept is what closes it — the loop rule itself did not move
  const ok = project({ mode: 'standard', tasks: '- [x] T1\n', ledger: LEDGER,
    review: (d) => { reviewRound(d, 'spec-review', 1, 'gaps found'); reviewRound(d, 'spec-review', 2, 'no major issues'); } });
  assert.strictEqual(gate(ok.root).status, 0, gate(ok.root).stdout);
});

// The round-5 stop-loss is the blueprint's ONE Owner exit (§6: "Owner 明确接受风险"), and it
// already costs a double authorization — the decision recorded in `gates:` AND an explicit
// `--force`. Slice 3's unresolved-review floor is not allowed to close it: a round-5 revise is
// exactly the state that exit exists for, so a fast change would otherwise lose the only way
// out that standard keeps. Measured against 705eadb: fast round-5 + accept-risk + --force
// merged there and stopped merging here, while standard kept merging.
const ACK5 = '  - 2026-07-11T00:02 owner: reframe code-review round 5 accept-risk — owner accepts the residual risk\n';
const REDO4 = '  - 2026-07-11T00:02 owner: reframe code-review round 4 redo — rework the approach\n';
const rounds = (n, verdict) => (d) => { for (let i = 1; i <= n; i++) reviewRound(d, 'code-review', i, verdict); };

test('FF-22 a fast round-5 escalation the owner answered still archives on --force', () => {
  const { root } = project({ phase: 'review', gates: ACK5, review: rounds(5, 'gaps found') });
  const c8 = line(gate(root).stdout, 'C8');
  assert.doesNotMatch(c8, /not resolved/,
    `the floor must hand round 5 back to the escalation branch, got: ${c8}`);
  assert.match(c8, /ESCALATION .*round 5/, `and the escalation must still be reported, got: ${c8}`);
  assert.match(c8, /accept-risk/, c8);

  const a = run(['archive', '--change', 'c', '--force'], root);
  assert.strictEqual(a.status, 0, `the owner exit must open, got exit ${a.status}:\n${a.stdout}${a.stderr}`);
  assert.match(a.stdout, /RESULT: MERGED/);
  assert.match(a.stdout, /forced: R4 .*round 5/, a.stdout);
});

test('FF-23 the exit stays narrow — anything short of both halves still refuses', () => {
  for (const [label, opts, extra] of [
    ['round 5, --force but no owner decision', { gates: '', review: rounds(5, 'gaps found') }, ['--force']],
    ['round 5, owner decision but no --force', { gates: ACK5, review: rounds(5, 'gaps found') }, []],
    ['round 4, reframed and still revising', { gates: REDO4, review: rounds(4, 'gaps found') }, ['--force']],
  ]) {
    const { root } = project({ phase: 'review', ...opts });
    const a = run(['archive', '--change', 'c', ...extra], root);
    assert.strictEqual(a.status, 1, `${label} must refuse, got exit ${a.status}:\n${a.stdout}${a.stderr}`);
    assert.match(a.stdout, /RESULT: NOT READY/, label);
  }
});

test('FF-24 standard\'s round-5 escalation behaves exactly as it did before slice 3', () => {
  const { root } = project({ mode: 'standard', phase: 'review', tasks: '- [x] T1\n', ledger: LEDGER,
    gates: ACK5, review: rounds(5, 'gaps found') });
  const a = run(['archive', '--change', 'c', '--force'], root);
  assert.strictEqual(a.status, 0, `standard must be untouched, got exit ${a.status}:\n${a.stdout}${a.stderr}`);
  assert.match(a.stdout, /RESULT: MERGED/);
  assert.strictEqual(run(['archive', '--change', 'c'], root).status, 1, 'and still needs --force');
});

test('FF-19 archive is not blind to evidence gate refuses: a symlinked summary', { skip: !canSymlink() }, () => {
  const forced = '  - 2026-07-11T00:01 owner: archive-force ledger — owner says ship it\n';
  for (const mode of ['fast', 'standard']) {
    const { root, dir } = project({ mode, phase: 'review', gates: forced,
      tasks: '- [x] T1\n', ledger: mode === 'standard' ? LEDGER : null });
    w(path.join(root, 'elsewhere.md'), 'VERDICT: no major issues\n');
    fs.symlinkSync(path.join(root, 'elsewhere.md'), path.join(dir, 'review', 'code-review-v1.md'));
    w(path.join(dir, 'review', 'code-review-v1-raw.txt'), 'raw\n');

    const g = gate(root);
    assert.strictEqual(g.status, 1, `${mode}: gate must refuse`);
    assert.match(line(g.stdout, 'C5'), /BLOCKED.*symlink/, line(g.stdout, 'C5'));

    for (const args of [['archive', '--change', 'c'], ['archive', '--change', 'c', '--force']]) {
      const a = run([...args, '--no-cas'], root);
      assert.strictEqual(a.status, 1,
        `${mode}: ${args.join(' ')} must refuse what gate refused, got exit ${a.status}:\n${a.stdout}${a.stderr}`);
      assert.match(a.stdout, /RESULT: NOT READY/);
      assert.match(a.stderr, /symlink/, `${mode}: the diagnosis must name the defect, got: ${a.stderr}`);
    }
  }
});

test('FF-20 archive refuses a verdict with no raw archive, as gate does', () => {
  const { root, dir } = project({ mode: 'standard', phase: 'review', tasks: '- [x] T1\n', ledger: LEDGER });
  w(path.join(dir, 'review', 'code-review-v1.md'), 'VERDICT: no major issues\n');
  const g = gate(root);
  assert.match(line(g.stdout, 'C5'), /BLOCKED.*without a raw archive/, line(g.stdout, 'C5'));
  const a = run(['archive', '--change', 'c'], root);
  assert.strictEqual(a.status, 1, `archive must agree, got exit ${a.status}:\n${a.stdout}${a.stderr}`);
  assert.match(a.stderr, /R4 .*raw archive/i, a.stderr);
});

test('FF-21 none of the three new refusals is applied to frozen history', () => {
  // zero review, and an unresolved fast review — both report, neither blocks
  for (const build of [undefined, (d) => reviewRound(d, 'code-review', 1, '3 issues open')]) {
    const { root } = project({ archived: true, step: 'DONE', review: build });
    const g = gate(root);
    assert.notStrictEqual(g.status, 1, `frozen history must not be retro-blocked:\n${g.stdout}${g.stderr}`);
    assert.doesNotMatch(line(g.stdout, 'C8'), /BLOCKED/, line(g.stdout, 'C8'));
  }
  // but integrity inside a frozen bundle still refuses (unchanged claim, re-pinned here)
  const { root } = project({ archived: true, step: 'DONE', mode: 'standard',
    review: (d) => w(path.join(d, 'review', 'code-review-v1.md'), 'VERDICT: no major issues\n') });
  assert.strictEqual(gate(root).status, 1, 'a frozen bundle whose evidence does not add up still refuses');
});

// ---------------------------------------------------------------------------
// 2 — the one mechanically-derivable §6 signal closes the fast lane
// ---------------------------------------------------------------------------

for (const [label, delta, op] of [['MODIFIED', MODIFIED, /MODIFIED/], ['REMOVED', REMOVED, /REMOVED/], ['RENAMED', RENAMED, /RENAMED/]]) {
  test(`FF-08 a ${label} delta upgrades fast to standard, with a short reason`, () => {
    // the producer read its own diff and nothing else — the mutation the tool PROVED is
    // deliberately left unanswered, which is what the review-ready assertion below is about
    const { root } = project({ delta, evidence: EVIDENCE('fast', null),
      review: (d) => reviewRound(d, 'code-review', 1, 'no major issues') });
    const g = gate(root);
    // The upgrade is a JUDGEMENT that is announced, not a demand for paperwork. 5.x/6.0-slice-3
    // withdrew fast's tasks.md and ledger waivers here; slice 5 removed both artifacts from
    // every mode, so there is no waiver left to withdraw. What survives — and what this pins —
    // is that the CLI states the upgrade, names the operation and the file, and that a change
    // carrying a mutated contract is not review-ready until it declares the evidence for it.
    const c3 = line(g.stdout, 'C3');
    assert.match(c3, /fast → standard/, `C3 must state the upgrade, got: ${c3}`);
    assert.match(c3, op, `the reason must name the operation it found, got: ${c3}`);
    assert.match(c3, /kv\/spec\.md/, `and the file, got: ${c3}`);
    // it demands no artifact of either mode
    assert.match(line(g.stdout, 'C2'), /^– C2 /, line(g.stdout, 'C2'));
    assert.match(line(g.stdout, 'C4'), /^– C4 /, line(g.stdout, 'C4'));
    // …and with no evidence declared, the change cannot enter review
    const rr = run(['gate', '--change', 'c', '--test-cmd', 'node tap.js', '--no-cas', '--review-ready'], root);
    assert.strictEqual(rr.status, 1, `an upgraded change with no evidence must not be review-ready:\n${rr.stdout}`);
    assert.match(rr.stdout, /✗ evidence/, rr.stdout);
  });
}

test('FF-09 an ADDED-only delta does not upgrade — the additive case stays fast', () => {
  const { root } = project({ delta: ADDED, review: (d) => reviewRound(d, 'code-review', 1, 'no major issues') });
  const g = gate(root);
  assert.strictEqual(g.status, 0, `an additive fast change must stay fast, got exit ${g.status}:\n${g.stdout}`);
  const c3 = line(g.stdout, 'C3');
  assert.doesNotMatch(c3, /standard/, `no upgrade may be invented, got: ${c3}`);
  assert.match(line(g.stdout, 'C2'), /^– C2 .*no tasks\.md/, 'the fast waivers must still apply');
  assert.match(line(g.stdout, 'C4'), /^– C4 .*no ledger/, 'the fast waivers must still apply');
});

test('FF-10 gate, archive readiness and status report the same upgrade', () => {
  const { root } = project({ delta: MODIFIED, phase: 'review',
    review: (d) => reviewRound(d, 'code-review', 1, 'no major issues') });
  // the REASON is the shared artefact: one derivation, quoted verbatim by all three surfaces
  const REASON = "contract-mutation: kv/spec.md MODIFIED 'Alpha'";
  const g = gate(root);
  assert.match(line(g.stdout, 'C3'), /fast → standard/, 'gate must announce the upgrade');
  assert.ok(line(g.stdout, 'C3').includes(REASON), `gate must quote the reason, got: ${line(g.stdout, 'C3')}`);

  const a = run(['archive', '--change', 'c', '--no-cas'], root);
  assert.match(a.stdout, /upgraded to standard/, `archive must say the lane closed, got: ${a.stdout}`);
  assert.ok(a.stdout.includes(REASON), `archive must quote the same reason, got: ${a.stdout}`);

  const s = run(['status', '--change', 'c'], root);
  assert.match(s.stdout, /fast → standard/, `status must state it too, got:\n${s.stdout}`);
  assert.ok(s.stdout.includes(REASON), `status must quote the same reason, got:\n${s.stdout}`);
  const j = JSON.parse(run(['status', '--change', 'c', '--json'], root).stdout);
  assert.strictEqual(j.mode, 'fast', 'the DECLARED mode is reported unchanged');
  assert.strictEqual(j.effectiveMode, 'standard', 'the effective mode is a separate, explicit field');
  assert.ok(Array.isArray(j.risk) && j.risk.length === 1, `one signal, got: ${JSON.stringify(j.risk)}`);
  assert.match(j.risk[0].detail, /MODIFIED/);
});

test('FF-11 the upgrade withdraws waivers and demands no artifact standard does not already demand', () => {
  const { root } = project({ delta: MODIFIED, tasks: '- [x] T1\n', ledger: LEDGER,
    review: (d) => reviewRound(d, 'code-review', 1, 'no major issues') });
  const g = gate(root);
  assert.strictEqual(g.status, 0,
    `an upgraded change that meets standard's OWN requirements must pass — nothing new may be invented:\n${g.stdout}`);
  assert.match(line(g.stdout, 'C3'), /fast → standard/, 'and it is still reported as upgraded');
});

// ---------------------------------------------------------------------------
// 3 — frozen history, path semantics, fail-closed
// ---------------------------------------------------------------------------

test('FF-12 an archived bundle is never re-judged by either new rule', () => {
  const { root } = project({ archived: true, delta: MODIFIED, step: 'DONE' });
  const g = gate(root);
  assert.notStrictEqual(g.status, 1, `frozen history must not be retro-blocked:\n${g.stdout}${g.stderr}`);
  assert.doesNotMatch(line(g.stdout, 'C8'), /BLOCKED/, 'the fast floor is not applied retroactively');
  assert.match(line(g.stdout, 'C2'), /^– C2 /, 'the upgrade is not applied retroactively either');
  assert.doesNotMatch(line(g.stdout, 'C3'), /→ standard/, 'a frozen bundle keeps its declared mode');

  const j = JSON.parse(run(['status', '--change', 'c', '--json'], root).stdout);
  assert.strictEqual(j.effectiveMode, 'fast', 'status must agree the frozen mode stands');
  assert.deepStrictEqual(j.risk, [], 'no signal is derived from a merged delta');
});

test('FF-12b evidence integrity still refuses inside a frozen bundle', () => {
  const { root } = project({ archived: true, step: 'DONE',
    review: (d) => w(path.join(d, 'review', 'code-review-v1.md'), 'VERDICT: no major issues\n') });
  const g = gate(root);
  assert.strictEqual(g.status, 1, `a frozen bundle whose evidence does not add up still refuses:\n${g.stdout}`);
  assert.match(line(g.stdout, 'C5'), /BLOCKED/);
});

test('FF-13 the signal names its file in POSIX form, from any nesting depth, on every platform', () => {
  const { root } = project({ delta: MODIFIED, deltaPath: 'kv/nested/spec.md',
    review: (d) => reviewRound(d, 'code-review', 1, 'no major issues') });
  const c3 = line(gate(root).stdout, 'C3');
  assert.match(c3, /kv\/nested\/spec\.md/, `the reason must be platform-stable, got: ${c3}`);
  assert.doesNotMatch(c3, /\\/, `no backslash may reach the reason string, got: ${c3}`);
});

test('FF-14b a dangling specs/ is fail-closed too — existsSync would have read it as "no risk"', { skip: !canSymlink() }, () => {
  const { root, dir } = project({ delta: null,
    review: (d) => reviewRound(d, 'code-review', 1, 'no major issues') });
  fs.symlinkSync(path.join(dir, 'nowhere'), path.join(dir, 'specs'));
  const j = JSON.parse(run(['status', '--change', 'c', '--json'], root).stdout);
  assert.strictEqual(j.effectiveMode, 'standard', JSON.stringify(j.risk));
  assert.match(j.risk[0].detail, /specs\//);
});

test('FF-14 a delta the scan cannot read closes the fast lane rather than opening it', { skip: !canSymlink() }, () => {
  const { root, dir } = project({ delta: null,
    review: (d) => reviewRound(d, 'code-review', 1, 'no major issues') });
  // a dangling link: the name claims a delta, the bytes cannot be judged
  fs.mkdirSync(path.join(dir, 'specs', 'kv'), { recursive: true });
  fs.symlinkSync(path.join(dir, 'specs', 'kv', 'gone.md'), path.join(dir, 'specs', 'kv', 'spec.md'));
  const j = JSON.parse(run(['status', '--change', 'c', '--json'], root).stdout);
  assert.strictEqual(j.effectiveMode, 'standard',
    `an unjudgeable delta must not be read as "no risk", got: ${JSON.stringify(j.risk)}`);
  assert.ok(j.risk.length >= 1 && /kv\/spec\.md/.test(j.risk[0].detail), JSON.stringify(j.risk));
});

test('FF-15 status and gate speak the same stage — a frozen loop is frozen in both', () => {
  const { root, dir } = project({ archived: true, mode: 'standard', step: 'DONE',
    tasks: '- [x] T1\n', ledger: LEDGER, delta: ADDED });
  for (const n of [1, 2]) reviewRound(dir, 'spec-review', n, 'gaps found');
  const g = gate(root);
  assert.match(line(g.stdout, 'C8'), /do not apply retroactively/, line(g.stdout, 'C8'));
  const s = run(['status', '--change', 'c'], root);
  assert.doesNotMatch(s.stdout, /loop stopped/,
    `status must not call a frozen loop stopped when gate does not:\n${s.stdout}`);
  const j = JSON.parse(run(['status', '--change', 'c', '--json'], root).stdout);
  assert.strictEqual(j.review.families[0].stopped, false, 'and the machine shape must agree');
});
