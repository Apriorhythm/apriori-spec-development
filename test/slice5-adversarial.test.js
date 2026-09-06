'use strict';
// Slice 5, adversarial — RY-22..RY-28, GT-41, AM-120 (6.2: Open items replace the Evidence rows).
//
// slice5-subtraction.test.js proves the happy paths of the subtraction. This file attacks them.
// Every case here is a way a producer could have bought itself out of the one thing 6.0 refuses
// to let it buy out of: real evidence about the product. The predicates under attack are
//
//   · the owner's acceptance exit            — a CLOSED grammar, or it is not an owner decision
//   · what the CLI PROVED about the delta    — an unreadable delta is fail-closed
//   · the change's own recorded claims       — its words about itself are binding
//   · the legacy ledger                      — never read, and it outranks nothing
//
// The tests drive the real CLI and the real predicates over real bundles; nothing here asserts
// on a mock.

const { test } = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const rd = require('../lib/readiness');
const risk = require('../lib/risk');
const rv = require('../lib/review');
const am = require('../lib/archive-merge');
const gateLib = require('../lib/gate');
const status = require('../lib/status');
const { canSymlink } = require('./helpers/can-symlink');

const BIN = path.join(__dirname, '..', 'bin', 'apriori.js');
const run = (args, cwd) => spawnSync('node', [BIN, ...args], { encoding: 'utf8', cwd });
const w = (p, s) => { fs.mkdirSync(path.dirname(p), { recursive: true }); fs.writeFileSync(p, s); return p; };

const STORE = '### Requirement: Alpha\n\n#### Scenario: XA-01 base\n- t\n';
const ADDED = '## ADDED Requirements\n\n### Requirement: Beta\n\n#### Scenario: XB-01 new\n- t\n';
const MUTATION = '## MODIFIED Requirements\n\n### Requirement: Alpha\n\n#### Scenario: XA-01 base\n- t\n- more\n';
// TAP for each delta shape: an ADDED delta projects two scenarios, a MODIFIED one projects one.
const TAP2 = 'node -e "console.log(\'TAP version 13\');console.log(\'1..2\');console.log(\'ok 1 - XA-01 a\');console.log(\'ok 2 - XB-01 b\')"';
const TAP1 = 'node -e "console.log(\'TAP version 13\');console.log(\'1..1\');console.log(\'ok 1 - XA-01 a\')"';
const tapFor = (delta) => (delta === ADDED ? TAP2 : TAP1);

// One bundle shape for the whole file: flow-state + delta + one accepting review round. The
// `## Open` section is EMPTY by default — nothing owed — so a test that is not about the state
// predicate does not collect a second blocker and read as though its own subject fired.
// `open` is a list of item lines (without the `- `); `mode` is written only when given (6.2: inert).
function project({ mode = null, open = [], sections = '', gates = '', delta = ADDED, ledger = null,
  verdict = 'no major issues' } = {}) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'apriori-adv-'));
  w(path.join(root, 'apriori', 'specs', 'kv', 'spec.md'), STORE);
  const dir = path.join(root, 'apriori', 'changes', 'c');
  if (delta) w(path.join(dir, 'specs', 'kv', 'spec.md'), delta);
  const op = `\n## Open\n${open.map((r) => `- ${r}`).join('\n')}\n\n`;
  w(path.join(dir, 'flow-state.md'),
    `change: c\n${mode ? `mode: ${mode}\n` : ''}lineage: v6\nphase: review\n${op}${sections}`
    + `gates:\n  - 2026-08-23T00:00 note: scaffolded\n${gates}`);
  w(path.join(dir, 'review', 'code-review-v1.md'), `# review r1\n\nVERDICT: ${verdict}\n`);
  w(path.join(dir, 'review', 'code-review-v1-raw.txt'), 'raw\n');
  if (ledger) w(path.join(dir, 'review', 'issues.md'), ledger);
  return { root, dir, delta };
}
const gate = (p, extra = []) => run(['gate', '--change', 'c', '--test-cmd', tapFor(p.delta), '--no-cas', ...extra], p.root);
const line = (out, id) => (out.split('\n').find((l) => l.includes(` ${id} `)) || '').trim();
const archive = (p, extra = []) => run(['archive', '--change', 'c', '--no-cas', ...extra], p.root);
const r5of = (p, force = false) =>
  rd.readinessOf({ bundleDir: p.dir, name: 'c', force }).blockers.filter((b) => b.rule === 'R5');
const LED = (st) => '| ID | Issue | Risk | Round found | Status |\n|---|---|---|---|---|\n'
  + `| Q-1 | i | low | 1 | ${st} |\n`;

// ---------------------------------------------------------------------------
// RY-22 — the owner's evidence exit, and every near miss
// ---------------------------------------------------------------------------

test('RY-22 the owner acceptance exit has one grammar and every near miss is refused', () => {
  const flow = (entry) => 'change: c\nlineage: v6\nphase: review\n'
    + '\n## Open\n- data-schema: the v1 risk is unverified\n\n'
    + `gates:\n  - 2026-08-23T00:00 note: scaffolded\n${entry}\n`;
  const grants = (entry) => rd.ownerAccepted(flow(entry), 'data-schema');

  // the ONE form that authorizes
  const CANON = '  - 2026-08-23T11:00 owner: evidence-accept data-schema — the staging DB is offline until Q4';
  assert.strictEqual(grants(CANON), true, 'the documented template must authorize');
  assert.strictEqual(rd.evidenceFindings(flow(CANON)).blockers.length, 0);
  assert.deepStrictEqual(rd.evidenceFindings(flow(CANON)).items.map((i) => [i.id, i.accepted]), [['data-schema', true]]);

  // and every near miss, each named by the way it used to get through
  const refused = [
    ['a producer may not accept its own risk', '  - 2026-08-23T11:00 producer: evidence-accept data-schema — offline'],
    ['a note is not a decision', '  - 2026-08-23T11:00 note: evidence-accept data-schema — offline'],
    ['an agent is not the owner', '  - 2026-08-23T11:00 agent: evidence-accept data-schema — offline'],
    ['the retired gate⑤ actor form is not `owner:`', '  - 2026-08-23T11:00 gate\u2464 (owner): evidence-accept data-schema — offline'],
    ['an undated line is nobody\'s decision', '  - owner: evidence-accept data-schema — offline'],
    ['a timestamp-shaped non-timestamp is not a timestamp', '  - 9999-99-99T99:99 owner: evidence-accept data-schema — offline'],
    ['no em dash: the id would absorb the prose', '  - 2026-08-23T11:00 owner: evidence-accept data-schema offline until Q4'],
    ['a hyphen is not the em dash', '  - 2026-08-23T11:00 owner: evidence-accept data-schema - offline'],
    ['an en dash is not the em dash', '  - 2026-08-23T11:00 owner: evidence-accept data-schema – offline'],
    ['an empty reason is not a reason', '  - 2026-08-23T11:00 owner: evidence-accept data-schema — '],
    ['punctuation is not a reason', '  - 2026-08-23T11:00 owner: evidence-accept data-schema — ——'],
    ['the keyword must OPEN the payload', '  - 2026-08-23T11:00 owner: we should evidence-accept data-schema — offline'],
    ['a refusal is not a grant', '  - 2026-08-23T11:00 owner: do not evidence-accept data-schema — not yet'],
    ['the keyword is lowercase-exact', '  - 2026-08-23T11:00 owner: Evidence-Accept data-schema — offline'],
    ['a superstring id authorizes only itself', '  - 2026-08-23T11:00 owner: evidence-accept data-schema-2 — offline'],
    ['ids are machine tokens, compared case-sensitively', '  - 2026-08-23T11:00 owner: evidence-accept Data-Schema — offline'],
    ['generic accept prose authorizes nothing', '  - 2026-08-23T11:00 owner: data-schema evidence accepted — offline'],
    ['and neither does the word accept alone', '  - 2026-08-23T11:00 owner: accept data-schema — offline'],
  ];
  for (const [why, entry] of refused) {
    assert.strictEqual(grants(entry), false, `${why}: ${entry}`);
    const b = rd.evidenceFindings(flow(entry)).blockers;
    assert.ok(b.some((x) => /^open item data-schema is pending/.test(x)), why);
  }

  // a shorter timestamp form the archive stamp itself uses is still a timestamp
  assert.strictEqual(grants('  - 2026-08-23T1100 owner: evidence-accept data-schema — offline'), true);

  // an entry about LS-10 never satisfies LS-1, in either direction
  const ids = 'change: c\nlineage: v6\nphase: review\ngates:\n'
    + '  - 2026-08-23T11:00 owner: evidence-accept LS-10 — the owner took it\n';
  assert.strictEqual(rd.ownerAccepted(ids, 'LS-1'), false);
  assert.strictEqual(rd.ownerAccepted(ids, 'LS-10'), true);

  // gates: is append-only, so the LAST decision for an id wins
  const seq = (...entries) => rd.ownerAccepted(flow(entries.join('\n')), 'data-schema');
  const REVOKE = '  - 2026-08-23T12:00 owner: evidence-accept-revoke data-schema — the risk grew';
  const REGRANT = '  - 2026-08-23T13:00 owner: evidence-accept data-schema — re-authorized';
  assert.strictEqual(seq(CANON), true);
  assert.strictEqual(seq(CANON, REVOKE), false, 'a revoke revokes');
  assert.strictEqual(seq(CANON, REVOKE, REGRANT), true, 'and the last decision wins');
  assert.strictEqual(seq(REVOKE), false, 'a revoke alone grants nothing');
  assert.strictEqual(seq(REVOKE, CANON), true);
  // an unreasoned revoke is ignored exactly as an unreasoned grant is
  assert.strictEqual(seq(CANON, '  - 2026-08-23T12:00 owner: evidence-accept-revoke data-schema — ——'), true);

  // the decision must live in the append-only log — a line pasted into a prose section is not one
  const outside = 'change: c\nlineage: v6\nphase: review\n'
    + 'gates:\n  - 2026-08-23T00:00 note: scaffolded\n'
    + '\n## Open\n- data-schema: the v1 risk\n'
    + '- 2026-08-23T11:00 owner: evidence-accept data-schema — offline\n';
  assert.strictEqual(rd.ownerAccepted(outside, 'data-schema'), false, 'the gates: block ends at the heading');

  // and the payload extractor itself refuses what is not an owner decision
  assert.strictEqual(rd.ownerPayload('- 2026-08-23T11:00 owner: evidence-accept x — r'), 'evidence-accept x — r');
  for (const bad of ['- 2026-08-23T11:00 note: evidence-accept x — r', '- owner: evidence-accept x — r',
    '- 2026-13-01T11:00 owner: evidence-accept x — r', '- 2026-08-23T24:00 owner: evidence-accept x — r',
    '- 2026-08-23T11:60 owner: evidence-accept x — r', '- 2026-08-23T11:00 ownership: evidence-accept x — r'])
    assert.strictEqual(rd.ownerPayload(bad), null, bad);
});

test('RY-28 the owner exit is spent end to end, at the gate and at the archive', () => {
  const CANON = '  - 2026-08-23T11:00 owner: evidence-accept data-schema — the staging DB is offline until Q4\n';
  const FAKE = '  - 2026-08-23T11:00 producer: evidence-accept data-schema — I accept my own risk\n';
  const ITEM = ['data-schema: the staging DB is offline, restart recovery unverified'];

  // a pending item, self-authorized: refused at both surfaces, and --force is not a decision
  const fake = project({ open: ITEM, gates: FAKE });
  assert.match(line(gate(fake).stdout, 'C9'), /BLOCKED — open item data-schema is pending/);
  assert.strictEqual(archive(fake, ['--force']).status, 1);
  assert.strictEqual(r5of(fake, true).length, 1);
  assert.strictEqual(r5of(fake, true)[0].forceable, false, 'missing reality is not progress');

  // the owner's own decision, recorded: the item is accepted, still present, and both surfaces open
  const real = project({ open: ITEM, gates: CANON });
  assert.strictEqual(gate(real).status, 0, gate(real).stdout);
  assert.strictEqual(archive(real).status, 0, archive(real).stdout + archive(real).stderr);
  // and the archive NAMES the accepted risk in its frozen declaration
  assert.match(archive(real).stdout, /critical evidence: complete, 1 risk\(s\) accepted by the owner \(data-schema\), still present/);
});

// ---------------------------------------------------------------------------
// RY-23 — the mutation the tool PROVED
// ---------------------------------------------------------------------------

test('RY-23 a proven contract mutation is reported as a signal and demands no reserved row', () => {
  // 6.2: the `contract-mutation` row demand is gone. The scan still proves the mutation, and
  // every surface still says so — as information, whatever `mode:` says or does not say.
  for (const mode of [null, 'fast', 'standard']) {
    const b = project({ mode, delta: MUTATION });
    assert.deepStrictEqual(risk.scanDeltas(b.dir).map((s) => s.signal), ['contract-mutation'], `${mode}: the scan sees it`);
    const g = gate(b);
    assert.strictEqual(g.status, 0, `${mode}: nothing is owed for it\n${g.stdout}`);
    assert.match(line(g.stdout, 'C9'), /^✓ C9 no open items; risk: contract-mutation: kv\/spec\.md MODIFIED 'Alpha'$/, String(mode));
    assert.doesNotMatch(g.stdout, /owes an answer|→ standard/, String(mode));
    assert.strictEqual(r5of(b).length, 0, String(mode));
    assert.strictEqual(archive(b).status, 0, String(mode));
    const j = JSON.parse(run(['status', '--change', 'c', '--json'], b.root).stdout);
    assert.deepStrictEqual(j.risk.map((s) => s.signal), ['contract-mutation'], String(mode));
    assert.strictEqual(j.effectiveMode, mode, 'effectiveMode is the declared mode, or null');
  }
  // an open item spelled `contract-mutation` is just an item: pending until accepted, like any other
  const named = project({ delta: MUTATION, open: ['contract-mutation: the consumer ships next quarter'] });
  assert.match(line(gate(named).stdout, 'C9'), /open item contract-mutation is pending/);
  const acc = project({ delta: MUTATION, open: ['contract-mutation: the consumer ships next quarter'],
    gates: '  - 2026-08-23T11:00 owner: evidence-accept contract-mutation — the consumer ships next quarter\n' });
  assert.match(line(gate(acc).stdout, 'C9'), /^✓ C9 1 open item\(s\): 1 accepted, still present \(contract-mutation\), 0 pending; risk: contract-mutation/);
});

// ---------------------------------------------------------------------------
// RY-25 — a scan that could not rule the risk out
// ---------------------------------------------------------------------------

test('RY-25 an unreadable delta is fail-closed and no open item or acceptance cures it',
  { skip: canSymlink() ? false : 'platform refuses symlinks' }, () => {
  // no open item at all, plus an owner acceptance aimed straight at the signal name: the most
  // complete answer a producer can write, against a scan that could not be made.
  const GRANT = '  - 2026-08-23T11:00 owner: evidence-accept unreadable-delta — please just ship it\n';

  const cases = [
    ['specs/ is a dangling symlink', (root, dir) => {
      fs.rmSync(path.join(dir, 'specs'), { recursive: true });
      fs.symlinkSync(path.join(root, 'nowhere'), path.join(dir, 'specs'));
    }],
    ['specs/ resolves outside the bundle', (root, dir) => {
      w(path.join(root, 'elsewhere', 'kv', 'spec.md'), ADDED);
      fs.rmSync(path.join(dir, 'specs'), { recursive: true });
      fs.symlinkSync(path.join(root, 'elsewhere'), path.join(dir, 'specs'));
    }],
    ['a delta file escapes the bundle', (root, dir) => {
      w(path.join(root, 'outside.md'), ADDED);
      fs.rmSync(path.join(dir, 'specs', 'kv', 'spec.md'));
      fs.symlinkSync(path.join(root, 'outside.md'), path.join(dir, 'specs', 'kv', 'spec.md'));
    }],
  ];
  for (const [why, breakIt] of cases) {
    const p = project({ gates: GRANT });
    breakIt(p.root, p.dir);
    assert.deepStrictEqual(risk.scanDeltas(p.dir).map((s) => s.signal), ['unreadable-delta'], why);
    // the archive predicate refuses, and it is not forceable
    const r5 = r5of(p, true);
    assert.ok(r5.some((b) => /the delta scan could not rule out a §6 risk/.test(b.detail)), `${why}: ${JSON.stringify(r5)}`);
    assert.ok(r5.every((b) => b.forceable === false), why);
    // Neither surface ships it. The exit code is whichever guard speaks first — delta DISCOVERY
    // refuses the same unreadable path with exit 2 (the evaluation is untrustworthy) before R5
    // gets to say so. What matters is that no path reaches 0, and nothing is written.
    const a = archive(p, ['--force']);
    assert.notStrictEqual(a.status, 0, `${why}: ${a.stdout}${a.stderr}`);
    assert.doesNotMatch(a.stdout, /RESULT: MERGED/, why);
    const g = gate(p);
    assert.notStrictEqual(g.status, 0, `${why}: ${g.stdout}`);
    assert.doesNotMatch(g.stdout, /GATE: PASS/, why);
  }
});

// ---------------------------------------------------------------------------
// RY-26 — the optional legacy ledger
// ---------------------------------------------------------------------------

test('RY-26 the legacy ledger is never read, and no ledger state closes the review floor', () => {
  // 6.2: the ledger has no reader. An open row is not a finding, not a note, not an R3 rule.
  for (const st of ['open', 'Open', 'open — still waiting on staging', 'verified', 'frobnicated']) {
    const p = project({ ledger: LED(st) });
    const r = rd.readinessOf({ bundleDir: p.dir, name: 'c' });
    assert.strictEqual(r.ready, true, `${st}: ${JSON.stringify(r.blockers)}`);
    assert.ok(!r.blockers.some((b) => b.rule === 'R3') && !r.notes.some((n) => /R3|Q-1/.test(n)), st);
  }
  // and no ledger state closes the reviewer's latest word — the floor is the evidence's alone
  for (const verdict of ['3 issues open', 'gaps found', 'escalate']) {
    for (const [why, ledger] of [
      ['no ledger at all', null],
      ['a fully verified ledger', LED('verified')],
      ['an empty ledger table', '| ID | Issue | Risk | Round found | Status |\n|---|---|---|---|---|\n'],
    ]) {
      const p = project({ ledger, verdict });
      const r4 = rd.readinessOf({ bundleDir: p.dir, name: 'c' }).blockers.filter((b) => b.rule === 'R4');
      assert.ok(r4.some((b) => b.class === 'review'), `${verdict} / ${why}: ${JSON.stringify(r4)}`);
      assert.match(line(gate(p).stdout, 'C8'), /the independent review has not resolved/, `${verdict} / ${why}`);
      assert.strictEqual(archive(p).status, 1, `${verdict} / ${why}`);
    }
  }
  // an accepting latest verdict is what closes it — the ledger neither helps nor hinders
  for (const ledger of [null, LED('verified'), LED('open')])
    assert.strictEqual(rd.readinessOf({ bundleDir: project({ ledger, verdict: '0 issues open' }).dir, name: 'c' }).ready,
      true, String(ledger));
});

// ---------------------------------------------------------------------------
// RY-27 — the state's own claims
// ---------------------------------------------------------------------------

test('RY-27 the state own claims block review-ready and archive; the Next cap only reports', () => {
  // [why, the Open items / sections, what C9 says, whether review-ready also refuses]. An open
  // item WITH an id is what a review is for, so it never fails review-ready; a claim the Open
  // section cannot carry (no id) or that lives outside it (an assumption) blocks the gate and
  // the archive, and only the unreadable Open section fails review-ready too.
  const claims = [
    ['an open item without an id', { open: ['the retry path is unproven'] }, /open item has no id: 'the retry path is unproven'/, true],
    ['an open item with an id', { open: ['R-01: the retry path is unproven'] }, /open item R-01 is pending: the retry path is unproven/, false],
    ['an unverified assumption', { sections: '## Reality Check\n- assumption: the staging schema matches production\n\n' },
      /unverified assumption: the staging schema matches production/, false],
    ['a Reality Check line naming no kind', { sections: '## Reality Check\n- I forgot to name a kind\n\n' },
      /Reality Check entry names no kind/, false],
  ];
  for (const [why, opts, re, failsReviewReady] of claims) {
    const p = project(opts);
    assert.match(line(gate(p).stdout, 'C9'), re, why);
    const rr = gate(p, ['--review-ready']);
    assert.strictEqual(rr.status, failsReviewReady ? 1 : 0, `${why}: ${rr.stdout}`);
    if (failsReviewReady) assert.match(rr.stdout, /✗ open/, why);
    const a = archive(p, ['--force']);
    assert.strictEqual(a.status, 1, why);
    assert.match(a.stderr, re, why);
    assert.doesNotMatch(a.stdout, /ARCHIVE DECLARES/, `${why}: a refused archive declares nothing`);
  }
  // A new change is not born unfinished — because the scaffold writes BARE headings, not because
  // a text heuristic guesses which claims are real. An `## Open` line is a claim whatever it says.
  const scaffold = project({ sections:
    '## Open                  # substantive unresolved items — one line each: - <ID>: <text>\n\n'
    + '## Reality Check         # observed / decision / assumption\n\n' });
  assert.strictEqual(gate(scaffold).status, 0, gate(scaffold).stdout);
  assert.strictEqual(gate(scaffold, ['--review-ready']).status, 0);
  // and a line that merely LOOKS like a placeholder is still a claim nobody closed
  const looksLike = project({ open: ['<a substantive issue nobody has closed yet>'] });
  assert.strictEqual(gate(looksLike).status, 1, gate(looksLike).stdout);

  // more than three next actions is a DIAGNOSTIC: the state is over its budget, the product is not
  const many = project({ sections: '## Next\n- one\n- two\n- three\n- four\n- five\n\n' });
  assert.strictEqual(gate(many).status, 0, gate(many).stdout);
  assert.strictEqual(gate(many, ['--review-ready']).status, 0);
  assert.strictEqual(archive(many).status, 0);
  const s = run(['status', '--change', 'c'], many.root).stdout;
  assert.match(s, /next:         5 actions listed — the state carries at most 3/);
  assert.strictEqual(run(['status', '--change', 'c', '--escalation'], many.root).status, 0,
    'a long next list is not something a human has to decide');
});

// ---------------------------------------------------------------------------
// GT-41 — the two inputs C9 cannot derive for itself
// ---------------------------------------------------------------------------

test('GT-41 gate, archive and status all judge the state on the same input — the delta scan', () => {
  // 6.2: the effective mode is gone, so the ONE thing C9 cannot derive for itself is the scan.
  // A mutating delta with a pending open item: the mutation is a note, the item is the refusal.
  const p = project({ mode: 'standard', delta: MUTATION, open: ['R-01: the consumer ships next quarter'] });
  const res = gateLib.runGate({ cwd: p.root, change: 'c', testCmd: TAP1, noCas: true });
  assert.deepStrictEqual(res.evidenceOpts, { stage: 'in-flight', riskSignals: risk.scanDeltas(p.dir) });
  assert.strictEqual(res.evidenceOpts.riskSignals.length, 1, 'the mutation is in the opts');

  // archive's R5 refuses on exactly the same findings, from the same input
  const want = rd.evidenceFindings(fs.readFileSync(path.join(p.dir, 'flow-state.md'), 'utf8'),
    { riskSignals: risk.scanDeltas(p.dir) });
  assert.deepStrictEqual(want.blockers.map((b) => b.split(':')[0]), ['open item R-01 is pending']);
  assert.deepStrictEqual(want.notes, ["risk: contract-mutation: kv/spec.md MODIFIED 'Alpha'"]);
  assert.deepStrictEqual(r5of(p).map((b) => b.detail), want.blockers);
  // …and status reports them rather than being the one permissive surface
  const j = JSON.parse(run(['status', '--change', 'c', '--json'], p.root).stdout);
  assert.deepStrictEqual(j.escalations, want.blockers);
  assert.deepStrictEqual(j.risk, risk.scanDeltas(p.dir));

  // frozen history is never re-scanned: an archived bundle's C9 reports instead of re-judging
  const arch = project({ mode: 'fast', delta: MUTATION, open: ['the retry path is unproven'] });
  fs.mkdirSync(path.join(arch.root, 'apriori', 'changes', 'archive'), { recursive: true });
  fs.renameSync(arch.dir, path.join(arch.root, 'apriori', 'changes', 'archive', '2026-01-01T0000-c'));
  const ares = gateLib.runGate({ cwd: arch.root, change: 'c', testCmd: TAP1, noCas: true });
  assert.deepStrictEqual(ares.evidenceOpts, { stage: 'archived', riskSignals: [] });
  assert.strictEqual(ares.checks.find((c) => c.id === 'C9').status, 'n/a');
  assert.match(ares.checks.find((c) => c.id === 'C9').detail, /does not apply retroactively/);
  // status takes the stage for the same reason. A frozen record reporting a live refusal was
  // telling a human to edit a finished archive — the one thing §8 forbids — and exiting 3 on
  // work that shipped. The findings stay visible as RECORDED; they stop being escalations.
  const aj = JSON.parse(run(['status', '--change', 'c', '--json'], arch.root).stdout);
  assert.strictEqual(aj.stage, 'archived');
  assert.deepStrictEqual(aj.openItems.map((i) => [i.id, i.accepted]), [[null, false]]);
  assert.deepStrictEqual(aj.risk, [], 'the delta is not re-scanned either');
  assert.deepStrictEqual(aj.escalations, [], 'frozen history is not a reason to wait on a human');
  const ae = run(['status', '--change', 'c', '--escalation'], arch.root);
  assert.strictEqual(ae.status, 0);
  assert.match(run(['status', '--change', 'c'], arch.root).stdout,
    /^recorded: {5}not re-judged \(archived\) — open item has no id: 'the retry path is unproven'/m);
});

// ---------------------------------------------------------------------------
// AM-120 — the declaration backstop
// ---------------------------------------------------------------------------

test('AM-120 an archive may not succeed while its own declaration says INCOMPLETE', () => {
  // R5 is what refuses in production. This drives the readiness seam to READY — the state a
  // softened or bypassed R5 would produce — and proves the declaration itself still refuses.
  const READY = () => ({ ready: true, blockers: [], forced: [], na: [], notes: [], grant: null });
  for (const [why, opts] of [
    ['a pending open item', { open: ['R-01: the retry path is unproven'] }],
    ['an open item without an id', { open: ['the retry path is unproven'] }],
    ['a standing assumption', { sections: '## Reality Check\n- assumption: the schema matches\n\n' }],
  ]) {
    const p = project(opts);
    const r = am.archiveChange({ cwd: p.root, change: 'c', noCas: true, readinessOf: READY });
    assert.strictEqual(r.code, 1, why);
    assert.match(r.out.join('\n'), /implementation:    INCOMPLETE/, why);
    assert.match(r.out.join('\n'), /RESULT: NOT READY — nothing written/, why);
    assert.match(r.err.join('\n'), /the declaration says the implementation is INCOMPLETE/, why);
    assert.strictEqual(am.archiveDeclaration(p.dir).incomplete, true, why);
    // …and with --write it is still a refusal: nothing merged, nothing moved
    const wr = am.archiveChange({ cwd: p.root, change: 'c', noCas: true, write: true,
      changesDir: 'apriori/changes', changesDirExplicit: true, readinessOf: READY });
    assert.strictEqual(wr.code, 1, why);
    assert.strictEqual(fs.readFileSync(path.join(p.root, 'apriori', 'specs', 'kv', 'spec.md'), 'utf8'), STORE, why);
    assert.ok(fs.existsSync(p.dir), `${why}: the bundle must not have moved`);
  }
  // the clean bundle declares three states and exactly three
  const clean = project();
  const d = am.archiveDeclaration(clean.dir);
  assert.strictEqual(d.incomplete, false);
  assert.deepStrictEqual(d.lines.filter((l) => /^ {2}\w/.test(l)).map((l) => l.trim().split(':')[0]),
    ['implementation', 'critical evidence', 'delivery']);
  assert.strictEqual(archive(clean).status, 0);
});

// ---------------------------------------------------------------------------
// RY-29 / AM-121 — the SAME canonical owner entry, for all three decisions
// ---------------------------------------------------------------------------

// Every way a line can look like an owner decision without being one. Each verb below is fed
// this same table, because the whole point of the fix is that they share one parser: a verb
// that is more forgiving than its neighbours is a door around the neighbour's lock.
const NEAR_MISSES = [
  ['a producer may not authorize itself', 'producer: ', ''],
  ['a note is not a decision', 'note: ', ''],
  ['an agent is not the owner', 'agent: ', ''],
  ['the retired gate-number actor is not `owner`', 'gate⑤ (owner): ', ''],
  ['`ownership:` is not `owner:`', 'ownership: ', ''],
  ['an undated line is nobody\'s decision', 'OWNER-NO-TS', ''],
  ['a timestamp-shaped non-timestamp is not a timestamp', 'BAD-TS', ''],
  ['the verb must OPEN the payload', 'owner: ', 'we should '],
  ['a refusal is not a grant', 'owner: ', 'do not '],
];
// -> the whole gates: entry for one near miss, given a verb payload
function nearMiss(prefix, lead, payload) {
  if (prefix === 'OWNER-NO-TS') return `  - owner: ${lead}${payload}`;
  if (prefix === 'BAD-TS') return `  - 9999-99-99T99:99 owner: ${lead}${payload}`;
  return `  - 2026-08-23T11:00 ${prefix}${lead}${payload}`;
}
const CANON = (payload) => `  - 2026-08-23T11:00 owner: ${payload}`;
const gatesOf = (entries) => 'change: c\nlineage: v6\nphase: review\ngates:\n'
  + `  - 2026-08-23T00:00 note: scaffolded\n${entries.join('\n')}\n`;

test('RY-29 the three owner decisions read ONE canonical entry, and no verb is looser', () => {
  // verb -> [a payload that authorizes, the predicate that answers, what "authorized" means]
  const VERBS = [
    ['archive-force', 'archive-force ledger — 还差两项文档',
      (t) => { const g = rd.forceGrant(t); return !!g && g.granted; }],
    ['evidence-accept', 'evidence-accept data-schema — the staging DB is offline',
      (t) => rd.ownerAccepted(t, 'data-schema')],
    ['reframe', 'reframe code-review round 5 accept-risk — the owner accepts the residual risk',
      (t) => rv.reframeDecisions(t).has('code-review#5')],
  ];
  for (const [verb, payload, authorized] of VERBS) {
    assert.strictEqual(authorized(gatesOf([CANON(payload)])), true, `${verb}: the canonical entry must authorize`);
    for (const [why, prefix, lead] of NEAR_MISSES)
      assert.strictEqual(authorized(gatesOf([nearMiss(prefix, lead, payload)])), false, `${verb}: ${why}`);
    // the em dash and a real reason, for every verb alike
    const noDash = payload.replace(' — ', ' ');
    assert.strictEqual(authorized(gatesOf([CANON(noDash)])), false, `${verb}: no em dash`);
    assert.strictEqual(authorized(gatesOf([CANON(payload.replace(' — ', ' - '))])), false, `${verb}: a hyphen is not the em dash`);
    assert.strictEqual(authorized(gatesOf([CANON(payload.replace(/—.*$/, '— ——'))])), false, `${verb}: punctuation is not a reason`);
    assert.strictEqual(authorized(gatesOf([CANON(payload.replace(/—.*$/, '—'))])), false, `${verb}: no reason at all`);
    // …and a decision must live in the append-only log, not in a prose section below it
    assert.strictEqual(authorized(gatesOf([]) + `\n## Notes\n${CANON(payload)}\n`), false, `${verb}: outside gates:`);
  }

  // TARGETS are matched whole, per verb
  assert.strictEqual(rd.forceGrant(gatesOf([CANON('archive-force ledger2 — x')])), null, 'ledger2 is not ledger');
  assert.strictEqual(rd.forceGrant(gatesOf([CANON('archive-force-2 ledger — x')])), null, 'a near-miss verb');
  assert.strictEqual(rd.ownerAccepted(gatesOf([CANON('evidence-accept LS-10 — x')]), 'LS-1'), false);
  const wrong = rv.reframeDecisions(gatesOf([CANON('reframe code-review round 5 redo — x')]));
  assert.ok(!wrong.has('code-review#4') && !wrong.has('spec-review#5'), 'a reframe answers one family and one round');

  // append-only: the LAST decision for a target wins, for the two verbs that carry a revoke
  const G = CANON('archive-force ledger — 授权'), R = CANON('archive-force-revoke ledger — 收回');
  assert.strictEqual(rd.forceGrant(gatesOf([G])).granted, true);
  assert.strictEqual(rd.forceGrant(gatesOf([G, R])).granted, false);
  assert.strictEqual(rd.forceGrant(gatesOf([G, R, CANON('archive-force ledger — 重新授权')])).granted, true);
  const A = CANON('evidence-accept data-schema — 授权'), AR = CANON('evidence-accept-revoke data-schema — 收回');
  assert.strictEqual(rd.ownerAccepted(gatesOf([A, AR]), 'data-schema'), false);
  assert.strictEqual(rd.ownerAccepted(gatesOf([A, AR, A]), 'data-schema'), true);
  // and the reframe, which carries no revoke verb, still lets the last entry for a round win
  const last = rv.reframeDecisions(gatesOf([CANON('reframe code-review round 2 split — 先拆'),
    CANON('reframe code-review round 2 redo — 改做法')])).get('code-review#2');
  assert.strictEqual(last.decision, 'redo');

  // one parser: gatesEntriesRaw hands every consumer the same payload, or null
  const raw = rd.gatesEntriesRaw(gatesOf([CANON('archive-force ledger — r'), '  - 2026-08-23T11:00 note: just history']));
  assert.deepStrictEqual(raw.map((e) => e.payload), [null, 'archive-force ledger — r', null]);
});

test('AM-121 the owner exit keeps its double action, and the printed cure is copyable', () => {
  // 6.2: the ledger class is gone, so `archive-force` has nothing left to force — the record is
  // reported as a note and changes no verdict, with or without --force
  const rec = CANON('archive-force ledger — the owner says ship it') + '\n';
  const inert = archive(project({ ledger: LED('open'), gates: rec }));
  assert.strictEqual(inert.status, 0, inert.stdout + inert.stderr);
  assert.match(inert.stdout, /^note: archive-force has nothing left to force in 6\.2$/m);
  assert.doesNotMatch(inert.stdout, /^forced:/m);

  // R4 — a round-5 escalation, the ONE double action left. Five rounds of one family.
  const five = (gates) => {
    const p = project({ gates });
    for (let i = 1; i <= 5; i++) {
      w(path.join(p.dir, 'review', `code-review-v${i}.md`), `# r${i}\n\nVERDICT: 3 issues open\n`);
      w(path.join(p.dir, 'review', `code-review-v${i}-raw.txt`), 'raw\n');
    }
    fs.rmSync(path.join(p.dir, 'review', 'code-review-v1.md'));
    w(path.join(p.dir, 'review', 'code-review-v1.md'), '# r1\n\nVERDICT: 3 issues open\n');
    return p;
  };
  const ACK = CANON('reframe code-review round 5 accept-risk — the owner accepts the residual risk') + '\n';
  assert.strictEqual(archive(five(ACK)).status, 1, 'the record alone is not a --force');
  assert.strictEqual(archive(five(''), ['--force']).status, 1, '--force alone is not a decision');
  assert.strictEqual(archive(five(ACK), ['--force']).status, 0, archive(five(ACK), ['--force']).stderr);
  for (const [why, prefix, lead] of NEAR_MISSES) {
    const p = five(nearMiss(prefix, lead, 'reframe code-review round 5 accept-risk — ship it') + '\n');
    assert.strictEqual(archive(p, ['--force']).status, 1, why);
  }

  // THE CURE THE TOOL PRINTS MUST WORK WHEN PASTED. A template that names only the verb was
  // handing a human a line that no longer authorizes anything once the prefix became binding.
  const stuck = five('');
  const refusal = archive(stuck, ['--force']).stderr;
  const printed = refusal.split('\n').map((l) => l.trim())
    .filter((l) => /^- <YYYY-MM-DDTHH:MM> owner: /.test(l));
  assert.strictEqual(printed.length, 1, `exactly one copyable cure, for the one forceable class:\n${refusal}`);
  assert.doesNotMatch(refusal, /archive-force/, 'no retired template is offered');
  const fill = (tmpl) => '  ' + tmpl
    .replace('<YYYY-MM-DDTHH:MM>', '2026-08-23T11:00')
    .replace(/<split\|tests\|redo(\|accept-risk)?>/, 'accept-risk')
    .replace('<reason>', 'the owner accepts the residual risk');
  const pasted = five(printed.map(fill).join('\n') + '\n');
  const after = archive(pasted, ['--force']);
  assert.strictEqual(after.status, 0,
    `a template the tool printed did not authorize when pasted:\n${printed.map(fill).join('\n')}\n${after.stderr}`);
});

// ---------------------------------------------------------------------------
// Review-5 regressions — RY-30..RY-32, AM-122, GT-43, GT-44
//
// Five root causes, each a way a claim or a gap became invisible: a documented heading the
// reader did not recognise, a text heuristic that deleted real claims, a second count that
// disagreed with the predicate, a status that cleared a check it had not answered, and a
// checklist item measuring nothing. The sixth test walks the whole scaffold path.
// ---------------------------------------------------------------------------

test('RY-30 an annotated heading is a heading — a claim under one does not vanish', () => {
  // This is the form the RUNBOOK's state template prints and `apriori new` scaffolds. A reader
  // that only matched the bare heading read the section as ABSENT: the claims did not block,
  // did not print, and did not exist.
  for (const [why, head] of [
    ['bare', '## Open'],
    ['annotated', '## Open                  # substantive issues nobody has closed yet'],
    ['annotated, one space', '## Open # substantive issues'],
    ['deeper level, annotated', '### Open   # still a heading'],
  ]) {
    // the project() helper writes its own (empty) Open section; this test writes the heading it is about
    const p = project({ sections: `${head}\n- R-01: the retry path is unproven\n\n` });
    const flow = fs.readFileSync(path.join(p.dir, 'flow-state.md'), 'utf8').replace('\n## Open\n\n\n', '\n');
    fs.writeFileSync(path.join(p.dir, 'flow-state.md'), flow);
    assert.deepStrictEqual(status.sectionItems(flow, 'Open'), ['R-01: the retry path is unproven'], why);
    assert.strictEqual(gate(p).status, 1, `${why}: ${gate(p).stdout}`);
    assert.match(line(gate(p).stdout, 'C9'), /open item R-01 is pending: the retry path is unproven/, why);
  }
  // the same for the Reality Check, whose `assumption` lines are the other blocking claim
  const rc = project({
    sections: '## Reality Check         # §4 Ground writes this\n- assumption: the staging schema matches\n\n' });
  assert.match(line(gate(rc).stdout, 'C9'), /unverified assumption: the staging schema matches/);
  assert.match(run(['status', '--change', 'c'], rc.root).stdout, /assumption:   the staging schema matches/);
  // and a heading is still matched WHOLE — `## Openness` is not `## Open`
  const other = project({ sections: '## Openness\n- not an open issue\n\n' });
  assert.strictEqual(gate(other).status, 0, gate(other).stdout);
});

test('RY-31 a claim carrying angle brackets is a claim; nothing is filtered as a scaffold', () => {
  // The broad `<…> anywhere` rule deleted exactly the claims a real project writes. 6.2 keeps no
  // scaffold filter at all: `apriori new` writes bare headings, so there is no unfilled row to skip.
  for (const [why, opts, re] of [
    ['a generic in an open item', { open: ['R-01: Map<Key> lookups are unproven under contention'] }, /open item R-01 is pending: Map<Key> lookups are unproven/],
    ['a generic in an id-less open item', { open: ['Map<Key> lookups are unproven under contention'] }, /open item has no id: 'Map<Key> lookups are unproven/],
    ['a generic in an assumption', { sections: '## Reality Check\n- assumption: List<T> ordering is stable\n\n' }, /List<T> ordering is stable/],
    ['a generic in an unreadable line', { sections: '## Reality Check\n- List<T> ordering — I forgot the kind\n\n' }, /names no kind/],
  ]) {
    const p = project(opts);
    assert.match(line(gate(p).stdout, 'C9'), re, why);
    assert.strictEqual(archive(p, ['--force']).status, 1, why);
  }
  // an accepted item carrying generics is a real, accepted item
  const real = project({ open: ['R-01: the Map<Key> column shape is unverified'],
    gates: '  - 2026-08-23T11:00 owner: evidence-accept R-01 — the shape matched on staging\n' });
  assert.strictEqual(gate(real).status, 0, gate(real).stdout);
  const items = rd.evidenceFindings(fs.readFileSync(path.join(real.dir, 'flow-state.md'), 'utf8')).items;
  assert.deepStrictEqual(items.map((i) => [i.id, i.text, i.accepted]), [['R-01', 'the Map<Key> column shape is unverified', true]]);
  // the scaffold's own unfilled-looking token is an id-less item like any other — it blocks
  const scaffoldish = project({ open: ['<ID>: <text>'] });
  assert.match(line(gate(scaffoldish).stdout, 'C9'), /open item <ID> is pending: <text>/);
});

test('AM-122 the declaration reads the predicate, and "complete" means accepted or absent', () => {
  const flow = (dir) => fs.readFileSync(path.join(dir, 'flow-state.md'), 'utf8');
  // ONE count. The declaration used to walk the state again, and the two walks disagreed.
  for (const opts of [{ open: ['R-01: Map<Key> is unproven'] },
    { sections: '## Reality Check\n- assumption: the schema matches\n\n' },
    { open: ['one', 'two'] }]) {
    const p = project(opts);
    const decl = am.archiveDeclaration(p.dir);
    const f = rd.evidenceFindings(flow(p.dir));
    const pending = f.items.filter((i) => !i.accepted).length;
    assert.strictEqual(decl.incomplete, true, JSON.stringify(opts));
    assert.ok(decl.lines.join('\n').includes(
      `INCOMPLETE — ${pending} pending open item(s), ${f.claims.assumption.length} unverified assumption(s)`),
    `${JSON.stringify(opts)}\n${decl.lines.join('\n')}`);
    // …and readiness refuses the same bundle, so the backstop can never contradict R5
    assert.strictEqual(rd.readinessOf({ bundleDir: p.dir, name: 'c' }).ready, false, JSON.stringify(opts));
  }
  // `critical evidence` counts ACCEPTED items, and names them
  const ev = (open, gates) => am.archiveDeclaration(project({ open, gates }).dir).lines[3];
  assert.match(ev([]), /critical evidence: complete$/);
  assert.match(ev(['R-01: a'], '  - 2026-08-23T11:00 owner: evidence-accept R-01 — the staging DB is offline\n'),
    /critical evidence: complete, 1 risk\(s\) accepted by the owner \(R-01\), still present$/);
  assert.match(ev(['R-01: a']), /critical evidence: 1 open item\(s\) still pending$/);
  assert.match(ev(['R-01: a'], '  - 2026-08-23T11:00 producer: evidence-accept R-01 — I accept my own risk\n'),
    /critical evidence: 1 open item\(s\) still pending$/);
});

test('GT-44 review-ready reports two measured items and promises nothing', () => {
  const p = project();
  const r = gate(p, ['--review-ready']);
  assert.strictEqual(r.status, 0, r.stdout);
  assert.deepStrictEqual((r.stdout.match(/^[✓✗] (\S+)/gm) || []).map((l) => l.slice(2)), ['tests', 'open'], r.stdout);
  // the deleted items and the deleted promise, by name
  assert.doesNotMatch(r.stdout, /reviewer-context|producer-diff|evidence/);
  assert.doesNotMatch(r.stdout, /uncovered boundaries/);
  assert.doesNotMatch(r.stdout, /the reviewer gets/);
  assert.match(r.stdout, /^REVIEW-READY: YES$/m);
  // the JSON face carries the same two and no third
  const j = JSON.parse(gate(p, ['--review-ready', '--json']).stdout);
  assert.deepStrictEqual(j.items.map((i) => i.id), ['tests', 'open']);
  assert.strictEqual(j.ready, true);
  // what it prints instead is a fact the run already held
  assert.match(r.stdout, /^delta specs: kv\/spec\.md$/m);
  const snapshot = () => spawnSync('find', [p.root, '-type', 'f'], { encoding: 'utf8' }).stdout.split('\n').sort().join('\n');
  const before = snapshot();
  gate(p, ['--review-ready']);
  assert.strictEqual(snapshot(), before, 'review-ready wrote a file');
});
