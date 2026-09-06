'use strict';
// AR2-01..AR2-06 — Astra round 2, the one open item (F5 partial): the error-view functions must
// honor the CLI's OWN token semantics — a value flag consumes the next token verbatim, a repeated
// value flag is last-wins — instead of re-guessing the view by scanning argv for flag-looking
// strings. One request context {view, change, json}, derived by the strict parser's consumption
// rules, read by the normal path, the strict-parser rejection and the top-level exception handler.

const { test } = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const { readyFiles } = require('./helpers/ready-bundle');
const { canSymlink } = require('./helpers/can-symlink');
const args = require('../lib/args');
const gateLib = require('../lib/gate');
const sr = require('../lib/spec-runner');

const BIN = path.join(__dirname, '..', 'bin', 'apriori.js');
const run = (a, cwd) => spawnSync('node', [BIN, ...a], { encoding: 'utf8', cwd });
const w = (p, s) => { fs.mkdirSync(path.dirname(p), { recursive: true }); fs.writeFileSync(p, s); return p; };
const STORE = '### Requirement: Alpha\n\n#### Scenario: XA-01 base\n- t\n';
const ADDED = '## ADDED Requirements\n\n### Requirement: Beta\n\n#### Scenario: XB-01 new\n- t\n';
const GATE_KEYS = ['blocked', 'change', 'checks', 'errors', 'result', 'stage'];
const parse = (r, label) => { try { return JSON.parse(r.stdout); } catch { assert.fail(`${label}: not JSON:\n${r.stdout}\n${r.stderr}`); } };

function project() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'apriori-ar2-'));
  for (const [rel, c] of Object.entries(readyFiles('c'))) w(path.join(root, rel), c);
  w(path.join(root, 'apriori', 'specs', 'kv', 'spec.md'), STORE);
  w(path.join(root, 'apriori', 'changes', 'c', 'specs', 'kv', 'spec.md'), ADDED);
  return root;
}
// a truth doc that is a symlinked DIRECTORY: C6's read throws EISDIR out of runGate
function breakC6(root) {
  fs.mkdirSync(path.join(root, 'apriori', 'truth', 'realdir'), { recursive: true });
  fs.symlinkSync(path.join(root, 'apriori', 'truth', 'realdir'), path.join(root, 'apriori', 'truth', 'kv.md'));
}
const STATUS_CHANGE_VIEW = 26;   // the change view's key count (JC-04 pins the set)

test('AR2-00 the request context is recovered by the parser\'s own consumption rules, not by scanning for flag-looking strings', () => {
  const spec = { sub: 'x', flags: { '--change': 'value', '--test-cmd': 'value', '--json': 'flag', '--review-ready': 'flag', '--escalation': 'flag' } };
  // a value flag consumes the next token verbatim, even a dash token
  assert.deepStrictEqual(args.recover(['--change', '--escalation', '--json'], spec), { '--change': '--escalation', '--json': true });
  // repeated value flag: last wins
  assert.deepStrictEqual(args.recover(['--change', 'c', '--change', 'absent', '--json'], spec), { '--change': 'absent', '--json': true });
  // `--json` swallowed as a value is NOT the json flag
  assert.deepStrictEqual(args.recover(['--test-cmd', '--json'], spec), { '--test-cmd': '--json' });
  // recovery walks past an unknown flag and a missing trailing value without inventing anything
  assert.deepStrictEqual(args.recover(['--change', 'c', '--bad', '--json', '--test-cmd'], spec), { '--change': 'c', '--json': true });
  // and the strict parser, on a legal argv, reaches the identical flags (one set of rules)
  const p = args.parseStrict(['--change', '--escalation', '--json'], { ...spec, positionals: 0 });
  assert.deepStrictEqual(p.flags, args.recover(['--change', '--escalation', '--json'], spec));
});

test('AR2-01 `status --change --escalation --json`: --escalation is the NAME (consumed as the value) → change-view error, not the escalation view', () => {
  const r = run(['status', '--change', '--escalation', '--json'], project());
  assert.strictEqual(r.status, 2, r.stdout + r.stderr);
  const j = parse(r, 'AR2-01');
  assert.strictEqual(Object.keys(j).length, STATUS_CHANGE_VIEW, `the change view: ${Object.keys(j)}`);
  assert.ok(!('escalations' in j) || 'openItems' in j, 'not the escalation view');
  assert.ok('openItems' in j && 'hasFlowState' in j);
  assert.strictEqual(j.change, '--escalation');
  assert.match(j.errors[0], /invalid change name '--escalation'/);
});

test('AR2-02 `status --change c --change absent --json`: last wins → resolve error for `absent`', () => {
  const r = run(['status', '--change', 'c', '--change', 'absent', '--json'], project());
  assert.strictEqual(r.status, 2, r.stdout + r.stderr);
  const j = parse(r, 'AR2-02');
  assert.strictEqual(Object.keys(j).length, STATUS_CHANGE_VIEW);
  assert.strictEqual(j.change, 'absent');
  assert.match(j.errors[0], /'absent'/);
  assert.doesNotMatch(j.errors[0], /'c'/);
});

test('AR2-03 `gate --change c --test-cmd --review-ready --json --bad`: --review-ready was the value of --test-cmd → ordinary gate-view argument error', () => {
  const r = run(['gate', '--change', 'c', '--test-cmd', '--review-ready', '--json', '--bad'], project());
  assert.strictEqual(r.status, 2, r.stdout + r.stderr);
  const j = parse(r, 'AR2-03');
  assert.deepStrictEqual(Object.keys(j).sort(), GATE_KEYS, 'the gate view, not review-ready');
  assert.strictEqual(j.result, 'ERROR');
  assert.match(j.errors[0], /unknown flag '--bad'/);
  assert.strictEqual(j.change, 'c');
});

test('AR2-04 `gate --change absent --change c --json --bad`: the error object carries change=c (last wins)', () => {
  const r = run(['gate', '--change', 'absent', '--change', 'c', '--json', '--bad'], project());
  assert.strictEqual(r.status, 2, r.stdout + r.stderr);
  const j = parse(r, 'AR2-04');
  assert.deepStrictEqual(Object.keys(j).sort(), GATE_KEYS);
  assert.strictEqual(j.change, 'c');
});

test('AR2-05 the same argv on the normal path and on a top-level EISDIR yields the SAME ordinary gate envelope — never review-ready', { skip: canSymlink() ? false : 'platform refuses symlinks' }, () => {
  const argv = ['--change', 'c', '--no-cas', '--test-cmd', '--review-ready', '--json'];
  // normal path, in process, the test command injected through the runner seam
  const root = project();
  const cwd = process.cwd(), log = console.log, out = [];
  sr._setTestRunner(() => ({ out: 'TAP version 13\n1..2\nok 1 - XA-01 a\nok 2 - XB-01 b\n', stderr: '', status: 0, signal: null, error: null }));
  console.log = (...a) => out.push(a.join(' '));
  let code;
  try { process.chdir(root); code = gateLib.cli(argv); }
  finally { process.chdir(cwd); console.log = log; sr._setTestRunner(null); }
  const normal = JSON.parse(out.join('\n'));
  assert.strictEqual(code, 0, JSON.stringify(normal));
  assert.deepStrictEqual(Object.keys(normal).sort(), GATE_KEYS, 'the ordinary gate envelope (review-ready was the test command)');
  assert.strictEqual(normal.result, 'PASS');
  // the same argv through the CLI: the shell command `--review-ready` cannot emit TAP, so C1
  // refuses the run (exit 2) — still the ordinary gate envelope, errors[], never review-ready
  const broken = project();
  breakC6(broken);
  const r = run(['gate', ...argv], broken);
  assert.strictEqual(r.status, 2, r.stdout + r.stderr);
  const j = parse(r, 'AR2-05 C1');
  assert.deepStrictEqual(Object.keys(j).sort(), GATE_KEYS, 'never the review-ready envelope');
  assert.strictEqual(j.result, 'ERROR');
  assert.match(j.errors[0], /^verify: /);
  assert.strictEqual(j.change, 'c');
  // a swallowed `--review-ready` that lets the run reach C6: as the VALUE of --id-pattern it is a
  // legal literal pattern, and a delta whose scenario is titled `--review-ready new` binds under
  // it (the store's XA-01 is then report-only debt) — so C1 runs, and C6 throws the real EISDIR:
  // the bin seam prints the SAME ordinary view, errors[], exit 2
  const odd = () => {
    const root = project();
    w(path.join(root, 'apriori', 'changes', 'c', 'specs', 'kv', 'spec.md'), '## ADDED Requirements\n\n### Requirement: Beta\n\n#### Scenario: --review-ready new\n- t\n');
    return root;
  };
  const argv2 = ['--change', 'c', '--no-cas', '--test-cmd', 'node -e "console.log(\'ok 1 - --review-ready new\')"', '--id-pattern', '--review-ready', '--json'];
  const oddBroken = odd();
  breakC6(oddBroken);
  const e = run(['gate', ...argv2], oddBroken);
  assert.strictEqual(e.status, 2, e.stdout + e.stderr);
  const ej = parse(e, 'AR2-05 EISDIR');
  assert.deepStrictEqual(Object.keys(ej).sort(), GATE_KEYS, 'never the review-ready envelope');
  assert.strictEqual(ej.result, 'ERROR');
  assert.match(ej.errors[0], /EISDIR/);
  assert.strictEqual(ej.change, 'c');
  // and the same argv2 on the normal path (no broken truth doc) is the ordinary envelope too
  const fine = run(['gate', ...argv2], odd());
  assert.strictEqual(fine.status, 0, fine.stdout + fine.stderr);
  assert.deepStrictEqual(Object.keys(parse(fine, 'AR2-05 normal')).sort(), GATE_KEYS);
  // and `--json` swallowed as a value is not a JSON request: text, exit 2
  const t = run(['gate', '--change', 'c', '--no-cas', '--test-cmd', '--json'], broken);
  assert.strictEqual(t.status, 2);
  assert.strictEqual(t.stdout.trim(), '', 'no JSON was asked for');
  assert.match(t.stderr, /^(gate|apriori): /, 'text, whichever guard speaks first (C1 refuses the command `--json` before C6 can throw)');
});

test('AR2-06 repeated --change plus a top-level EISDIR: the error object carries the LAST change', { skip: canSymlink() ? false : 'platform refuses symlinks' }, () => {
  const root = project();
  breakC6(root);
  const r = run(['gate', '--change', 'absent', '--change', 'c', '--no-cas', '--test-cmd', 'true', '--json'], root);
  assert.strictEqual(r.status, 2, r.stdout + r.stderr);
  const j = parse(r, 'AR2-06');
  assert.deepStrictEqual(Object.keys(j).sort(), GATE_KEYS);
  assert.strictEqual(j.change, 'c');
  assert.match(j.errors[0], /EISDIR/);
  // status too: the change view names the last change on a top-level failure path is not
  // reachable here, but the strict-parser path is — last wins
  const s = run(['status', '--change', 'absent', '--change', 'c', '--json', '--bad'], root);
  assert.strictEqual(s.status, 2);
  assert.strictEqual(parse(s, 'status').change, 'c');
});
