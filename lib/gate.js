'use strict';
/*
 * apriori gate — aggregate the MECHANICAL exit conditions for one change into one exit code.
 * 0 = PASS · 1 = BLOCKED · 2 = the evaluation itself is untrustworthy.
 * Strictly read-only. PASS covers machine checks only — human gates remain human.
 */
const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');
const { parseFlowState, parseLedger } = require('./status');
const { verify, configTestCmd } = require('./spec-runner');
const { CHANGE_NAME_RE, containsReal } = require('./archive-merge');

const STEP_ENUM = ['STEP0', 'STEP1', 'STEP2', 'STEP3', 'STEP4', 'STEP5', 'STEP6',
  'INTENT-CARD', 'SPIKE', 'EXTRACTION', 'DONE', 'ABANDONED'];
const TIER_ENUM = ['trivial', 'medium', 'large'];
const CAVEAT = 'mechanical checks only; human gates remain human';

function err(res, msg) { res.errors.push(msg); res.result = 'ERROR'; res.code = 2; return res; }

// stage resolution: in-flight first, else newest archived (exact stamp regex, lexicographic last)
function resolveChange(cwd, name) {
  const changesDir = path.join(cwd, 'apriori', 'changes');
  const inflight = path.join(changesDir, name);
  if (fs.existsSync(inflight)) {
    if (!containsReal(changesDir, inflight)) return { error: `change path escapes ${changesDir}` };
    return { stage: 'in-flight', dir: inflight };
  }
  const archRoot = path.join(changesDir, 'archive');
  if (fs.existsSync(archRoot)) {
    const re = new RegExp(`^\\d{4}-\\d{2}-\\d{2}T\\d{4}-${name}$`);
    // candidates must be DIRECTORIES (following symlinks) — a stray file with a stamp name is ignored
    const hits = fs.readdirSync(archRoot).filter((b) => {
      if (!re.test(b)) return false;
      try { return fs.statSync(path.join(archRoot, b)).isDirectory(); } catch { return false; }
    }).sort();
    if (hits.length) {
      const dir = path.join(archRoot, hits[hits.length - 1]);
      // containment against the ARCHIVE root — a symlink pointing elsewhere under changes/ is still an escape
      if (!containsReal(archRoot, dir)) return { error: `archived change path escapes ${archRoot}` };
      return { stage: 'archived', dir };
    }
  }
  return { error: `change '${name}' found neither at ${inflight} nor under ${archRoot}` };
}

// --- individual checks; each returns {id, status: 'pass'|'blocked'|'n/a', detail} ---

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

function checkLedger(cwd, name, tier) {
  const p = path.join(cwd, 'apriori', 'review', `${name}-issues.md`);
  if (!fs.existsSync(p)) {
    return tier === 'trivial'
      ? { id: 'C4', status: 'n/a', detail: 'no ledger — trivial tier may never open one' }
      : { id: 'C4', status: 'blocked', detail: `ledger missing at ${p}` };
  }
  const rows = parseLedger(fs.readFileSync(p, 'utf8'));
  const bad = [];
  for (const r of rows) {
    if (/^open\b/i.test(r.status)) bad.push(`${r.id} is open`);
    else if (/^rejected\b/i.test(r.status)) {
      // reason rule: strip the leading word, trim, require a WORD character (punctuation alone is not a reason)
      const rest = r.status.replace(/^rejected\b/i, '').trim();
      if (!/\w/.test(rest)) bad.push(`${r.id} is rejected without a reason`);
    }
  }
  return bad.length
    ? { id: 'C4', status: 'blocked', detail: bad.join('; ') }
    : { id: 'C4', status: 'pass', detail: `${rows.length} row(s), none blocking` };
}

function checkEvidence(cwd, name) {
  const reviewDir = path.join(cwd, 'apriori', 'review');
  const designDir = path.join(cwd, 'apriori', 'design');
  const docs = [];
  const collect = (dir, re) => {
    if (!fs.existsSync(dir)) return;
    for (const b of fs.readdirSync(dir)) {
      if (!re.test(b)) continue;
      if (b === `${name}-issues.md`) continue;
      if (/-raw\.[^.]+$/.test(b) || b.replace(/\.md$/, '').endsWith('-raw')) continue;
      docs.push(path.join(dir, b));
    }
  };
  collect(reviewDir, new RegExp(`^${name}-.*\\.md$`));
  collect(designDir, new RegExp(`^${name}-review-v.*\\.md$`));
  const bad = [];
  for (const doc of docs.sort()) {
    if (fs.lstatSync(doc).isSymbolicLink()) { bad.push(`${path.basename(doc)} is a symlink — evidence docs must be regular files`); continue; }
    if (!fs.statSync(doc).isFile()) continue;
    if (!/^VERDICT:/m.test(fs.readFileSync(doc, 'utf8'))) continue;
    const stem = path.basename(doc, '.md');
    const raws = fs.existsSync(reviewDir) ? fs.readdirSync(reviewDir).filter((b) =>
      b.startsWith(stem + '-raw.') &&
      fs.lstatSync(path.join(reviewDir, b)).isFile() &&                     // lstat FIRST: symlinked raws are not evidence
      containsReal(reviewDir, path.join(reviewDir, b))) : [];
    if (!raws.length) bad.push(`${path.basename(doc)} carries a VERDICT but no ${stem}-raw.* exists`);
  }
  return bad.length
    ? { id: 'C5', status: 'blocked', detail: bad.join('; ') }
    : { id: 'C5', status: 'pass', detail: `${docs.length} review doc(s), every verdict has raw evidence` };
}

function checkKb(cwd, dir) {
  const specsDir = path.join(dir, 'specs');
  const modules = new Set();
  const walk = (d, base) => {
    if (!fs.existsSync(d)) return;
    for (const e of fs.readdirSync(d, { withFileTypes: true })) {
      const p = path.join(d, e.name);
      if (e.isDirectory()) walk(p, base);
      else if (e.name.endsWith('.md')) modules.add(path.relative(base, p).split(path.sep)[0]);
    }
  };
  walk(specsDir, specsDir);
  if (!modules.size) return { id: 'C6', status: 'n/a', detail: 'no delta specs to map' };
  const blocked = [], notes = [];
  let checked = 0;
  for (const m of [...modules].sort()) {
    const truth = path.join(cwd, 'apriori', 'truth', `${m}.md`);
    if (!fs.existsSync(truth)) { notes.push(`${m}: no truth doc`); continue; }
    const sc = fs.readFileSync(truth, 'utf8').match(/^source-commit:\s*(\S+)/m);
    if (!sc) { notes.push(`${m}: truth doc has no source-commit`); continue; }
    if (!fs.existsSync(path.join(cwd, 'lib', `${m}.js`))) { notes.push(`${m}: no lib/${m}.js to compare`); continue; }
    const g = spawnSync('git', ['-C', cwd, 'log', '--oneline', `${sc[1]}..HEAD`, '--', `lib/${m}.js`], { encoding: 'utf8' });
    if (g.error) { notes.push(`${m}: git unavailable (${g.error.message})`); continue; }
    if (g.status !== 0) { notes.push(`${m}: git failed (${(g.stderr || '').split('\n')[0]})`); continue; }
    const n = g.stdout.trim() ? g.stdout.trim().split('\n').length : 0;
    if (n > 0) blocked.push(`${m}: ${n} commit(s) since ${sc[1]}`);
    else checked++;
  }
  if (blocked.length) return { id: 'C6', status: 'blocked', detail: blocked.join('; ') };
  if (checked > 0) return { id: 'C6', status: 'pass', detail: `${checked} module stamp(s) up to date${notes.length ? `; ${notes.join('; ')}` : ''}` };
  return { id: 'C6', status: 'n/a', detail: notes.join('; ') };
}

function checkBinding(cwd, name, stage, testCmd) {
  const run = stage === 'in-flight'
    ? verify({ change: name, cwd, testCmd })
    : verify({ specs: [path.join(cwd, 'apriori', 'specs')], cwd, testCmd });
  if (run.errors.length) return { infra: run.errors };
  const v = run.verdict;
  const clean = v.clean && run.duplicates.length === 0;
  if (clean) return { check: { id: 'C1', status: 'pass', detail: `verify GREEN (${stage})` } };
  const parts = [];
  for (const [label, arr] of [['red', v.boundRed], ['unbound', v.unbound], ['orphan', v.orphan], ['unidentified', v.unidentified], ['duplicate-IDs', run.duplicates]])
    if (arr.length) parts.push(`${arr.length} ${label}`);
  return { check: { id: 'C1', status: 'blocked', detail: `verify GAPS: ${parts.join(', ')}` } };
}

// The whole evaluation. → { code, stage, checks, result, blocked, errors }
function runGate(opts) {
  const cwd = opts.cwd || process.cwd();
  const res = { code: 0, stage: null, checks: [], result: 'PASS', blocked: 0, errors: [], change: opts.change || null };
  if (!opts.change) return err(res, 'usage: apriori gate --change <name> [--test-cmd "<cmd>"] [--cwd <dir>] [--json]');
  if (!CHANGE_NAME_RE.test(opts.change)) return err(res, `invalid change name '${opts.change}' — bare kebab-case only`);
  const loc = resolveChange(cwd, opts.change);
  if (loc.error) return err(res, loc.error);
  res.stage = loc.stage;
  const flowPath = path.join(loc.dir, 'flow-state.md');
  if (!fs.existsSync(flowPath)) return err(res, `no readable flow-state.md at ${flowPath} — tier-aware checks are impossible`);
  let state;
  try { state = parseFlowState(fs.readFileSync(flowPath, 'utf8')); }
  catch (e) { return err(res, `flow-state unreadable: ${e.message}`); }
  const testCmd = opts.testCmd || configTestCmd(cwd);
  if (!testCmd) return err(res, 'no test command: pass --test-cmd or add a test-cmd row to apriori/process-config.md');

  const b = checkBinding(cwd, opts.change, loc.stage, testCmd);
  if (b.infra) { for (const e of b.infra) res.errors.push(`verify: ${e}`); res.result = 'ERROR'; res.code = 2; return res; }
  res.checks.push(b.check);
  const tier = TIER_ENUM.includes(state.tier) ? state.tier : null;
  res.checks.push(checkTasks(loc.dir, tier));
  res.checks.push(checkFlowState(state, opts.change));
  res.checks.push(checkLedger(cwd, opts.change, tier));
  res.checks.push(checkEvidence(cwd, opts.change));
  res.checks.push(checkKb(cwd, loc.dir));

  res.blocked = res.checks.filter((c) => c.status === 'blocked').length;
  res.result = res.blocked ? 'BLOCKED' : 'PASS';
  res.code = res.blocked ? 1 : 0;
  return res;
}

function toJson(res) {
  return { change: res.change, stage: res.stage, checks: res.checks, result: res.result, blocked: res.blocked, errors: res.errors };
}

function cli(argv) {
  const a = { change: null, testCmd: null, cwd: process.cwd(), json: false };
  for (let i = 0; i < argv.length; i++) {
    const k = argv[i];
    if (k === '--change') a.change = argv[++i];
    else if (k === '--test-cmd') a.testCmd = argv[++i];
    else if (k === '--cwd') a.cwd = argv[++i];
    else if (k === '--json') a.json = true;
  }
  const res = runGate(a);
  if (a.json) { console.log(JSON.stringify(toJson(res), null, 2)); return res.code; }
  for (const e of res.errors) console.error('gate: ' + e);
  const mark = { pass: '✓', blocked: '✗', 'n/a': '–' };
  for (const c of res.checks) console.log(`${mark[c.status]} ${c.id} ${c.status === 'blocked' ? 'BLOCKED — ' : ''}${c.detail}`);
  if (res.code !== 2) console.log(res.code === 0 ? `\nGATE: PASS — ${CAVEAT}` : `\nGATE: BLOCKED (${res.blocked} item(s))`);
  return res.code;
}

module.exports = { runGate, resolveChange, cli };
