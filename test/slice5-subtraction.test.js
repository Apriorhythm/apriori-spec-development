'use strict';
// Slice 5 — the semantic subtraction, as behaviour.
//
// GT-39/GT-40 (the evidence predicate and the transient review-ready view), RY-16..RY-19
// (readiness stops demanding a document family), ST-12..ST-14 (the ONE state, read back, with
// the escalation hard stop) and AM-118 (an archive declares three states and freezes).
//
// These are the tests that replace the ones deleted with the artifact machine. Each drives the
// real CLI over a real bundle: what a doc claims is PR-xx's business, not this file's.

const { test } = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const am = require('../lib/archive-merge');
const rd = require('../lib/readiness');
const risk = require('../lib/risk');
const status = require('../lib/status');

const BIN = path.join(__dirname, '..', 'bin', 'apriori.js');
const run = (args, cwd) => spawnSync('node', [BIN, ...args], { encoding: 'utf8', cwd });
const w = (p, s) => { fs.mkdirSync(path.dirname(p), { recursive: true }); fs.writeFileSync(p, s); return p; };

const STORE = '### Requirement: Alpha\n\n#### Scenario: XA-01 base\n- t\n';
const ADDED = '## ADDED Requirements\n\n### Requirement: Beta\n\n#### Scenario: XB-01 new\n- t\n';
const MUTATION = '## MODIFIED Requirements\n\n### Requirement: Alpha\n\n#### Scenario: XA-01 base\n- t\n- more\n';
const TAP = 'node -e "console.log(\'TAP version 13\');console.log(\'1..2\');console.log(\'ok 1 - XA-01 a\');console.log(\'ok 2 - XB-01 b\')"';
const TAP1 = 'node -e "console.log(\'TAP version 13\');console.log(\'1..1\');console.log(\'ok 1 - XA-01 a\')"';

const OPEN = (items) => `\n## Open\n${items.map((r) => `- ${r}`).join('\n')}\n`;
const ACCEPT = (id) => `  - 2026-08-23T11:00 owner: evidence-accept ${id} — the staging DB is offline until Q4\n`;

// A bundle with NO document family at all: flow-state + delta + one attributable review round.
// The `## Open` section is empty unless a test hands items in; `mode:` is written only when given.
function project({ mode = null, phase = 'review', sections = '', gates = '', delta = ADDED, open = [] } = {}) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'apriori-s5-'));
  w(path.join(root, 'apriori', 'specs', 'kv', 'spec.md'), STORE);
  const dir = path.join(root, 'apriori', 'changes', 'c');
  if (delta) w(path.join(dir, 'specs', 'kv', 'spec.md'), delta);
  w(path.join(dir, 'flow-state.md'),
    `change: c\n${mode ? `mode: ${mode}\n` : ''}lineage: v6\nphase: ${phase}\n${OPEN(open)}${sections}`
    + `\ngates:\n  - 2026-08-23T00:00 note: scaffolded\n${gates}`);
  w(path.join(dir, 'review', 'code-review-v1.md'), '# review r1\n\nVERDICT: no major issues\n');
  w(path.join(dir, 'review', 'code-review-v1-raw.txt'), 'raw\n');
  return { root, dir };
}
const gate = (root, extra = []) => run(['gate', '--change', 'c', '--test-cmd', TAP, '--no-cas', ...extra], root);
const line = (out, id) => (out.split('\n').find((l) => l.includes(` ${id} `)) || '').trim();

// ---------------------------------------------------------------------------
// The base predicates ARE what the gate reports
// ---------------------------------------------------------------------------

test('RY-01 the base predicates are what the gate reports', () => {
  // The differential that matters after slice 5: gate does not re-decide C3/C9, it prints
  // lib/readiness.js's own return values; C2 and C4 are 6.2 placeholders with one fixed shape.
  // A second copy in gate is how the archive and the gate came to disagree in 5.x.
  const { root, dir } = project();
  fs.writeFileSync(path.join(dir, 'tasks.md'), '- [ ] b\n');
  fs.writeFileSync(path.join(dir, 'review', 'issues.md'),
    '| ID | Issue | Risk | Round found | Status |\n|---|---|---|---|---|\n| Q-1 | i | low | 1 | open |\n');
  const flowText = fs.readFileSync(path.join(dir, 'flow-state.md'), 'utf8');
  const state = status.parseFlowState(flowText);
  const res = require('../lib/gate').runGate({ cwd: root, change: 'c', testCmd: TAP, noCas: true });
  // C9 takes ONE input it cannot derive for itself: the §6 signals the scan proved about this
  // delta. It is recomputed here from the bundle — if gate ever stops passing it, this equality
  // breaks rather than the check quietly going quiet. (6.2: there is no mode input any more.)
  const opts = { stage: 'in-flight', riskSignals: risk.scanDeltas(dir) };
  assert.deepStrictEqual(res.evidenceOpts, opts, 'gate must hand C9 the scan');
  const mine = {
    C2: { id: 'C2', status: 'n/a', detail: 'retired in 6.2 — nothing is read' },
    C3: rd.checkFlowState(state, 'c', flowText),
    C4: { id: 'C4', status: 'n/a', detail: 'ledger retired in 6.2 — open items live in ## Open' },
    C9: rd.checkEvidenceStatus(flowText, opts),
  };
  for (const id of Object.keys(mine)) {
    const got = res.checks.find((c) => c.id === id);
    assert.deepStrictEqual({ id: got.id, status: got.status, detail: got.detail }, mine[id],
      `${id}: gate must report the base layer's own value, not a second opinion`);
  }
});

// ---------------------------------------------------------------------------
// The scaffold, and what a change owes without one
// ---------------------------------------------------------------------------

test('RY-16 no rule reads a task list, present or absent', () => {
  // absent: archivable, and C2 is the 6.2 placeholder
  const { root, dir } = project();
  assert.strictEqual(run(['archive', '--change', 'c', '--no-cas'], root).status, 0);
  assert.ok(!rd.readinessOf({ bundleDir: dir, name: 'c' }).blockers.some((b) => b.rule === 'R2'),
    'the retired R2 rule came back');
  // present with unchecked boxes: still archivable, and the gate says nothing about it
  w(path.join(dir, 'tasks.md'), '- [x] a\n- [ ] b\n- [ ] c\n');
  assert.strictEqual(run(['archive', '--change', 'c', '--no-cas'], root).status, 0,
    'a legacy checklist must not stop an irreversible write');
  const c2 = line(gate(root).stdout, 'C2');
  assert.match(c2, /^– C2 retired in 6\.2 — nothing is read$/);
});

test('RY-17 the ledger is never read: an open row neither blocks nor is reported', () => {
  const LED = (row) => '| ID | Issue | Risk | Round found | Status |\n|---|---|---|---|---|\n' + `| Q-1 | i | low | 1 | ${row} |\n`;
  for (const row of ['open', 'frobnicated', 'rejected', 'waived by the owner', 'fixed']) {
    const p = project();
    w(path.join(p.dir, 'review', 'issues.md'), LED(row));
    const r = rd.readinessOf({ bundleDir: p.dir, name: 'c' });
    assert.strictEqual(r.ready, true, `${row}: ${JSON.stringify(r.blockers)}`);
    assert.ok(!r.blockers.some((b) => b.rule === 'R3'), `${row}: the retired R3 rule came back`);
    assert.deepStrictEqual(r.na, [], `${row}: nothing is n/a — there is no ledger rule to be n/a`);
    assert.ok(!r.notes.some((n) => /R3|ledger|Q-1/.test(n)), `${row}: nothing about the ledger is printed: ${r.notes}`);
    const a = run(['archive', '--change', 'c', '--no-cas'], p.root);
    assert.strictEqual(a.status, 0, `${row}: ${a.stdout}${a.stderr}`);
    assert.doesNotMatch(a.stdout + a.stderr, /Q-1|bookkeeping/, row);
    assert.match(line(gate(p.root).stdout, 'C4'), /^– C4 ledger retired in 6\.2 — open items live in ## Open$/, row);
    const j = JSON.parse(run(['status', '--change', 'c', '--json'], p.root).stdout);
    assert.deepStrictEqual(j.openLedger, [], `${row}: the compat key stays and stays empty`);
  }
});

// ---------------------------------------------------------------------------
// C9 / R5 — the one substantive evidence predicate
// ---------------------------------------------------------------------------

test('RY-18 a pending open item refuses, and only the owner opens it', () => {
  // the readiness face of the same predicate: R5, non-forceable, cured only by the owner
  const b = project({ open: ['R-01: the staging DB is offline; restart recovery unverified'] });
  const r1 = rd.readinessOf({ bundleDir: b.dir, name: 'c', force: true });
  assert.strictEqual(r1.ready, false);
  const r5 = r1.blockers.filter((x) => x.rule === 'R5');
  assert.strictEqual(r5.length, 1, JSON.stringify(r1.blockers));
  assert.strictEqual(r5[0].forceable, false, 'missing reality is not progress an owner can force past');

  const claimed = project({ open: ['R-01: the staging DB is offline'],
    gates: '  - 2026-08-23T11:00 producer: evidence-accept R-01 — I accept it\n' });
  assert.strictEqual(rd.readinessOf({ bundleDir: claimed.dir, name: 'c', force: true }).ready, false);

  const ok = project({ open: ['R-01: the staging DB is offline'], gates: ACCEPT('R-01') });
  assert.strictEqual(rd.readinessOf({ bundleDir: ok.dir, name: 'c' }).ready, true);
});

test('GT-39 a pending open item refuses, and owner acceptance is a recorded human act', () => {
  // 1. pending, no decision → C9 blocked and archive refuses
  const b = project({ open: ['R-01: the staging DB is offline'] });
  assert.match(line(gate(b.root).stdout, 'C9'), /BLOCKED — open item R-01 is pending: the staging DB is offline/);
  const ab = run(['archive', '--change', 'c', '--no-cas', '--force'], b.root);
  assert.strictEqual(ab.status, 1, '--force is not an owner decision');
  assert.match(ab.stderr, /R5 open item R-01 is pending/);

  // 2. a producer's own entry → still pending; a producer may not accept its own risk
  const claimed = project({ open: ['R-01: the staging DB is offline'],
    gates: '  - 2026-08-23T11:00 producer: evidence-accept R-01 — accepted\n' });
  assert.match(line(gate(claimed.root).stdout, 'C9'), /BLOCKED — open item R-01 is pending/);

  // 3. the owner's recorded decision → passes, reported as accepted and still present
  const ok = project({ open: ['R-01: the staging DB is offline'], gates: ACCEPT('R-01') });
  assert.match(line(gate(ok.root).stdout, 'C9'), /^✓ C9 1 open item\(s\): 1 accepted, still present \(R-01\), 0 pending$/);
  assert.strictEqual(run(['archive', '--change', 'c', '--no-cas'], ok.root).status, 0);

  // 4. an item with no id is fail-closed — it blocks, and no acceptance can name it
  const bad = project({ open: ['probably fine'], gates: ACCEPT('probably') });
  assert.match(line(gate(bad.root).stdout, 'C9'), /BLOCKED — open item has no id: 'probably fine'/);

  // 5. no section at all → nothing owed
  const silent = project();
  assert.match(line(gate(silent.root).stdout, 'C9'), /^✓ C9 no open items$/);
});

test('RY-19 owner acceptance settles one item and never touches the (inert) mode', () => {
  for (const mode of [null, 'fast', 'standard']) {
    const { root } = project({ mode, open: ['R-01: the v1 risk'], gates: ACCEPT('R-01') });
    const j = JSON.parse(run(['status', '--change', 'c', '--json'], root).stdout);
    assert.strictEqual(j.mode, mode);
    assert.strictEqual(j.effectiveMode, mode, 'effectiveMode is the declared mode (or null) — a compat field, never a judgement');
    assert.deepStrictEqual(j.openItems.map((i) => [i.id, i.accepted]), [['R-01', true]]);
  }
  assert.ok(!('effectiveMode' in risk), 'the upgrade derivation left with the mode branches');
});

// ---------------------------------------------------------------------------
// review-ready — a transient view, never a document
// ---------------------------------------------------------------------------

test('GT-40 review-ready answers from the run own facts and persists nothing', () => {
  const ready = () => project({ open: ['R-01: the target runtime could not be booted here'] });

  // the happy path: TWO items, exit 0, and the transient-view notice — a PENDING item is
  // exactly what the review is for, so it does not stand in the way
  const ok = ready();
  const snapshot = (root) => spawnSync('find', [root, '-type', 'f'], { encoding: 'utf8' }).stdout.split('\n').sort().join('\n');
  const before = snapshot(ok.root);
  const r = gate(ok.root, ['--review-ready']);
  assert.strictEqual(r.status, 0, r.stdout + r.stderr);
  assert.match(r.stdout, /review-ready — transient view of this run; nothing was written/);
  for (const item of ['tests', 'open'])
    assert.match(r.stdout, new RegExp(`✓ ${item}\\b`), `${item}: ${r.stdout}`);
  assert.strictEqual((r.stdout.match(/^[✓✗] /gm) || []).length, 2, `two items, no invented third:\n${r.stdout}`);
  assert.match(r.stdout, /^REVIEW-READY: YES$/m);
  assert.doesNotMatch(r.stdout, /reviewer gets|reviewer-context|producer-diff/,
    'review-ready may not claim what a reviewer will read — it cannot observe that');
  // …and it prints a fact the run already holds instead
  assert.match(r.stdout, /^delta specs: kv\/spec\.md$/m);
  assert.strictEqual(snapshot(ok.root), before, 'review-ready wrote a file');
  // running it twice is the same answer, recomputed — nothing was cached
  assert.strictEqual(gate(ok.root, ['--review-ready']).stdout, r.stdout);

  // an Open section the review cannot read → not ready, and it says which item and why
  const noId = project({ open: ['the target runtime could not be booted here'] });
  const rd1 = gate(noId.root, ['--review-ready']);
  assert.strictEqual(rd1.status, 1);
  assert.match(rd1.stdout, /✗ open  open item has no id/);
  assert.match(rd1.stdout, /REVIEW-READY: NOT YET \(1 item\(s\)\) — go back to Build & Test; this is not a review round/);

  // NO test command → never ready: the reviewer must not be the first to run the suite
  const noCmd = ready();
  const rr = run(['gate', '--change', 'c', '--review-ready', '--no-cas'], noCmd.root);
  assert.strictEqual(rr.status, 1);
  assert.match(rr.stdout, /✗ tests  no test command/);
  assert.strictEqual(rr.stdout.match(/REVIEW-READY: NOT YET \(1 item\(s\)\)/) !== null, true,
    'the missing suite is ONE item — it never doubled into a second, derived tick');
});

// ---------------------------------------------------------------------------
// the ONE state, and the escalation hard stop
// ---------------------------------------------------------------------------

test('ST-12 the Reality Check is read back, and an unverified assumption is surfaced', () => {
  const { root } = project({ sections:
    '\n## Reality Check\n'
    + '- observed: lib/kv.js exports set/get/del — read 2026-08-23\n'
    + '- decision: the owner wants XB-01\n'
    + '- assumption: the staging schema matches production\n'
    + '- I forgot to name a kind\n' });
  const out = run(['status', '--change', 'c'], root).stdout;
  assert.match(out, /reality:      1 observed, 1 decision, 1 assumption/);
  assert.match(out, /assumption:   the staging schema matches production/);
  assert.match(out, /reality:      unreadable entry \(want observed\/decision\/assumption\): I forgot to name a kind/);
  const j = JSON.parse(run(['status', '--change', 'c', '--json'], root).stdout);
  assert.deepStrictEqual(j.reality.malformed, ['I forgot to name a kind'], 'a kind-less line is never dropped silently');
});

test('ST-13 the state next actions are capped at three, and the cap is reported', () => {
  const { root } = project({ sections: '\n## Next\n- one\n- two\n- three\n- four\n' });
  const out = run(['status', '--change', 'c'], root).stdout;
  for (const n of ['one', 'two', 'three']) assert.match(out, new RegExp(`next \\d:       ${n}$`, 'm'));
  assert.doesNotMatch(out, /^next \d:       four$/m);
  assert.match(out, /next:         4 actions listed — the state carries at most 3/);
  assert.strictEqual(status.MAX_NEXT, 3);
});

test('ST-14 --escalation is the hard stop, and exit 3 is the whole mechanism', () => {
  // nothing outstanding → 0
  const clean = project();
  const c = run(['status', '--change', 'c', '--escalation'], clean.root);
  assert.strictEqual(c.status, 0);
  assert.match(c.stdout, /^ESCALATION: none$/m);

  // 1. the state's own escalation line (6.2: a retired field — its content is a pending decision
  //    the machine has no reading for, so the stop is the migration refusal, see ES-01)
  const declared = project({ sections: 'escalation: the approach needs the owner\n' });
  const d = run(['status', '--change', 'c', '--escalation'], declared.root);
  assert.strictEqual(d.status, 3);
  assert.match(d.stdout, /escalation: carries a pending decision \('the approach needs the owner'\) — move it to ## Open/);

  // 2. a reviewer's ESCALATE verdict, at round 1 — the approach is wrong, not the details
  const esc = project();
  fs.writeFileSync(path.join(esc.dir, 'review', 'code-review-v1.md'), '# r1\n\nVERDICT: escalate\n');
  const e = run(['status', '--change', 'c', '--escalation'], esc.root);
  assert.strictEqual(e.status, 3);
  assert.match(e.stdout, /code-review round 1 \(the reviewer escalated\) — a human decides/);
  assert.match(gate(esc.root).stdout, /✗ C8 BLOCKED/, 'and it blocks the gate at whatever round it happened');
  assert.strictEqual(run(['archive', '--change', 'c', '--no-cas'], esc.root).status, 1);

  // 3. a pending open item
  const ev = project({ open: ['R-01: staging DB offline'] });
  const v = run(['status', '--change', 'c', '--escalation'], ev.root);
  assert.strictEqual(v.status, 3);
  assert.match(v.stdout, /open item R-01 is pending/);
  // …and an accepted one is not a stop
  assert.strictEqual(run(['status', '--change', 'c', '--escalation'], project({ open: ['R-01: x'], gates: ACCEPT('R-01') }).root).status, 0);

  // the owner's recorded decision closes the escalation loop
  const answered = project({ gates: '  - 2026-08-23T12:00 owner: reframe code-review round 1 redo — the approach was wrong\n' });
  fs.writeFileSync(path.join(answered.dir, 'review', 'code-review-v1.md'), '# r1\n\nVERDICT: escalate\n');
  const a = run(['status', '--change', 'c', '--escalation'], answered.root);
  assert.strictEqual(a.status, 0, '6.2: an acknowledged escalation is not a pending one — it never leaves the report, but it is not the hard stop by itself (ES-05)');
  assert.match(a.stdout, /^acknowledged: .*owner decision on record: redo/m);
});

// ---------------------------------------------------------------------------
// the archive declares three states and freezes
// ---------------------------------------------------------------------------

test('AM-118 the archive declaration carries exactly the three states', () => {
  const decl = (out) => out.slice(out.indexOf('ARCHIVE DECLARES')).split('\n').slice(0, 4).join('\n');

  // clean state
  const clean = project();
  const r = run(['archive', '--change', 'c', '--no-cas'], clean.root);
  assert.strictEqual(r.status, 0, r.stdout + r.stderr);
  assert.match(r.stdout, /ARCHIVE DECLARES \(frozen; a later defect becomes an outcome note or a new change\):/);
  assert.match(decl(r.stdout), /implementation:    complete/);
  assert.match(decl(r.stdout), /critical evidence: complete/);
  assert.match(decl(r.stdout), /delivery:          pending external acceptance/);
  // and exactly three states — no fourth line
  assert.strictEqual(decl(r.stdout).split('\n').filter((l) => /^ {2}\w/.test(l)).length, 3);

  // An open issue or a standing assumption is the state saying, in the producer's own words,
  // that the work is unfinished — so the archive REFUSES rather than freezing a snapshot whose
  // own declaration would read INCOMPLETE. R5 is what refuses; the declaration backstop below
  // (AM-120) is what makes a successful-but-incomplete run impossible even if R5 ever softened.
  const open = project({ open: ['R-01: the retry path is unproven'],
    sections: '\n## Reality Check\n- assumption: the schema matches\n' });
  const ro = run(['archive', '--change', 'c', '--no-cas'], open.root);
  assert.strictEqual(ro.status, 1, ro.stdout + ro.stderr);
  assert.match(ro.stderr, /R5 open item R-01 is pending: the retry path is unproven/);
  assert.match(ro.stderr, /R5 unverified assumption: the schema matches/);
  assert.doesNotMatch(ro.stdout, /ARCHIVE DECLARES/, 'a refused archive declares nothing');
  // and the declaration the run WOULD have printed says so too
  assert.strictEqual(am.archiveDeclaration(open.dir).incomplete, true);
  assert.match(am.archiveDeclaration(open.dir).lines.join('\n'),
    /implementation:    INCOMPLETE — 1 pending open item\(s\), 1 unverified assumption\(s\)/);

  // an owner-accepted risk is NAMED in the evidence state, and stays present
  const acc = project({ open: ['data-schema: the v1 risk'], gates: ACCEPT('data-schema') });
  assert.match(decl(run(['archive', '--change', 'c', '--no-cas'], acc.root).stdout),
    /critical evidence: complete, 1 risk\(s\) accepted by the owner \(data-schema\), still present/);

  // `delivery: released` is the third state's other value
  const rel = project({ sections: 'delivery: released\n' });
  assert.match(decl(run(['archive', '--change', 'c', '--no-cas'], rel.root).stdout), /delivery:          released/);

  // dry-run declares what --write will declare, and creates nothing
  const dry = project();
  const files = () => spawnSync('find', [dry.root, '-type', 'f'], { encoding: 'utf8' }).stdout;
  const before = files();
  run(['archive', '--change', 'c', '--no-cas'], dry.root);
  assert.strictEqual(files(), before, 'a dry-run declaration must not create a file');
});

test('AM-119 an archived bundle is frozen: the merge writes one unit and nothing rewrites it', () => {
  const { root } = project();
  const r = run(['archive', '--change', 'c', '--no-cas', '--write', '--changes-dir', 'apriori/changes'], root);
  assert.strictEqual(r.status, 0, r.stdout + r.stderr);
  const archived = path.join(root, 'apriori', 'changes', 'archive');
  const [stamp] = fs.readdirSync(archived);
  const dir = path.join(archived, stamp);
  // the whole bundle travelled, and nothing was left behind to write back into
  assert.deepStrictEqual(fs.readdirSync(dir).sort(), ['flow-state.md', 'review', 'specs']);
  assert.ok(!fs.existsSync(path.join(root, 'apriori', 'changes', 'c')));
  // re-running against the frozen record is a read, never an edit
  const before = fs.readFileSync(path.join(dir, 'flow-state.md'), 'utf8');
  const g = run(['gate', '--change', 'c', '--test-cmd', TAP1, '--no-cas'], root);
  assert.notStrictEqual(g.status, 2, g.stdout + g.stderr);
  assert.strictEqual(fs.readFileSync(path.join(dir, 'flow-state.md'), 'utf8'), before);
});

// ---------------------------------------------------------------------------
// the whole flow, end to end, with no document family anywhere
// ---------------------------------------------------------------------------

test('RY-20 a change with no tasks, no ledger and no mode passes, archives and declares', () => {
  const { root, dir } = project();
  // the bundle carries no document family at all
  assert.deepStrictEqual(fs.readdirSync(dir).sort(), ['flow-state.md', 'review', 'specs']);
  const g = gate(root);
  assert.strictEqual(g.status, 0, g.stdout);
  assert.match(g.stdout, /GATE: PASS/);
  assert.strictEqual(gate(root, ['--review-ready']).status, 0);
  const a = run(['archive', '--change', 'c', '--no-cas', '--write', '--changes-dir', 'apriori/changes'], root);
  assert.strictEqual(a.status, 0, a.stdout + a.stderr);
  assert.match(a.stdout, /ARCHIVE DECLARES/);
});

test('RY-21 a 5.x bundle is diagnosed, not silently read, and its legacy files never block', () => {
  const { root, dir } = project();
  // legacy residue: a task list with open boxes and a ledger with an open row — neither is read
  w(path.join(dir, 'tasks.md'), '- [ ] never finished\n');
  w(path.join(dir, 'review', 'issues.md'),
    '| ID | Issue | Risk | Round found | Status |\n|---|---|---|---|---|\n| Q-1 | i | low | 1 | open |\n| Q-2 | j | low | 1 | frobnicated |\n');
  const g = gate(root);
  assert.strictEqual(g.status, 0, `legacy residue must be inert, not blocking:\n${g.stdout}`);
  assert.match(line(g.stdout, 'C2'), /^– C2 retired in 6\.2/);
  assert.match(line(g.stdout, 'C4'), /^– C4 ledger retired in 6\.2/);
  assert.doesNotMatch(g.stdout, /Q-1|Q-2|unchecked/, 'nothing from the unread files reaches the report');
  // but the 5.x IDENTITY key is refused rather than read
  const flow = path.join(dir, 'flow-state.md');
  fs.writeFileSync(flow, fs.readFileSync(flow, 'utf8').replace('phase: review', 'current-step: STEP6\nphase: review'));
  const g2 = gate(root);
  assert.strictEqual(g2.status, 1);
  assert.match(line(g2.stdout, 'C3'), /5\.x identity key\(s\) present \(current-step\)/);
  assert.match(line(g2.stdout, 'C3'), /MIGRATING\.md/);
});
