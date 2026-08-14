'use strict';
// config-contract — CF-01..07: process-config parses as structure
const { test } = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawnSync } = require('node:child_process');

const BIN = path.join(__dirname, '..', 'bin', 'apriori.js');
function run(args, cwd) { return spawnSync('node', [BIN, ...args], { encoding: 'utf8', cwd }); }

const STORE = '### Requirement: Alpha\nold\n\n#### Scenario: XA-01 a\n- t\n';
const MOD = '## MODIFIED Requirements\n\n### Requirement: Alpha\nCHANGED\n\n#### Scenario: XA-01 a\n- t\n';
function proj(config) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'apriori-cfg-'));
  for (const [rel, c] of Object.entries({
    'apriori/specs/a/spec.md': STORE,
    'apriori/changes/c/flow-state.md': 'change: c\ntier: medium\n',
    'apriori/changes/c/specs/a/spec.md': MOD,
    'apriori/process-config.md': config,
  })) { fs.mkdirSync(path.dirname(path.join(root, rel)), { recursive: true }); fs.writeFileSync(path.join(root, rel), c); }
  return root;
}
const store = (root) => fs.readFileSync(path.join(root, 'apriori/specs/a/spec.md'), 'utf8');

test('CF-01 fenced and commented rows never take effect', () => {
  const denied = proj('```md\n| cas | optional |\n```\n\n| cas | required |\n');
  const r1 = run(['archive', '--change', 'c', '--write'], denied);
  assert.strictEqual(r1.status, 1, r1.stdout + r1.stderr);
  assert.doesNotMatch(store(denied), /CHANGED/);
  const waived = proj('```md\n| cas | required |\n```\n\n| cas | optional |\n');
  const r2 = run(['archive', '--change', 'c', '--write'], waived);
  assert.strictEqual(r2.status, 0, r2.stdout + r2.stderr);
  assert.match(r2.stdout + r2.stderr, /waived|process-config/i);
  assert.match(store(waived), /CHANGED/);
  const comment = proj('<!--\n| cas | optional |\n-->\n');
  const r3 = run(['archive', '--change', 'c', '--write'], comment);
  assert.strictEqual(r3.status, 1, r3.stdout + r3.stderr);
});

test('CF-02 multi-column rows parse by their first two cells', () => {
  const root = proj('| cas | optional | 注释说明列 |\n');
  const r = run(['archive', '--change', 'c', '--write'], root);
  assert.strictEqual(r.status, 0, r.stdout + r.stderr);
  assert.match(store(root), /CHANGED/);
  // an inline HTML comment is a span, not a line-killer — the live row survives (CCIMPL-2)
  const inline = proj('| cas | optional | <!-- note --> |\n');
  assert.strictEqual(run(['archive', '--change', 'c', '--write'], inline).status, 0);
});

test('CF-03 duplicates tolerate sameness and refuse conflict', () => {
  const same = proj('| cas | optional |\n| cas | optional |\n');
  assert.strictEqual(run(['archive', '--change', 'c', '--write'], same).status, 0);
  const conflict = proj('| cas | optional |\n| cas | required |\n');
  const r = run(['archive', '--change', 'c', '--write'], conflict);
  assert.strictEqual(r.status, 1, r.stdout + r.stderr);
  assert.match(r.stdout + r.stderr, /conflict/i);
  assert.doesNotMatch(store(conflict), /CHANGED/);
  const g = run(['gate', '--change', 'c', '--test-cmd', `node -e "console.log('ok 1 - XA-01 a')"`], conflict);
  assert.match(g.stdout, /C7/);
  assert.match(g.stdout, /conflict/i);
  // an illegal value is a config error too, never a silent no-waiver (CCIMPL-1)
  const banana = proj('| cas | banana |\n');
  const rb = run(['archive', '--change', 'c', '--write'], banana);
  assert.strictEqual(rb.status, 1, rb.stdout + rb.stderr);
  assert.match(rb.stdout + rb.stderr, /banana/);
  assert.doesNotMatch(store(banana), /CHANGED/);
});

test('CF-04 unterminated blocks are inert, not effective', () => {
  for (const cfg of ['```\n| cas | optional |\n', '<!--\n| cas | optional |\n']) {
    const root = proj(cfg);
    const r = run(['archive', '--change', 'c', '--write'], root);
    assert.strictEqual(r.status, 1, cfg + r.stdout + r.stderr);
    assert.doesNotMatch(store(root), /CHANGED/);
  }
});

test('CF-05 config errors surface only at consumption', () => {
  // ADDED-only delta: the conflicted cas row is never consulted
  const root = proj('| cas | optional |\n| cas | required |\n');
  fs.writeFileSync(path.join(root, 'apriori/changes/c/specs/a/spec.md'),
    '## ADDED Requirements\n\n### Requirement: Beta\n\n#### Scenario: XB-01 b\n- t\n');
  const r = run(['archive', '--change', 'c', '--write'], root);
  assert.strictEqual(r.status, 0, r.stdout + r.stderr);
});

test('CF-06 the waiver is discoverable', () => {
  const a = run(['archive'], fs.mkdtempSync(path.join(os.tmpdir(), 'apriori-cfg-')));
  assert.match(a.stderr + a.stdout, /--no-cas/);
  const g = run(['gate'], fs.mkdtempSync(path.join(os.tmpdir(), 'apriori-cfg-')));
  assert.match(g.stderr + g.stdout, /--no-cas/);
});

test('CF-07 the template names the cas row', () => {
  const tpl = fs.readFileSync(path.join(__dirname, '..', 'templates', 'process-config.md'), 'utf8');
  assert.match(tpl, /\|\s*cas\s*\|/);
});

// ---- gate-id-pattern: CF-08..CF-12 — cell escaping, unreadable config, template row ----
const { parseConfig, getConfig } = require('../lib/config');

test('CF-08 odd backslash runs keep the pipe in the value', () => {
  const { values } = parseConfig('| id-pattern | (AC\\|BR)-\\d+ |\n');
  assert.strictEqual(values.get('id-pattern'), '(AC|BR)-\\d+');
  const three = parseConfig('| k | a\\\\\\|b |\n');           // raw cell: a\\\|b (3 backslashes + pipe)
  assert.strictEqual(three.values.get('k'), 'a\\\\|b');       // one escape removed, two kept, pipe joins
});

test('CF-09 even backslash runs keep the pipe a separator', () => {
  const two = parseConfig('| k | a\\\\|b |\n');                // raw: a\\|b — even, separator
  assert.strictEqual(two.values.get('k'), 'a\\\\');            // value ends with two literal backslashes
  const four = parseConfig('| k | a\\\\\\\\|b |\n');           // raw: a\\\\|b — even (4), separator
  assert.strictEqual(four.values.get('k'), 'a\\\\\\\\');
});

test('CF-10 unescaped configs parse exactly as before', () => {
  const text = [
    '| test-cmd | node scripts/run-tests.mjs --test-reporter=tap |',
    '| cas | optional | 备注列 |',
    '```md', '| cas | required |', '```',
    '<!-- | test-cmd | echo nope | -->',
  ].join('\n') + '\n';
  const { values, conflicts } = parseConfig(text);
  assert.strictEqual(values.get('test-cmd'), 'node scripts/run-tests.mjs --test-reporter=tap');
  assert.strictEqual(values.get('cas'), 'optional');
  assert.strictEqual(conflicts.size, 0);
});

test('CF-11 an unreadable config is a consumption-time problem', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'apriori-cfg-'));
  fs.mkdirSync(path.join(root, 'apriori', 'process-config.md'), { recursive: true });   // a DIRECTORY
  const { value, problem } = getConfig(root, 'id-pattern');
  assert.strictEqual(value, null);
  assert.match(String(problem), /process-config/);
});

test('CF-12 the template names the id-pattern row with two-layer pipe wording', () => {
  const tplPath = path.join(__dirname, '..', 'templates', 'process-config.md');
  const tpl = fs.readFileSync(tplPath, 'utf8');
  const { values } = parseConfig(tpl);
  assert.strictEqual(values.get('id-pattern'), require('../lib/config').DEFAULT_ID);  // parsed value = built-in default, whatever it currently is
  assert.strictEqual(values.get('cas'), 'required');                     // table structure survives end-to-end
  assert.match(tpl, /\\\|/);                                             // guidance shows the \| spelling
  assert.match(tpl, /\[\\\|\]/);                                         // and the [\|] literal-pipe spelling
  assert.doesNotMatch(tpl, /literal pipe[^.\n]*written\s*`?\\\|`?(?!\])/i); // no "literal pipe is \|" phrasing
  const rowLine = tpl.split('\n').find((l) => /^\|\s*id-pattern\s*\|/.test(l));
  assert.ok(rowLine, 'id-pattern row exists');
  const { splitCells } = require('../lib/config');
  const cells = splitCells(rowLine);
  assert.strictEqual(cells.length, 6, 'row splits into exactly 4 cells + 2 edges (no in-cell pipes)');
  for (const c of cells) assert.doesNotMatch(c, /\|/, 'cells stay pipe-free');
});
