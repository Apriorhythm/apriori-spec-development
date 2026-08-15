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


// ---------------------------------------------------------------------------
// ARCHIVE LAYER — for a caller that performs an IRREVERSIBLE write.
//
// State A's fileReadDefect / reviewDirDefect / containsReal all funnel every exception
// into a default (missing / null / false). That is right for gate, status and resolve,
// which only report. It is unsound here: an EACCES reported as "missing" becomes `n/a`
// at trivial tier and the archive proceeds.
//
// So these do their own classification, in a SINGLE pass. "Outer lstat, then call the
// helper" does not work — the helper lstats again and swallows again.
// They must never call fileReadDefect, the base reviewDirDefect, or containsReal (RY-10).
// ---------------------------------------------------------------------------

const DEFAULT_OPS = { lstatSync: fs.lstatSync.bind(fs), realpathSync: fs.realpathSync.bind(fs) };

// Two codes mean "this path does not resolve", and the ancestor walk can say something
// precise about both: ENOENT (nothing there) and ENOTDIR (a component is not a directory —
// which IS the bad-ancestor condition, and what lstat raises for `<a-file>/child`).
// Everything else — EACCES, EPERM, EIO, ELOOP, ENAMETOOLONG — means the check could not be
// made, and a check that could not be made must never read as "absent".
const UNRESOLVED = new Set(['ENOENT', 'ENOTDIR']);

// Containment with the error semantics containsReal cannot express.
// Both realpaths are attempted — no short circuit — so a mixed failure is classified by
// the STRICTER outcome: any non-ENOENT is an io-error. Taking `enoent` while an EACCES was
// also in play would let the permission failure hide behind the absence and pass as `n/a`.
function containDefect(root, target, ops = DEFAULT_OPS) {
  let realRoot = null, real = null, sawOther = null, sawEnoent = false;
  for (const [p, set] of [[root, (v) => { realRoot = v; }], [target, (v) => { real = v; }]]) {
    try { set(ops.realpathSync(p)); }
    catch (e) { if (UNRESOLVED.has(e.code)) sawEnoent = true; else sawOther = sawOther || e.code || 'EUNKNOWN'; }
  }
  if (sawOther) return { kind: 'io-error', code: sawOther, path: target };
  if (sawEnoent) return { kind: 'enoent', path: target };
  return (real === realRoot || real.startsWith(realRoot + path.sep))
    ? null : { kind: 'escape', path: target };
}

// The nearest existing ancestor decides whether an absent path is merely absent or sits
// under something that should never have been followed. Unlike state A, a non-ENOENT here
// stops the walk instead of being swallowed as "keep walking".
function ancestorDefect(bundleDir, p, ops) {
  const stop = path.resolve(bundleDir);
  let cur = path.dirname(p);
  while (cur.startsWith(stop)) {
    let st = null;
    try { st = ops.lstatSync(cur); }
    catch (e) { if (!UNRESOLVED.has(e.code)) return { kind: 'io-error', code: e.code, path: cur }; }
    if (st) {
      if (st.isSymbolicLink() || !st.isDirectory()) return { kind: 'bad-ancestor', path: cur };
      break;
    }
    if (cur === stop) break;
    cur = path.dirname(cur);
  }
  return { kind: 'missing', path: p };
}

// A file artifact inside the bundle: flow-state.md, tasks.md, review/issues.md.
// → null | missing | io-error | symlink | not-file | escape | bad-ancestor
function artifactDefect(bundleDir, p, ops = DEFAULT_OPS) {
  let st;
  try { st = ops.lstatSync(p); }
  catch (e) {
    if (!UNRESOLVED.has(e.code)) return { kind: 'io-error', code: e.code, path: p };
    return ancestorDefect(bundleDir, p, ops);
  }
  if (st.isSymbolicLink()) return { kind: 'symlink', path: p };
  if (!st.isFile()) return { kind: 'not-file', path: p };
  const c = containDefect(bundleDir, p, ops);
  if (!c) return null;
  if (c.kind === 'enoent') return ancestorDefect(bundleDir, p, ops);   // vanished between the two calls
  return c;
}

// The review/ directory. Absence is NOT a defect: state A's reviewDirDefect returns null for
// it and lets the ledger leaf apply the tier rule, and this change introduces no new class.
// The type rule is isDirectory() — applying the file rule here would fail every well-formed
// bundle (STEP0·r4 REQ-1).
// → null | io-error | symlink | not-dir | escape
function reviewRootDefect(bundleDir, ops = DEFAULT_OPS) {
  const rd = path.join(bundleDir, 'review');
  let st;
  try { st = ops.lstatSync(rd); }
  catch (e) { return UNRESOLVED.has(e.code) ? null : { kind: 'io-error', code: e.code, path: rd }; }
  if (st.isSymbolicLink()) return { kind: 'symlink', path: rd };
  if (!st.isDirectory()) return { kind: 'not-dir', path: rd };
  const c = containDefect(bundleDir, rd, ops);
  if (!c) return null;
  if (c.kind === 'enoent') return null;                                 // same rule as an absent dir
  return c;
}

// every kind except `missing` refuses outright and is never forceable
const STRUCTURAL = new Set(['io-error', 'symlink', 'not-file', 'not-dir', 'escape', 'bad-ancestor']);

module.exports = {
  STEP_ENUM, TIER_ENUM,
  classifyStatus, gatesEntries, waiveEvidence,
  checkFlowState, checkTasks, checkLedger, ledgerFindings, reviewDirDefect,
  stepOverlay,
  containDefect, artifactDefect, reviewRootDefect, STRUCTURAL,
};
