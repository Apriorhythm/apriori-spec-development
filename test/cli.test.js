'use strict';
const { test } = require('node:test');
const assert = require('node:assert');
const { spawnSync } = require('node:child_process');
const path = require('node:path');
const fs = require('node:fs');

const BIN = path.join(__dirname, '..', 'bin', 'apriori.js');
function run(args) { return spawnSync('node', [BIN, ...args], { encoding: 'utf8' }); }

test('CL-01 subcommand dispatch: known subs dispatch, unknown prints usage + non-zero', () => {
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
