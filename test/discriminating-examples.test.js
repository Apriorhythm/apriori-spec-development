'use strict';
// discriminating-examples — a scenario's examples cover the conditions that change the expected result and the
// entry points through which the same rule can fail, chosen to tell a correct implementation from a likely wrong
// one; each chosen example is asserted completely; a fix at one entry point is not the rule's closure (PR-75).
// Claude × Astra consensus 2026-10-25 (R1024 §六) after four evaluation-baseline runs: the requirements were in the
// contract, but not carried to every entry point, and the tests asserted less than the contract.
const { test } = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.join(__dirname, '..');
const read = (f) => fs.readFileSync(path.join(ROOT, f), 'utf8');
const EN = read('RUNBOOK.md');
const line = (text, start) => text.split('\n').find((l) => l.startsWith(start));

test('PR-75 examples discriminate, evidence asserts completely, and a fix at one entry point is not the rule\'s closure', () => {
  // Specify: the examples requirement sits in the minimal-contract bullet
  const minimal = line(EN, '- **Minimal means minimal.**');
  assert.ok(minimal);
  assert.match(minimal, /conditions in the sources that change the expected result within that scenario's outcome category/);
  assert.match(minimal, /a condition that changes the category is its own scenario/);
  assert.match(minimal, /entry points through which the same rule can fail/);
  assert.match(minimal, /named as a caller reaches it \(a route, a page, a command, an input channel\), never as an internal handler/);
  assert.doesNotMatch(minimal, /entry points in the real code/);
  assert.match(minimal, /tell a correct implementation from a likely wrong one/);
  assert.match(minimal, /never every combination by default/);
  assert.match(minimal, /the entry point it applies to and the expected result it stands for/);
  assert.match(minimal, /the sources or the owner may ask for more/);
  // Build & Test: evidence per chosen example, shared tests count only when they execute and assert it
  const doBullet = line(EN, '- **Do, in order:**');
  assert.match(doBullet, /examples table may share ONE parametrized test/, 'the existing parametrized-test rule stays');
  assert.match(doBullet, /each chosen example has evidence that asserts the expected result it names, completely/);
  assert.match(doBullet, /a shared test counts as covering an example only when it actually executes and asserts that example's condition and entry point/);
  // Review & Deliver: after a fix, the other entry points of the same rule
  const disposition = line(EN, '- **Disposition of findings');
  assert.match(disposition, /scope is judged per finding, never by volume/, 'the existing disposition rule stays');
  assert.match(disposition, /When a review or a test finds a rule broken at one entry point/);
  assert.match(disposition, /check the other entry points the same rule applies to for the same omission/);
  assert.match(disposition, /fixed at one entry point is not closed for the rule/);
  assert.match(disposition, /`fixed` disposition's evidence names the other entry points of that rule it checked \(or says there are none\)/);
  // P2 carries both clauses to the producer
  const p2spec = line(EN, '* One scenario per user-visible output');
  assert.match(p2spec, /examples cover the conditions in the sources that change the expected result within the scenario's outcome category/);
  assert.match(p2spec, /named as a caller reaches it \(route, page, command, input channel\), never as an internal handler/);
  assert.match(p2spec, /representatives that tell a correct implementation from a likely wrong one, never every combination by default/);
  const p2build = line(EN, '[Build & Test] Derive a failing test');
  assert.match(p2build, /one parametrized test may cover a scenario's whole examples table/, 'the existing rule stays');
  assert.match(p2build, /each chosen example asserted completely against the expected result it names/);
  assert.match(p2build, /let the fix's evidence name the entry points you checked \(or say there are none\)/);
  assert.match(p2build, /a shared test covers an example only when it executes and asserts its condition and entry point/);
  assert.match(p2build, /after the fix check the other entry points the same rule applies to/);
  // both handbook editions agree where they echo the parametrized-test rule
  const concepts = read('docs/concepts.md'); const cn = read('docs/concepts_cn.md');
  assert.strictEqual((concepts.match(/each chosen example asserted completely/g) || []).length, (concepts.match(/one parametrized test may cover a scenario's whole examples table/g) || []).length, 'every EN echo of the parametrized-test rule carries the clause');
  assert.strictEqual((cn.match(/每个选定的例子都要断言完整的预期/g) || []).length, (cn.match(/一条参数化测试可以覆盖一个 scenario 的整张 examples 表/g) || []).length, 'every CN echo carries the clause');
  // no gate, field, matrix obligation or task-specific list is added
  const added = (t, from) => { const i = t.indexOf(from); assert.ok(i >= 0, `fragment "${from}" present`); return t.slice(i); };
  for (const [label, t] of [['minimal', added(minimal, "A scenario's examples cover")], ['do', added(doBullet, 'each chosen example has evidence')],
    ['disposition', added(disposition, 'When a review or a test finds a rule broken')], ['p2spec', added(p2spec, 'Its examples cover')], ['p2build', added(p2build, 'each chosen example asserted')]]) {
    assert.doesNotMatch(t, /Cartesian|\bmatrix\b|all combinations|gate C\d|a new field|coverage ledger|a new document/i, `${label}: no new mechanism`);
    assert.doesNotMatch(t, /CP-?\d\d|RW-?\d\d|B[1-5] |code point|workspace admin/i, `${label}: no task-specific list in the runbook`);
  }
});
