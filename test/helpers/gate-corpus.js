'use strict';
// The fixed corpus behind the state-A gate golden (design §D6a, STEP2·r1 SPEC-4).
//
// Why it exists: once gate.js delegates to lib/readiness.js, a "base layer vs gate"
// differential compares a function with its own wrapper and passes even if the move
// broke a detail string. The golden captured from THIS corpus, BEFORE the move, is the
// independent oracle. Both the capture script and the differential test import this
// module, so the two runs see byte-identical inputs.
//
// Capture entry point: gate.js exports { runGate, resolveChange, reviewReadyView, cli } —
// checkFlowState is private, so C3 is read off runGate(...).checks (STEP2·r2 A-5).

const fs = require('fs');
const os = require('os');
const path = require('path');

const STORE = '### Requirement: Alpha\n\n#### Scenario: XA-01 base\n- t\n';
const DELTA = '## ADDED Requirements\n\n### Requirement: Beta\n\n#### Scenario: XB-01 new\n- t\n';

const flow = (name, over = {}) => {
  const base = {
    change: name, mode: 'standard',
    lineage: 'v4', phase: 'build',
  };
  const merged = { ...base, ...over };
  const keys = Object.keys(merged).filter((k) => merged[k] !== null && !k.startsWith('__'));
  const body = keys.map((k) => `${k}: ${merged[k]}`).join('\n');
  const gates = over.__gates || '  - 2026-07-11T00:00 note: n\n';
  // one case reproduces a 5.x bundle verbatim: the four keys 6.0 replaced with `mode`
  const legacy = over.__legacy ? 'tier: medium\ntrack: harden\ntrack-rationale: r\nround: 1\n' : '';
  // the state's own answer to C9/R5 — an empty `## Open` section: nothing owed
  return `${body}\n${legacy}\n## Open\n\ngates:\n${gates}`;
};

// TAP that satisfies the binding check for both store scenarios.
const TAP_OK = `node -e "${['ok 1 - XA-01 a', 'ok 2 - XB-01 b'].map((l) => `console.log('${l}')`).join(';')}"`;

// Every case: {id, files, change, stage} — stage 'in-flight' | 'archived'.
// Coverage: C3 pass and every blocked branch (5.x identity included), the review-root guard,
// and both stages. 6.2 retired the task-list and ledger readers, so no case carries either file.
const CASES = [
  { id: 'healthy-standard', change: 'c', mode: 'standard' },
  { id: 'fast', change: 'c', mode: 'fast' },
  { id: 'flow-missing-key', change: 'c', over: { lineage: null } },
  { id: 'flow-placeholder', change: 'c', over: { lineage: '<fill me>' } },
  { id: 'flow-name-mismatch', change: 'c', over: { change: 'other' } },
  { id: 'flow-illegal-phase', change: 'c', over: { phase: 'STEP6' } },
  { id: 'flow-illegal-mode', change: 'c', over: { mode: 'huge' } },
  { id: 'flow-legacy-identity', change: 'c', over: { mode: null, __legacy: true } },
  { id: 'flow-abandoned', change: 'c', over: { phase: 'abandoned' } },
  { id: 'flow-done', change: 'c', over: { phase: 'done' } },
  { id: 'flow-review', change: 'c', over: { phase: 'review' } },
  { id: 'review-root-symlink', change: 'c', reviewRoot: 'symlink', needsSymlink: true },
  { id: 'review-root-file', change: 'c', reviewRoot: 'file' },
];

// Build one case into a fresh temp project. Returns {root, change, dir}.
function build(c) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'apriori-golden-'));
  const name = c.change;
  const rel = c.stage === 'archived'
    ? path.join('apriori', 'changes', 'archive', `2026-07-11T0000-${name}`)
    : path.join('apriori', 'changes', name);
  const dir = path.join(root, rel);
  const write = (p, s) => { fs.mkdirSync(path.dirname(p), { recursive: true }); fs.writeFileSync(p, s); };

  write(path.join(root, 'apriori', 'specs', 'kv', 'spec.md'), STORE);
  write(path.join(dir, 'flow-state.md'), flow(name, { mode: c.mode || 'standard', ...(c.over || {}) }));
  write(path.join(dir, 'specs', 'kv', 'spec.md'), DELTA);

  if (c.reviewRoot === 'symlink') {
    fs.mkdirSync(path.join(dir, 'elsewhere'), { recursive: true });
    fs.writeFileSync(path.join(dir, 'elsewhere', 'code-review-v1.md'), 'VERDICT: no major issues\n');
    fs.symlinkSync(path.join(dir, 'elsewhere'), path.join(dir, 'review'));
  } else if (c.reviewRoot === 'file') {
    fs.writeFileSync(path.join(dir, 'review'), 'not a directory\n');
  } else {
    fs.mkdirSync(path.join(dir, 'review'), { recursive: true });
  }
  return { root, change: name, dir };
}

module.exports = { CASES, build, TAP_OK, STORE, DELTA, flow };
