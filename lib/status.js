'use strict';
/*
 * apriori status — answer "where am I / what's left" for a change.
 * Reads the flow-state file + the issue ledger; zero deps, pure Node stdlib.
 */
const fs = require('fs');
const path = require('path');
const { withStrict } = require('./args');
const { resolveChange, fileReadDefect, validateChangeName } = require('./resolve');

// parse `key: value` lines from a flow-state file → object; plus the last gate line
function parseFlowState(text) {
  const out = {};
  for (const key of ['change', 'mode', 'current-step', 'next-action', 'lineage']) {
    // horizontal whitespace only: `\s*` matched the NEWLINE, so an empty `mode:` took the
    // whole next line as its value and a blank field read as a filled one (MD-09).
    const m = text.match(new RegExp('^' + key + ':[^\\S\\r\\n]*(.+)$', 'm'));
    if (m) out[key] = m[1].replace(/\s*#.*$/, '').trim();
  }
  const gates = [...text.matchAll(/^\s*-\s*(\d{4}-\d{2}-\d{2}\S*\s+.+)$/gm)].map((m) => m[1].trim());
  out.lastGate = gates.length ? gates[gates.length - 1] : null;
  return out;
}

// parse a P0 ledger markdown table → rows with {id, status}
function parseLedger(text) {
  const rows = [];
  for (const line of text.split('\n')) {
    const m = line.match(/^\|\s*([^|]+?)\s*\|.*\|\s*([^|]+?)\s*\|\s*$/);
    if (!m) continue;
    const id = m[1].trim(), status = m[2].trim();
    if (id === 'ID' || /^-+$/.test(id)) continue;         // header / separator
    rows.push({ id, status });
  }
  return rows;
}

function activeChanges(root) {
  const dir = path.join(root, 'apriori', 'changes');
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir, { withFileTypes: true })
    .filter((e) => e.isDirectory() && e.name !== 'archive')
    .map((e) => e.name).sort();
}

// dir defaults to the active path (unit-level compat); cli passes the resolved bundle
function changeStatus(root, change, dir, stage) {
  const bundle = dir || path.join(root, 'apriori', 'changes', change);
  const fsPath = path.join(bundle, 'flow-state.md');
  const flowSafe = fileReadDefect(bundle, fsPath) === null;
  const state = flowSafe ? parseFlowState(fs.readFileSync(fsPath, 'utf8')) : null;
  const ledgerPath = path.join(bundle, 'review', 'issues.md');
  const ledgerSafe = fileReadDefect(bundle, ledgerPath) === null;
  const rows = ledgerSafe ? parseLedger(fs.readFileSync(ledgerPath, 'utf8')) : [];
  const open = rows.filter((r) => /^open\b/i.test(r.status));
  // residue of the lane retired in 6.0 — status still SEES it so a leftover bundle is
  // diagnosed instead of read as a change with a missing flow-state.
  const hotfix = fs.existsSync(path.join(bundle, 'hotfix-state.md'));
  // readiness and review are required lazily: readiness reads THIS module back for
  // parseLedger/parseFlowState, so a top-level require would close the cycle
  const flowText = flowSafe ? fs.readFileSync(fsPath, 'utf8') : null;
  const legacy = flowSafe ? require('./readiness').legacyIdentity(flowText) : [];
  // Rounds are DERIVED per review family, never read off a `round:` line — status only
  // reports what review.js computed. A leftover lane bundle has no flow-state and so no
  // review loop to report. And status crosses the SAME trust boundary gate does first: a symlinked,
  // escaping or non-directory review/ is named, never read through — an escalation
  // manufactured from a path outside the bundle would be worse than no escalation at all.
  const st = stage || 'in-flight';
  let loop = null, reviewDefect = null;
  if (flowSafe) {
    reviewDefect = require('./readiness').reviewDirDefect(bundle);
    if (!reviewDefect) {
      const rv = require('./review');
      // the STAGE goes in: `gate` stops applying the stop/escalation rules to a frozen bundle,
      // and status reporting a frozen loop as "stopped" is the same claim told two ways
      try { loop = rv.reviewLoop(rv.reviewFacts(bundle), flowText, st, state && state.mode); }
      catch (e) { reviewDefect = `review evidence unreadable (${e.code || e.message})`; }
      // a symlinked summary aborted the scan — say so, rather than reporting the empty facts
      // it left behind as "this change never had a review"
      if (loop && loop.status === 'n/a' && /is a symlink/.test(loop.detail)) {
        reviewDefect = loop.detail; loop = null;
      }
    }
  }
  // the mode the gates actually judge by — one derivation, shared with gate and archive
  const em = state && state.mode
    ? require('./risk').effectiveMode(bundle, state.mode, st)
    : null;
  return { change, state, open, hasFlowState: !!state, hotfix, legacy, loop, reviewDefect, em,
    stage: st, path: path.relative(root, bundle) };
}

// cli --change guards: name validation + resolver + structured file-level defects (kinds,
// never message prefixes); the optional ledger is benign ONLY on kind 'missing'
function guardedResolve(root, change) {
  const v = validateChangeName(change);
  if (!v.ok) {
    const why = { 'invalid-shape': 'bare kebab-case only', 'date-prefixed': 'date-prefixed — in-flight names are bare; dates are stamped at archive time', reserved: `'${change}' is reserved` }[v.kind];
    return { error: `invalid change name '${change}' — ${why}` };
  }
  const loc = resolveChange(root, change);
  if (loc.error) return { error: loc.error };
  const flowDefect = fileReadDefect(loc.dir, path.join(loc.dir, 'flow-state.md'));
  // a leftover lane bundle still resolves — formatOne diagnoses it. Residue sitting beside a
  // readable flow-state is just residue: the change is gated and reported as the change it is.
  const leftoverLane = fs.existsSync(path.join(loc.dir, 'hotfix-state.md'));
  if (leftoverLane && flowDefect && flowDefect.kind === 'missing') return loc;
  if (flowDefect) return { error: `flow-state.md unreadable for '${change}' — ${flowDefect.kind}: ${flowDefect.path}` };
  const ledgerDefect = fileReadDefect(loc.dir, path.join(loc.dir, 'review', 'issues.md'));
  if (ledgerDefect && ledgerDefect.kind !== 'missing') return { error: `review/issues.md unsafe for '${change}' — ${ledgerDefect.kind}: ${ledgerDefect.path}` };
  // identity: the parsed flow-state must speak the queried name (P2-1)
  const state = parseFlowState(fs.readFileSync(path.join(loc.dir, 'flow-state.md'), 'utf8'));
  if (state.change && state.change !== change) return { error: `identity mismatch for '${change}' — the resolved flow-state declares change: ${state.change}` };
  return loc;
}

function formatOne(s) {
  const lines = [];
  if (s.hotfix && !s.state) {
    // same stage rule as gate: an archived record is frozen history and is never handed a
    // write-back instruction; only an in-flight leftover has anything left to migrate.
    if (s.stage === 'archived') {
      lines.push(`change:       ${s.change}   (archived hotfix-lane record)`);
      lines.push('note:         frozen history from the lane retired in 6.0 — read-only, nothing to migrate');
      return lines.join('\n');
    }
    lines.push(`change:       ${s.change}   (leftover hotfix-state.md, no flow-state)`);
    lines.push('migration:    the hotfix lane was removed in 6.0 — convert this to a change');
    lines.push(`              (\`apriori new ${s.change}\`, mode: fast) or finish it with apriori-cli 5.x`);
    return lines.join('\n');
  }
  if (!s.state) { lines.push(`change: ${s.change} (no flow-state file found)`); }
  else {
    lines.push(`change:       ${s.state.change || s.change}` + (s.stage === 'archived' ? '   (archived)' : ''));
    const shownMode = s.em && s.em.upgraded ? `${s.em.declared} → ${s.em.mode}` : (s.state.mode || '?');
    lines.push(`step:         ${s.state['current-step'] || '?'}   (mode ${shownMode})`);
    for (const r of (s.em ? s.em.signals : [])) lines.push(`risk:         ${r.signal}: ${r.detail}`);
    if (s.legacy && s.legacy.length)
      lines.push(`migration:    5.x identity key(s) still present: ${s.legacy.join(', ')} — see MIGRATING.md`);
    if (s.state['next-action']) lines.push(`next-action:  ${s.state['next-action']}`);
    if (s.state.lastGate) lines.push(`last gate:    ${s.state.lastGate}`);
  }
  lines.push(`open ledger:  ${s.open.length}` + (s.open.length ? ` — ${s.open.map((r) => r.id).join(', ')}` : ''));
  if (s.reviewDefect) lines.push(`review:       UNREADABLE — ${s.reviewDefect}`);
  else if (s.loop) {
    if (!s.loop.families.length) lines.push('review:       no completed round yet');
    for (const f of s.loop.families)
      lines.push(`review:       ${f.family} round ${f.round}, verdict ${f.verdict}`
        + (f.issuesOpen !== null ? ` (${f.issuesOpen} open)` : '')
        + (f.stopped && f.round < 5 ? '   (loop stopped)' : ''));
    if (s.loop.reviewFloor) lines.push(`review:       ${s.loop.reviewFloor}`);
    for (const p of s.loop.problems) lines.push(`review problem: ${p}`);
    for (const a of s.loop.advisories) lines.push(`review advisory: ${a}`);
    // the escalation lines are not suppressible — a recorded owner decision changes their
    // wording, never their presence (decision card: pre-authorization may not skip the report)
    for (const e of (s.loop.escalation || []))
      lines.push(`ESCALATION:   ${e.family} round ${e.round} (verdict ${e.verdict})`
        + (e.acknowledged ? ` — owner decision on record: ${e.decision}` : ' — a human decides'));
  }
  return lines.join('\n');
}

// machine-consumable shape for one change
function toJson(s) {
  return {
    change: s.change,
    step: s.state ? s.state['current-step'] || null : null,
    mode: s.state ? s.state.mode || null : null,
    // the DECLARED mode above; the mode the gates judge by, and why, below
    effectiveMode: s.em ? s.em.mode : null,
    risk: s.em ? s.em.signals : [],
    legacyIdentity: s.legacy && s.legacy.length ? s.legacy : null,
    lineage: s.state ? s.state.lineage || null : null,
    nextAction: s.state ? s.state['next-action'] || null : null,
    lastGate: s.state ? s.state.lastGate : null,
    hasFlowState: s.hasFlowState,
    hotfix: !!s.hotfix,
    openLedger: s.open.map((r) => r.id),
    // per family; there is deliberately no global `round` — see lib/review.js
    review: (s.loop || s.reviewDefect)
      ? { families: s.loop ? s.loop.families.map((f) => ({ family: f.family, round: f.round, verdict: f.verdict, issuesOpen: f.issuesOpen, stopped: f.stopped })) : [],
          problems: s.loop ? s.loop.problems : [],
          advisories: s.loop ? s.loop.advisories : [],
          reviewFloor: s.loop ? s.loop.reviewFloor : null,
          defect: s.reviewDefect || null }
      : null,
    escalation: s.loop && s.loop.escalation ? s.loop.escalation : null,
    stage: s.stage,
    path: s.path,
  };
}

const USAGE = 'usage: apriori status [--change <name>] [--json]';

function cli(argv) {
  return withStrict(argv, { sub: 'status', usage: USAGE, positionals: 0,
    flags: { '--change': 'value', '--json': 'flag' } }, (f) => {
    const root = process.cwd();
    const change = f['--change'] || null, json = !!f['--json'];
    if (change) {
      const loc = guardedResolve(root, change);
      if (loc.error) { console.error(`status: ${loc.error}`); return 2; }
      const s = changeStatus(root, change, loc.dir, loc.stage);
      console.log(json ? JSON.stringify(toJson(s), null, 2) : formatOne(s));
      return 0;
    }
    const changes = activeChanges(root);
    if (json) {
      console.log(JSON.stringify({ changes: changes.map((c) => toJson(changeStatus(root, c))) }, null, 2));
      return 0;
    }
    if (!changes.length) { console.log('No active changes under apriori/changes/.'); return 0; }
    console.log(`Active changes (${changes.length}):\n`);
    for (const c of changes) {
      const s = changeStatus(root, c);
      const step = s.hotfix && !s.state ? 'leftover lane bundle — migrate' : s.state ? s.state['current-step'] || '?' : 'no flow-state';
      console.log(`  ${c}  —  ${step}, ${s.open.length} open`);
    }
    console.log('\nRun `apriori status --change <name>` for detail.');
    return 0;
  });
}

module.exports = { parseFlowState, parseLedger, activeChanges, changeStatus, formatOne, toJson, cli };
