'use strict';
// CT-01..04 — batch C row 4: the default template keeps only what a user actually decides.
//
// The scaffolded process-config carries the `language` row alone. The `id-pattern` and `cas`
// rows restated built-in defaults, and the ~10-line pipe-escaping comment was reference
// material — the rows are gone (omission ≡ explicit default, proven byte-for-byte across
// verify/gate/archive) and the escaping reference lives in docs/cli.md §8.0 (both editions).
// Adding a custom row to the slim template works exactly as before: the two pipe-escape
// spellings (`\|` alternation, `[\|]` literal) and `| cas | optional |` keep their meaning.
// Effective defaults, detection and consumption-time errors are untouched.

const { test } = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawnSync } = require('node:child_process');
const { DEFAULT_ID } = require('../lib/config');
const gate = require('../lib/gate');

const ROOT = path.join(__dirname, '..');
const BIN = path.join(ROOT, 'bin', 'apriori.js');
const TEMPLATE = () => fs.readFileSync(path.join(ROOT, 'templates', 'process-config.md'), 'utf8');
const run = (args, cwd) => spawnSync('node', [BIN, ...args], { encoding: 'utf8', cwd });

function mk(files) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'apriori-ct-'));
  for (const [rel, content] of Object.entries(files)) {
    const p = path.join(root, rel);
    fs.mkdirSync(path.dirname(p), { recursive: true });
    fs.writeFileSync(p, content);
  }
  return root;
}

const STORE = '### Requirement: Alpha\n\n#### Scenario: XA-01 base\n- t\n';
const ADDED = '## ADDED Requirements\n\n### Requirement: Beta\n\n#### Scenario: XB-01 new\n- t\n';
const MOD = '## MODIFIED Requirements\n\n### Requirement: Alpha\n\n#### Scenario: XA-01 base\n- tightened\n';
const FLOW = (n, phase) => `change: ${n}\nlineage: v3\nphase: ${phase}\n\n## Open\n\ngates:\n  - 2026-07-11T00:00 note: n\n`;
const tap = (...lines) => `node -e "${lines.map((l, i) => `console.log('ok ${i + 1} - ${l}')`).join(';')}"`;
const TAP2 = tap('XA-01 base', 'XB-01 new');

test('CT-01 the shipped template is the table the user decides — no default rows, no escaping essay', () => {
  const t = TEMPLATE();
  assert.match(t, /\| language \| auto \|/);                       // the row --language writes
  assert.doesNotMatch(t, /id-pattern/, 'the id-pattern default row is still shipped');
  assert.doesNotMatch(t, /\| cas \|/, 'the cas default row is still shipped');
  assert.doesNotMatch(t, /pipe|escap/i, 'the pipe-escaping comment block is still in the template');
  // the reference moved to docs/cli.md §8.0, both editions: the two spellings are taught there
  for (const doc of ['docs/cli.md', 'docs/cli_cn.md']) {
    const d = fs.readFileSync(path.join(ROOT, doc), 'utf8');
    assert.ok(d.includes('\\|'), `${doc}: the \\| escaping reference did not land`);
    assert.ok(d.includes('[\\|]'), `${doc}: the [\\|] literal-pipe reference did not land`);
    assert.ok(d.includes('| cas | optional |'), `${doc}: the cas row reference is gone`);
  }
});

test('CT-02 omitted rows ≡ explicit defaults: verify/gate/archive byte-identical', () => {
  const proj = (cfg) => mk({
    'apriori/process-config.md': cfg,
    'apriori/specs/kv/spec.md': STORE,
    'apriori/changes/c/flow-state.md': FLOW('c', 'review'),
    'apriori/changes/c/specs/kv/spec.md': ADDED,
    'apriori/changes/c/review/code-review-v1.md': 'VERDICT: no major issues\n',
    'apriori/changes/c/review/code-review-v1-raw.txt': 'raw\n',
  });
  const A = proj(TEMPLATE());                                       // scaffold shape: rows omitted
  const B = proj(TEMPLATE() + `| id-pattern | ${DEFAULT_ID} |\n| cas | required |\n`);
  const norm = (s, root) => s.split(root).join('<root>');
  for (const args of [
    ['verify', '--change', 'c', '--test-cmd', TAP2],
    ['gate', '--change', 'c', '--test-cmd', TAP2],
    ['archive', '--change', 'c'],
  ]) {
    const ra = run(args, A), rb = run(args, B);
    assert.strictEqual(rb.status, ra.status, `${args[0]}: exit differs (${ra.status} vs ${rb.status})\nA:${ra.stdout}${ra.stderr}\nB:${rb.stdout}${rb.stderr}`);
    assert.strictEqual(norm(rb.stdout, B), norm(ra.stdout, A), `${args[0]}: stdout differs`);
    assert.strictEqual(norm(rb.stderr, B), norm(ra.stderr, A), `${args[0]}: stderr differs`);
  }
  // and the comparison was not between two errors: verify really bound and ran
  assert.strictEqual(run(['verify', '--change', 'c', '--test-cmd', TAP2], A).status, 0);
});

test('CT-03 a custom id-pattern row on the slim template: both pipe-escape spellings still work', () => {
  // `\|` = alternation: (AC|BR)-\d+
  const alt = mk({
    'apriori/process-config.md': TEMPLATE() + '| id-pattern | (AC\\|BR)-\\d+ |\n',
    'apriori/specs/m/spec.md': '#### Scenario: AC-1 a\n#### Scenario: BR-2 b\n',
  });
  const r1 = run(['verify', '--specs', 'apriori/specs', '--test-cmd', tap('AC-1 a', 'BR-2 b'), '--json'], alt);
  const j1 = JSON.parse(r1.stdout);
  assert.strictEqual(j1.unidentified.length, 0, 'the \\| alternation row stopped binding: ' + r1.stdout + r1.stderr);
  // `[\|]` = a literal pipe in the ID shape
  const lit = mk({
    'apriori/process-config.md': TEMPLATE() + '| id-pattern | A[\\|]\\d+ |\n',
    'apriori/specs/m/spec.md': '#### Scenario: A|1 t\n#### Scenario: A-9 x\n',
  });
  const r2 = run(['verify', '--specs', 'apriori/specs', '--test-cmd', tap('A|1 t'), '--json'], lit);
  const j2 = JSON.parse(r2.stdout);
  assert.ok(!j2.unidentified.some((u) => /A\|1/.test(u.title || JSON.stringify(u))), 'the [\\|] literal pipe stopped matching: ' + r2.stdout + r2.stderr);
  assert.ok(j2.unidentified.some((u) => /A-9/.test(u.title || JSON.stringify(u))), 'a non-matching title bound anyway — the row is not governing: ' + r2.stdout);
});

test('CT-04 cas semantics on the slim template: omitted = required (byte-identical), optional still waives', () => {
  const proj = (cfg) => mk({
    'apriori/process-config.md': cfg,
    'apriori/specs/kv/spec.md': STORE,
    'apriori/changes/c/flow-state.md': FLOW('c', 'build'),
    'apriori/changes/c/specs/kv/spec.md': MOD,                      // unstamped MUTATION delta
  });
  const MOD_TAP = tap('XA-01 base');
  const A = proj(TEMPLATE());                                       // no cas row → default required
  const B = proj(TEMPLATE() + '| cas | required |\n');
  const norm = (s, root) => s.split(root).join('<root>');
  for (const args of [['gate', '--change', 'c', '--test-cmd', MOD_TAP], ['archive', '--change', 'c']]) {
    const ra = run(args, A), rb = run(args, B);
    assert.strictEqual(rb.status, ra.status, `${args[0]}: exit differs`);
    assert.strictEqual(norm(rb.stdout, B), norm(ra.stdout, A), `${args[0]}: stdout differs`);
    assert.strictEqual(norm(rb.stderr, B), norm(ra.stderr, A), `${args[0]}: stderr differs`);
  }
  // the default really is DENY: C7 blocked on the omitted-row project
  const c7 = gate.runGate({ cwd: A, change: 'c', testCmd: MOD_TAP }).checks.find((x) => x.id === 'C7');
  assert.strictEqual(c7.status, 'blocked');
  // and `| cas | optional |` appended to the slim template still waives, naming the config
  const C = proj(TEMPLATE() + '| cas | optional |\n');
  const c7w = gate.runGate({ cwd: C, change: 'c', testCmd: MOD_TAP }).checks.find((x) => x.id === 'C7');
  assert.notStrictEqual(c7w.status, 'blocked');
  assert.match(c7w.detail, /process-config/);
});
