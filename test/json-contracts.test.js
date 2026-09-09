'use strict';
// JC-01..JC-08 — every `--json` view has ONE fixed envelope, for success AND error (6.2 batch A-6).
//
// Astra P5: `verify.clean` could be a string, `--review-ready` had three top-level shapes, verify
// and status printed no JSON on their own errors, and an uncaught exception broke both the JSON
// promise and "untrustworthy = exit 2". These tests pin TYPES, not just key sets.

const { test } = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const { readyFiles } = require('./helpers/ready-bundle');
const { canSymlink } = require('./helpers/can-symlink');

const BIN = path.join(__dirname, '..', 'bin', 'apriori.js');
const run = (args, cwd) => spawnSync('node', [BIN, ...args], { encoding: 'utf8', cwd });
const w = (p, s) => { fs.mkdirSync(path.dirname(p), { recursive: true }); fs.writeFileSync(p, s); return p; };
const STORE = '### Requirement: Alpha\n\n#### Scenario: XA-01 base\n- t\n';
const ADDED = '## ADDED Requirements\n\n### Requirement: Beta\n\n#### Scenario: XB-01 new\n- t\n';
const tap = (lines) => `node -e "${lines.map((l) => `console.log('${l}')`).join(';')}"`;
const TAP2 = tap(['ok 1 - XA-01 base', 'ok 2 - XB-01 new']);

function project({ delta = ADDED, store = STORE } = {}) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'apriori-jc-'));
  for (const [rel, c] of Object.entries(readyFiles('c'))) w(path.join(root, rel), c);
  w(path.join(root, 'apriori', 'specs', 'kv', 'spec.md'), store);
  if (delta) w(path.join(root, 'apriori', 'changes', 'c', 'specs', 'kv', 'spec.md'), delta);
  w(path.join(root, 'apriori', 'runbook.md'), fs.readFileSync(path.join(__dirname, '..', 'RUNBOOK.md')));
  w(path.join(root, 'apriori', '.gitignore'), 'tmp/\n');
  fs.mkdirSync(path.join(root, 'apriori', 'tmp'), { recursive: true });
  return root;
}

// a tiny type oracle: shape = { key: 'string' | 'number' | 'boolean' | 'array' | 'object' | 'null' | 'a|b' }
function typeOf(v) { return v === null ? 'null' : Array.isArray(v) ? 'array' : typeof v; }
function expectShape(obj, shape, label) {
  assert.deepStrictEqual(Object.keys(obj).sort(), Object.keys(shape).sort(), `${label}: key set`);
  for (const [k, t] of Object.entries(shape))
    assert.ok(t.split('|').includes(typeOf(obj[k])), `${label}: ${k} is ${typeOf(obj[k])}, want ${t} (${JSON.stringify(obj[k])})`);
}
const strings = (arr, label) => { assert.ok(Array.isArray(arr), label); for (const s of arr) assert.strictEqual(typeof s, 'string', `${label}: ${JSON.stringify(s)}`); };
const parse = (r, label) => { try { return JSON.parse(r.stdout); } catch { assert.fail(`${label}: stdout is not JSON:\n${r.stdout}\n${r.stderr}`); } };

// ---------------------------------------------------------------------------
// verify
// ---------------------------------------------------------------------------

const VERIFY = { clean: 'boolean', result: 'string', errors: 'array', specFiles: 'number', exec: 'object', duplicates: 'array',
  boundGreen: 'array', boundRed: 'array', unbound: 'array', orphan: 'array', unidentified: 'array', unattributedFailures: 'object', stderr: 'string' };
const CHANGE_EXTRA = { projection: 'object', storeReport: 'object', changeScope: 'object', modifiedIntegrity: 'array' };
function checkVerify(j, label, { change = false, error = false } = {}) {
  const shape = { ...VERIFY, ...(change ? (error ? { projection: 'object' } : CHANGE_EXTRA) : {}) };
  expectShape(j, shape, label);
  assert.ok(['GREEN', 'GAPS', 'ERROR'].includes(j.result), label);
  assert.strictEqual(j.clean, j.result === 'GREEN', `${label}: clean is the GREEN boolean`);
  strings(j.errors, `${label}.errors`);
  expectShape(j.exec, { status: 'number|null', signal: 'string|null', error: 'string|null' }, `${label}.exec`);
  expectShape(j.unattributedFailures, { count: 'number', lines: 'array' }, `${label}.unattributedFailures`);
}

test('JC-01 verify: one envelope for GREEN, GAPS and every ERROR — clean is a boolean, removal-only included', () => {
  const root = project();
  checkVerify(parse(run(['verify', '--change', 'c', '--test-cmd', TAP2, '--json'], root), 'GREEN'), 'GREEN', { change: true });
  const gaps = parse(run(['verify', '--change', 'c', '--test-cmd', tap(['ok 1 - XA-01 base', 'not ok 2 - XB-01 new']), '--json'], root), 'GAPS');
  checkVerify(gaps, 'GAPS', { change: true });
  assert.strictEqual(gaps.result, 'GAPS');
  // removal-only: `clean` is TRUE (a boolean), never the vacuous-note string
  const rm = project({ store: STORE + '\n### Requirement: Zeta\n\n#### Scenario: XZ-01 stays\n- t\n', delta: null });
  w(path.join(rm, 'apriori', 'changes', 'c', 'specs', 'kv', 'spec.md'),
    run(['stamp', 'apriori/specs/kv/spec.md'], rm).stdout + '## REMOVED Requirements\n\n### Requirement: Alpha\n\n#### Scenario: XA-01 base\n- t\n');
  const j = parse(run(['verify', '--change', 'c', '--test-cmd', tap(['1..0']), '--json'], rm), 'removal-only');
  checkVerify(j, 'removal-only', { change: true });
  assert.strictEqual(j.clean, true);
  // ERROR classes: pre-test (broken projection), argument errors, parse errors — all the same envelope, exit 2
  const broken = project({ delta: '## NONSENSE Requirements\n' });
  const e1 = run(['verify', '--change', 'c', '--test-cmd', TAP2, '--json'], broken);
  assert.strictEqual(e1.status, 2);
  checkVerify(parse(e1, 'ERROR(projection)'), 'ERROR(projection)', { change: true, error: true });
  for (const [label, args] of [
    ['--specs with --change', ['verify', '--specs', 'apriori/specs', '--change', 'c', '--test-cmd', TAP2, '--json']],
    ['no target', ['verify', '--test-cmd', TAP2, '--json']],
    ['no test command anywhere', ['verify', '--specs', 'apriori/specs', '--json']],
    ['empty --test-cmd', ['verify', '--specs', 'apriori/specs', '--test-cmd', '', '--json']],
    ['unknown flag (strict parser)', ['verify', '--specs', 'apriori/specs', '--test-cmd', TAP2, '--nope', '--json']],
    ['stray positional (strict parser)', ['verify', 'stray', '--specs', 'apriori/specs', '--test-cmd', TAP2, '--json']],
  ]) {
    const r = run(args, root);
    assert.strictEqual(r.status, 2, `${label}: ${r.stdout}${r.stderr}`);
    const j2 = parse(r, label);
    checkVerify(j2, label);
    assert.strictEqual(j2.result, 'ERROR', label);
    assert.strictEqual(j2.errors.length, 1, label);
  }
});

// ---------------------------------------------------------------------------
// gate, and gate --review-ready
// ---------------------------------------------------------------------------

const GATE = { change: 'string|null', stage: 'string|null', checks: 'array', result: 'string', blocked: 'number', errors: 'array' };
function checkGate(j, label) {
  expectShape(j, GATE, label);
  assert.ok(['PASS', 'BLOCKED', 'INCOMPLETE', 'ERROR'].includes(j.result), label);
  strings(j.errors, `${label}.errors`);
  for (const c of j.checks) expectShape(c, { id: 'string', status: 'string', detail: 'string' }, `${label}.checks[]`);
}

test('JC-02 gate: one envelope in every outcome class, checks typed', () => {
  const root = project();
  const cases = [
    ['PASS', ['gate', '--change', 'c', '--no-cas', '--test-cmd', TAP2, '--json'], 0],
    ['INCOMPLETE', ['gate', '--change', 'c', '--no-cas', '--json'], 3],
    ['ERROR(resolve)', ['gate', '--change', 'nope', '--test-cmd', TAP2, '--json'], 2],
    ['ERROR(empty --test-cmd)', ['gate', '--change', 'c', '--test-cmd', '', '--json'], 2],
    ['ERROR(strict parser)', ['gate', 'stray', '--change', 'c', '--json'], 2],
  ];
  for (const [label, args, code] of cases) {
    const r = run(args, root);
    assert.strictEqual(r.status, code, `${label}: ${r.stdout}${r.stderr}`);
    const j = parse(r, label);
    checkGate(j, label);
    assert.strictEqual(j.result, label.replace(/\(.*/, ''), label);
  }
});

const RR = { change: 'string|null', ready: 'boolean|null', items: 'array', errors: 'array' };
function checkRR(j, label) {
  expectShape(j, RR, label);
  strings(j.errors, `${label}.errors`);
  for (const i of j.items) expectShape(i, { id: 'string', ok: 'boolean', detail: 'string' }, `${label}.items[]`);
  if (j.ready === null) assert.ok(j.errors.length > 0 && j.items.length === 0, `${label}: ready null means errors`);
  else assert.strictEqual(j.errors.length, 0, `${label}: a judged view carries no errors`);
}

test('JC-03 gate --review-ready: ONE envelope for the judged view, an evaluation error and an argument error', () => {
  const root = project();
  const ok = run(['gate', '--change', 'c', '--no-cas', '--test-cmd', TAP2, '--review-ready', '--json'], root);
  assert.strictEqual(ok.status, 0, ok.stdout + ok.stderr);
  const jo = parse(ok, 'ready'); checkRR(jo, 'ready');
  assert.strictEqual(jo.ready, true);
  assert.deepStrictEqual(jo.items.map((i) => i.id), ['tests', 'open']);
  const notYet = run(['gate', '--change', 'c', '--no-cas', '--review-ready', '--json'], root);   // no test command → tests ✗
  assert.strictEqual(notYet.status, 1);
  const jn = parse(notYet, 'not yet'); checkRR(jn, 'not yet');
  assert.strictEqual(jn.ready, false);
  for (const [label, args] of [
    ['evaluation error', ['gate', '--change', 'nope', '--test-cmd', TAP2, '--review-ready', '--json']],
    ['empty --test-cmd', ['gate', '--change', 'c', '--test-cmd', '', '--review-ready', '--json']],
    ['argument error (strict parser)', ['gate', 'stray', '--change', 'c', '--review-ready', '--json']],
    ['argument error (unknown flag)', ['gate', '--change', 'c', '--review-ready', '--json', '--bogus']],
  ]) {
    const r = run(args, root);
    assert.strictEqual(r.status, 2, `${label}: ${r.stdout}${r.stderr}`);
    const j = parse(r, label); checkRR(j, label);
    assert.strictEqual(j.ready, null, label);
    assert.ok(!('reviewReady' in j) && !('checks' in j), `${label}: not the gate envelope, not the old null key`);
  }
});

// ---------------------------------------------------------------------------
// status
// ---------------------------------------------------------------------------

test('JC-04 status: the single view, the list view and --escalation each carry errors[]; every error under --json is JSON', () => {
  const root = project();
  const single = parse(run(['status', '--change', 'c', '--json'], root), 'single');
  assert.deepStrictEqual(single.errors, []);
  for (const [k, t] of Object.entries({ change: 'string', phase: 'string|null', reality: 'object', openIssues: 'array', openItems: 'array', next: 'array',
    evidence: 'object', lastGate: 'string|null', hasFlowState: 'boolean', hotfix: 'boolean', openLedger: 'array', review: 'object|null',
    delivery: 'null',                                    // retired (batch C row 6): the key stays, STRICTLY null
    lineage: 'null',                                     // retired (batch C row 7): the key stays, STRICTLY null
    escalation: 'array|null', escalations: 'array', acknowledged: 'array', historical: 'array', migrations: 'array', stage: 'string', path: 'string', risk: 'array', errors: 'array' }))
    assert.ok(t.split('|').includes(typeOf(single[k])), `single.${k} is ${typeOf(single[k])}, want ${t}`);
  const list = parse(run(['status', '--json'], root), 'list');
  expectShape(list, { changes: 'array', errors: 'array' }, 'list');
  for (const c of list.changes) assert.strictEqual(c.delivery, null, `list element ${c.change}: delivery strictly null`);
  for (const c of list.changes) assert.strictEqual(c.lineage, null, `list element ${c.change}: lineage strictly null`);
  const esc = parse(run(['status', '--change', 'c', '--escalation', '--json'], root), 'escalation');
  expectShape(esc, { change: 'string', escalations: 'array', acknowledged: 'array', historical: 'array', errors: 'array' }, 'escalation');
  // errors keep the REQUESTED view's envelope (F5): the change view on a resolve/name error, the
  // escalation view under --escalation, the list view when no change was asked for
  const CHANGE_VIEW = Object.keys(single).sort();
  const ESC_VIEW = ['acknowledged', 'change', 'errors', 'escalations', 'historical'];
  for (const [label, args, keys] of [
    ['resolve', ['status', '--change', 'nope', '--json'], CHANGE_VIEW],
    ['invalid name', ['status', '--change', '../evil', '--json'], CHANGE_VIEW],
    ['strict parser, change view', ['status', '--change', 'c', '--bogus', '--json'], CHANGE_VIEW],
    ['resolve, --escalation', ['status', '--change', 'nope', '--escalation', '--json'], ESC_VIEW],
    ['--escalation without --change', ['status', '--escalation', '--json'], ESC_VIEW],
    ['strict parser, list view', ['status', 'stray', '--json'], ['changes', 'errors']],
  ]) {
    const r = run(args, root);
    assert.strictEqual(r.status, 2, `${label}: ${r.stdout}${r.stderr}`);
    const j = parse(r, label);
    assert.deepStrictEqual(Object.keys(j).sort(), keys, `${label}: the view's own envelope`);
    strings(j.errors, `${label}.errors`);
    assert.strictEqual(j.errors.length, 1, label);
    if (keys === CHANGE_VIEW) {
      assert.strictEqual(j.hasFlowState, false, label); assert.strictEqual(j.stage, null, label);
      // the error envelope keeps the TYPES too, not just the key set — the retired key must be
      // strictly null here as well (a `{}` slipped into emptyChangeView turns this red)
      assert.strictEqual(j.delivery, null, `${label}: delivery strictly null in the error envelope`);
      assert.strictEqual(j.lineage, null, `${label}: lineage strictly null in the error envelope`);
    }
  }
});

// ---------------------------------------------------------------------------
// doctor, --test-cmd '' everywhere, check --specs absolute, uncaught exceptions
// ---------------------------------------------------------------------------

test('JC-05 doctor: one envelope, checks typed, empty --test-cmd refused', () => {
  const root = project();
  for (const [label, args, code] of [
    ['HEALTHY-ish run', ['doctor', '--no-run', '--json'], null],
    ['UNUSABLE (strict parser)', ['doctor', 'stray', '--json'], 2],
    ['UNUSABLE (empty --test-cmd)', ['doctor', '--test-cmd', '', '--json'], 2],
  ]) {
    const r = run(args, root);
    if (code !== null) assert.strictEqual(r.status, code, `${label}: ${r.stdout}${r.stderr}`);
    const j = parse(r, label);
    expectShape(j, { result: 'string', findings: 'number', checks: 'array', errors: 'array' }, label);
    assert.ok(['HEALTHY', 'FINDINGS', 'UNUSABLE'].includes(j.result), label);
    strings(j.errors, `${label}.errors`);
    for (const c of j.checks) {
      assert.deepStrictEqual(Object.keys(c).sort().filter((k) => k !== 'fix'), ['detail', 'id', 'status'], `${label}.checks[]`);
      assert.strictEqual(typeof c.id, 'string'); assert.strictEqual(typeof c.status, 'string'); assert.strictEqual(typeof c.detail, 'string');
      if ('fix' in c) assert.strictEqual(typeof c.fix, 'string');
    }
  }
  const e = run(['doctor', '--test-cmd', '   ', '--json'], root);
  assert.strictEqual(e.status, 2);
  assert.match(parse(e, 'blank').errors[0], /empty --test-cmd — pass a command or omit the flag/);
});

test('JC-06 --test-cmd "" is refused at the argument layer for verify, gate and doctor alike — never a config fallback', () => {
  const root = project();
  w(path.join(root, 'apriori', 'process-config.md'), `| key | value |\n|---|---|\n| test-cmd | ${TAP2.replace(/\|/g, '\\|')} |\n`);
  // with the config row, OMITTING the flag inherits it
  assert.strictEqual(run(['verify', '--change', 'c'], root).status, 0);
  assert.strictEqual(run(['gate', '--change', 'c', '--no-cas'], root).status, 0);
  // an EMPTY flag is an operator error, in text and in JSON
  for (const args of [['verify', '--change', 'c', '--test-cmd', ''], ['gate', '--change', 'c', '--test-cmd', ''], ['doctor', '--test-cmd', ''],
    ['verify', '--change', 'c', '--test-cmd', ' '], ['doctor', '--test-cmd', '\t']]) {
    const r = run(args, root);
    assert.strictEqual(r.status, 2, `${args.join(' ')}: ${r.stdout}${r.stderr}`);
    assert.match(r.stderr, /empty --test-cmd — pass a command or omit the flag/, args.join(' '));
    const rj = run([...args, '--json'], root);
    assert.strictEqual(rj.status, 2, args.join(' '));
    assert.match(parse(rj, args.join(' ')).errors[0], /empty --test-cmd — pass a command or omit the flag/);
  }
});

test('JC-07 check --specs resolves an absolute path', () => {
  const root = project();
  const abs = path.join(root, 'apriori', 'specs');
  const r = run(['check', '--specs', abs], root);
  assert.strictEqual(r.status, 0, r.stdout + r.stderr);
  const elsewhere = fs.mkdtempSync(path.join(os.tmpdir(), 'apriori-jc-else-'));
  const r2 = run(['check', '--specs', abs], elsewhere);
  assert.strictEqual(r2.status, 0, `absolute means absolute, whatever the cwd: ${r2.stdout}${r2.stderr}`);
  const missing = run(['check', '--specs', path.join(root, 'nope')], root);
  assert.strictEqual(missing.status, 2);
  assert.match(missing.stderr, /spec store path does not exist/);
});

test('JC-08 an uncaught exception still emits JSON with errors[] under --json, and exits 2 either way', { skip: canSymlink() ? false : 'platform refuses symlinks' }, () => {
  // a symlink named `x.md` pointing at a DIRECTORY: the --specs walker lists it as a file and the
  // read throws EISDIR out of the command body — the bin seam, not the command, answers
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'apriori-jc-throw-'));
  fs.mkdirSync(path.join(root, 'specs', 'real'), { recursive: true });
  fs.writeFileSync(path.join(root, 'specs', 'real', 'a.md'), '#### Scenario: XA-01 a\n');
  fs.symlinkSync(path.join(root, 'specs', 'real'), path.join(root, 'specs', 'x.md'));
  const j = run(['verify', '--specs', 'specs', '--test-cmd', 'true', '--json'], root);
  assert.strictEqual(j.status, 2, j.stdout + j.stderr);
  const o = parse(j, 'uncaught');
  checkVerify(o, 'uncaught');                                 // the verify envelope, not a generic one (F5)
  assert.strictEqual(o.result, 'ERROR');
  assert.match(o.errors[0], /EISDIR/);
  const t = run(['verify', '--specs', 'specs', '--test-cmd', 'true'], root);
  assert.strictEqual(t.status, 2, 'untrustworthy is 2, not 1');
  assert.match(t.stderr, /apriori: .*EISDIR/);
  assert.strictEqual(t.stdout, '');
});
