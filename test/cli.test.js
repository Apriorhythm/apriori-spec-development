'use strict';
const { test } = require('node:test');
const assert = require('node:assert');
const { spawnSync } = require('node:child_process');
const path = require('node:path');
const fs = require('node:fs');

const BIN = path.join(__dirname, '..', 'bin', 'apriori.js');
function run(args) { return spawnSync('node', [BIN, ...args], { encoding: 'utf8' }); }

test('CL-01 subcommand dispatch: known subs dispatch, unknown prints usage + non-zero', () => {
  // update dispatches to lib/update (bare cwd is uninitialized → its own error, not "unknown command")
  const up = run(['update']);
  assert.strictEqual(up.status, 1);
  assert.match(up.stderr, /apriori init/);
  assert.doesNotMatch(up.stderr, /unknown command/);
  assert.match(run(['--help']).stdout, /apriori <command>/);
  const unknown = run(['frobnicate']);
  assert.notStrictEqual(unknown.status, 0);
  assert.match(unknown.stderr, /unknown command/);
  // init dispatches to lib/init (non-interactive without --tools → its own usage, not "unknown command")
  const init = run(['init']);
  assert.match(init.stderr, /--tools/);
  assert.doesNotMatch(init.stderr, /unknown command/);
  // status dispatches to lib/status (no active changes in a bare cwd → its own message, not "unknown command")
  const st = run(['status']);
  assert.strictEqual(st.status, 0);
  assert.doesNotMatch(st.stderr + st.stdout, /unknown command/);
  // new dispatches to lib/new (no name → its own usage, exit 2)
  const nw = run(['new']);
  assert.strictEqual(nw.status, 2);
  assert.match(nw.stderr, /apriori new <change-name>/);
  assert.doesNotMatch(nw.stderr, /unknown command/);
});

test('CL-02 verify subcommand is the spec-runner', () => {
  const r = run(['verify']);           // missing required args → usage + exit 2
  assert.strictEqual(r.status, 2);
  assert.match(r.stderr, /apriori verify --specs/);
});

test('CL-03 archive subcommand is archive-merge', () => {
  const r = run(['archive']);
  assert.strictEqual(r.status, 2);
  assert.match(r.stderr, /apriori archive --store/);
});

test('CL-04 check subcommand is the doc checker', () => {
  const r = run(['check', '--specs', 'apriori/specs']);
  assert.match(r.stdout + r.stderr, /RESULT:/);   // it runs and reports a result
});

test('CL-05 zero runtime dependencies', () => {
  const pkg = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'package.json'), 'utf8'));
  assert.ok(!pkg.dependencies || Object.keys(pkg.dependencies).length === 0);
  assert.ok(!pkg.devDependencies || Object.keys(pkg.devDependencies).length === 0);
});

test('CL-06 --version prints the package version verbatim, exit 0', () => {
  const pkg = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'package.json'), 'utf8'));
  for (const flag of ['--version', '-v']) {
    const r = run([flag]);
    assert.strictEqual(r.status, 0);
    assert.strictEqual(r.stdout.trim(), pkg.version);
  }
});

test('CL-08 stamp subcommand appears in usage and dispatches', () => {
  assert.match(run(['--help']).stdout, /stamp/);
  const r = run(['stamp']);                      // no arg → its own usage, exit 2, not "unknown command"
  assert.strictEqual(r.status, 2);
  assert.doesNotMatch(r.stderr, /unknown command/);
});

test('CL-09 gate subcommand appears in usage and dispatches', () => {
  assert.match(run(['--help']).stdout, /gate/);
  const r = run(['gate']);                       // no --change → its own usage, exit 2, not "unknown command"
  assert.strictEqual(r.status, 2);
  assert.doesNotMatch(r.stderr, /unknown command/);
});

test('CL-10 doctor subcommand appears in usage and dispatches', () => {
  assert.match(run(['--help']).stdout, /doctor/);
  const r = run(['doctor', 'stray-positional']);   // positional → its own usage, exit 2, not "unknown command"
  assert.strictEqual(r.status, 2);
  assert.doesNotMatch(r.stderr, /unknown command/);
});

test('CL-07 unexpected subcommand failures exit cleanly — one line, no stack trace', () => {
  // archive with an unreadable store file → fs throws deep inside the subcommand
  const r = run(['archive', '--store', 'no-such-store.md', '--delta', 'no-such-delta.md', '--change', 'x']);
  assert.strictEqual(r.status, 1);
  assert.match(r.stderr, /^apriori: /);
  assert.doesNotMatch(r.stderr, /\n\s+at /);   // no stack frames reach the user
});

test('CL-18 hotfix subcommand appears in usage and dispatches by verb', () => {
  assert.match(run(['--help']).stdout, /\n  hotfix\s/);

  const bare = run(['hotfix']);
  assert.strictEqual(bare.status, 0, bare.stderr);
  assert.match(bare.stdout, /apriori hotfix new <name>/);

  const nonsense = run(['hotfix', 'nonsense']);
  assert.strictEqual(nonsense.status, 2);
  assert.match(nonsense.stderr, /unknown subcommand 'nonsense'/);

  // both known verbs reach the lane rather than the dispatcher's unknown-command path
  const scaffold = run(['hotfix', 'new', 'Not Kebab']);
  assert.strictEqual(scaffold.status, 1);
  assert.match(scaffold.stderr, /bare kebab-case/);
  const arch = run(['hotfix', 'archive', 'no-such-hotfix']);
  assert.notStrictEqual(arch.status, 0);
  assert.match(arch.stderr, /no bundle at apriori\/changes\/no-such-hotfix/);
});
