'use strict';
const { test } = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { verify, cli } = require('../lib/spec-runner');

// cross-platform TAP emitter: node -e works identically under cmd.exe, PowerShell and sh
function tapCmd(...lines) {
  return `node -e "${lines.map((l) => `console.log('${l}')`).join(';')}"`;
}

// Build a project tree: { 'apriori/specs/kv/spec.md': '...', 'apriori/changes/c/specs/kv/spec.md': '...' }
function mkProject(files) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'apriori-proj-'));
  for (const [rel, content] of Object.entries(files)) {
    const p = path.join(root, rel);
    fs.mkdirSync(path.dirname(p), { recursive: true });
    fs.writeFileSync(p, content);
  }
  return root;
}

const STORE_KV = '### Requirement: Alpha\nbase req\n\n#### Scenario: XA-01 first\n- WHEN x\n- THEN y\n';

function jsonCli(args) {
  let out = '';
  const orig = console.log;
  console.log = (s) => { out += s + '\n'; };
  let code;
  try { code = cli(args); } finally { console.log = orig; }
  return { code, json: JSON.parse(out) };
}

test('SR-16 ADDED delta scenarios join the projection alongside store scenarios', () => {
  const root = mkProject({
    'apriori/specs/kv/spec.md': STORE_KV,
    'apriori/changes/c/specs/kv/spec.md':
      '## ADDED Requirements\n\n### Requirement: Beta\n\n#### Scenario: XB-01 new one\n- WHEN a\n- THEN b\n',
  });
  const run = verify({ change: 'c', cwd: root, testCmd: tapCmd('ok 1 - XA-01 a', 'ok 2 - XB-01 b') });
  assert.strictEqual(run.errors.length, 0);
  assert.deepStrictEqual(run.verdict.boundGreen, ['XA-01', 'XB-01']);   // both demanded, both green
  assert.strictEqual(run.duplicates.length, 0);                          // overlay produced no dup-ID error
  assert.strictEqual(run.verdict.clean, true);
});

test('SR-17 MODIFIED delta replaces the demanded scenario set', () => {
  const root = mkProject({
    'apriori/specs/kv/spec.md':
      '### Requirement: Alpha\n\n#### Scenario: XA-01 keep\n- t\n\n#### Scenario: XA-02 dropped by delta\n- t\n',
    'apriori/changes/c/specs/kv/spec.md':
      '## MODIFIED Requirements\n\n### Requirement: Alpha\n\n#### Scenario: XA-01 keep\n- t\n',
  });
  const run = verify({ change: 'c', cwd: root, testCmd: tapCmd('ok 1 - XA-01 a') });
  assert.deepStrictEqual(run.verdict.boundGreen, ['XA-01']);
  assert.deepStrictEqual(run.verdict.unbound, []);          // XA-02 is NOT demanded
  assert.strictEqual(run.verdict.clean, true);
});

test('SR-18 REMOVED delta scenarios are not demanded and their lingering tests orphan', () => {
  const root = mkProject({
    'apriori/specs/kv/spec.md': STORE_KV,
    'apriori/changes/c/specs/kv/spec.md': '## REMOVED Requirements\n\n### Requirement: Alpha\n',
  });
  const run = verify({ change: 'c', cwd: root, testCmd: tapCmd('ok 1 - XA-01 lingering') });
  assert.deepStrictEqual(run.verdict.orphan, ['XA-01']);    // test survives, scenario gone → ORPHAN
  assert.deepStrictEqual(run.verdict.unbound, []);
  assert.strictEqual(run.verdict.clean, false);             // exit 1 until the test is deleted
});

test('SR-19 RENAMED delta demands exactly the post-rename picture', () => {
  const root = mkProject({
    'apriori/specs/kv/spec.md': STORE_KV,
    'apriori/changes/c/specs/kv/spec.md': '## RENAMED Requirements\n- Alpha -> Gamma\n',
  });
  const run = verify({ change: 'c', cwd: root, testCmd: tapCmd('ok 1 - XA-01 a') });
  assert.deepStrictEqual(run.verdict.boundGreen, ['XA-01']);  // content (and IDs) preserved, demanded once
  assert.strictEqual(run.verdict.clean, true);
});

test('SR-20 merge conflicts make the projection untrustworthy (exit 2, conflicts named)', () => {
  const root = mkProject({
    'apriori/specs/kv/spec.md': STORE_KV,
    'apriori/changes/c/specs/kv/spec.md':
      '## MODIFIED Requirements\n\n### Requirement: NoSuch\n\n#### Scenario: XN-01 x\n- t\n',
  });
  const run = verify({ change: 'c', cwd: root, testCmd: tapCmd('ok 1 - XA-01 a') });
  assert.ok(run.errors.length > 0);
  assert.ok(run.projection.conflicts.some((c) => c.includes('NoSuch')));
  const r = jsonCli(['--change', 'c', '--cwd', root, '--test-cmd', tapCmd('ok 1 - XA-01 a'), '--json']);
  assert.strictEqual(r.code, 2);
});

test('SR-21 projection inputs fail closed (exit 2 naming the offender)', () => {
  const store = { 'apriori/specs/kv/spec.md': STORE_KV };
  const cases = [
    // [extra files, change name, message fragment]
    [{}, 'nope', 'nope'],                                                    // nonexistent change
    [{ 'apriori/changes/c/specs/.keep': '' }, 'c', 'specs'],                 // zero delta files
    [{ 'apriori/changes/c/specs/kv/spec.md': '   \n' }, 'c', 'kv'],          // whitespace-only delta
    [{ 'apriori/changes/c/specs/kv/spec.md': '# just prose\nno sections\n' }, 'c', 'kv'],  // zero ops
    [{ 'apriori/changes/c/specs/kv/spec.md':
        '## ADDED Requirements\n\n### Requirement: Dup\n\n#### Scenario: XD-01 a\n- t\n\n### Requirement: Dup\n\n#### Scenario: XD-02 b\n- t\n' },
      'c', 'Dup'],                                                           // duplicate names in delta
    [{}, '../evil', 'evil'],                                                 // invalid name
  ];
  for (const [extra, name, frag] of cases) {
    const root = mkProject({ ...store, ...extra });
    const run = verify({ change: name, cwd: root, testCmd: tapCmd('ok 1 - XA-01 a') });
    assert.ok(run.errors.length > 0, `expected errors for ${frag}`);
    assert.ok(run.errors.some((e) => e.includes(frag)), `error should name ${frag}: ${run.errors}`);
  }
});

test('SR-22 --specs and --change are mutually exclusive (exit 2)', () => {
  const root = mkProject({ 'apriori/specs/kv/spec.md': STORE_KV });
  let err = '';
  const orig = console.error;
  console.error = (s) => { err += s + '\n'; };
  let code;
  try { code = cli(['--change', 'c', '--specs', 'apriori/specs', '--cwd', root, '--test-cmd', 'x']); }
  finally { console.error = orig; }
  assert.strictEqual(code, 2);
  assert.match(err, /projection defines the spec set/);
});

test('SR-23 --json carries the projection contract in every outcome class', () => {
  // success class
  const okRoot = mkProject({
    'apriori/specs/kv/spec.md': STORE_KV,
    'apriori/changes/c/specs/kv/spec.md':
      '## ADDED Requirements\n\n### Requirement: Beta\n\n#### Scenario: XB-01 n\n- t\n',
  });
  const ok = jsonCli(['--change', 'c', '--cwd', okRoot, '--test-cmd', tapCmd('ok 1 - XA-01 a', 'ok 2 - XB-01 b'), '--json']);
  assert.strictEqual(ok.code, 0);
  assert.strictEqual(ok.json.result, 'GREEN');
  assert.deepStrictEqual(ok.json.projection, { change: 'c', modules: ['kv/spec.md'], conflicts: [] });
  // merge-conflict class
  const cfRoot = mkProject({
    'apriori/specs/kv/spec.md': STORE_KV,
    'apriori/changes/c/specs/kv/spec.md': '## MODIFIED Requirements\n\n### Requirement: NoSuch\n\n#### Scenario: XN-01 x\n- t\n',
  });
  const cf = jsonCli(['--change', 'c', '--cwd', cfRoot, '--test-cmd', tapCmd('ok 1 - XA-01 a'), '--json']);
  assert.strictEqual(cf.code, 2);
  assert.strictEqual(cf.json.result, 'ERROR');
  assert.ok(cf.json.projection.conflicts.length > 0);
  assert.ok(cf.json.errors.length > 0);
  // other-failure class (nonexistent change) — still pure JSON, projection present
  const nfRoot = mkProject({ 'apriori/specs/kv/spec.md': STORE_KV });
  const nf = jsonCli(['--change', 'zzz', '--cwd', nfRoot, '--test-cmd', tapCmd('ok 1 - XA-01 a'), '--json']);
  assert.strictEqual(nf.code, 2);
  assert.strictEqual(nf.json.result, 'ERROR');
  assert.deepStrictEqual(nf.json.projection, { change: 'zzz', modules: [], conflicts: [] });
  assert.ok(nf.json.errors.length > 0);
  // non-change runs never emit projection
  const plain = jsonCli(['--specs', path.join(okRoot, 'apriori/specs'), '--test-cmd', tapCmd('ok 1 - XA-01 a'), '--json']);
  assert.ok(!('projection' in plain.json));
});

test('SR-24 a diverged base stamp blocks projection (exit 2, fingerprints named)', () => {
  const root = mkProject({
    'apriori/specs/kv/spec.md': STORE_KV,
    'apriori/changes/c/specs/kv/spec.md':
      `<!-- apriori-base: sha256:${'0'.repeat(64)} -->\n## ADDED Requirements\n\n### Requirement: Beta\n\n#### Scenario: XB-01 n\n- t\n`,
  });
  const run = verify({ change: 'c', cwd: root, testCmd: tapCmd('ok 1 - XA-01 a') });
  assert.ok(run.errors.some((e) => e.includes('kv') && e.includes('sha256:')));
  const r = jsonCli(['--change', 'c', '--cwd', root, '--test-cmd', tapCmd('ok 1 - XA-01 a'), '--json']);
  assert.strictEqual(r.code, 2);
});

test('SR-25 deprecated block scenarios stop being demanded; their tests are ORPHAN', () => {
  const root = mkProject({
    'apriori/specs/kv/spec.md':
      '### Requirement: Old  _deprecated (superseded by some-change)_\n\n#### Scenario: XO-01 gone\n- t\n\n' + STORE_KV,
  });
  // plain verify (no --change) — the rule applies to ALL verify forms
  const run = verify({ specs: [path.join(root, 'apriori/specs')], testCmd: tapCmd('ok 1 - XA-01 a', 'ok 2 - XO-01 lingering') });
  assert.deepStrictEqual(run.verdict.boundGreen, ['XA-01']);   // non-deprecated block unaffected
  assert.deepStrictEqual(run.verdict.unbound, []);             // XO-01 not demanded
  assert.deepStrictEqual(run.verdict.orphan, ['XO-01']);       // lingering test flagged
});
