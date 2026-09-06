'use strict';
// SP-01..SP-10 — the structural check BEFORE the projection is written (6.2 batch A-1).
//
// Astra P1: the closeout order check → gate → archive could archive a store that `check` then
// failed — archive checked deltas, CAS and merges but never whether the scenarios it was about
// to write carried a stable id. So, in `archive` (both forms) and in `verify --change`'s
// projection: for every scenario the delta ADDS or MODIFIES (the change scope; REMOVED /
// deprecated blocks are out of it), refuse at preflight — nothing written — when a scenario has
// no leading id under the controlled id matcher (`makeIdMatcher(...).batch`, never an in-process
// RegExp over a config pattern), or when the delta introduces a duplicate id: within the delta,
// or colliding with the store outside the blocks it replaces. Refusals are listed per file:line
// of the DELTA. Historical store debt (ids missing elsewhere) stays a report, never a block, and
// a native test command with no scenario-named tests stays legal (binding is advisory).

const { test } = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const { readyFiles } = require('./helpers/ready-bundle');
const am = require('../lib/archive-merge');

const BIN = path.join(__dirname, '..', 'bin', 'apriori.js');
const run = (args, cwd) => spawnSync('node', [BIN, ...args], { encoding: 'utf8', cwd });
const w = (p, s) => { fs.mkdirSync(path.dirname(p), { recursive: true }); fs.writeFileSync(p, s); return p; };

const STORE = '### Requirement: Alpha\n\n#### Scenario: XA-01 base\n- t\n';
const DEBT = STORE + '\n### Requirement: Old\n\n#### Scenario: nameless since 5.x\n- t\n';
const tap = (lines) => `node -e "${lines.map((l) => `console.log('${l}')`).join(';')}"`;

function project(delta, { store = STORE, config = null } = {}) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'apriori-sp-'));
  for (const [rel, c] of Object.entries(readyFiles('c'))) w(path.join(root, rel), c);
  w(path.join(root, 'apriori', 'specs', 'kv', 'spec.md'), store);
  w(path.join(root, 'apriori', 'changes', 'c', 'specs', 'kv', 'spec.md'), delta);
  if (config) w(path.join(root, 'apriori', 'process-config.md'), config);
  return root;
}
const storePath = (root) => path.join(root, 'apriori', 'specs', 'kv', 'spec.md');
const snapshot = (root) => fs.readFileSync(storePath(root));
const archive = (root, extra = []) => run(['archive', '--change', 'c', '--no-cas', ...extra], root);
const verify = (root, lines, extra = []) => run(['verify', '--change', 'c', '--test-cmd', tap(lines), ...extra], root);
const gate = (root, lines) => run(['gate', '--change', 'c', '--no-cas', '--test-cmd', tap(lines)], root);

// refused at preflight, on every surface, nothing written
function refused(root, re, tapLines = ['ok 1 - XA-01 base']) {
  const before = snapshot(root);
  for (const extra of [[], ['--write'], ['--write', '--changes-dir', 'apriori/changes']]) {
    const a = archive(root, extra);
    assert.strictEqual(a.status, 1, `archive ${extra.join(' ')}: ${a.stdout}${a.stderr}`);
    assert.match(a.stderr, re, extra.join(' '));
    assert.match(a.stdout, /RESULT: FAILED PREFLIGHT — nothing written/, extra.join(' '));
    assert.doesNotMatch(a.stdout, /ARCHIVE DECLARES/, 'a refused archive declares nothing');
  }
  assert.ok(before.equals(snapshot(root)), 'the store is byte-identical');
  assert.ok(!fs.existsSync(storePath(root) + '.tmp-archive'), 'no temp file');
  assert.ok(fs.existsSync(path.join(root, 'apriori', 'changes', 'c', 'flow-state.md')), 'the bundle was not moved');
  const v = verify(root, tapLines, ['--json']);
  assert.strictEqual(v.status, 2, v.stdout + v.stderr);
  const j = JSON.parse(v.stdout);
  assert.strictEqual(j.result, 'ERROR');
  assert.ok(j.errors.some((e) => re.test(e)), JSON.stringify(j.errors));
  assert.strictEqual(gate(root, tapLines).status, 2, 'an unsound projection is not judged');
}

// merged cleanly, and `check` — the oracle — agrees with what was written (test-only closeout)
function merged(root, tapLines) {
  const v = verify(root, tapLines);
  assert.strictEqual(v.status, 0, v.stdout + v.stderr);
  const a = archive(root, ['--write']);
  assert.strictEqual(a.status, 0, a.stdout + a.stderr);
  assert.match(a.stdout, /RESULT: MERGED/);
  return run(['check'], root);
}

test('SP-01 a scenario the delta ADDS with no leading id is refused at preflight, per file:line', () => {
  const root = project('## ADDED Requirements\n\n### Requirement: Beta\n\n#### Scenario: XB-01 fine\n- t\n\n#### Scenario: works but no id\n- t\n');
  refused(root, /kv\/spec\.md:8: scenario without a bindable id: 'works but no id' — this change adds or modifies it; give it a leading id/);
});

test('SP-02 a duplicate id INTRODUCED by the delta is refused, both lines named', () => {
  const root = project('## ADDED Requirements\n\n### Requirement: Beta\n\n#### Scenario: XB-01 one\n- t\n\n### Requirement: Gamma\n\n#### Scenario: XB-01 two\n- t\n');
  refused(root, /scenario id 'XB-01' is introduced twice by this change: kv\/spec\.md:5, kv\/spec\.md:10 — an id names one scenario/);
});

test('SP-03 an id that collides with the store outside the blocks the delta replaces is refused; replacing the block that owns it is not', () => {
  const clash = project('## ADDED Requirements\n\n### Requirement: Beta\n\n#### Scenario: XA-01 clash\n- t\n');
  refused(clash, /kv\/spec\.md:5: scenario id 'XA-01' collides with the store \(kv\/spec\.md\) outside the blocks this change replaces — an id names one scenario/);
  // MODIFIED of Alpha re-declares XA-01 inside the block being replaced: legal
  const mod = project('<!-- apriori-base: new -->\n## MODIFIED Requirements\n\n### Requirement: Alpha\n\n#### Scenario: XA-01 base, revised\n- t\n- more\n');
  fs.writeFileSync(path.join(mod, 'apriori', 'changes', 'c', 'specs', 'kv', 'spec.md'),
    run(['stamp', 'apriori/specs/kv/spec.md'], mod).stdout + '## MODIFIED Requirements\n\n### Requirement: Alpha\n\n#### Scenario: XA-01 base, revised\n- t\n- more\n');
  const c = merged(mod, ['ok 1 - XA-01 base']);
  assert.strictEqual(c.status, 0, c.stdout);
  // and a rename-then-modify keeps its id too
  const rtm = project('## RENAMED Requirements\n\n- Alpha -> Alpha2\n\n## MODIFIED Requirements\n\n### Requirement: Alpha2\n\n#### Scenario: XA-01 base\n- t\n- more\n');
  assert.strictEqual(verify(rtm, ['ok 1 - XA-01 base']).status, 0);
});

test('SP-04 a legal native test command with no scenario-named tests stays legal: ids are structural, binding is advisory', () => {
  const root = project('## ADDED Requirements\n\n### Requirement: Beta\n\n#### Scenario: XB-01 new\n- t\n');
  const v = verify(root, ['ok 1 - native suite green', 'ok 2 - another native test']);
  assert.strictEqual(v.status, 0, v.stdout + v.stderr);
  assert.match(v.stdout, /GREEN — advisory scenario-ID binding gaps only/);
  const c = merged(root, ['ok 1 - native suite green']);
  assert.strictEqual(c.status, 0, c.stdout);
  assert.match(fs.readFileSync(storePath(root), 'utf8'), /XB-01 new/);
});

test('SP-05 a removal-only delta has no scoped scenario: nothing to refuse', () => {
  // the store keeps a second requirement, so the projection is not globally empty (SR-62's ERROR)
  const root = project('', { store: STORE + '\n### Requirement: Zeta\n\n#### Scenario: XZ-01 stays\n- t\n' });
  fs.writeFileSync(path.join(root, 'apriori', 'changes', 'c', 'specs', 'kv', 'spec.md'),
    run(['stamp', 'apriori/specs/kv/spec.md'], root).stdout + '## REMOVED Requirements\n\n### Requirement: Alpha\n\n#### Scenario: no id, but it is being removed\n- t\n');
  const v = verify(root, ['1..0'], ['--json']);
  assert.strictEqual(v.status, 0, v.stdout + v.stderr);
  assert.strictEqual(JSON.parse(v.stdout).result, 'GREEN');
  const a = archive(root, ['--write']);
  assert.strictEqual(a.status, 0, a.stdout + a.stderr);
  assert.match(fs.readFileSync(storePath(root), 'utf8'), /_deprecated \(superseded by c\)_/);
});

test('SP-06 unrelated old debt in the store is reported, never a block on this change — and `check` still owns it afterwards', () => {
  const root = project('## ADDED Requirements\n\n### Requirement: Beta\n\n#### Scenario: XB-01 new\n- t\n', { store: DEBT });
  const dry = archive(root);
  assert.strictEqual(dry.status, 0, dry.stdout + dry.stderr);
  assert.match(dry.stdout, /^note: store debt outside this change \(reported, not a block\): kv\/spec\.md: scenario without a bindable id: 'nameless since 5\.x'/m);
  const v = verify(root, ['ok 1 - XA-01 base', 'ok 2 - XB-01 new'], ['--json']);
  assert.strictEqual(v.status, 0, v.stdout + v.stderr);
  assert.deepStrictEqual(JSON.parse(v.stdout).storeReport.unidentified, [{ file: 'kv/spec.md', title: 'nameless since 5.x' }]);
  const c = merged(root, ['ok 1 - XA-01 base', 'ok 2 - XB-01 new']);
  assert.strictEqual(c.status, 1, 'the oracle: the OLD debt is still there, and only it');
  assert.match(c.stdout, /scenario without a bindable ID: nameless since 5\.x/);
  assert.doesNotMatch(c.stdout, /XB-01/);
});

test('SP-07 the single-file form refuses the same way, nothing written', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'apriori-sp1-'));
  w(path.join(root, 'apriori', 'specs', 'kv', 'spec.md'), STORE);
  const delta = w(path.join(root, 'delta.md'), '## ADDED Requirements\n\n### Requirement: Beta\n\n#### Scenario: no id at all\n- t\n');
  const before = snapshot(root);
  for (const extra of [[], ['--write']]) {
    const r = run(['archive', '--store', 'apriori/specs/kv/spec.md', '--delta', 'delta.md', '--change', 'c', ...extra], root);
    assert.strictEqual(r.status, 1, r.stdout + r.stderr);
    assert.match(r.stderr, /archive: delta\.md:5: scenario without a bindable id: 'no id at all'/);
    assert.match(r.stdout, /RESULT: FAILED PREFLIGHT — nothing written/);
  }
  assert.ok(before.equals(snapshot(root)));
  // a duplicate against the store, same form
  fs.writeFileSync(delta, '## ADDED Requirements\n\n### Requirement: Beta\n\n#### Scenario: XA-01 clash\n- t\n');
  const d = run(['archive', '--store', 'apriori/specs/kv/spec.md', '--delta', 'delta.md', '--change', 'c'], root);
  assert.strictEqual(d.status, 1);
  assert.match(d.stderr, /delta\.md:5: scenario id 'XA-01' collides with the store/);
  // and a clean delta still merges
  fs.writeFileSync(delta, '## ADDED Requirements\n\n### Requirement: Beta\n\n#### Scenario: XB-01 new\n- t\n');
  assert.strictEqual(run(['archive', '--store', 'apriori/specs/kv/spec.md', '--delta', 'delta.md', '--change', 'c', '--write'], root).status, 0);
  assert.strictEqual(run(['check'], root).status, 0);
});

test('SP-08 recognition goes through the controlled matcher: a config pattern decides, and a broken one refuses (fail-closed)', () => {
  // NARROW config row: `XB-01a` is not an id under it, so the delta is refused for exactly that
  const narrow = project('## ADDED Requirements\n\n### Requirement: Beta\n\n#### Scenario: XB-01a suffixed\n- t\n',
    { config: '| id-pattern | [A-Z]+-\\d+ |\n' });
  refused(narrow, /kv\/spec\.md:5: scenario without a bindable id: 'XB-01a suffixed'/);
  // the same delta under the default pattern is fine
  const wide = project('## ADDED Requirements\n\n### Requirement: Beta\n\n#### Scenario: XB-01a suffixed\n- t\n');
  assert.strictEqual(verify(wide, ['ok 1 - XA-01 base']).status, 0);
  // an uncompilable config pattern: archive refuses rather than skipping the check
  const broken = project('## ADDED Requirements\n\n### Requirement: Beta\n\n#### Scenario: XB-01 new\n- t\n',
    { config: '| id-pattern | ( |\n' });
  const before = snapshot(broken);
  const a = archive(broken, ['--write']);
  assert.strictEqual(a.status, 1, a.stdout + a.stderr);
  assert.match(a.stderr, /archive: the structural check could not run — process-config id-pattern row is invalid/);
  assert.match(a.stdout, /RESULT: FAILED PREFLIGHT — nothing written/);
  assert.ok(before.equals(snapshot(broken)));
});

test('SP-09 a scenario a MODIFIED block introduces without an id is refused; one inside a REMOVED block is not scoped', () => {
  const root = project('');
  const stamp = run(['stamp', 'apriori/specs/kv/spec.md'], root).stdout;
  fs.writeFileSync(path.join(root, 'apriori', 'changes', 'c', 'specs', 'kv', 'spec.md'),
    stamp + '## MODIFIED Requirements\n\n### Requirement: Alpha\n\n#### Scenario: XA-01 base\n- t\n\n#### Scenario: a new one, nameless\n- t\n');
  refused(root, /kv\/spec\.md:9: scenario without a bindable id: 'a new one, nameless'/);
});

test('SP-10 check.checkScenarioIds is gone; CK-04 in the CLI still goes through the controlled matcher', () => {
  const check = require('../lib/check');
  assert.ok(!('checkScenarioIds' in check), 'the in-process-regex helper must be deleted, not merely unused');
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'apriori-sp-ck-'));
  w(path.join(root, 'apriori', 'specs', 'kv', 'spec.md'), '#### Scenario: PB-01 plays\n#### Scenario: no id here\n```\n#### Scenario: fenced example\n```\n');
  const r = run(['check'], root);
  assert.strictEqual(r.status, 1);
  assert.match(r.stdout, /scenario without a bindable ID: no id here/);
  assert.doesNotMatch(r.stdout, /fenced example/);
  // the pure scan of a delta's scoped scenarios carries the delta line
  const parsed = am.parseDeltaStrict('## ADDED Requirements\n\n### Requirement: R\n\n#### Scenario: ZZ-01 x\n- t\n```\n#### Scenario: fenced\n```\n\n## REMOVED Requirements\n\n### Requirement: Q\n\n#### Scenario: gone\n- t\n');
  assert.deepStrictEqual(parsed.scenarios, [{ kind: 'ADDED', name: 'R', title: 'ZZ-01 x', line: 5 }, { kind: 'REMOVED', name: 'Q', title: 'gone', line: 15 }]);
});
