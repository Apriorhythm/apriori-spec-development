'use strict';
// AR-F4/F5 — Astra's acceptance review of v6.2-code @ba004f8 (REVISE): the init --test-cmd
// round-trip and the per-view JSON envelopes. (F1/F2/F3/F6/F7 are in accept-r1-reader.test.js.)

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

test('AR-F4 init --test-cmd validates the RAW argument through the full encode → getConfig path; what cannot round-trip is refused before any write', () => {
  const fresh = () => fs.mkdtempSync(path.join(os.tmpdir(), 'apriori-ar4-'));
  for (const [why, cmd, re] of [
    ['an HTML comment in the command', 'node -e "console.log(\'<!-- test -->\')"', /cannot carry an HTML comment marker \(<!-- or -->\) — the config reader strips comments; put the command in a script file and name that/],
    ['an opening marker alone', 'node -e "console.log(\'<!--\')"', /cannot carry an HTML comment marker/],
    ['a trailing backslash-space', 'printf %s foo\\ ', /leading or trailing whitespace is trimmed by the config reader — it would change the command; put it in a script file and name that/],
    ['a trailing newline', 'printf ok\n', /cannot contain a newline/],
    ['a leading space', ' printf ok', /leading or trailing whitespace is trimmed/],
  ]) {
    assert.ok(config.encodeCell(cmd).error, `${why}: encodeCell refuses`);
    assert.match(config.encodeCell(cmd).error, re, why);
    const root = fresh();
    const r = run(['init', '--tools', 'claude', '--test-cmd', cmd, '--yes'], root);
    assert.strictEqual(r.status, 2, `${why}: ${r.stdout}${r.stderr}`);
    assert.match(r.stderr, re, why);
    assert.deepStrictEqual(fs.readdirSync(root), [], `${why}: nothing written`);
  }
  // all-whitespace is still "empty"
  const root = fresh();
  assert.strictEqual(run(['init', '--tools', 'claude', '--test-cmd', ' \t ', '--yes'], root).status, 2);
  assert.deepStrictEqual(fs.readdirSync(root), []);
  // the positive cases still round-trip through the real reader
  for (const cmd of ['printf ok | cat', 'node -e "console.log(\'$&\')"', 'node -e "console.log(\'a\\\\b\')"', 'node -e "console.log(\'日本語 ✓\')"']) {
    const r2 = fresh();
    assert.strictEqual(run(['init', '--tools', 'claude', '--test-cmd', cmd, '--yes'], r2).status, 0);
    assert.strictEqual(config.getConfig(r2, 'test-cmd').value, cmd);
  }
});

// one envelope per view — the SAME constructor on success, on a strict-parser error and on an uncaught exception
const STATUS_VIEW_KEYS = ['acknowledged', 'change', 'delivery', 'effectiveMode', 'errors', 'escalation', 'escalations', 'evidence', 'hasFlowState', 'historical', 'hotfix', 'lastGate', 'legacyIdentity', 'lineage', 'migrations', 'mode', 'next', 'openIssues', 'openItems', 'openLedger', 'path', 'phase', 'reality', 'review', 'risk', 'stage'];
const parse = (r, label) => { try { return JSON.parse(r.stdout); } catch { assert.fail(`${label}: not JSON:\n${r.stdout}\n${r.stderr}`); } };

test('AR-F5 status keeps the requested view\'s envelope on every error path; verify/gate/doctor keep theirs on a real I/O exception', { skip: canSymlink() ? false : 'platform refuses symlinks' }, () => {
  const p = project();
  const ok = parse(run(['status', '--change', 'c', '--json'], p.root), 'ok');
  assert.deepStrictEqual(Object.keys(ok).sort(), STATUS_VIEW_KEYS);
  for (const [label, args] of [['resolve error', ['status', '--change', 'nope', '--json']], ['strict parser, change view', ['status', '--change', 'c', '--bogus', '--json']], ['invalid name', ['status', '--change', '../evil', '--json']]]) {
    const r = run(args, p.root);
    assert.strictEqual(r.status, 2, label);
    const j = parse(r, label);
    assert.deepStrictEqual(Object.keys(j).sort(), STATUS_VIEW_KEYS, `${label}: the change view, not a shrunken shape`);
    assert.strictEqual(j.errors.length, 1, label);
    assert.strictEqual(j.hasFlowState, false, label); assert.strictEqual(j.stage, null, label); assert.deepStrictEqual(j.openItems, [], label);
  }
  const lst = parse(run(['status', 'stray', '--json'], p.root), 'list parse error');
  assert.deepStrictEqual(Object.keys(lst).sort(), ['changes', 'errors']);
  assert.deepStrictEqual(lst.changes, []); assert.strictEqual(lst.errors.length, 1);
  const esc = parse(run(['status', '--change', 'c', '--escalation', '--bogus', '--json'], p.root), 'escalation parse error');
  assert.deepStrictEqual(Object.keys(esc).sort(), ['acknowledged', 'change', 'errors', 'escalations', 'historical']);
  assert.deepStrictEqual([esc.escalations, esc.acknowledged, esc.historical], [[], [], []]);
  // real I/O exceptions: a symlink named *.md pointing at a directory makes a read throw EISDIR out of the command
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'apriori-ar5-'));
  fs.mkdirSync(path.join(root, 'specs', 'real'), { recursive: true });
  fs.writeFileSync(path.join(root, 'specs', 'real', 'a.md'), '#### Scenario: XA-01 a\n');
  fs.symlinkSync(path.join(root, 'specs', 'real'), path.join(root, 'specs', 'x.md'));
  const v = run(['verify', '--specs', 'specs', '--test-cmd', 'true', '--json'], root);
  assert.strictEqual(v.status, 2);
  const vj = parse(v, 'verify EISDIR');
  assert.deepStrictEqual(Object.keys(vj).sort(), ['boundGreen', 'boundRed', 'clean', 'duplicates', 'errors', 'exec', 'orphan', 'result', 'specFiles', 'stderr', 'unattributedFailures', 'unbound', 'unidentified']);
  assert.strictEqual(vj.result, 'ERROR'); assert.match(vj.errors[0], /EISDIR/);
  // gate: a truth doc that is a symlinked directory throws inside C6
  const g = project();
  fs.mkdirSync(path.join(g.root, 'apriori', 'truth', 'realdir'), { recursive: true });
  fs.symlinkSync(path.join(g.root, 'apriori', 'truth', 'realdir'), path.join(g.root, 'apriori', 'truth', 'kv.md'));
  const gr = run(['gate', '--change', 'c', '--no-cas', '--test-cmd', TAP2, '--json'], g.root);
  assert.strictEqual(gr.status, 2, gr.stdout + gr.stderr);
  const gj = parse(gr, 'gate EISDIR');
  assert.deepStrictEqual(Object.keys(gj).sort(), ['blocked', 'change', 'checks', 'errors', 'result', 'stage']);
  assert.strictEqual(gj.result, 'ERROR'); assert.match(gj.errors[0], /EISDIR/);
  // doctor: a store file that is a symlinked directory throws inside D6
  const d = project();
  fs.mkdirSync(path.join(d.root, 'apriori', 'specs', 'realdir'), { recursive: true });
  fs.symlinkSync(path.join(d.root, 'apriori', 'specs', 'realdir'), path.join(d.root, 'apriori', 'specs', 'x.md'));
  const dr = run(['doctor', '--no-run', '--json'], d.root);
  assert.strictEqual(dr.status, 2, dr.stdout + dr.stderr);
  const dj = parse(dr, 'doctor EISDIR');
  assert.deepStrictEqual(Object.keys(dj).sort(), ['checks', 'errors', 'findings', 'result']);
  assert.strictEqual(dj.result, 'UNUSABLE'); assert.match(dj.errors[0], /EISDIR/);
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
