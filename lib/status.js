'use strict';
/*
 * apriori status — answer "where am I / what's left" for a change.
 * Reads the flow-state file + the issue ledger; zero deps, pure Node stdlib.
 */
const fs = require('fs');
const path = require('path');
const { withStrict } = require('./args');

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

function changeStatus(root, change) {
  const fsPath = path.join(root, 'apriori', 'changes', change, 'flow-state.md');
  const state = fs.existsSync(fsPath) ? parseFlowState(fs.readFileSync(fsPath, 'utf8')) : null;
  const ledgerPath = path.join(root, 'apriori', 'review', `${change}-issues.md`);
  const rows = fs.existsSync(ledgerPath) ? parseLedger(fs.readFileSync(ledgerPath, 'utf8')) : [];
  const open = rows.filter((r) => /^open\b/i.test(r.status));
  return { change, state, open, hasFlowState: !!state };
}

function formatOne(s) {
  const lines = [];
  if (!s.state) { lines.push(`change: ${s.change} (no flow-state file found)`); }
  else {
    lines.push(`change:       ${s.state.change || s.change}`);
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
    openLedger: s.open.map((r) => r.id),
  };
}

const USAGE = 'usage: apriori status [--change <name>] [--json]';

function cli(argv) {
  return withStrict(argv, { sub: 'status', usage: USAGE, positionals: 0,
    flags: { '--change': 'value', '--json': 'flag' } }, (f) => {
    const root = process.cwd();
    const change = f['--change'] || null, json = !!f['--json'];
    if (change) {
      const s = changeStatus(root, change);
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
      const step = s.state ? s.state['current-step'] || '?' : 'no flow-state';
      console.log(`  ${c}  —  ${step}, ${s.open.length} open`);
    }
    console.log('\nRun `apriori status --change <name>` for detail.');
    return 0;
  });
}

module.exports = { parseFlowState, parseLedger, activeChanges, changeStatus, formatOne, toJson, cli };
