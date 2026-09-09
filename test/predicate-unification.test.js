'use strict';
// PU-01..04 — C5/R4 predicate unification, the finish (batch C row 10).
//
// The C3/R1 common base already landed (gate C3 = readiness.checkFlowState, one trust root,
// one parser); what remained were TWO judgment layers over the SAME completeness facts
// (rv.reviewFacts): gate's checkEvidence and archive readiness's R4 evidence section each
// re-derived "what is a refusal" from the raw facts. The judgment now lives in ONE predicate —
// review.completenessFindings(facts) — and both surfaces only RENDER its findings.
//
// The §四 R6 oracle, verbatim: each surface stays equivalent to ITSELF (exact detail strings
// pinned, before == after); the surfaces agree on the shared facts (same classes, same labels,
// from any review/ shape); the RY-03/04 one-way implication holds (archivable ⇒ gate-legal,
// never the reverse); archive never calls back into gate; and the DELIBERATE stage differences
// — the archive phase overlay, frozen semantics — are kept, not unified away.

const { test } = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const rv = require('../lib/review');
const rd = require('../lib/readiness');
const gate = require('../lib/gate');
const { canSymlink } = require('./helpers/can-symlink');
const { FLOW } = require('./helpers/ready-bundle');

const ROOT = path.join(__dirname, '..');
const w = (p, s) => { fs.mkdirSync(path.dirname(p), { recursive: true }); fs.writeFileSync(p, s); return p; };

const STORE = '### Requirement: Alpha\n\n#### Scenario: XA-01 base\n- t\n';
const ADDED = '## ADDED Requirements\n\n### Requirement: Beta\n\n#### Scenario: XB-01 new\n- t\n';
const TAP2 = 'node -e "console.log(\'TAP version 13\');console.log(\'1..2\');console.log(\'ok 1 - XA-01 a\');console.log(\'ok 2 - XB-01 b\')"';
const gateOf = (root) => gate.runGate({ cwd: root, change: 'c', testCmd: TAP2, noCas: true });

// one bundle per review-dir shape; returns its dir
function bundle(shape) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'apriori-pu-'));
  const dir = path.join(root, 'apriori', 'changes', 'c');
  w(path.join(root, 'apriori', 'specs', 'kv', 'spec.md'), STORE);
  w(path.join(dir, 'specs', 'kv', 'spec.md'), ADDED);
  w(path.join(dir, 'flow-state.md'), FLOW('c'));
  fs.mkdirSync(path.join(dir, 'review'), { recursive: true });
  if (shape === 'clean' || shape === 'empty-raw') {
    w(path.join(dir, 'review', 'code-review-v1.md'), '# r1\n\nVERDICT: no major issues\n');
    if (shape === 'clean') w(path.join(dir, 'review', 'code-review-v1-raw.txt'), 'raw\n');
    else w(path.join(dir, 'review', 'code-review-v1-raw.txt'), '');
  }
  if (shape === 'missing-raw') w(path.join(dir, 'review', 'code-review-v1.md'), '# r1\n\nVERDICT: no major issues\n');
  if (shape === 'symlink') {
    w(path.join(root, 'outside.md'), '# r1\n\nVERDICT: no major issues\n');
    fs.symlinkSync(path.join(root, 'outside.md'), path.join(dir, 'review', 'code-review-v1.md'));
  }
  return { root, dir };
}

test('PU-01 ONE predicate judges the completeness facts, and both surfaces render exactly what it found', () => {
  assert.strictEqual(typeof rv.completenessFindings, 'function',
    'review.completenessFindings is the unified judgment layer — it must exist and be exported');
  // the classification, straight from the predicate
  const clean = rv.completenessFindings(rv.reviewFacts(bundle('clean').dir));
  assert.deepStrictEqual(clean, { symlink: null, missing: [], verdictDocs: 1 });
  const miss = rv.completenessFindings(rv.reviewFacts(bundle('missing-raw').dir));
  assert.deepStrictEqual(miss, { symlink: null, missing: ['code-review-v1.md'], verdictDocs: 1 });
  const empty = rv.completenessFindings(rv.reviewFacts(bundle('empty-raw').dir));
  assert.deepStrictEqual(empty, { symlink: null, missing: ['code-review-v1.md (code-review-v1-raw.txt is empty)'], verdictDocs: 1 });
  const none = rv.completenessFindings(rv.reviewFacts(bundle('none').dir));
  assert.deepStrictEqual(none, { symlink: null, missing: [], verdictDocs: 0 });
  if (canSymlink()) {
    const sym = rv.completenessFindings(rv.reviewFacts(bundle('symlink').dir));
    assert.notStrictEqual(sym.symlink, null, 'a symlinked doc must abort — the consumer may not read further');
    assert.deepStrictEqual(sym.missing, []);
  }
});

test('PU-02 each surface stays equivalent to itself — the exact pre-unification detail strings', () => {
  // gate C5 (the strings gate printed BEFORE the refactor, byte for byte)
  const c5 = (shape) => gateOf(bundle(shape).root).checks.find((c) => c.id === 'C5');
  const clean5 = c5('clean');
  assert.strictEqual(clean5.status, 'pass');
  assert.strictEqual(clean5.detail, '1 review doc(s), every verdict has raw evidence');
  const miss5 = c5('missing-raw');
  assert.strictEqual(miss5.status, 'blocked');
  assert.strictEqual(miss5.detail, 'verdict doc(s) without a raw archive or self-contained provenance: code-review-v1.md');
  const none5 = c5('none');
  assert.strictEqual(none5.status, 'n/a');
  assert.strictEqual(none5.detail, 'no review document carries a verdict — nothing to attest');
  if (canSymlink()) {
    const sym5 = c5('symlink');
    assert.strictEqual(sym5.status, 'blocked');
    assert.match(sym5.detail, /^evidence doc is a symlink: /);
  }
  // archive R4 (the strings readiness pushed BEFORE the refactor, byte for byte)
  const r4 = (shape) => rd.readinessOf({ bundleDir: bundle(shape).dir, name: 'c' })
    .blockers.filter((b) => b.rule === 'R4' && b.class === 'evidence');
  assert.deepStrictEqual(r4('clean'), []);
  const missR4 = r4('missing-raw');
  assert.strictEqual(missR4.length, 1);
  assert.strictEqual(missR4[0].detail, 'verdict doc without a raw archive or self-contained provenance: code-review-v1.md');
  assert.strictEqual(missR4[0].forceable, false);
  const emptyR4 = r4('empty-raw');
  assert.strictEqual(emptyR4[0].detail, 'verdict doc without a raw archive or self-contained provenance: code-review-v1.md (code-review-v1-raw.txt is empty)');
  if (canSymlink()) {
    const symR4 = r4('symlink');
    assert.strictEqual(symR4.length, 1);
    assert.match(symR4[0].detail, /^review evidence doc is a symlink: .* — evidence that is not a real file cannot be judged$/);
  }
});

test('PU-03 the two surfaces agree on the shared facts, and the one-way implication holds', () => {
  const shapes = canSymlink() ? ['clean', 'missing-raw', 'empty-raw', 'none', 'symlink'] : ['clean', 'missing-raw', 'empty-raw', 'none'];
  for (const shape of shapes) {
    const b = bundle(shape);
    const c5 = gateOf(b.root).checks.find((c) => c.id === 'C5');
    const r4ev = rd.readinessOf({ bundleDir: b.dir, name: 'c' }).blockers.filter((x) => x.rule === 'R4' && x.class === 'evidence');
    // consistency: C5 blocked ⇔ R4 carries evidence blockers, on every shape
    assert.strictEqual(c5.status === 'blocked', r4ev.length > 0,
      `${shape}: the surfaces disagree — C5 ${c5.status} vs ${r4ev.length} R4 evidence blocker(s)`);
    // and they name the same findings (labels), never different ones
    const labels = rv.completenessFindings(rv.reviewFacts(b.dir));
    if (labels.missing.length) {
      for (const l of labels.missing) {
        assert.ok(c5.detail.includes(l), `${shape}: C5 lost the predicate's label ${l}`);
        assert.ok(r4ev.some((x) => x.detail.includes(l)), `${shape}: R4 lost the predicate's label ${l}`);
      }
    }
  }
  // RY-03/04 direction, at the evidence surfaces: an archivable bundle is gate-legal…
  const ready = bundle('clean');
  assert.strictEqual(rd.readinessOf({ bundleDir: ready.dir, name: 'c' }).ready, true);
  const g = gateOf(ready.root);
  for (const id of ['C3', 'C5', 'C8']) {
    const c = g.checks.find((x) => x.id === id);
    assert.notStrictEqual(c.status, 'blocked', `archivable ⇒ ${id} not blocked, got: ${c.detail}`);
  }
  // …and the reverse does NOT hold: the same bundle at `build` is gate-legal yet NOT archivable
  // — the archive phase overlay is a KEPT stage difference, not something unification erased
  const build = bundle('clean');
  fs.writeFileSync(path.join(build.dir, 'flow-state.md'), FLOW('c').replace('phase: review', 'phase: build'));
  const gb = gateOf(build.root);
  assert.strictEqual(gb.checks.find((x) => x.id === 'C3').status, 'pass');
  const rb = rd.readinessOf({ bundleDir: build.dir, name: 'c' });
  assert.strictEqual(rb.ready, false, 'gate-legal must NOT imply archivable');
  assert.ok(rb.blockers.some((x) => x.rule === 'R1'), 'the phase overlay must still refuse');
});

test('PU-04 the dependency direction is preserved: archive/readiness never calls back into gate', () => {
  const readiness = fs.readFileSync(path.join(ROOT, 'lib', 'readiness.js'), 'utf8');
  const review = fs.readFileSync(path.join(ROOT, 'lib', 'review.js'), 'utf8');
  const archive = fs.readFileSync(path.join(ROOT, 'lib', 'archive-merge.js'), 'utf8');
  for (const [name, src] of [['readiness', readiness], ['review', review], ['archive-merge', archive]])
    assert.ok(!/require\(['"]\.\/gate['"]\)/.test(src), `${name} must never require gate`);
  // and the unified predicate lives with the facts it judges — one owner, no third copy
  assert.match(review, /function completenessFindings\(/);
  const gateSrc = fs.readFileSync(path.join(ROOT, 'lib', 'gate.js'), 'utf8');
  assert.match(gateSrc, /completenessFindings/, 'gate C5 must render the shared predicate');
  assert.match(readiness, /completenessFindings/, 'archive R4 must render the shared predicate');
});
