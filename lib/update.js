'use strict';
/*
 * apriori update — refresh tool-owned scaffolded files after a CLI upgrade.
 * Tool-owned: apriori/runbook.md (copied from the package's own RUNBOOK.md — single source),
 * apriori/guides/prototype-walk.md (the one guide the runbook names, from guides/)
 * and per-tool command files that already exist (from templates/command.md).
 * User-owned is NEVER touched: process-config.md, specs/, changes/, review/, truth/,
 * and the rules files the init pointer was appended to (CLAUDE.md, AGENTS.md, …).
 * Zero deps — pure Node stdlib.
 */
const fs = require('fs');
const path = require('path');
const { TOOLS, upgradePointer } = require('./init');
const { containsFuturePath } = require('./archive-merge');
const { withStrict } = require('./args');
const { legacyRoots } = require('./resolve');
const managed = require('./managed');

const PKG_ROOT = path.join(__dirname, '..');
const RUNBOOK_SRC = path.join(PKG_ROOT, 'RUNBOOK.md');
const { TEMPLATE_SRC } = require('./init');           // template id → shipped source path

// Refresh one existing target from src; returns 'updated' | 'up-to-date'.
function refresh(target, src, dryRun) {
  const want = fs.readFileSync(src, 'utf8');
  if (fs.readFileSync(target, 'utf8') === want) return 'up-to-date';
  if (!dryRun) fs.writeFileSync(target, want);
  return 'updated';
}

const CURE = "delete it and rerun 'apriori init --tools <t>' to hand it back to the tool";
const CHANGED = 'changed during refresh (skipped — what sits at the path was replaced after it was read; left alone, rerun to judge it)';
const LINKED = `not refreshed (skipped — the guide has other hard links, so rewriting it in place would change them too; ${CURE})`;
const UNCONFIRMED = `not refreshed (skipped — this platform cannot tell where an opened file really is, so the guide is never rewritten in place here; ${CURE})`;

// Refresh tool-owned files under root — but only those apriori/managed.json proves the
// tool owns AND the user hasn't modified. Everything else is reported and left alone.
// Pre-manifest projects are adopted on proof (runbook unconditionally; command files
// only when their bytes match a shipped template generation).
// Returns { actions: [{file, action}] }; throws on no runbook or manifest hygiene errors.
function run(root, opts = {}) {
  const rb = path.join(root, 'apriori', 'runbook.md');
  if (!fs.existsSync(rb)) throw new Error(`no apriori/runbook.md here — run 'apriori init' first`);
  const tools = opts.tools || TOOLS;                        // test-only injection (K=2)
  const manifest = managed.readManifest(root, tools);       // hygiene throws before any touch
  const generations = opts.generations || managed.TEMPLATE_GENERATIONS;
  const srcs = opts.commandSrc || TEMPLATE_SRC;
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
  // the guide the runbook names: listed → refreshed like any managed file (modified or missing is
  // reported and left alone — recreating a listed file is init's job); never installed (not listed,
  // not present) → installed and recorded now; present but not listed → adopted only on proof (its
  // bytes are exactly a shipped edition — an install that failed before its record), else the user's
  // and left alone. Every branch first checks what sits at the path and at apriori/guides (lstat — a
  // symlink is never followed): an obstruction is reported and left alone before anything is hashed or written.
  const guideAbs = path.join(root, managed.GUIDE_REL);
  const guideSrc = opts.guideSrc || managed.GUIDE_SRC;
  const guideGens = opts.guideGenerations || managed.GUIDE_GENERATIONS;
  const guideListed = manifest && Object.prototype.hasOwnProperty.call(manifest.files, managed.GUIDE_REL);
  const obstruction = managed.guideObstruction(root);
  const G = managed.GUIDE_REL;
  if (obstruction) {
    actions.push({ file: G, action: obstruction });
  } else if (!fs.existsSync(guideAbs)) {
    if (guideListed) actions.push({ file: G, action: "missing (skipped — recreating is init's job)" });
    else {
      const a = managed.installGuide(root, dry);
      actions.push({ file: G, action: a === 'created' ? 'created (first install)' : a });
      if (a === 'created' && !dry) { files[G] = managed.hashFile(guideAbs); manifestDirty = true; }
    }
  } else {
    // ONE no-follow look: the hash judged (listed entry, or a shipped edition) and the bytes rewritten
    // belong to the same file — a symlink swapped in after the checks is never written through
    const seen = managed.readPlain(root, guideAbs);
    const cur = seen && managed.hashBytes(seen.bytes);
    const refreshGuide = () => {
      const want = fs.readFileSync(guideSrc);
      if (seen.bytes.equals(want)) return 'up-to-date';
      if (dry) return seen.st.nlink !== 1 ? LINKED : !seen.located ? UNCONFIRMED : 'updated';   // the run's own answer, predicted
      const w = managed.writePlain(root, guideAbs, want, seen);
      return w === 'written' ? 'updated' : w === 'changed' ? CHANGED : w === 'linked' ? LINKED : UNCONFIRMED;
    };
    const heldBack = (act) => act === CHANGED || act === LINKED || act === UNCONFIRMED;
    if (!seen) actions.push({ file: G, action: CHANGED });
    else if (guideListed) {
      if (cur !== manifest.files[G]) actions.push({ file: G, action: `modified (skipped — locally modified; ${CURE})` });
      else {
        const act = refreshGuide();
        actions.push({ file: G, action: act });
        if (act === 'updated') { files[G] = managed.hashBytes(fs.readFileSync(guideSrc)); manifestDirty = true; }
      }
    } else if (guideGens.includes(cur)) {
      const act = refreshGuide();
      if (heldBack(act)) actions.push({ file: G, action: act });
      else {
        actions.push({ file: G, action: act === 'updated' ? 'adopted and updated (its bytes were an earlier shipped edition)' : 'adopted (its bytes are the shipped guide)' });
        files[G] = act === 'updated' ? managed.hashBytes(fs.readFileSync(guideSrc)) : cur;
        manifestDirty = true;
      }
    } else actions.push({ file: G, action: `unmanaged (skipped — not created by this tool; ${CURE})` });
  }
  // protocol-required scaffolding the refreshed runbook relies on (IN-11): create if missing,
  // NEVER modify — and each piece on its own: a lone missing tmp/ is recreated too (BD-02)
  const gi = path.join(root, 'apriori', '.gitignore');
  if (!fs.existsSync(gi)) {
    if (!dry) fs.writeFileSync(gi, 'tmp/\n');
    actions.push({ file: 'apriori/.gitignore', action: 'created' });
  }
  const tmpDir = path.join(root, 'apriori', 'tmp');
  let tmpSt = null;
  try { tmpSt = fs.lstatSync(tmpDir); } catch { /* absent */ }
  if (!tmpSt) {
    if (!dry) fs.mkdirSync(tmpDir, { recursive: true });
    actions.push({ file: 'apriori/tmp/', action: 'created' });
  } else if (!tmpSt.isDirectory()) {
    actions.push({ file: 'apriori/tmp/', action: 'not a directory (skipped — something else sits at apriori/tmp; move it and rerun)' });
  }
  // each mapped template is adopted ONLY against its own generation table — a body that is a
  // legal generation of a DIFFERENT template is unmanaged, in either direction (MC-04)
  for (const key of Object.keys(tools)) {
    for (const [tplId, rel] of Object.entries(tools[key].commands || {})) {
      const gens = generations[tplId] || [];
      consider(rel, srcs[tplId], (cur) => gens.includes(cur));
    }
  }
  // the rules files are USER-OWNED; the one thing update may change in them is the pointer
  // paragraph this tool wrote, and only when it is an exact previous generation (BD-04) —
  // detected the way command files are: verbatim, never by resemblance
  const seenRules = new Set();
  for (const key of Object.keys(tools)) {
    const rel = TOOLS[key].rules;
    if (!rel || seenRules.has(rel)) continue;
    seenRules.add(rel);
    const p = path.join(root, rel);
    let st;
    try { st = fs.lstatSync(p); } catch { continue; }
    if (st.isSymbolicLink() || !st.isFile() || !containsFuturePath(root, p)) continue;   // not a plain contained file: not touched, not judged
    const up = upgradePointer(fs.readFileSync(p, 'utf8'));
    if (up.kind === 'none' || up.kind === 'current') continue;      // a user-owned file with nothing to do is not an action
    if (up.kind === 'hand-edited') { actions.push({ file: rel, action: 'pointer (skipped — not a shipped generation; hand-edited, left alone)' }); continue; }
    if (!dry) fs.writeFileSync(p, up.text);
    actions.push({ file: rel, action: 'pointer updated' });
  }
  if (manifestDirty && !dry) managed.writeManifest(root, files);
  // legacy 3.x layout roots: refreshing the protocol over pre-4.0 artifacts must be loud (UP-12)
  const legacy = legacyRoots(root);
  const warnings = legacy.length
    ? [`legacy 3.x layout root(s) present: ${legacy.join(', ')} — migrate them into their change bundles, see MIGRATING.md (4.0): https://github.com/Apriorhythm/apriori-spec-development/blob/main/MIGRATING.md`]
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
    const refreshed = (a) => a === 'updated' || a === 'pointer updated' || a === 'created (first install)' || a.startsWith('adopted and updated');
    for (const { file, action } of res.actions)
      console.log(`  ${refreshed(action) ? '✓' : '·'} ${file}  (${action})`);
    for (const w of res.warnings || []) console.error(`  warning: ${w}`);
    const n = res.actions.filter((a) => refreshed(a.action)).length;
    const modified = res.actions.filter((a) => /^modified \(skipped/.test(a.action)).length;
    // a tool-owned path it could not bring to match: deleted, obstructed, escaping, or changed mid-install
    const blocked = res.actions.filter((a) => /^(missing|not a regular file|not a directory|escapes the project root|changed during (?:install|refresh)|not refreshed) \(skipped/.test(a.action)).length;
    const held = [];
    if (modified) held.push(`${modified} modified (skipped) — locally modified, not refreshed; ${CURE}`);
    if (blocked) held.push(`${blocked} missing or obstructed (skipped) — not refreshed; see the lines above`);
    const v = require('../package.json').version;
    // the summary never says "everything matches" over a file it just declined or could not refresh (BD-03)
    console.log(n
      ? `\n  ${n} file(s) ${dryRun ? 'would be ' : ''}refreshed to apriori-cli ${v}.`
      : held.length
        ? `\n  ${held.join('; ')}.`
        : `\n  everything already matches apriori-cli ${v}.`);
    console.log('  (user-owned files — process-config.md, specs/, changes/, rules files — are never touched.)');
    return 0;
  });
}

module.exports = { run, refresh, cli };
