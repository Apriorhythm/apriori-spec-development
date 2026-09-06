'use strict';
// IT-01..IT-06 — `init --test-cmd` round-trips byte-for-byte (6.2 batch A-4).
//
// Astra P4: the command was spliced into the process-config table with `String.replace` and a
// bare template — `|` split the cell, `$&`/`$1` were replacement patterns — so `printf ok | cat`
// persisted as `printf ok` and `console.log("$&")` lost its tail: a silently different test
// command. Now: a callback replacement and an explicit cell serializer/parser pair (config.js
// `encodeCell` / `splitCells`), and anything the cell grammar cannot carry is refused with a
// clear error BEFORE anything is written.

const { test } = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const config = require('../lib/config');

const BIN = path.join(__dirname, '..', 'bin', 'apriori.js');
const run = (args, cwd) => spawnSync('node', [BIN, ...args], { encoding: 'utf8', cwd });
const fresh = () => fs.mkdtempSync(path.join(os.tmpdir(), 'apriori-it-'));

const COMMANDS = [
  ['a pipe', 'printf ok | cat'],
  ['two pipes and quotes', "sh -c 'echo x || echo y' | grep -v z"],
  ['the replacement pattern $&', 'node -e "console.log(\'$&\')"'],
  ['the replacement patterns $1 $` $\'', 'node -e "console.log(\'$1 $` $\\\' $$\')"'],
  ['backslashes not before a pipe', 'node -e "console.log(\'a\\\\b\\\\\\\\c\')"'],
  ['an even run of backslashes before a pipe', 'echo a\\\\ | cat'],
  ['unicode', 'node -e "console.log(\'日本語 ✓ émoji 🚀\')"'],
  ['a pipe inside quotes', 'node -e "process.stdout.write(\'ok 1 - a|b\\n\')"'],
];

test('IT-01 every command round-trips byte-for-byte through init → process-config → getConfig', () => {
  for (const [why, cmd] of COMMANDS) {
    const root = fresh();
    const r = run(['init', '--tools', 'claude', '--test-cmd', cmd, '--yes'], root);
    assert.strictEqual(r.status, 0, `${why}: ${r.stdout}${r.stderr}`);
    const got = config.getConfig(root, 'test-cmd');
    assert.strictEqual(got.problem, null, why);
    assert.strictEqual(got.value, cmd, `${why}: persisted as ${JSON.stringify(got.value)}`);
    // and the row is one table row — the cell did not split
    const cfg = fs.readFileSync(path.join(root, 'apriori', 'process-config.md'), 'utf8');
    const rows = cfg.split('\n').filter((l) => /^\| test-cmd \|/.test(l));
    assert.strictEqual(rows.length, 1, why);
  }
});

test('IT-02 the serializer/parser pair is explicit, and decode(encode(x)) === x', () => {
  for (const [why, cmd] of COMMANDS) {
    const enc = config.encodeCell(cmd);
    assert.strictEqual(enc.error, undefined, why);
    const cells = config.splitCells(`| test-cmd | ${enc.cell} | note |`).map((c) => c.trim());
    assert.strictEqual(cells[2], cmd, why);
  }
  assert.deepStrictEqual(config.encodeCell('printf ok | cat'), { cell: 'printf ok \\| cat' });
});

test('IT-03 a command with a newline is refused with a clear error before anything is written', () => {
  const root = fresh();
  const r = run(['init', '--tools', 'claude', '--test-cmd', 'echo a\necho b', '--yes'], root);
  assert.strictEqual(r.status, 2, r.stdout + r.stderr);
  assert.match(r.stderr, /--test-cmd cannot contain a newline — a config row is one line; wrap the command in a script and name that/);
  assert.ok(!fs.existsSync(path.join(root, 'apriori')), 'nothing written');
  assert.ok(!fs.existsSync(path.join(root, 'CLAUDE.md')), 'no pointer either');
});

test('IT-04 the one shape the cell grammar cannot carry — an odd run of backslashes right before a pipe — is refused, not mangled', () => {
  assert.match(config.encodeCell('echo a\\| cat').error, /a backslash directly before a pipe cannot be represented in a config table cell/);
  const root = fresh();
  const r = run(['init', '--tools', 'claude', '--test-cmd', 'echo a\\| cat', '--yes'], root);
  assert.strictEqual(r.status, 2, r.stdout + r.stderr);
  assert.match(r.stderr, /cannot be represented in a config table cell/);
  assert.ok(!fs.existsSync(path.join(root, 'apriori')), 'nothing written');
});

test('IT-05 an empty --test-cmd is refused at the argument layer, nothing written', () => {
  for (const v of ['', '   ']) {
    const root = fresh();
    const r = run(['init', '--tools', 'claude', '--test-cmd', v, '--yes'], root);
    assert.strictEqual(r.status, 2, JSON.stringify(v));
    assert.match(r.stderr, /empty --test-cmd — pass a command or omit the flag/);
    assert.ok(!fs.existsSync(path.join(root, 'apriori')), 'nothing written');
  }
});

test('IT-06 --language is written through the same callback replacement: `$` sequences stay literal', () => {
  const root = fresh();
  const r = run(['init', '--tools', 'claude', '--language', 'zh$&$1', '--yes'], root);
  assert.strictEqual(r.status, 0, r.stdout + r.stderr);
  assert.strictEqual(config.getConfig(root, 'language').value, 'zh$&$1');
});
