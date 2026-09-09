'use strict';
// AR-F1/F2/F3/F6/F7 — Astra's acceptance review of v6.2-code @ba004f8 (REVISE): the flow reader
// and its consumers. Each finding's exact counterexample is the test. Fixtures for F1/F2 live in
// test/fixtures/flow-corpus/. (F4/F5 are in accept-r1-contracts.test.js.)

const { test } = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const { readyFiles, FLOW } = require('./helpers/ready-bundle');
const { canSymlink } = require('./helpers/can-symlink');
const flow = require('../lib/flow');
const rd = require('../lib/readiness');
const am = require('../lib/archive-merge');
const gateLib = require('../lib/gate');
const config = require('../lib/config');

const BIN = path.join(__dirname, '..', 'bin', 'apriori.js');
const run = (args, cwd) => spawnSync('node', [BIN, ...args], { encoding: 'utf8', cwd });
const w = (p, s) => { fs.mkdirSync(path.dirname(p), { recursive: true }); fs.writeFileSync(p, s); return p; };
const CORPUS = path.join(__dirname, 'fixtures', 'flow-corpus');
const fx = (n) => fs.readFileSync(path.join(CORPUS, n), 'utf8');
const STORE = '### Requirement: Alpha\n\n#### Scenario: XA-01 base\n- t\n';
const ADDED = '## ADDED Requirements\n\n### Requirement: Beta\n\n#### Scenario: XB-01 new\n- t\n';
const TAP2 = 'node -e "console.log(\'TAP version 13\');console.log(\'1..2\');console.log(\'ok 1 - XA-01 a\');console.log(\'ok 2 - XB-01 b\')"';
const HEADER = '| ID | Issue | Risk | Round found | Status |\n|---|---|---|---|---|\n';

function project({ flowText = null, ledger = null, store = STORE, delta = ADDED } = {}) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'apriori-ar-'));
  for (const [rel, c] of Object.entries(readyFiles('c'))) w(path.join(root, rel), c);
  const dir = path.join(root, 'apriori', 'changes', 'c');
  if (flowText !== null) fs.writeFileSync(path.join(dir, 'flow-state.md'), flowText);
  w(path.join(root, 'apriori', 'specs', 'kv', 'spec.md'), store);
  w(path.join(dir, 'specs', 'kv', 'spec.md'), delta);
  if (ledger !== null) w(path.join(dir, 'review', 'issues.md'), ledger);
  return { root, dir };
}
const gate = (p, extra = []) => run(['gate', '--change', 'c', '--test-cmd', TAP2, '--no-cas', ...extra], p.root);
const line = (out, id) => (out.split('\n').find((l) => l.includes(` ${id} `)) || '').trim();
const storeOf = (p) => fs.readFileSync(path.join(p.root, 'apriori', 'specs', 'kv', 'spec.md'));
// the real write + move, the way Astra ran it: nothing written, bundle still active
function refusedToArchive(p, why) {
  const before = storeOf(p);
  const r = am.archiveChange({ cwd: p.root, change: 'c', write: true, changesDir: 'apriori/changes', changesDirExplicit: true, noCas: true });
  assert.notStrictEqual(r.code, 0, `${why}: ${r.out.join('\n')}${r.err.join('\n')}`);
  assert.ok(before.equals(storeOf(p)), `${why}: store untouched`);
  assert.ok(fs.existsSync(path.join(p.dir, 'flow-state.md')), `${why}: bundle not moved`);
  return r;
}

// ---------------------------------------------------------------------------

test('AR-F1 an owner line inside a four-backtick block (nesting a three-backtick block) authorizes nothing', () => {
  const text = fx('long-fence-gates.md');
  assert.strictEqual(rd.ownerAccepted(text, 'R-1'), false, 'the example is inert');
  const st = flow.parseFlowState(text);
  assert.deepStrictEqual(st.defects, [], 'a well-formed long fence is legal');
  assert.deepStrictEqual(st.openIssues, ['R-1: production target unresolved']);
  const e = rd.evidenceFindings(text);
  assert.deepStrictEqual(e.items.map((i) => [i.id, i.accepted]), [['R-1', false]]);
  const p = project({ flowText: text });
  const g = gate(p);
  assert.strictEqual(g.status, 1, g.stdout);
  assert.match(line(g.stdout, 'C9'), /open item R-1 is pending/);
  assert.strictEqual(rd.readinessOf({ bundleDir: p.dir, name: 'c' }).ready, false);
  refusedToArchive(p, 'F1');
  // the fence grammar itself: marker and length are remembered; a shorter or tagged line does not close
  for (const [why, body, inert] of [
    ['a tilde fence', '~~~\n- R-9: x\n~~~\n', true],
    ['a longer closing line closes', '```\n- R-9: x\n`````\n', true],
    ['a closing line with an info string does not close', '```\n- R-9: x\n```text\n- R-8: y\n```\n', true],
    ['tildes do not close backticks', '```\n- R-9: x\n~~~\n- R-8: y\n```\n', true],
  ]) {
    const s = flow.parseFlowState(`## Open\n${body}\n## Next\n- n\n`);
    assert.deepStrictEqual(s.openIssues, [], why);
    assert.deepStrictEqual(s.defects, [], why);
    assert.ok(inert);
  }
  assert.deepStrictEqual(flow.parseFlowState('## Open\n````\n- R-9: x\n```\n- R-8: still inside\n').defects.map((d) => d.slice(0, 29)), ['line 2: unclosed code fence —'], 'a shorter line never closes a longer opening');
});

test('AR-F2 a bare `word:` line inside a judged section is a located structural defect, never a scalar that empties the section', () => {
  for (const [why, name, want, lineNo] of [
    ['lowercase Open id', 'bare-lowercase-open.md', /^line 6: open section line is not a list item — write `- risk: production target unresolved`$/, 6],
    ['bare assumption', 'bare-reality.md', /^line 6: reality check section line is not a list item — write `- assumption: production schema is unknown`$/, 6],
    ['bare line after a list', 'bare-after-list.md', /^line 7: open section line is not a list item — write `- risk: production target unresolved`$/, 7],
  ]) {
    const text = fx(name);
    const st = flow.parseFlowState(text);
    assert.strictEqual(st.defects.length, 1, `${why}: ${JSON.stringify(st.defects)}`);
    assert.match(st.defects[0], want, why);
    assert.ok(!('risk' in st) && st.phase === 'review', `${why}: no stray scalar, the real keys still read`);
    const e = rd.evidenceFindings(text);
    assert.ok(e.blockers.some((b) => new RegExp(`structural defect: line ${lineNo}:`).test(b)), `${why}: ${e.blockers}`);
    const p = project({ flowText: text });
    const g = gate(p);
    assert.strictEqual(g.status, 1, `${why}: ${g.stdout}`);
    assert.match(line(g.stdout, 'C9'), new RegExp(`line ${lineNo}: .* is not a list item`), why);
    assert.strictEqual(gate(p, ['--review-ready']).status, 1, why);
    assert.strictEqual(rd.readinessOf({ bundleDir: p.dir, name: 'c' }).ready, false, why);
    refusedToArchive(p, why);
  }
  // the terminators that DO end a section: a heading, `gates:`, and a known state key
  const s = flow.parseFlowState('## Open\n- R-1: x\n\ndelivery: released\n\n## Next\n- n\n\ngates:\n  - 2026-08-23T00:00 note: n\n');
  assert.deepStrictEqual(s.openIssues, ['R-1: x']);
  assert.ok(!('delivery' in s), 'delivery is retired (batch C row 6) — legacy-tolerated, never tracked');
  assert.deepStrictEqual(s.defects, []);
  // a legacy identity key at column 0 inside a section is still a live key (C3's business, F6)
  assert.deepStrictEqual(rd.legacyIdentity('## Open\n- R-1: x\nround: 2\n'), ['round']);
});

test('AR-F3 a legacy ledger whose scan reports an unclosed fence or comment is a migration error, never "no open rows"', () => {
  for (const [why, ledger] of [
    ['unclosed fence', '| ID | Issue | Status |\n|---|---|---|\n```\n| Q-1 | real bug | open |\n'],
    ['unclosed comment', '| ID | Issue | Status |\n|---|---|---|\n<!--\n| Q-1 | real bug | open |\n'],
  ]) {
    const p = project({ ledger });
    const m = rd.legacyLedgerMigration(p.dir);
    assert.match(m || '', /^legacy ledger review\/issues\.md: line 3: unclosed (code fence|HTML comment)/, why);
    const g = gate(p);
    assert.strictEqual(g.status, 1, `${why}: ${g.stdout}`);
    assert.match(line(g.stdout, 'C3'), /BLOCKED — legacy ledger review\/issues\.md: line 3: unclosed/, why);
    const r = rd.readinessOf({ bundleDir: p.dir, name: 'c' });
    assert.deepStrictEqual(r.blockers.map((b) => [b.rule, b.class]), [['R1', 'structural']], why);
    refusedToArchive(p, why);
  }
});

test('AR-F6 legacyIdentity reads keys off the same fence/comment-stripped text as the flow reader: fenced or commented examples are inert, live keys are refused', () => {
  const LIVE = ['tier: medium', 'track: harden', 'track-rationale: r', 'round: 1', 'current-step: STEP6'];
  for (const key of LIVE) {
    const name = key.split(':')[0];
    assert.deepStrictEqual(rd.legacyIdentity(`change: c\nlineage: v6\nphase: review\n${key}\n\n## Open\n\ngates:\n`), [name], `live ${name}`);
    assert.deepStrictEqual(rd.legacyIdentity(`change: c\nlineage: v6\nphase: review\n\n## Open\n\n\`\`\`text\n${key}\n\`\`\`\n\ngates:\n`), [], `fenced ${name}`);
    assert.deepStrictEqual(rd.legacyIdentity(`change: c\nlineage: v6\nphase: review\n\n## Open\n\n<!--\n${key}\n-->\n\ngates:\n`), [], `commented ${name}`);
  }
  // end to end: the fenced example does not refuse the bundle; the live key still does
  const fenced = project({ flowText: FLOW('c').replace('\n## Open\n\n', '\n## Open\n\n```text\nround: 1\n```\n\n') });
  const g = gate(fenced);
  assert.strictEqual(g.status, 0, g.stdout);
  assert.strictEqual(rd.readinessOf({ bundleDir: fenced.dir, name: 'c' }).ready, true);
  const live = project({ flowText: FLOW('c').replace('phase: review\n', 'phase: review\nround: 1\n') });
  assert.match(line(gate(live).stdout, 'C3'), /5\.x identity key\(s\) present \(round\)/);
});

test('AR-F7 old duplicate ids in the store are reported by OCCURRENCE — same-file and cross-file alike — and never block', () => {
  const same = project({ store: STORE + '\n### Requirement: Old\n\n#### Scenario: XA-01 again\n- t\n' });
  const s = am.archiveChange({ cwd: same.root, change: 'c', write: false, noCas: true });
  assert.strictEqual(s.code, 0, s.err.join('\n'));
  assert.match(s.out.join('\n'), /note: store debt outside this change \(reported, not a block\): scenario id 'XA-01' is carried 2 times in the store \(kv\/spec\.md\)/);
  const cross = project();
  w(path.join(cross.root, 'apriori', 'specs', 'other', 'spec.md'), '### Requirement: Other\n\n#### Scenario: XA-01 elsewhere\n- t\n');
  const c = am.archiveChange({ cwd: cross.root, change: 'c', write: false, noCas: true });
  assert.strictEqual(c.code, 0, c.err.join('\n'));
  assert.match(c.out.join('\n'), /scenario id 'XA-01' is carried 2 times in the store \(kv\/spec\.md, other\/spec\.md\)/);
  // the refusals are untouched: an id this change introduces against the store still refuses
  const clash = project({ delta: '## ADDED Requirements\n\n### Requirement: Beta\n\n#### Scenario: XA-01 clash\n- t\n' });
  assert.strictEqual(am.archiveChange({ cwd: clash.root, change: 'c', write: false, noCas: true }).code, 1);
});
