'use strict';
/*
 * apriori update — refresh tool-owned scaffolded files after a CLI upgrade.
 * Tool-owned: apriori/runbook.md (copied from the package's own RUNBOOK.md — single source)
 * and per-tool command files that already exist (from templates/command.md).
 * User-owned is NEVER touched: process-config.md, specs/, changes/, review/, truth/,
 * and the rules files the init pointer was appended to (CLAUDE.md, AGENTS.md, …).
 * Zero deps — pure Node stdlib.
 */
const fs = require('fs');
const path = require('path');
const { TOOLS } = require('./init');

const PKG_ROOT = path.join(__dirname, '..');
const RUNBOOK_SRC = path.join(PKG_ROOT, 'RUNBOOK.md');
const COMMAND_SRC = path.join(PKG_ROOT, 'templates', 'command.md');

// Refresh one existing target from src; returns 'updated' | 'up-to-date'.
function refresh(target, src, dryRun) {
  const want = fs.readFileSync(src, 'utf8');
  if (fs.readFileSync(target, 'utf8') === want) return 'up-to-date';
  if (!dryRun) fs.writeFileSync(target, want);
  return 'updated';
}

// Refresh all tool-owned files under root. Only files that exist are refreshed —
// update never creates anything (adding a tool is init's job).
// Returns { actions: [{file, action}] }; throws if the project isn't initialized.
function run(root, opts = {}) {
  const rb = path.join(root, 'apriori', 'runbook.md');
  if (!fs.existsSync(rb)) throw new Error(`no apriori/runbook.md here — run 'apriori init' first`);
  const actions = [{ file: 'apriori/runbook.md', action: refresh(rb, opts.runbookSrc || RUNBOOK_SRC, opts.dryRun) }];
  for (const key of Object.keys(TOOLS)) {
    const rel = TOOLS[key].command;
    if (!rel) continue;
    const p = path.join(root, rel);
    if (fs.existsSync(p)) actions.push({ file: rel, action: refresh(p, opts.commandSrc || COMMAND_SRC, opts.dryRun) });
  }
  return { actions };
}

function cli(argv) {
  const dryRun = argv.includes('--dry-run');
  let res;
  try { res = run(process.cwd(), { dryRun }); }
  catch (e) { console.error('  ' + e.message); return 1; }
  for (const { file, action } of res.actions)
    console.log(`  ${action === 'updated' ? '✓' : '·'} ${file}  (${action})`);
  const n = res.actions.filter((a) => a.action === 'updated').length;
  const v = require('../package.json').version;
  console.log(n
    ? `\n  ${n} file(s) ${dryRun ? 'would be ' : ''}refreshed to apriori-cli ${v}.`
    : `\n  everything already matches apriori-cli ${v}.`);
  console.log('  (user-owned files — process-config.md, specs/, changes/, rules files — are never touched.)');
  return 0;
}

module.exports = { run, refresh, cli };
