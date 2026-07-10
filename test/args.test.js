'use strict';
const { test } = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawnSync } = require('node:child_process');
const { parseStrict } = require('../lib/args');

const BIN = path.join(__dirname, '..', 'bin', 'apriori.js');
function run(args, cwd) { return spawnSync('node', [BIN, ...args], { encoding: 'utf8', cwd: cwd || fs.mkdtempSync(path.join(os.tmpdir(), 'apriori-args-')) }); }

const SUBS = ['new', 'status', 'verify', 'archive', 'check', 'init', 'update', 'stamp', 'gate', 'doctor'];

function mkProject(files) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'apriori-args-'));
  for (const [rel, content] of Object.entries(files)) {
    const p = path.join(root, rel);
    fs.mkdirSync(path.dirname(p), { recursive: true });
    if (content === null) fs.mkdirSync(p, { recursive: true });
    else fs.writeFileSync(p, content);
  }
  return root;
}
// a valid project whose configured test command writes a SENTINEL file (SSPEC-1 fixtures)
function sentinelProject() {
  return mkProject({
    'apriori/specs/m/spec.md': '### Requirement: R\n\n#### Scenario: XA-01 a\n- t\n',
    'apriori/changes/c/flow-state.md': 'change: c\ntier: trivial\ntrack: harden\nlineage: v3\ncurrent-step: STEP5\n',
    'apriori/changes/c/specs/m/spec.md': '## ADDED Requirements\n\n### Requirement: S\n\n#### Scenario: XB-01 b\n- t\n',
    'apriori/process-config.md': `| language | auto |\n| test-cmd | node -e "require('fs').writeFileSync('SENTINEL','x');console.log('ok 1 - XA-01')" | x | (none) |\n`,
  });
}

test('CL-11 every subcommand answers --help and -h (exit 0, usage on stdout)', () => {
  for (const sub of SUBS) for (const h of ['--help', '-h']) {
    const r = run([sub, h]);
    assert.strictEqual(r.status, 0, `${sub} ${h}: ${r.stderr}`);
    assert.ok(r.stdout.includes(`apriori ${sub}`), `${sub} ${h} usage: ${r.stdout}`);
  }
});

test('CL-12 unknown flags fail loudly everywhere, before any action', () => {
  for (const sub of SUBS) {
    const r = run([sub, '--no-such-flag']);
    assert.strictEqual(r.status, 2, `${sub}: ${r.stdout}${r.stderr}`);
    assert.match(r.stderr, /--no-such-flag/);
  }
  // sentinel fixtures: the test-spawning commands must not execute the test command
  for (const args of [
    ['verify', '--no-such-flag', '--specs', 'apriori/specs'],
    ['gate', '--change', 'c', '--no-such-flag'],
    ['doctor', '--no-such-flag'],
  ]) {
    const root = sentinelProject();
    const r = run(args, root);
    assert.strictEqual(r.status, 2, args.join(' ') + r.stderr);
    assert.match(r.stderr, /--no-such-flag/);
    assert.ok(!fs.existsSync(path.join(root, 'SENTINEL')), `${args[0]}: test command RAN despite unknown flag`);
  }
});

test('CL-13 positional arity is enforced', () => {
  assert.strictEqual(run(['status', 'extra']).status, 2);
  assert.match(run(['verify', 'extra']).stderr, /extra/);
  const nb = run(['new', 'a', 'b']);
  assert.strictEqual(nb.status, 2);
  assert.match(nb.stderr, /'b'/);
  assert.strictEqual(run(['new']).status, 2);
  assert.strictEqual(run(['stamp']).status, 2);
  assert.strictEqual(run(['stamp', 'a', 'b']).status, 2);
  const sf = run(['stamp', '--foo']);              // declared change: unknown flag, not a positional
  assert.strictEqual(sf.status, 2);
  assert.match(sf.stderr, /--foo/);
});

test('CL-14 missing values fail closed', () => {
  const r1 = run(['verify', '--test-cmd']);
  assert.strictEqual(r1.status, 2);
  assert.match(r1.stderr, /--test-cmd/);
  const r2 = run(['verify', '--specs', '--test-cmd', 't']);
  assert.strictEqual(r2.status, 2);
  assert.match(r2.stderr, /--specs/);
});

test('CL-15 repeats and aliases behave declaredly', () => {
  // multi accumulates: scenarios from BOTH spec targets demanded
  const root = mkProject({
    'a/spec.md': '#### Scenario: XA-01 a\n- t\n',
    'b/spec.md': '#### Scenario: XB-01 b\n- t\n',
  });
  const tap = `node -e "console.log('ok 1 - XA-01');console.log('ok 2 - XB-01')"`;
  const r = run(['verify', '--specs', 'a', '--specs', 'b', '--test-cmd', tap], root);
  assert.strictEqual(r.status, 0, r.stdout + r.stderr);
  // value last-write-wins
  const root2 = mkProject({ 'apriori/changes/b/flow-state.md': 'change: b\ncurrent-step: STEP0\n' });
  const r2 = run(['status', '--change', 'a', '--change', 'b'], root2);
  assert.match(r2.stdout, /\bb\b/);
  // boolean idempotent
  const root3 = mkProject({ 'apriori/specs/m/spec.md': '#### Scenario: XA-01 a\n- t\n' });
  assert.strictEqual(run(['check', '--self', '--self'], root3).status, run(['check', '--self'], root3).status);
  // alias: init -y == --yes (non-interactive completes)
  const root4 = fs.mkdtempSync(path.join(os.tmpdir(), 'apriori-args-'));
  assert.strictEqual(run(['init', '--tools', 'claude', '-y'], root4).status, 0);
});

test('CL-16 multi consumption stops at any dash token', () => {
  const r = run(['verify', '--specs', 'a', '-x', '--test-cmd', 't']);
  assert.strictEqual(r.status, 2);
  assert.match(r.stderr, /-x/);
});

test('CL-17 init no-flag door survives the migration (non-TTY → its own --tools usage)', () => {
  const r = run(['init']);
  assert.strictEqual(r.status, 2);
  assert.match(r.stderr, /--tools/);
  assert.doesNotMatch(r.stderr, /unknown flag/);
});

test('CL-11..16 parseStrict unit edges', () => {
  const spec = { sub: 'x', usage: 'u', flags: { '--v': 'value', '--m': 'multi', '--b': 'flag' }, positionals: 0, aliases: { '-b': '--b' } };
  assert.strictEqual(parseStrict(['--help'], spec).code, 0);
  assert.strictEqual(parseStrict(['-h'], spec).code, 0);
  assert.strictEqual(parseStrict(['--v'], spec).code, 2);                       // missing value
  assert.strictEqual(parseStrict(['--m', '--v', 'x'], spec).code, 2);           // empty multi
  assert.strictEqual(parseStrict(['--m', 'a', '--m', '--v', 'x'], spec).code, 2); // empty SECOND occurrence
  assert.deepStrictEqual(parseStrict(['--m', 'a', '--m', 'b'], spec).flags['--m'], ['a', 'b']);
  assert.strictEqual(parseStrict(['--v', 'a', '--v', 'b'], spec).flags['--v'], 'b');
  assert.strictEqual(parseStrict(['-b', '--b'], spec).flags['--b'], true);
  assert.strictEqual(parseStrict(['--nope'], spec).code, 2);
  assert.strictEqual(parseStrict(['stray'], spec).code, 2);
  assert.strictEqual(parseStrict(['--m', 'a', '--help'], spec).code, 0);        // help wins anywhere
  assert.strictEqual(parseStrict(['--nope', '--help'], spec).code, 0);          // ...even after an unknown flag (SIMPL-1)
  assert.strictEqual(parseStrict(['--v', '-h'], spec).code, 0);                 // ...and via alias after a value flag
  assert.strictEqual(parseStrict(['--v', '-e'], spec).flags['--v'], '-e');      // value takes the next token verbatim (SIMPL-2)
});
