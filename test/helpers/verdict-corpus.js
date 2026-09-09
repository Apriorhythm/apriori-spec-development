'use strict';
// The ONE corpus judge behind the baseline verdict oracle (LNG-07). It takes the
// IMPLEMENTATION as an argument so the same walk can judge the corpus with two different
// libs: the frozen 6.1 baseline (v6-dev@2853684 — how the golden fixture was generated)
// and the shipped code under test. A self-comparison — running the current code twice,
// with and without some input variation — cannot see a regression that breaks BOTH sides
// the same way; only a pinned foreign expectation can (P3 acceptance r2, item 3).
//
// What it records, for every compatibility fixture and every shipped self-repo flow-state:
//   - the complete structural-defect set          (flow.structuralDefects)
//   - the complete C3 verdict                     (readiness.checkFlowState, stage-aware)
// and for every resolvable self-repo change name / active bundle:
//   - the full gate: result, code, stage, the BLOCKED check set, the error list
//   - archive readiness: ready + the complete blocker set
// Line numbers are normalized (a stripped/added line may shift them); the repo root is
// normalized to <ROOT> so the record is machine-independent. NOTHING else is normalized:
// every other byte of every verdict must match the golden literally.
//
// Regenerating the golden (only when the BASELINE is deliberately re-pinned):
//   git archive <baseline-sha> | tar -x -C /tmp/apriori-baseline
//   node -e "const j=require('./test/helpers/verdict-corpus');
//            const b='/tmp/apriori-baseline';
//            console.log(JSON.stringify(j.judgeCorpus(process.cwd(), {
//              flow: require(b+'/lib/flow'),
//              readiness: require(b+'/lib/readiness'),
//              gate: require(b+'/lib/gate') }), null, 2))" \
//     > test/fixtures/lineage-baseline-golden.json   # then set _meta by hand

const fs = require('node:fs');
const path = require('node:path');

const STAMP_RE = /^\d{4}-\d{2}-\d{2}T\d{4}-(.+)$/;

const makeNorm = (root) => {
  const abs = path.resolve(root);
  return (s) => String(s)
    .split(abs).join('<ROOT>')
    .replace(/lines \d+ and \d+/g, 'lines N and N')
    .replace(/line \d+/g, 'line N');
};

// -> { fixtures: {name: {defects,c3}}, states: {relPath: {defects,c3}},
//      gate: {change: {result,code,stage,blocked,errors}}, readiness: {change: {ready,blockers}} }
function judgeCorpus(root, impl) {
  const { flow, readiness, gate } = impl;
  const N = makeNorm(root);
  const judgeText = (text, name, stage) => {
    const c3 = readiness.checkFlowState(flow.parseFlowState(text), name, text,
      stage ? { stage } : {});
    return {
      defects: flow.structuralDefects(text).map(N),
      c3: { status: c3.status, detail: N(c3.detail) },
    };
  };
  const out = { fixtures: {}, states: {}, gate: {}, readiness: {} };

  // (a) the compatibility corpus, whole
  const corpusDir = path.join(root, 'test', 'fixtures', 'flow-corpus');
  for (const n of fs.readdirSync(corpusDir).filter((x) => x.endsWith('.md')).sort()) {
    const text = fs.readFileSync(path.join(corpusDir, n), 'utf8');
    out.fixtures[n] = judgeText(text, flow.parseFlowState(text).change || 'x', null);
  }

  // (b) the whole shipped self-repo corpus, stage-aware
  const changesDir = path.join(root, 'apriori', 'changes');
  const flowStates = [];
  (function walk(d) {
    for (const n of fs.readdirSync(d).sort()) {
      const p = path.join(d, n);
      if (fs.statSync(p).isDirectory()) walk(p);
      else if (n === 'flow-state.md') flowStates.push(p);
    }
  })(changesDir);
  const names = new Set();
  for (const p of flowStates) {
    const rel = path.relative(root, p).split(path.sep).join('/');
    const base = path.basename(path.dirname(p));
    const archived = rel.startsWith('apriori/changes/archive/');
    const m = STAMP_RE.exec(base);
    const name = archived && m ? m[1] : base;
    names.add(name);
    out.states[rel] = judgeText(fs.readFileSync(p, 'utf8'), name, archived ? 'archived' : null);
  }

  // (c) the FULL gate for every resolvable change name — the blocked set is the record
  for (const name of [...names].sort()) {
    const res = gate.runGate({ cwd: root, change: name });
    out.gate[name] = {
      result: res.result, code: res.code, stage: res.stage,
      blocked: res.checks.filter((c) => c.status === 'blocked')
        .map((c) => ({ id: c.id, detail: N(c.detail) })),
      errors: (res.errors || []).map(N),
    };
  }

  // (d) archive readiness — the active bundles' complete blocker sets
  for (const n of fs.readdirSync(changesDir).sort()) {
    if (n === 'archive') continue;
    const bundleDir = path.join(changesDir, n);
    if (!fs.existsSync(path.join(bundleDir, 'flow-state.md'))) continue;
    const r = readiness.readinessOf({ bundleDir, name: n });
    out.readiness[n] = {
      ready: r.ready,
      blockers: r.blockers.map((b) => ({ rule: b.rule, class: b.class, detail: N(b.detail) })),
    };
  }
  return out;
}

module.exports = { judgeCorpus };
