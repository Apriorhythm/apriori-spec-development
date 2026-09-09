'use strict';
// OI-01..OI-10 — 6.2 unifies risk acceptance on ONE mechanism: `## Open` items plus the
// owner's `evidence-accept <id>` entry. The `## Evidence` row table, its status vocabulary,
// the `producer-diff` self-certification, the standard/fast quota and the `contract-mutation`
// reserved row are gone. What replaces them is one predicate that gate C9, archive R5, the
// archive declaration and `status` all read:
//
//   - <ID>: <text>      an open item; pending until the owner records evidence-accept <ID>
//                       (accepted items do not block, but stay present and are reported)
//   - <no id>           still an open item — it blocks and CANNOT be accepted
//   duplicate ids       fail-closed, both lines named
//   empty / absent      nothing owed
//
// A legacy `## Evidence` section in an in-flight bundle migrates by rule (OI-04); an archived
// bundle is recorded, never re-judged (OI-09). `mode:` is optional and inert (OI-06).

const { test } = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const rd = require('../lib/readiness');
const risk = require('../lib/risk');
const am = require('../lib/archive-merge');
const gateLib = require('../lib/gate');
const status = require('../lib/status');

const BIN = path.join(__dirname, '..', 'bin', 'apriori.js');
const run = (args, cwd) => spawnSync('node', [BIN, ...args], { encoding: 'utf8', cwd });
const w = (p, s) => { fs.mkdirSync(path.dirname(p), { recursive: true }); fs.writeFileSync(p, s); return p; };

const STORE = '### Requirement: Alpha\n\n#### Scenario: XA-01 base\n- t\n';
const ADDED = '## ADDED Requirements\n\n### Requirement: Beta\n\n#### Scenario: XB-01 new\n- t\n';
const MUTATION = '## MODIFIED Requirements\n\n### Requirement: Alpha\n\n#### Scenario: XA-01 base\n- t\n- more\n';
const TAP2 = 'node -e "console.log(\'TAP version 13\');console.log(\'1..2\');console.log(\'ok 1 - XA-01 a\');console.log(\'ok 2 - XB-01 b\')"';
const TAP1 = 'node -e "console.log(\'TAP version 13\');console.log(\'1..1\');console.log(\'ok 1 - XA-01 a\')"';
const tapFor = (delta) => (delta === ADDED ? TAP2 : TAP1);

const EM = '—';
const ACCEPT = (id, reason = 'the owner accepts the residual risk', stamp = '2026-08-23T11:00') =>
  `  - ${stamp} owner: evidence-accept ${id} ${EM} ${reason}\n`;
const REVOKE = (id, reason = 'the risk grew') => `  - 2026-08-23T12:00 owner: evidence-accept-revoke ${id} ${EM} ${reason}\n`;

// One bundle shape: flow-state + delta + one accepting review round. `open` is the body of the
// `## Open` section (already `- ` prefixed lines), `sections` any extra section text, `head`
// extra top-level keys (e.g. a `mode:` line), `evidence` a legacy `## Evidence` body.
function project({ open = '', sections = '', gates = '', head = '', evidence = null, delta = ADDED,
  verdict = 'no major issues', archived = false } = {}) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'apriori-oi-'));
  w(path.join(root, 'apriori', 'specs', 'kv', 'spec.md'), STORE);
  const dir = archived
    ? path.join(root, 'apriori', 'changes', 'archive', '2026-01-01T0000-c')
    : path.join(root, 'apriori', 'changes', 'c');
  if (delta) w(path.join(dir, 'specs', 'kv', 'spec.md'), delta);
  const ev = evidence === null ? '' : `\n## Evidence\n${evidence}\n`;
  w(path.join(dir, 'flow-state.md'),
    `change: c\n${head}lineage: v6\nphase: review\n${ev}\n## Open                  # one line each\n${open}\n${sections}`
    + `gates:\n  - 2026-08-23T00:00 note: scaffolded\n${gates}`);
  w(path.join(dir, 'review', 'code-review-v1.md'), `# review r1\n\nVERDICT: ${verdict}\n`);
  w(path.join(dir, 'review', 'code-review-v1-raw.txt'), 'raw\n');
  return { root, dir, delta };
}
const flowOf = (p) => fs.readFileSync(path.join(p.dir, 'flow-state.md'), 'utf8');
const gate = (p, extra = []) => run(['gate', '--change', 'c', '--test-cmd', tapFor(p.delta), '--no-cas', ...extra], p.root);
const line = (out, id) => (out.split('\n').find((l) => l.includes(` ${id} `)) || '').trim();
const archive = (p, extra = []) => run(['archive', '--change', 'c', '--no-cas', ...extra], p.root);
const r5of = (p, force = false) =>
  rd.readinessOf({ bundleDir: p.dir, name: 'c', force }).blockers.filter((b) => b.rule === 'R5');
const statusJson = (p) => JSON.parse(run(['status', '--change', 'c', '--json'], p.root).stdout);

// ---------------------------------------------------------------------------
// OI-01 — the item grammar: id / no id / duplicate / empty
// ---------------------------------------------------------------------------

test('OI-01 an open item is `- <ID>: <text>`; no id still blocks and cannot be accepted; duplicates fail closed', () => {
  // the id is one token in front of the colon — the same shape evidence-accept targets
  const f = rd.evidenceFindings('## Open\n- R-01: restart recovery is unverified in the target runtime\n- producer-diff: I read the whole diff and know P0/P1 is zero\n');
  assert.deepStrictEqual(f.items.map((i) => [i.id, i.text, i.accepted, i.acceptedAt]), [
    ['R-01', 'restart recovery is unverified in the target runtime', false, null],
    ['producer-diff', 'I read the whole diff and know P0/P1 is zero', false, null],
  ]);
  assert.deepStrictEqual(f.blockers.map((b) => b.split(' — ')[0]),
    ['open item R-01 is pending: restart recovery is unverified in the target runtime',
      'open item producer-diff is pending: I read the whole diff and know P0/P1 is zero']);
  assert.match(f.blockers[0], /record the owner's decision: {3}- <YYYY-MM-DDTHH:MM> owner: evidence-accept R-01 — <the human's reason, verbatim>$/);

  // a line without an id is still an open item: it blocks, and no acceptance can reach it
  for (const [why, text] of [
    ['prose', 'the retry path is unproven'],
    ['a token then prose', 'D-1 is still open'],
    ['a generic that only looks like a placeholder', 'Map<Key> lookups are unproven under contention'],
    ['a scaffold-looking line', '<a substantive issue nobody has closed yet>'],
  ]) {
    const g = rd.evidenceFindings(`## Open\n- ${text}\n\ngates:\n${ACCEPT('D-1')}${ACCEPT('the')}`);
    assert.deepStrictEqual(g.items.map((i) => [i.id, i.accepted]), [[null, false]], why);
    assert.strictEqual(g.blockers.length, 1, why);
    assert.match(g.blockers[0], /^open item has no id: '/, why);
    assert.match(g.blockers[0], /give it a stable id to accept it, or close it$/, why);
  }

  // duplicate ids: a blocker naming both lines — never "the last one wins"
  const d = rd.evidenceFindings(`## Open\n- R-01: first\n- R-02: other\n- R-01: second\n\ngates:\n${ACCEPT('R-01')}`);
  assert.ok(d.blockers.some((b) => /^open item id 'R-01' is duplicated: 'R-01: first' and 'R-01: second' — one line per id$/.test(b)), d.blockers);
  assert.ok(!d.blockers.some((b) => /duplicated/.test(b) && /R-02/.test(b)), 'the well-formed neighbour is not blamed');

  // empty or absent: nothing owed — and an empty section never swallows the heading that follows
  // it (the heading match stops at the end of its own line, annotation or not)
  for (const text of ['', '## Open\n', '## Open                  # annotated, empty\n\n## Next\n- x\n', 'change: c\nphase: build\n',
    '## Open\n\n## Next\n- do the next thing\n', '## Open\n## Reality Check\n- observed: x — y\n', '## Open\n\n\n## Reality Check\n- assumption: still standing\n']) {
    const e = rd.evidenceFindings(text);
    assert.deepStrictEqual(e.items, [], JSON.stringify(text));
    assert.ok(!e.blockers.some((b) => /^open item/.test(b)), JSON.stringify(text));
  }
  assert.deepStrictEqual(status.sectionItems('## Open\n\n## Next\n- do the next thing\n', 'Next'), ['do the next thing']);

  // and the CLI face of the same three: gate C9, archive R5 and status agree
  const p = project({ open: '- R-01: restart recovery is unverified\n- prose without an id\n- R-01: again\n' });
  const c9 = line(gate(p).stdout, 'C9');
  assert.match(c9, /^✗ C9 BLOCKED — /);
  for (const re of [/open item R-01 is pending/, /open item has no id: 'prose without an id'/, /open item id 'R-01' is duplicated/])
    assert.match(c9, re);
  assert.deepStrictEqual(r5of(p, true).map((b) => b.forceable), [false, false, false, false], 'never forceable');
  assert.strictEqual(archive(p, ['--force']).status, 1);
  const j = statusJson(p);
  assert.deepStrictEqual(j.openItems.map((i) => [i.id, i.accepted]), [['R-01', false], [null, false], ['R-01', false]]);
  assert.deepStrictEqual(j.openIssues, ['R-01: restart recovery is unverified', 'prose without an id', 'R-01: again'], 'compat: the raw lines');
  const s = run(['status', '--change', 'c'], p.root).stdout;
  assert.match(s, /^open: {9}\[pending\] R-01: restart recovery is unverified$/m);
  assert.match(s, /^open: {9}\[pending\] prose without an id$/m);
});

// ---------------------------------------------------------------------------
// OI-02 — acceptance: the closed owner grammar, unchanged
// ---------------------------------------------------------------------------

test('OI-02 evidence-accept <id> settles one item; revoke, near misses and unknown ids do not', () => {
  const OPEN = '- R-01: restart recovery is unverified in the target runtime\n';
  const with_ = (gates) => rd.evidenceFindings(`## Open\n${OPEN}\ngates:\n  - 2026-08-23T00:00 note: scaffolded\n${gates}`);

  // the ONE form that authorizes: the item is accepted, still present, and no longer blocks
  const ok = with_(ACCEPT('R-01', 'the staging DB is offline until Q4'));
  assert.deepStrictEqual(ok.items, [{ id: 'R-01', text: 'restart recovery is unverified in the target runtime', accepted: true, acceptedAt: '2026-08-23T11:00' }]);
  assert.deepStrictEqual(ok.blockers, []);
  assert.deepStrictEqual(ok.notes, []);
  // the archive-stamp timestamp form is a timestamp too
  assert.strictEqual(with_(ACCEPT('R-01', 'r', '2026-08-23T1100')).items[0].acceptedAt, '2026-08-23T1100');

  // every near miss, each named by the way it used to get through — the item stays pending
  const refused = [
    ['a producer may not accept its own risk', '  - 2026-08-23T11:00 producer: evidence-accept R-01 — offline'],
    ['a note is not a decision', '  - 2026-08-23T11:00 note: evidence-accept R-01 — offline'],
    ['an agent is not the owner', '  - 2026-08-23T11:00 agent: evidence-accept R-01 — offline'],
    ['the retired gate⑤ actor form is not `owner:`', '  - 2026-08-23T11:00 gate⑤ (owner): evidence-accept R-01 — offline'],
    ['an undated line is nobody\'s decision', '  - owner: evidence-accept R-01 — offline'],
    ['a timestamp-shaped non-timestamp is not a timestamp', '  - 9999-99-99T99:99 owner: evidence-accept R-01 — offline'],
    ['no em dash: the id would absorb the prose', '  - 2026-08-23T11:00 owner: evidence-accept R-01 offline until Q4'],
    ['a hyphen is not the em dash', '  - 2026-08-23T11:00 owner: evidence-accept R-01 - offline'],
    ['an empty reason is not a reason', '  - 2026-08-23T11:00 owner: evidence-accept R-01 — '],
    ['punctuation is not a reason', '  - 2026-08-23T11:00 owner: evidence-accept R-01 — ——'],
    ['the keyword must OPEN the payload', '  - 2026-08-23T11:00 owner: we should evidence-accept R-01 — offline'],
    ['a refusal is not a grant', '  - 2026-08-23T11:00 owner: do not evidence-accept R-01 — not yet'],
    ['the keyword is lowercase-exact', '  - 2026-08-23T11:00 owner: Evidence-Accept R-01 — offline'],
    ['a superstring id authorizes only itself', '  - 2026-08-23T11:00 owner: evidence-accept R-011 — offline'],
    ['ids are machine tokens, compared case-sensitively', '  - 2026-08-23T11:00 owner: evidence-accept r-01 — offline'],
    ['generic accept prose authorizes nothing', '  - 2026-08-23T11:00 owner: R-01 evidence accepted — offline'],
  ];
  for (const [why, entry] of refused) {
    const f = with_(entry + '\n');
    assert.strictEqual(f.items[0].accepted, false, why);
    assert.ok(f.blockers.some((b) => /^open item R-01 is pending/.test(b)), why);
  }
  // the decision must live in the append-only log — pasted under a prose heading it is prose
  const outside = rd.evidenceFindings(`## Open\n${OPEN}- 2026-08-23T11:00 owner: evidence-accept R-01 — offline\n`);
  assert.strictEqual(outside.items[0].accepted, false);
  assert.strictEqual(outside.items.length, 2, 'and the pasted line is itself an open item (with the id "2026-08-23T11:00")');

  // gates: is append-only — the LAST decision for an id wins
  assert.strictEqual(with_(ACCEPT('R-01') + REVOKE('R-01')).items[0].accepted, false, 'a revoke revokes');
  assert.strictEqual(with_(ACCEPT('R-01') + REVOKE('R-01') + ACCEPT('R-01', 're-authorized', '2026-08-23T13:00')).items[0].acceptedAt, '2026-08-23T13:00');
  assert.strictEqual(with_(REVOKE('R-01')).items[0].accepted, false, 'a revoke alone grants nothing');
  assert.strictEqual(with_(ACCEPT('R-01') + '  - 2026-08-23T12:00 owner: evidence-accept-revoke R-01 — ——\n').items[0].accepted, true, 'an unreasoned revoke is ignored');

  // an acceptance that matches no item is a NOTE — not a block, not an error
  const stray = with_(ACCEPT('R-09'));
  assert.deepStrictEqual(stray.notes, ['acceptance R-09 matches no open item']);
  assert.strictEqual(stray.blockers.length, 1, 'R-01 is still pending');
  assert.deepStrictEqual(rd.evidenceFindings(`gates:\n${ACCEPT('R-09')}`).notes, ['acceptance R-09 matches no open item']);
  assert.deepStrictEqual(rd.evidenceFindings(`gates:\n${ACCEPT('R-09')}${REVOKE('R-09')}`).notes, [], 'a revoked stray is nothing');

  // the CLI: an accepted item passes C9, archives, and is reported as accepted, still present
  const p = project({ open: OPEN, gates: ACCEPT('R-01', 'the staging DB is offline until Q4') + ACCEPT('R-09') });
  const c9 = line(gate(p).stdout, 'C9');
  assert.match(c9, /^✓ C9 1 open item\(s\): 1 accepted, still present \(R-01\), 0 pending; acceptance R-09 matches no open item$/);
  assert.strictEqual(gate(p).status, 0, gate(p).stdout);
  const a = archive(p);
  assert.strictEqual(a.status, 0, a.stdout + a.stderr);
  assert.match(a.stdout, /^note: acceptance R-09 matches no open item$/m);
  assert.match(a.stdout, /critical evidence: complete, 1 risk\(s\) accepted by the owner \(R-01\), still present/);
  const s = run(['status', '--change', 'c'], p.root).stdout;
  assert.match(s, /^open: {9}\[accepted\] R-01: restart recovery is unverified in the target runtime$/m);
  assert.doesNotMatch(s, /BLOCKED/);
  assert.deepStrictEqual(statusJson(p).openItems, [{ id: 'R-01', text: 'restart recovery is unverified in the target runtime', accepted: true, acceptedAt: '2026-08-23T11:00' }]);
  assert.strictEqual(run(['status', '--change', 'c', '--escalation'], p.root).status, 0, 'an accepted item is not a reason to wait on a human');
  // nothing deletes the accepted line: the archived bundle still carries it
  const wr = run(['archive', '--change', 'c', '--no-cas', '--write', '--changes-dir', 'apriori/changes'], p.root);
  assert.strictEqual(wr.status, 0, wr.stdout + wr.stderr);
  const [stamp] = fs.readdirSync(path.join(p.root, 'apriori', 'changes', 'archive'));
  assert.match(fs.readFileSync(path.join(p.root, 'apriori', 'changes', 'archive', stamp, 'flow-state.md'), 'utf8'), /^- R-01: restart recovery/m);
});

// ---------------------------------------------------------------------------
// OI-03 — gate C9, archive R5 and status read the SAME function on the SAME input
// ---------------------------------------------------------------------------

test('OI-03 gate, archive and status judge the open items on the same inputs — the state and the delta scan', () => {
  const p = project({ delta: MUTATION,
    open: '- R-01: restart recovery is unverified\n- R-02: the consumer ships next quarter\n- no id here\n',
    sections: '## Reality Check\n- assumption: the staging schema matches production\n\n',
    gates: ACCEPT('R-02') });
  const res = gateLib.runGate({ cwd: p.root, change: 'c', testCmd: TAP1, noCas: true });
  // the ONE input C9 cannot derive for itself is the delta scan — there is no mode any more
  assert.deepStrictEqual(res.evidenceOpts, { stage: 'in-flight', riskSignals: risk.scanDeltas(p.dir) });
  assert.deepStrictEqual(res.evidenceOpts.riskSignals.map((s) => s.signal), ['contract-mutation']);
  const want = rd.evidenceFindings(flowOf(p), { riskSignals: risk.scanDeltas(p.dir) });
  assert.strictEqual(res.checks.find((c) => c.id === 'C9').detail, want.blockers.join('; '));
  assert.deepStrictEqual(r5of(p).map((b) => b.detail), want.blockers);
  const j = statusJson(p);
  assert.deepStrictEqual(j.escalations, want.blockers, 'status carries every C9 refusal as a reason a human is waited on');
  assert.deepStrictEqual(j.openItems.map((i) => [i.id, i.accepted]), [['R-01', false], ['R-02', true], [null, false]]);
  assert.deepStrictEqual(j.evidence, { rows: [], blocked: [], recorded: [] }, 'no legacy rows: the compat key is empty');
  // what the three agree on: two pending items and one standing assumption; the mutation is a
  // SIGNAL now (reported, demanding nothing), and the accepted item is not a refusal
  assert.deepStrictEqual(want.blockers.map((b) => b.split(/[:—]/)[0].trim()),
    ['open item R-01 is pending', 'open item has no id', 'unverified assumption']);
  assert.match(want.blockers[2], /verified\? rewrite it as `- observed: …`; carried forward unverified\? move it to ## Open as/);
  assert.deepStrictEqual(want.notes, ["risk: contract-mutation: kv/spec.md MODIFIED 'Alpha'"]);
  assert.deepStrictEqual(j.risk, [{ signal: 'contract-mutation', detail: "kv/spec.md MODIFIED 'Alpha'" }]);
  assert.match(run(['status', '--change', 'c'], p.root).stdout, /^risk: {9}contract-mutation: kv\/spec\.md MODIFIED 'Alpha'$/m);
  // the review-ready face reads the same findings and answers its own narrower question (OI-05)
  assert.strictEqual(gate(p, ['--review-ready']).status, 1);
});

// ---------------------------------------------------------------------------
// OI-04 — a legacy `## Evidence` section in an in-flight bundle
// ---------------------------------------------------------------------------

test('OI-04 legacy Evidence rows migrate by rule: blocked blocks, accepted is an accepted item, the rest are ignored with one note', () => {
  const MSG = /^legacy Evidence row 'data-schema' is blocked — move it to ## Open as an item \(or accept it via evidence-accept data-schema\)$/;
  // a blocked row blocks, with the migration message, at every surface
  const b = project({ evidence: '- producer-diff: done — read the whole diff\n- data-schema: blocked — staging DB offline\n' });
  const f = rd.evidenceFindings(flowOf(b));
  assert.deepStrictEqual(f.blockers.length, 1); assert.match(f.blockers[0], MSG);
  assert.deepStrictEqual(f.notes, ['legacy ## Evidence section ignored (6.2: risks live in ## Open)']);
  assert.deepStrictEqual(f.legacy.rows, [
    { name: 'producer-diff', status: 'done', detail: 'read the whole diff' },
    { name: 'data-schema', status: 'blocked', detail: 'staging DB offline' }]);
  assert.match(line(gate(b).stdout, 'C9'), /legacy Evidence row 'data-schema' is blocked — move it to ## Open as an item/);
  assert.strictEqual(archive(b, ['--force']).status, 1);
  assert.ok(r5of(b, true).every((x) => x.forceable === false));
  const jb = statusJson(b);
  assert.deepStrictEqual(jb.evidence.rows.map((r) => r.name), ['producer-diff', 'data-schema']);
  assert.strictEqual(jb.evidence.blocked.length, 1); assert.match(jb.evidence.blocked[0], MSG);
  assert.match(run(['status', '--change', 'c'], b.root).stdout, /^BLOCKED: {6}legacy Evidence row 'data-schema' is blocked/m);

  // a legacy row with a valid acceptance for its name is an ACCEPTED item — reported, not blocking
  const a = project({ evidence: '- data-schema: blocked — staging DB offline\n- other: owner-accepted — the v1 risk\n',
    gates: ACCEPT('data-schema') + ACCEPT('other') });
  const fa = rd.evidenceFindings(flowOf(a));
  assert.deepStrictEqual(fa.blockers, []);
  assert.deepStrictEqual(fa.items.map((i) => [i.id, i.accepted]), [['data-schema', true], ['other', true]]);
  assert.deepStrictEqual(fa.notes, [], 'every row was consumed as an accepted item — nothing was ignored');
  assert.strictEqual(gate(a).status, 0, gate(a).stdout);
  assert.match(line(gate(a).stdout, 'C9'), /2 open item\(s\): 2 accepted, still present \(data-schema, other\), 0 pending/);
  assert.match(archive(a).stdout, /critical evidence: complete, 2 risk\(s\) accepted by the owner \(data-schema, other\), still present/);

  // a self-signed `owner-accepted` row with no valid acceptance is a migration refusal too:
  // ignoring it would let the claim make the risk disappear
  const self = project({ evidence: '- contract-mutation: owner-accepted — I accept my own risk\n',
    gates: '  - 2026-08-23T11:00 producer: evidence-accept contract-mutation — me\n' });
  const fs2 = rd.evidenceFindings(flowOf(self));
  assert.strictEqual(fs2.blockers.length, 1);
  assert.match(fs2.blockers[0], /^legacy Evidence row 'contract-mutation' claims owner acceptance with no canonical gates: entry — move it to ## Open, or record: {3}- <YYYY-MM-DDTHH:MM> owner: evidence-accept contract-mutation — <the human's reason, verbatim>$/);
  assert.deepStrictEqual(fs2.notes, [], 'nothing was ignored');
  assert.strictEqual(gate(self).status, 1);
  assert.strictEqual(archive(self, ['--force']).status, 1);

  // done / n-a / fixed / an unfilled scaffold row / an unreadable row → ignored, ONE note
  const ig = project({ evidence: '- producer-diff: done — read\n- ui: n/a — no UI\n- data-schema: fixed — ran it\n'
    + '- <risk>: done | blocked | owner-accepted | n/a — <what was run>\n- not a row at all\n' });
  const fi = rd.evidenceFindings(flowOf(ig));
  assert.deepStrictEqual(fi.blockers, []);
  assert.deepStrictEqual(fi.items, []);
  assert.deepStrictEqual(fi.notes, ['legacy ## Evidence section ignored (6.2: risks live in ## Open)']);
  assert.strictEqual(gate(ig).status, 0, gate(ig).stdout);
  assert.match(line(gate(ig).stdout, 'C9'), /^✓ C9 no open items; legacy ## Evidence section ignored \(6\.2: risks live in ## Open\)$/);
  assert.strictEqual(archive(ig).status, 0);
  // the retired vocabulary left with the table
  for (const gone of ['EVIDENCE_STATUS', 'EVIDENCE_STATUS_ALIAS', 'canonicalEvidenceStatus'])
    assert.ok(!(gone in rd), `${gone} must be gone`);
  assert.ok(!('PRODUCER_DIFF_ROW' in gateLib), 'the producer-diff constant must be gone');
});

// ---------------------------------------------------------------------------
// OI-05 — review-ready: two items, and pending acceptances are what the review is for
// ---------------------------------------------------------------------------

test('OI-05 review-ready answers two items — tests, and a readable Open section', () => {
  const ready = project({ open: '- R-01: restart recovery is unverified in the target runtime\n' });
  const r = gate(ready, ['--review-ready']);
  assert.strictEqual(r.status, 0, r.stdout);
  assert.deepStrictEqual((r.stdout.match(/^[✓✗] (\S+)/gm) || []).map((l) => l.slice(2)), ['tests', 'open'], r.stdout);
  assert.match(r.stdout, /^✓ open {2}1 open item\(s\): 0 accepted, 1 pending — pending items are what the review is for$/m);
  assert.match(r.stdout, /^REVIEW-READY: YES$/m);
  const j = JSON.parse(gate(ready, ['--review-ready', '--json']).stdout);
  assert.deepStrictEqual(Object.keys(j).sort(), ['change', 'errors', 'items', 'ready'], '6.2: one envelope, errors[] included (JC-03)');
  assert.deepStrictEqual(j.errors, []);
  assert.deepStrictEqual(j.items.map((i) => [i.id, i.ok]), [['tests', true], ['open', true]]);
  // …while the same bundle is NOT gate-passable or archivable: the item is pending
  assert.strictEqual(gate(ready).status, 1);
  assert.strictEqual(archive(ready).status, 1);

  // an unreadable Open section fails the item, naming the defect — and so does a standing
  // assumption or a kind-less Reality Check line, with C9's own wording
  for (const [why, open, re, sections] of [
    ['no id', '- the retry path is unproven\n', /✗ open {2}open item has no id/],
    ['duplicate', '- R-01: a\n- R-01: b\n', /✗ open {2}open item id 'R-01' is duplicated/],
    ['assumption', '', /✗ open {2}unverified assumption: the schema matches — verified\? rewrite it as `- observed: …`; carried forward unverified\? move it to ## Open as `- <ID>: the schema matches` and delete this line/, '## Reality Check\n- assumption: the schema matches\n\n'],
    ['kind-less line', '', /✗ open {2}Reality Check entry names no kind: 'I forgot'/, '## Reality Check\n- I forgot\n\n'],
  ]) {
    const p = project({ open, sections: sections || '' });
    const rr = gate(p, ['--review-ready']);
    assert.strictEqual(rr.status, 1, why);
    assert.match(rr.stdout, re, why);
    assert.match(rr.stdout, /REVIEW-READY: NOT YET \(1 item\(s\)\) — go back to Build & Test; this is not a review round/, why);
  }
  // no Open items at all is readable too
  const none = project();
  assert.match(gate(none, ['--review-ready']).stdout, /^✓ open {2}no open items$/m);
  // NO test command → never ready: the reviewer must not be the first to run the suite
  const rr = run(['gate', '--change', 'c', '--review-ready', '--no-cas'], none.root);
  assert.strictEqual(rr.status, 1);
  assert.match(rr.stdout, /✗ tests  no test command/);
  // nothing is written, and the retired items are gone by name
  assert.doesNotMatch(r.stdout, /producer-diff|evidence/);
});

// ---------------------------------------------------------------------------
// OI-06 — `mode:` is optional and inert
// ---------------------------------------------------------------------------

test('OI-06 mode is optional and inert: absent is fine, fast/standard are echoed, anything else blocks, nothing upgrades', () => {
  // C3, at the predicate
  const st = (over) => ({ change: 'c', lineage: 'l', phase: 'build', ...over });
  assert.deepStrictEqual(rd.checkFlowState(st({}), 'c', 'change: c\nlineage: l\nphase: build\n'),
    { id: 'C3', status: 'pass', detail: 'legal (build)' });
  for (const mode of ['fast', 'standard'])
    assert.deepStrictEqual(rd.checkFlowState(st({ mode }), 'c', ''), { id: 'C3', status: 'pass', detail: `legal (mode ${mode}, build)` }, mode);
  assert.strictEqual(rd.checkFlowState(st({ mode: '' }), 'c', '').status, 'pass', 'an empty value is absence');
  for (const bad of ['<fast | standard>', 'huge', 'Fast', 'trivial'])
    assert.strictEqual(rd.checkFlowState(st({ mode: bad }), 'c', '').status, 'blocked', bad);
  assert.match(rd.checkFlowState(st({ mode: '<fast | standard>' }), 'c', '').detail, /'mode' is an unfilled placeholder/);
  assert.match(rd.checkFlowState(st({ mode: 'huge' }), 'c', '').detail, /'mode' 'huge' not in \{fast, standard\}/);
  assert.deepStrictEqual(rd.MODE_ENUM, ['fast', 'standard'], 'no third mode');

  // the CLI, end to end, with a mutating delta: no upgrade is announced anywhere
  for (const [why, head, shown] of [['absent', '', null], ['fast', 'mode: fast\n', 'fast'], ['standard', 'mode: standard\n', 'standard']]) {
    const p = project({ head, delta: MUTATION });
    const g = gate(p);
    assert.strictEqual(g.status, 0, `${why}: ${g.stdout}`);
    assert.doesNotMatch(g.stdout, /→ standard|upgraded/, why);
    assert.match(line(g.stdout, 'C3'), shown ? new RegExp(`legal \\(mode ${shown}, review\\)`) : /legal \(review\)/, why);
    assert.match(line(g.stdout, 'C9'), /risk: contract-mutation: kv\/spec\.md MODIFIED 'Alpha'/, `${why}: the signal is information`);
    const a = archive(p);
    assert.strictEqual(a.status, 0, `${why}: ${a.stdout}${a.stderr}`);
    assert.doesNotMatch(a.stdout, /upgraded|standard/, why);
    const j = statusJson(p);
    assert.strictEqual(j.mode, shown);
    assert.strictEqual(j.effectiveMode, shown, 'effectiveMode equals mode — a compat field');
    assert.deepStrictEqual(j.risk.map((r) => r.signal), ['contract-mutation'], why);
    const s = run(['status', '--change', 'c'], p.root).stdout;
    assert.doesNotMatch(s, /→/, why);
    assert.match(s, shown ? new RegExp(`^phase: {8}review {3}\\(mode ${shown}\\)$`, 'm') : /^phase: {8}review$/m, why);
  }
  const ph = project({ head: 'mode: <fast | standard>\n' });
  assert.match(line(gate(ph).stdout, 'C3'), /BLOCKED — flow-state: 'mode' is an unfilled placeholder/);
  assert.ok(!('effectiveMode' in risk), 'the upgrade derivation must be gone');
});

// ---------------------------------------------------------------------------
// OI-07 — the scaffold
// ---------------------------------------------------------------------------

test('OI-07 `apriori new` scaffolds no mode line and no Evidence section; Open shows the id form', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'apriori-oi-new-'));
  const r = run(['new', 'hello'], root);
  assert.strictEqual(r.status, 0, r.stdout + r.stderr);
  const flow = fs.readFileSync(path.join(root, 'apriori', 'changes', 'hello', 'flow-state.md'), 'utf8');
  assert.doesNotMatch(flow, /^mode:/m);
  assert.doesNotMatch(flow, /## Evidence|producer-diff/);
  assert.match(flow, /^## Open {2,}# .*- <ID>: <text>/m, 'the comment shows the id form');
  assert.match(flow, /^## Reality Check {2,}#/m);
  assert.match(flow, /^## Next {2,}#/m);
  assert.match(flow, /^gates:$/m);
  assert.deepStrictEqual(status.sectionItems(flow, 'Open'), [], 'the comment is not an item');
  assert.deepStrictEqual(rd.evidenceFindings(flow).blockers, []);
  assert.doesNotMatch(r.stdout, /mode/, 'the epilogue no longer asks for a mode');
  assert.match(r.stdout, /fill in lineage, then Ground/);
  // the scaffold path runs end to end without ever writing a mode
  w(path.join(root, 'apriori', 'specs', 'kv', 'spec.md'), STORE);
  w(path.join(root, 'apriori', 'changes', 'hello', 'specs', 'kv', 'spec.md'), ADDED);
  const g = (extra = []) => run(['gate', '--change', 'hello', '--test-cmd', TAP2, '--no-cas', ...extra], root);
  assert.strictEqual(g().status, 1, 'the unfilled lineage placeholder still blocks C3');
  fs.writeFileSync(path.join(root, 'apriori', 'changes', 'hello', 'flow-state.md'), flow
    .replace('lineage: <target branch/line + merge taboo>', 'lineage: main')
    .replace('phase: ground', 'phase: review'));
  const rev = path.join(root, 'apriori', 'changes', 'hello', 'review');
  w(path.join(rev, 'code-review-v1.md'), '# code review, round 1\n\nVERDICT: no major issues\n');
  w(path.join(rev, 'code-review-v1-raw.txt'), 'raw\n');
  assert.strictEqual(g().status, 0, g().stdout);
  assert.strictEqual(g(['--review-ready']).status, 0, g(['--review-ready']).stdout);
  const a = run(['archive', '--change', 'hello', '--no-cas', '--write', '--changes-dir', 'apriori/changes'], root);
  assert.strictEqual(a.status, 0, a.stdout + a.stderr);
  assert.match(a.stdout, /implementation: {4}complete/);
  assert.match(a.stdout, /critical evidence: complete$/m);
});

// ---------------------------------------------------------------------------
// OI-08 — the archive declaration derives from Open
// ---------------------------------------------------------------------------

test('OI-08 the archive declaration derives its three lines from the open items', () => {
  const decl = (opts) => am.archiveDeclaration(project(opts).dir);
  const lines = (d) => d.lines.filter((l) => /^ {2}\w/.test(l)).map((l) => l.trim());
  assert.deepStrictEqual(lines(decl({})), ['implementation:    complete', 'critical evidence: complete', 'delivery:          an archive is not a release']);
  const pend = decl({ open: '- R-01: a\n- no id\n', sections: '## Reality Check\n- assumption: x\n\n' });
  assert.strictEqual(pend.incomplete, true);
  assert.deepStrictEqual(lines(pend).slice(0, 2), [
    'implementation:    INCOMPLETE — 2 pending open item(s), 1 unverified assumption(s) recorded in the state',
    'critical evidence: 2 open item(s) still pending']);
  const acc = decl({ open: '- R-01: a\n- R-02: b\n', gates: ACCEPT('R-01') + ACCEPT('R-02'), sections: 'delivery: released\n' });
  assert.strictEqual(acc.incomplete, false);
  // a legacy `delivery: released` line no longer changes the third state: it is one fixed sentence
  assert.deepStrictEqual(lines(acc), ['implementation:    complete',
    'critical evidence: complete, 2 risk(s) accepted by the owner (R-01, R-02), still present', 'delivery:          an archive is not a release']);
  const half = decl({ open: '- R-01: a\n- R-02: b\n', gates: ACCEPT('R-01') });
  assert.strictEqual(half.incomplete, true);
  assert.match(half.lines.join('\n'), /INCOMPLETE — 1 pending open item\(s\), 0 unverified assumption\(s\)/);
  // a legacy blocked row is named in the evidence line, and the backstop refuses like R5 does
  const leg = decl({ evidence: '- data-schema: blocked — offline\n' });
  assert.match(leg.lines.join('\n'), /critical evidence: 1 legacy Evidence row\(s\) still blocked — move them to ## Open/);
  // the backstop: readiness driven to READY, the declaration still refuses a pending item
  const READY = () => ({ ready: true, blockers: [], forced: [], na: [], notes: [], grant: null });
  const p = project({ open: '- R-01: a\n' });
  const r = am.archiveChange({ cwd: p.root, change: 'c', noCas: true, readinessOf: READY });
  assert.strictEqual(r.code, 1);
  assert.match(r.out.join('\n'), /implementation: {4}INCOMPLETE — 1 pending open item\(s\)/);
  assert.match(r.err.join('\n'), /the declaration says the implementation is INCOMPLETE/);
});

// ---------------------------------------------------------------------------
// OI-09 — archived bundles are recorded, never re-judged
// ---------------------------------------------------------------------------

test('OI-09 an archived bundle keeps today\'s behavior: recorded, not re-judged', () => {
  const p = project({ archived: true, delta: MUTATION, head: 'mode: fast\n',
    open: '- R-01: unverified\n- no id\n', evidence: '- data-schema: blocked — offline\n' });
  const res = gateLib.runGate({ cwd: p.root, change: 'c', testCmd: TAP1, noCas: true });
  assert.deepStrictEqual(res.evidenceOpts, { stage: 'archived', riskSignals: [] }, 'the delta is not re-scanned');
  const c9 = res.checks.find((c) => c.id === 'C9');
  assert.strictEqual(c9.status, 'n/a');
  assert.match(c9.detail, /^archived: the state predicate does not apply retroactively — 2 open item\(s\): 0 accepted, 2 pending; recorded: open item R-01 is pending/);
  assert.match(c9.detail, /legacy Evidence row 'data-schema' is blocked/);
  assert.notStrictEqual(res.code, 1, 'frozen history is never blocked on its state');
  const j = statusJson(p);
  assert.strictEqual(j.stage, 'archived');
  assert.deepStrictEqual(j.escalations, [], 'frozen history is not a reason to wait on a human');
  assert.deepStrictEqual(j.openItems.map((i) => [i.id, i.accepted]), [['R-01', false], [null, false]]);
  assert.deepStrictEqual(j.evidence.blocked, []);
  assert.strictEqual(j.evidence.recorded.length, 1); assert.match(j.evidence.recorded[0], /legacy Evidence row 'data-schema' is blocked/);
  assert.deepStrictEqual(j.risk, [], 'no signal is derived from a merged delta');
  assert.strictEqual(j.mode, 'fast'); assert.strictEqual(j.effectiveMode, 'fast');
  assert.strictEqual(run(['status', '--change', 'c', '--escalation'], p.root).status, 0);
  const s = run(['status', '--change', 'c'], p.root).stdout;
  assert.match(s, /^recorded: {5}not re-judged \(archived\) — open item R-01 is pending/m);
  assert.doesNotMatch(s, /^BLOCKED:/m);
});

// ---------------------------------------------------------------------------
// OI-10 — --force never reaches an open item; the only forceable class is R4's stop-loss
// ---------------------------------------------------------------------------

test('OI-10 an unaccepted open item is never forceable, with or without an archive-force record', () => {
  const p = project({ open: '- R-01: unverified\n', gates: '  - 2026-08-23T11:00 owner: archive-force ledger — ship it\n' });
  const a = archive(p, ['--force']);
  assert.strictEqual(a.status, 1, a.stdout + a.stderr);
  assert.match(a.stderr, /R5 open item R-01 is pending/);
  assert.doesNotMatch(a.stderr, /progress blockers|--force needs/, 'nothing forceable, so no force advice');
  assert.match(a.stdout, /RESULT: NOT READY — nothing written/);
  const rdy = rd.readinessOf({ bundleDir: p.dir, name: 'c', force: true });
  assert.deepStrictEqual(rdy.blockers.map((b) => [b.rule, b.class, b.forceable]), [['R5', 'evidence', false]]);
  assert.deepStrictEqual(rdy.forced, []);
  // the round-5 escalation path did not depend on the ledger class: it still opens on the
  // owner's reframe plus --force, item or no item accepted
  const five = project({ open: '- R-01: unverified\n', gates: ACCEPT('R-01')
    + '  - 2026-08-23T11:00 owner: reframe code-review round 5 accept-risk — the owner accepts the residual risk\n' });
  for (let i = 1; i <= 5; i++) {
    w(path.join(five.dir, 'review', `code-review-v${i}.md`), `# r${i}\n\nVERDICT: 3 issues open\n`);
    w(path.join(five.dir, 'review', `code-review-v${i}-raw.txt`), 'raw\n');
  }
  assert.strictEqual(archive(five).status, 1, 'the record alone is not a --force');
  const forced = archive(five, ['--force']);
  assert.strictEqual(forced.status, 0, forced.stdout + forced.stderr);
  assert.match(forced.stdout, /^forced: R4 code-review round 5/m);
});
