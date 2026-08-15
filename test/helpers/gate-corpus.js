'use strict';
// The fixed corpus behind the state-A gate golden (design §D6a, STEP2·r1 SPEC-4).
//
// Why it exists: once gate.js delegates to lib/readiness.js, a "base layer vs gate"
// differential compares a function with its own wrapper and passes even if the move
// broke a detail string. The golden captured from THIS corpus, BEFORE the move, is the
// independent oracle. Both the capture script and the differential test import this
// module, so the two runs see byte-identical inputs.
//
// Capture entry point: gate.js exports only { runGate, resolveChange, classifyStatus, cli } —
// checkTasks/checkFlowState/checkLedger are private, so C2/C3/C4 are read off
// runGate(...).checks (STEP2·r2 A-5).

const fs = require('fs');
const os = require('os');
const path = require('path');

const STORE = '### Requirement: Alpha\n\n#### Scenario: XA-01 base\n- t\n';
const DELTA = '## ADDED Requirements\n\n### Requirement: Beta\n\n#### Scenario: XB-01 new\n- t\n';

const flow = (name, over = {}) => {
  const base = {
    change: name, tier: 'medium', track: 'harden', 'track-rationale': 'r',
    lineage: 'v4', 'current-step': 'STEP5', round: '1', 'next-action': 'x',
  };
  const merged = { ...base, ...over };
  const keys = Object.keys(merged).filter((k) => merged[k] !== null);
  const body = keys.map((k) => `${k}: ${merged[k]}`).join('\n');
  const gates = over.__gates || '  - 2026-07-11T00:00 note: n\n';
  return `${body}\ngates:\n${gates}`;
};

const ledger = (...rows) =>
  '| ID | Issue | Risk | Round found | Status |\n|---|---|---|---|---|\n' +
  rows.map((r) => `| ${r} |\n`).join('');

const TASKS_DONE = '- [x] T1 done\n- [X] T2 done\n';
const TASKS_OPEN = '- [x] T1 done\n- [ ] T2\n- [ ] T3\n- [ ] T4\n';

// TAP that satisfies the binding check for both store scenarios.
const TAP_OK = `node -e "${['ok 1 - XA-01 a', 'ok 2 - XB-01 b'].map((l) => `console.log('${l}')`).join(';')}"`;

// Every case: {id, files, change, stage} — stage 'in-flight' | 'archived'.
// Coverage: C2 pass/blocked/n-a, C3 pass and every blocked branch,
// C4 pass/blocked (each bad-row kind)/n-a, the review-root guard, and both stages.
const CASES = [
  { id: 'healthy-medium', change: 'c', tier: 'medium', tasks: TASKS_DONE, led: ledger('Q-1 | a | low | 1 | verified') },
  { id: 'trivial-no-tasks-no-ledger', change: 'c', tier: 'trivial', tasks: null, led: null },
  { id: 'medium-tasks-missing', change: 'c', tier: 'medium', tasks: null, led: ledger('Q-1 | a | low | 1 | verified') },
  { id: 'tasks-unchecked', change: 'c', tier: 'medium', tasks: TASKS_OPEN, led: ledger('Q-1 | a | low | 1 | verified') },
  { id: 'flow-missing-key', change: 'c', over: { lineage: null } },
  { id: 'flow-placeholder', change: 'c', over: { lineage: '<fill me>' } },
  { id: 'flow-name-mismatch', change: 'c', over: { change: 'other' } },
  { id: 'flow-illegal-step', change: 'c', over: { 'current-step': 'STEP9' } },
  { id: 'flow-illegal-tier', change: 'c', over: { tier: 'huge' } },
  { id: 'flow-step-abandoned', change: 'c', over: { 'current-step': 'ABANDONED' } },
  { id: 'flow-step-done', change: 'c', over: { 'current-step': 'DONE' } },
  { id: 'flow-step6', change: 'c', over: { 'current-step': 'STEP6' } },
  { id: 'medium-ledger-missing', change: 'c', tier: 'medium', tasks: TASKS_DONE, led: null },
  { id: 'ledger-open-row', change: 'c', led: ledger('Q-1 | a | low | 1 | open') },
  { id: 'ledger-illegal-status', change: 'c', led: ledger('Q-1 | a | low | 1 | frobnicated') },
  { id: 'ledger-rejected-no-reason', change: 'c', led: ledger('Q-1 | a | low | 1 | rejected') },
  { id: 'ledger-rejected-with-reason', change: 'c', led: ledger('Q-1 | a | low | 1 | rejected because x') },
  { id: 'ledger-waived-no-evidence', change: 'c', led: ledger('Q-1 | a | low | 1 | waived by human') },
  { id: 'ledger-waived-with-evidence', change: 'c', led: ledger('Q-1 | a | low | 1 | waived by human'),
    over: { __gates: '  - 2026-07-11T00:00 gate⑤ (owner): Q-1 waived — reason\n' } },
  { id: 'ledger-fixed-in-flight', change: 'c', led: ledger('Q-1 | a | low | 1 | fixed') },
  { id: 'ledger-fixed-archived', change: 'c', stage: 'archived', led: ledger('Q-1 | a | low | 1 | fixed') },
  { id: 'ledger-rejected-archived', change: 'c', stage: 'archived', led: ledger('Q-1 | a | low | 1 | rejected because x') },
  { id: 'ledger-terminal-archived', change: 'c', stage: 'archived', led: ledger('Q-1 | a | low | 1 | rejected-verified because x') },
  { id: 'review-root-symlink', change: 'c', reviewRoot: 'symlink' },
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
  write(path.join(dir, 'flow-state.md'), flow(name, { tier: c.tier || 'medium', ...(c.over || {}) }));
  write(path.join(dir, 'specs', 'kv', 'spec.md'), DELTA);
  if (c.tasks !== null) write(path.join(dir, 'tasks.md'), c.tasks || TASKS_DONE);

  if (c.reviewRoot === 'symlink') {
    fs.mkdirSync(path.join(dir, 'elsewhere'), { recursive: true });
    fs.writeFileSync(path.join(dir, 'elsewhere', 'issues.md'), ledger('Q-1 | a | low | 1 | verified'));
    fs.symlinkSync(path.join(dir, 'elsewhere'), path.join(dir, 'review'));
  } else if (c.reviewRoot === 'file') {
    fs.writeFileSync(path.join(dir, 'review'), 'not a directory\n');
  } else if (c.led !== null) {
    write(path.join(dir, 'review', 'issues.md'), c.led || ledger('Q-1 | a | low | 1 | verified'));
  } else {
    fs.mkdirSync(path.join(dir, 'review'), { recursive: true });
  }
  return { root, change: name, dir };
}

module.exports = { CASES, build, TAP_OK, STORE, DELTA, ledger, flow, TASKS_DONE, TASKS_OPEN };
