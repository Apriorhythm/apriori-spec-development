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
  for (const key of ['change', 'tier', 'track', 'current-step', 'round', 'next-action', 'lineage']) {
    const m = text.match(new RegExp('^' + key + ':\\s*(.+)$', 'm'));
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
  const hotfix = fs.existsSync(path.join(bundle, 'hotfix-state.md'));
  return { change, state, open, hasFlowState: !!state, hotfix, stage: stage || 'in-flight', path: path.relative(root, bundle) };
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
  const isHotfix = fs.existsSync(path.join(loc.dir, 'hotfix-state.md'));
  if (isHotfix && flowDefect && flowDefect.kind === 'missing') return loc;   // the lane has no flow-state, by design
  if (flowDefect) return { error: `flow-state.md unreadable for '${change}' — ${flowDefect.kind}: ${flowDefect.path}` };
  if (isHotfix) return { error: `'${change}' carries BOTH flow-state.md and hotfix-state.md — a bundle has one identity; delete the one that does not belong` };
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
    lines.push(`change:       ${s.change}   (hotfix lane)`);
    lines.push('step:         the lane has no steps — write the conclusion, then `apriori hotfix archive`');
    return lines.join('\n');
  }
  if (!s.state) { lines.push(`change: ${s.change} (no flow-state file found)`); }
  else {
    lines.push(`change:       ${s.state.change || s.change}` + (s.stage === 'archived' ? '   (archived)' : ''));
    lines.push(`step:         ${s.state['current-step'] || '?'}   (tier ${s.state.tier || '?'}, track ${s.state.track || '?'})`);
    if (s.state['next-action']) lines.push(`next-action:  ${s.state['next-action']}`);
    if (s.state.lastGate) lines.push(`last gate:    ${s.state.lastGate}`);
  }
  lines.push(`open ledger:  ${s.open.length}` + (s.open.length ? ` — ${s.open.map((r) => r.id).join(', ')}` : ''));
  return lines.join('\n');
}

// machine-consumable shape for one change
function toJson(s) {
  return {
    change: s.change,
    step: s.state ? s.state['current-step'] || null : null,
    tier: s.state ? s.state.tier || null : null,
    track: s.state ? s.state.track || null : null,
    lineage: s.state ? s.state.lineage || null : null,
    nextAction: s.state ? s.state['next-action'] || null : null,
    lastGate: s.state ? s.state.lastGate : null,
    hasFlowState: s.hasFlowState,
    hotfix: !!s.hotfix,
    openLedger: s.open.map((r) => r.id),
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
      const step = s.hotfix ? 'hotfix lane' : s.state ? s.state['current-step'] || '?' : 'no flow-state';
      console.log(`  ${c}  —  ${step}, ${s.open.length} open`);
    }
    console.log('\nRun `apriori status --change <name>` for detail.');
    return 0;
  });
}

module.exports = { parseFlowState, parseLedger, activeChanges, changeStatus, formatOne, toJson, cli };
