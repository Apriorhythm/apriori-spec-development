'use strict';
/*
 * apriori readiness — the flow-state / tasks / ledger predicates, in two layers.
 *
 * BASE layer: the gate's state-A code, moved here verbatim. Same results, same detail
 * strings, same bare reads. `gate` consumes it instead of keeping its own copy, so the
 * two can never drift.
 *
 * ARCHIVE layer (below the base): a SEPARATE set of functions for a caller that performs
 * an irreversible write. They classify lstat/realpath failures by e.code in a single pass
 * and never call a helper that swallows exceptions.
 *
 * Why two: state A's fileReadDefect, reviewDirDefect and containsReal all swallow errors
 * into a default — right for callers that only REPORT (gate, status, resolve), unsound for
 * one that WRITES. Same rules, two levels of responsibility, two implementations. The duplication is
 * deliberate and is locked down by the RY-08/09/10 differentials.
 *
 * This module must not depend on archive-merge (that would close the cycle
 * archive-merge → readiness → archive-merge). Containment comes from resolve.
 */
const fs = require('fs');
const path = require('path');
const { containsReal } = require('./resolve');

const STEP_ENUM = ['STEP0', 'STEP1', 'STEP2', 'STEP3', 'STEP4', 'STEP5', 'STEP6',
  'INTENT-CARD', 'SPIKE', 'EXTRACTION', 'DONE', 'ABANDONED'];
const TIER_ENUM = ['trivial', 'medium', 'large'];

// ---------------------------------------------------------------------------
// BASE LAYER — byte-identical to state-A gate. Do not add guards here: a guard
// would change gate's behaviour and contradict RY-02/RY-06.
// ---------------------------------------------------------------------------

function checkFlowState(state, name) {
  for (const key of ['change', 'tier', 'track', 'lineage', 'current-step']) {
    const v = state[key];
    if (v === undefined || v === '') return { id: 'C3', status: 'blocked', detail: `flow-state: required key '${key}' missing` };
    if (v.includes('<') || v.includes('>')) return { id: 'C3', status: 'blocked', detail: `flow-state: '${key}' is an unfilled placeholder (${v})` };
  }
  if (state.change !== name) return { id: 'C3', status: 'blocked', detail: `flow-state: 'change' is '${state.change}', expected '${name}'` };
  if (!STEP_ENUM.includes(state['current-step'])) return { id: 'C3', status: 'blocked', detail: `flow-state: 'current-step' '${state['current-step']}' not in the legal vocabulary` };
  if (!TIER_ENUM.includes(state.tier)) return { id: 'C3', status: 'blocked', detail: `flow-state: 'tier' '${state.tier}' not in {trivial, medium, large}` };
  return { id: 'C3', status: 'pass', detail: `legal (tier ${state.tier}, ${state['current-step']})` };
}

function checkTasks(dir, tier) {
  const p = path.join(dir, 'tasks.md');
  if (!fs.existsSync(p)) {
    return tier === 'trivial'
      ? { id: 'C2', status: 'n/a', detail: 'no tasks.md — trivial tier has no STEP2' }
      : { id: 'C2', status: 'blocked', detail: `tasks.md missing at ${p}` };
  }
  const open = (fs.readFileSync(p, 'utf8').match(/^\s*-\s\[\s\]/gm) || []).length;
  return open
    ? { id: 'C2', status: 'blocked', detail: `tasks.md has ${open} unchecked box(es)` }
    : { id: 'C2', status: 'pass', detail: 'all tasks checked' };
}

// the ledger vocabulary, one classifier shared by C4 and the corpus test (GT-15).
// leading token, case-insensitive; rejected-verified BEFORE rejected (alternation order).
const STATUS_RE = /^(open|fixed|verified|rejected-verified|rejected|advisory-acked|waived)\b/i;
function classifyStatus(status) {
  const m = STATUS_RE.exec(status);
  if (!m) return { legal: false, terminal: false, needsReason: false, hasReason: false, isWaived: false };
  const tok = m[1].toLowerCase();
  const needsReason = tok === 'rejected' || tok === 'rejected-verified' || tok === 'waived';
  return {
    legal: true,
    terminal: tok === 'verified' || tok === 'rejected-verified' || tok === 'waived' || tok === 'advisory-acked',
    needsReason,
    hasReason: !needsReason || /\w/.test(status.slice(m[0].length)),
    isWaived: tok === 'waived',
    token: tok,
  };
}

const escapeRe = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// gates: entries from a flow-state text — the block runs from the unindented `gates:` line
// to the next unindented top-level key; entries start `- `, continuation lines attach.
function gatesEntries(flowText) {
  const start = flowText.search(/^gates:/m);
  if (start < 0) return [];
  const rest = flowText.slice(start + 'gates:'.length);
  const end = rest.search(/^[A-Za-z][\w-]*:/m);
  const block = end < 0 ? rest : rest.slice(0, end);
  const entries = [];
  for (const line of block.split('\n')) {
    if (/^\s*-\s/.test(line)) entries.push(line.trim());
    else if (entries.length && line.trim()) entries[entries.length - 1] += ' ' + line.trim();
  }
  return entries;
}

// a waive is a HUMAN act: one single gates: entry must carry the row ID as an exact
// token (LS-1 never matches inside LS-10) AND the word waive/waived.
function waiveEvidence(flowText, id) {
  const idRe = new RegExp(`(^|[^A-Za-z0-9-])${escapeRe(id)}([^A-Za-z0-9-]|$)`);
  return gatesEntries(flowText).some((e) => idRe.test(e) && /waiv/i.test(e));
}

// The per-row ledger findings, as STRUCTURE rather than a joined string. One implementation
// serves both gate's C4 (which formats it) and archive's readiness (which maps each kind to
// forceable / not) — a second walk over the rows is how the two drift apart.
// Pure: it reads nothing; callers hand it parsed rows and the flow-state text.
function ledgerFindings(rows, flowText, stage) {
  const bad = [];
  for (const r of rows) {
    const c = classifyStatus(r.status);
    if (!c.legal) { bad.push({ id: r.id, kind: 'illegal', detail: `${r.id}: '${r.status}' is not in the ledger vocabulary` }); continue; }
    if (c.needsReason && !c.hasReason) { bad.push({ id: r.id, kind: 'no-reason', detail: `${r.id} is ${c.token} without a reason` }); continue; }
    if (c.isWaived && !waiveEvidence(flowText, r.id)) {
      bad.push({ id: r.id, kind: 'no-waive-evidence', detail: `${r.id} is waived without a gates: entry recording the human decision` }); continue;
    }
    if (c.token === 'open') { bad.push({ id: r.id, kind: 'open', detail: `${r.id} is open` }); continue; }
    if (stage === 'archived' && !c.terminal) {
      bad.push(c.token === 'fixed'
        ? { id: r.id, kind: 'fixed', detail: `${r.id} is fixed but never verified — reviewer must verify, or the human waives it` }
        : { id: r.id, kind: 'rejected-unconcurred', detail: `${r.id} is rejected without reviewer concurrence — flip to rejected-verified, or the human waives it` });
    }
  }
  return bad;
}

function checkLedger(tier, stage, dir) {
  const p = path.join(dir, 'review', 'issues.md');
  if (!fs.existsSync(p)) {
    return tier === 'trivial'
      ? { id: 'C4', status: 'n/a', detail: 'no ledger — trivial tier may never open one' }
      : { id: 'C4', status: 'blocked', detail: `ledger missing at ${p}` };
  }
  const { parseLedger } = require('./status');
  const rows = parseLedger(fs.readFileSync(p, 'utf8'));
  const fsPath = dir ? path.join(dir, 'flow-state.md') : null;
  const flowText = fsPath && fs.existsSync(fsPath) ? fs.readFileSync(fsPath, 'utf8') : '';
  const bad = ledgerFindings(rows, flowText, stage);
  return bad.length
    ? { id: 'C4', status: 'blocked', detail: bad.map((b) => b.detail).join('; ') }
    : { id: 'C4', status: 'pass', detail: `${rows.length} row(s), none blocking` };
}

// the bundle review/ dir is the shared evidence root for C4 and C5 — when present it must be
// a REAL contained directory (symlinked/escaping/non-dir entries block, never read through)
function reviewDirDefect(dir) {
  const rd = path.join(dir, 'review');
  let st;
  try { st = fs.lstatSync(rd); } catch { return null; }  // lstat, not exists: a dangling symlink is a defect, not absence
  if (st.isSymbolicLink()) return `review is a symlink: ${rd}`;
  if (!st.isDirectory()) return `review is not a directory: ${rd}`;
  if (!containsReal(dir, rd)) return `review escapes the change dir: ${rd}`;
  return null;
}

// STEP6 is an OVERLAY on C3, not a replacement: C3 legality first, the archiving-step demand
// second. A named production function so the acceptance that covers it cannot be satisfied by
// a test restating the comparison — readinessOf must call THIS (RY-11).
function stepOverlay(state, name) {
  const c3 = checkFlowState(state, name);
  if (c3.status !== 'pass') return { class: 'legality', detail: c3.detail };
  const step = state['current-step'];
  if (step === 'STEP6') return null;
  if (step === 'ABANDONED') {
    return { class: 'step', detail: 'flow-state declares ABANDONED — an abandoned change writes nothing to the KB or the spec store; that rule has no override here' };
  }
  if (step === 'DONE') {
    return { class: 'step', detail: 'in-flight bundle declares DONE; expected STEP6' };
  }
  return { class: 'step', detail: `flow-state is at '${step}'; archiving is STEP6` };
}

module.exports = {
  STEP_ENUM, TIER_ENUM,
  classifyStatus, gatesEntries, waiveEvidence,
  checkFlowState, checkTasks, checkLedger, ledgerFindings, reviewDirDefect,
  stepOverlay,
};
