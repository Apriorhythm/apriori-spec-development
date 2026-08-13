'use strict';
// hotfix-lane T6 — screenshot evidence is tier-parameterized (owner ruling D) and validated
// in full whenever it IS present (HF-21..HF-24).
const test = require('node:test');
const assert = require('node:assert');

const { checkEvidence } = require('../lib/hotfix.js');

const HEAD = 'a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0';
const line = (o = {}) => {
  const f = { path: 'apriori/tmp/orders.png', obs: 'the orders page renders the new empty state', time: '2026-08-14T09:30:00Z', baseline: HEAD, run: 'r1', ...o };
  return `- path=${f.path} obs=${f.obs} time=${f.time} baseline=${f.baseline} run=${f.run}${f.hash ? ` hash=${f.hash}` : ''}`;
};
const ctx = (o = {}) => ({ tier: 'incremental', profile: 'ui', frontendTouched: true, head: HEAD, records: null, waiver: null, ...o });

test('HF-21 a missing record is advisory in the lane and never blocks', () => {
  const r = checkEvidence(ctx({ records: null }));
  assert.deepStrictEqual(r.problems, [], 'never blocks at the incremental tier');
  assert.ok(r.advisories.some((a) => /screenshot/i.test(a)), `advisory printed: ${r.advisories}`);

  // the full tier keeps the obligation (formal side; its mechanical consumption is out of scope
  // for this change, but the checker itself is tier-parameterized)
  const full = checkEvidence(ctx({ tier: 'full', records: null }));
  assert.ok(full.problems.some((p) => /screenshot/i.test(p)), `full tier blocks: ${full.problems}`);
});

test('HF-22 a present record is validated in full', () => {
  const clean = checkEvidence(ctx({ records: [line()].join('\n') }));
  assert.deepStrictEqual(clean.problems, [], `clean record: ${clean.problems}`);

  const missingField = checkEvidence(ctx({ records: '- path=apriori/tmp/a.png obs=looked fine time=2026-08-14T09:30:00Z run=r1' }));
  assert.ok(missingField.problems.some((p) => /baseline/.test(p)), `missing field named: ${missingField.problems}`);

  const outside = checkEvidence(ctx({ records: line({ path: 'docs/shot.png' }) }));
  assert.ok(outside.problems.some((p) => /apriori\/tmp/.test(p)), `path outside tmp: ${outside.problems}`);

  const dots = checkEvidence(ctx({ records: line({ path: 'apriori/tmp/../../etc/passwd.png' }) }));
  assert.ok(dots.problems.some((p) => /\.\./.test(p)), `dot-dot refused: ${dots.problems}`);

  const badTime = checkEvidence(ctx({ records: line({ time: 'yesterday' }) }));
  assert.ok(badTime.problems.some((p) => /time/.test(p)), `time shape: ${badTime.problems}`);

  const twoRuns = checkEvidence(ctx({ records: [line(), line({ path: 'apriori/tmp/b.png', run: 'r2' })].join('\n') }));
  assert.ok(twoRuns.problems.some((p) => /run/.test(p)), `one run per bundle: ${twoRuns.problems}`);
});

test('HF-23 a stale baseline and an injected marker are refused', () => {
  const stale = checkEvidence(ctx({ records: line({ baseline: 'deadbeefdeadbeefdeadbeefdeadbeefdeadbeef' }) }));
  assert.ok(stale.problems.some((p) => /baseline/.test(p) && /HEAD/.test(p)), `stale baseline: ${stale.problems}`);

  const injected = checkEvidence(ctx({ records: line({ obs: 'looked fine run=r9 honest' }) }));
  assert.ok(injected.problems.some((p) => /run=/.test(p)), `marker injection refused: ${injected.problems}`);
});

test('HF-24 hash is refused and the waiver line needs a reason', () => {
  const hashed = checkEvidence(ctx({ records: line({ hash: 'a'.repeat(64) }) }));
  assert.ok(hashed.problems.some((p) => /hash/.test(p)), `hash refused under the ruled combination: ${hashed.problems}`);

  const emptyWaiver = checkEvidence(ctx({ frontendTouched: false, waiver: 'ui: not-applicable — ' }));
  assert.ok(emptyWaiver.problems.some((p) => /reason/.test(p)), `empty reason refused: ${emptyWaiver.problems}`);

  const goodWaiver = checkEvidence(ctx({ frontendTouched: false, waiver: 'ui: not-applicable — backend-only fix, no page renders differently' }));
  assert.deepStrictEqual(goodWaiver.problems, [], `waiver accepted: ${goodWaiver.problems}`);
});
