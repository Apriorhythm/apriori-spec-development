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
const { withStrict } = require('./args');
const { legacyRoots } = require('./resolve');
const managed = require('./managed');

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

const CURE = "delete it and rerun 'apriori init --tools <t>' to hand it back to the tool";

// Refresh tool-owned files under root — but only those apriori/managed.json proves the
// tool owns AND the user hasn't modified. Everything else is reported and left alone.
// Pre-manifest projects are adopted on proof (runbook unconditionally; command files
// only when their bytes match a shipped template generation).
// Returns { actions: [{file, action}] }; throws on no runbook or manifest hygiene errors.
function run(root, opts = {}) {
  const rb = path.join(root, 'apriori', 'runbook.md');
  if (!fs.existsSync(rb)) throw new Error(`no apriori/runbook.md here — run 'apriori init' first`);
  const manifest = managed.readManifest(root, TOOLS);       // hygiene throws before any touch
  const generations = opts.generations || managed.TEMPLATE_GENERATIONS;
  const dry = !!opts.dryRun;
  const actions = [];
  const files = manifest ? { ...manifest.files } : {};
  let manifestDirty = manifest === null;                    // adoption always materializes it

  // one candidate: managed semantics when listed; adoption when pre-manifest; unmanaged otherwise
  const consider = (rel, srcAbs, adoptable) => {
    const p = path.join(root, rel);
    const listed = manifest && Object.prototype.hasOwnProperty.call(manifest.files, rel);
    if (!fs.existsSync(p)) {
      if (listed) actions.push({ file: rel, action: "missing (skipped — recreating is init's job)" });
      return;
    }
    managed.assertContained(root, rel);                     // before ANY read or hash
    const cur = managed.hashFile(p);
    if (listed) {
      if (cur !== manifest.files[rel]) { actions.push({ file: rel, action: `modified (skipped — locally modified; ${CURE})` }); return; }
      const act = refresh(p, srcAbs, dry);
      actions.push({ file: rel, action: act });
      if (act === 'updated') { files[rel] = managed.hashBytes(fs.readFileSync(srcAbs)); manifestDirty = true; }
      return;
    }
    if (manifest === null && adoptable(cur)) {              // pre-manifest adoption on proof
      const act = refresh(p, srcAbs, dry);
      actions.push({ file: rel, action: act });
      files[rel] = act === 'updated' ? managed.hashBytes(fs.readFileSync(srcAbs)) : cur;
      return;
    }
    actions.push({ file: rel, action: `unmanaged (skipped — not created by this tool; ${CURE})` });
  };

  // runbook: adopted unconditionally pre-manifest (its refresh is update's reason to exist)
  consider('apriori/runbook.md', opts.runbookSrc || RUNBOOK_SRC, () => true);
  // protocol-required scaffolding the refreshed runbook relies on (IN-11): create if missing, NEVER modify
  const gi = path.join(root, 'apriori', '.gitignore');
  if (!fs.existsSync(gi)) {
    if (!dry) { fs.writeFileSync(gi, 'tmp/\n'); fs.mkdirSync(path.join(root, 'apriori', 'tmp'), { recursive: true }); }
    actions.push({ file: 'apriori/.gitignore', action: 'created' });
  }
  for (const key of Object.keys(TOOLS)) {
    const rel = TOOLS[key].command;
    if (!rel) continue;
    consider(rel, opts.commandSrc || COMMAND_SRC, (cur) => generations.includes(cur));
  }
  if (manifestDirty && !dry) managed.writeManifest(root, files);
  // legacy 3.x layout roots: refreshing the protocol over pre-4.0 artifacts must be loud (UP-12)
  const legacy = legacyRoots(root);
  const warnings = legacy.length
    ? [`legacy 3.x layout root(s) present: ${legacy.join(', ')} — migrate them into their change bundles, see MIGRATING.md (4.0): https://github.com/Apriorhythm/apriori-spec-development/blob/v4/MIGRATING.md`]
    : [];
  return { actions, warnings };
}

const USAGE = 'usage: apriori update [--dry-run]';

function cli(argv) {
  return withStrict(argv, { sub: 'update', usage: USAGE, positionals: 0, flags: { '--dry-run': 'flag' } }, (f) => {
    const dryRun = !!f['--dry-run'];
    let res;
    try { res = run(process.cwd(), { dryRun }); }
    catch (e) { console.error('  ' + e.message); return 1; }
    for (const { file, action } of res.actions)
      console.log(`  ${action === 'updated' ? '✓' : '·'} ${file}  (${action})`);
    for (const w of res.warnings || []) console.error(`  warning: ${w}`);
    const n = res.actions.filter((a) => a.action === 'updated').length;
    const v = require('../package.json').version;
    console.log(n
      ? `\n  ${n} file(s) ${dryRun ? 'would be ' : ''}refreshed to apriori-cli ${v}.`
      : `\n  everything already matches apriori-cli ${v}.`);
    console.log('  (user-owned files — process-config.md, specs/, changes/, rules files — are never touched.)');
    return 0;
  });
}

module.exports = { run, refresh, cli };
