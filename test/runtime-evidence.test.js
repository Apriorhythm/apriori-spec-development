'use strict';
// runtime-evidence-not-reviewable — a runtime risk no test executes is run and recorded, or it is an
// ## Open item; the independent review closes no runtime gap (PR-74). Claude × Astra consensus
// 2026-10-24 after three evaluation-baseline runs in which every producer wrote "the UI was never
// run in a browser" into its final report under the old sentence "the independent review is the
// instrument there".
const { test } = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.join(__dirname, '..');
const read = (f) => fs.readFileSync(path.join(ROOT, f), 'utf8');
const EN = read('RUNBOOK.md');
const CONCEPTS = read('docs/concepts.md');
const CONCEPTS_CN = read('docs/concepts_cn.md');

test('PR-74 the runbook sends a runtime risk to a run or to ## Open, never to the review', () => {
  const bullet = EN.split('\n').find((l) => l.startsWith('- **Run the tests the risks call for, not a matrix.**'));
  assert.ok(bullet, 'the Build & Test bullet exists');
  // review reads, it does not run; the runtime examples; a run is recorded as observed:
  assert.match(bullet, /Review reads; it does not run/);
  for (const ex of ['page', 'user-visible flow', 'migration', 'job', 'real service'])
    assert.ok(bullet.includes(ex), `the bullet names "${ex}" as a runtime risk example`);
  assert.match(bullet, /`observed:` line/);
  for (const part of ['what was done', 'what was expected', 'what happened', 'where the screenshot or output lives'])
    assert.ok(bullet.includes(part), `the observed: line carries "${part}"`);
  assert.match(bullet, /"there is no test runner here" is not "it cannot be run"/);
  assert.match(bullet, /a dev server and a headless browser count/);
  assert.match(bullet, /normal path is evidence for that path only/);
  assert.match(bullet, /`## Open` item with a stable id — R1 case 2, the owner's — never only a sentence in the final report/);
  assert.match(bullet, /never closes a runtime gap/);
  // the old exit is gone from every live doc
  for (const [label, doc] of [['RUNBOOK', EN], ['concepts', CONCEPTS], ['operator', read('docs/operator.md')], ['VISION', read('VISION.md')]]) {
    assert.doesNotMatch(doc, /the independent review is the instrument there/, `${label}: the old sentence survives`);
    assert.doesNotMatch(doc, /where none exists, the independent review is the instrument/, `${label}: the VISION paraphrase survives`);
  }
  for (const [label, doc] of [['concepts_cn', CONCEPTS_CN], ['operator_cn', read('docs/operator_cn.md')], ['VISION_cn', read('VISION_cn.md')]])
    assert.doesNotMatch(doc, /独立评审就是(那里的)?仪器/, `${label}: the old sentence survives`);
  assert.match(read('VISION.md'), /the review reads, it does not run/);
  assert.match(read('VISION_cn.md'), /评审只读,不运行/);
  // PR-10's pinned phrases stay
  assert.match(bullet, /no per-project-type evidence table/i);
  assert.match(bullet, /`apriori\/tmp\/`/);
  assert.match(bullet, /baseline images belong to the project's own test suite/);
  // P2 carries the same rule to the producer
  const p2 = EN.split('\n').find((l) => l.startsWith('[Build & Test] Derive a failing test'));
  assert.match(p2, /runtime behavior no test executes[^.]*is run once[^.]*`observed:`[^.]*only a run that genuinely cannot be made is an `## Open` item[^.]*naming what was tried/);
  assert.match(p2, /"there is no test runner here" is not "it cannot be run"/);
  assert.doesNotMatch(p2, /gate C\d|UNBOUND|a new field/);
  // the handbooks agree, in both editions
  assert.match(CONCEPTS, /Review reads; it does not run/);
  assert.match(CONCEPTS, /recorded as an `observed:` line \(what was done, expected, happened, where the evidence lives\)/);
  assert.match(CONCEPTS, /only when the run genuinely cannot be made — it is an `## Open` item for the owner naming what was tried, never only a sentence in the final report/);
  assert.match(CONCEPTS, /needs no run because there is nothing to run, not because the review replaces it/);
  assert.match(CONCEPTS, /never closes a runtime gap/);
  assert.doesNotMatch(CONCEPTS, /no deploy surface; solo; library; docs/, 'the project-type exemption list is gone');
  assert.match(CONCEPTS_CN, /评审只读,不运行/);
  assert.match(CONCEPTS_CN, /记成一行 `observed:`\(做了什么、预期什么、实际什么、证据在哪\)/);
  assert.match(CONCEPTS_CN, /只有确实跑不了的,才是交给所有者的 `## Open` 条目,写明试过什么——绝不只是交付说明里的一句话/);
  assert.match(CONCEPTS_CN, /是因为无物可跑,不是因为评审替代了跑/);
  assert.match(CONCEPTS_CN, /不能关闭运行时的证据缺口/);
  assert.match(CONCEPTS_CN, /截图自查落在已被 gitignore 的 `apriori\/tmp\/`/);
  // no gate, field or UI-specific check is added
  assert.doesNotMatch(bullet, /gate C\d|UNBOUND|a new field/);
});
