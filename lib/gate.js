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
const sr = require('./spec-runner');
const { verify, configTestCmd } = sr;
const { CHANGE_NAME_RE, containsReal } = require('./archive-merge');
const { resolveChange, configCas, configCasProblem } = require('./resolve');
const { resolveIdPattern } = require('./config');
const { withStrict } = require('./args');
// the flow-state / tasks / ledger predicates live in ONE place; gate consumes them
const rd = require('./readiness');
const { STEP_ENUM, TIER_ENUM, classifyStatus, checkFlowState, checkTasks, checkLedger, reviewDirDefect } = rd;
const CAVEAT = 'mechanical checks only; human gates remain human';

function err(res, msg) { res.errors.push(msg); res.result = 'ERROR'; res.code = 2; return res; }


// --- individual checks; each returns {id, status: 'pass'|'blocked'|'n/a', detail} ---
// C2 / C3 / C4 and their helpers now live in lib/readiness.js (imported above) so that
// `archive`'s readiness precondition and this gate can never judge a bundle differently.

function checkEvidence(dir) {
  const rd = path.join(dir, 'review');
  const docs = [];
  if (fs.existsSync(rd)) {
    for (const e of fs.readdirSync(rd, { withFileTypes: true })) {
      if (!e.name.endsWith('.md') || e.name === 'issues.md' || /-raw(\.|$)/.test(e.name.replace(/\.md$/, ''))) continue;
      if (e.name.includes('-raw')) continue;
      const p = path.join(rd, e.name);
      if (fs.lstatSync(p).isSymbolicLink())
        return { id: 'C5', status: 'blocked', detail: `evidence doc is a symlink: ${e.name}` };
      if (!fs.lstatSync(p).isFile()) continue;
      docs.push(p);
    }
  }
  const missing = [];
  let verdictDocs = 0;
  for (const doc of docs) {
    if (!/^VERDICT:/m.test(fs.readFileSync(doc, 'utf8'))) continue;
    verdictDocs++;
    const stem = path.basename(doc).replace(/\.md$/, '');
    const hasRaw = fs.existsSync(rd) && fs.readdirSync(rd).some((n) => {
      if (!n.startsWith(stem + '-raw')) return false;
      const rp = path.join(rd, n);
      return fs.lstatSync(rp).isFile();
    });
    if (!hasRaw) missing.push(path.basename(doc));
  }
  if (missing.length) return { id: 'C5', status: 'blocked', detail: `verdict doc(s) without a raw archive: ${missing.join(', ')}` };
  return { id: 'C5', status: 'pass', detail: `${verdictDocs} review doc(s), every verdict has raw evidence` };
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

  // build the module → truth index (c6-truth-binding): a truth doc binds by its
  // declared store-module (default = basename), never by a filename assumption
  const truthDir = path.join(cwd, 'apriori', 'truth');
  const index = new Map();                 // module → { text, sourceFiles, basename }
  const conflicts = new Map();             // module → "declared by A and B"
  if (fs.existsSync(truthDir)) {
    for (const e of fs.readdirSync(truthDir).sort()) {
      if (!e.endsWith('.md')) continue;
      const text = fs.readFileSync(path.join(truthDir, e), 'utf8');
      const h2 = text.search(/^##\s/m);
      const header = h2 >= 0 ? text.slice(0, h2) : text;
      const smM = header.match(/^store-module:\s*(.+)$/m);
      const sfM = header.match(/^source-files:\s*(.+)$/m);
      const mods = smM ? smM[1].trim().split(/\s+/) : [e.replace(/\.md$/, '')];
      const sourceFiles = sfM ? sfM[1].trim().split(/\s+/) : null;   // null = default lib/<module>.js
      for (const m of mods) {
        if (index.has(m)) conflicts.set(m, `${m}: declared by both ${index.get(m).basename} and ${e}`);
        else index.set(m, { text, sourceFiles, basename: e });
      }
    }
  }
  const stripFencesKb = (t) => t.replace(/```[\s\S]*?```/g, '');
  const blocked = [], notes = [];
  let checked = 0;
  for (const m of [...modules].sort()) {
    if (conflicts.has(m)) { blocked.push(conflicts.get(m)); continue; }
    const entry = index.get(m);
    if (!entry) { notes.push(`${m}: no truth doc`); continue; }
    const noFence = stripFencesKb(entry.text);
    const sc = noFence.match(/^source-commit:\s+(\S+)/m);
    if (!sc) {
      const attempt = noFence.split('\n').some((l) => l.includes('source-commit:') && !/^source-commit:\s+\S+/.test(l));
      notes.push(attempt
        ? `${m}: source-commit is not in the canonical fence-outside line-start form 'source-commit: <ref>'`
        : `${m}: truth doc has no source-commit`);
      continue;
    }
    const ref = sc[1];
    const explicit = entry.sourceFiles !== null;
    const declared = explicit ? entry.sourceFiles : [`lib/${m}.js`];
    // an explicit declaration is a complete promise: every token must be verifiable
    const usable = [];
    let tokenBad = null;
    for (const rel of declared) {
      // an explicit token is a repo-relative promise: reject absolute/backslash/empty/. or .. segments
      if (explicit && (rel === '' || path.isAbsolute(rel) || rel.includes('\\') ||
          rel.split('/').some((seg) => seg === '' || seg === '.' || seg === '..'))) {
        tokenBad = `${m}: malformed source-files token (must be a normalized repo-relative path): ${rel}`; break;
      }
      const abs = path.join(cwd, rel);
      let st = null; try { st = fs.lstatSync(abs); } catch { /* absent */ }
      if (!st) { if (explicit) { tokenBad = `${m}: declared source-files token missing: ${rel}`; break; } continue; }
      if (st.isSymbolicLink()) { if (explicit) { tokenBad = `${m}: declared source-files token is a symlink: ${rel}`; break; } continue; }
      if (!containsReal(cwd, abs)) { if (explicit) { tokenBad = `${m}: declared source-files token escapes the repo: ${rel}`; break; } continue; }
      if (!st.isFile() && !st.isDirectory()) { if (explicit) { tokenBad = `${m}: declared source-files token is neither file nor directory: ${rel}`; break; } continue; }
      usable.push(rel);
    }
    if (tokenBad) { blocked.push(tokenBad); continue; }
    if (!usable.length) { notes.push(`${m}: no ${declared.join(' / ')} to compare`); continue; }
    const g = spawnSync('git', ['-C', cwd, 'log', '--oneline', `${ref}..HEAD`, '--', ...usable], { encoding: 'utf8' });
    if (g.error) { notes.push(`${m}: git unavailable (${g.error.message})`); continue; }
    if (g.status !== 0) { notes.push(`${m}: git failed (${(g.stderr || '').split('\n')[0]})`); continue; }
    const n = g.stdout.trim() ? g.stdout.trim().split('\n').length : 0;
    if (n > 0) blocked.push(`${m}: ${n} commit(s) since ${ref}`);
    else checked++;
  }
  if (blocked.length) return { id: 'C6', status: 'blocked', detail: blocked.join('; ') };
  if (checked > 0) return { id: 'C6', status: 'pass', detail: `${checked} module stamp(s) up to date${notes.length ? `; ${notes.join('; ')}` : ''}` };
  return { id: 'C6', status: 'n/a', detail: notes.join('; ') };
}

function checkBinding(cwd, name, stage, testCmd, idPattern) {
  const run = stage === 'in-flight'
    ? verify({ change: name, cwd, testCmd, idPattern })
    : verify({ specs: [path.join(cwd, 'apriori', 'specs')], cwd, testCmd, idPattern });
  if (run.errors.length) return { infra: run.errors };
  const v = run.verdict;
  const clean = v.clean && run.duplicates.length === 0;
  // in-flight runs carry the informative store summary (change-scoped verdict, GT-26/27)
  const sr2 = run.storeReport;
  const suffix = sr2
    ? `; store: ${sr2.boundRed.length} red, ${sr2.unbound.length} unbound, ${sr2.orphan.length} orphan, ${sr2.unidentified.length} unidentified, ${sr2.unattributedFailures.count} unattributed, ${sr2.duplicates.length} duplicate(s) outstanding`
    : '';
  const label0 = sr2 ? `${stage}, change-scoped` : stage;
  if (clean) return { check: { id: 'C1', status: 'pass', detail: `verify GREEN (${label0})${suffix}` }, projection: run.projection };
  const parts = [];
  for (const [label, arr] of [['red', v.boundRed], ['unbound', v.unbound], ['orphan', v.orphan], ['unidentified', v.unidentified], ['unattributed-failures', v.unattributed || []], ['duplicate-IDs', run.duplicates]])
    if (arr.length) parts.push(`${arr.length} ${label}`);
  return { check: { id: 'C1', status: 'blocked', detail: `verify GAPS: ${parts.join(', ')}${suffix}` }, projection: run.projection };
}


// The same shape as checkBinding, for the path where no test command exists. C1 cannot run,
// but everything C1 was ALSO producing for its neighbours still can: C7 needs the projection,
// and a broken id-pattern is still a broken config. Nothing here spawns a process.
function checkBindingSkipped(cwd, name, stage, idPattern) {
  // a broken pattern is a broken CONFIG, not an absent one — it stays an evaluation error
  // (GT-24 keeps holding). Compile-checking is in-process; no scenario is ever MATCHED here,
  // so no matcher child is spawned and GT-25's runtime precondition cannot arise.
  const idp = resolveIdPattern(cwd, idPattern);
  if (idp.error) return { infra: [idp.error] };
  const detail = 'skipped — no test command (pass --test-cmd or add a test-cmd row to '
    + 'apriori/process-config.md); the binding check did not run';
  const c1 = { id: 'C1', status: 'skipped', detail };
  // archived: the deltas are already merged and C7 is n/a — building a projection could only
  // manufacture a false block, so it is never built at all.
  if (stage === 'archived') return { check: c1, projection: null };
  const b = sr.currentProjectionBuilder()(name, cwd);
  if (b.errors && b.errors.length) return { infra: b.errors };
  // fail closed: no trustworthy texts is untrustworthy even when nothing said why. Reporting
  // it with an empty errors list would be an ERROR that cannot explain itself.
  if (!b.texts) return { infra: ['projection produced no trustworthy texts and reported no error — refusing to judge'] };
  return { check: c1, projection: b.projection };
}

// The test command has three fates, and "broken" is not "absent". A flag that is present but
// empty (or all whitespace) is an operator error in THIS invocation and must never fall back
// to the config; an empty config VALUE, by contrast, was already normalised to "no such row"
// by the shared reader (config.js), so gate sees an absence and treats it as one.
function resolveTestCmd(opts, cwd) {
  const flag = opts.testCmd;
  if (flag !== undefined && flag !== null) {
    if (typeof flag !== 'string') return { kind: 'error', error: `--test-cmd must be a string (got ${Array.isArray(flag) ? 'array' : typeof flag})` };
    if (flag.trim() === '') return { kind: 'error', error: 'empty --test-cmd — pass a command or omit the flag' };
    return { kind: 'ok', value: flag };
  }
  const c = configTestCmd(cwd);
  if (c && c.error) return { kind: 'error', error: `verify: ${c.error}` };
  if (c) return { kind: 'ok', value: c };
  return { kind: 'absent' };
}

// C7: unstamped mutation deltas are denied by default — a waiver is always visible (GT-16).
// Archived stage: the deltas are already merged; there is nothing left to stamp-check.
function checkCas(projection, stage, noCas, cwd) {
  if (stage === 'archived') return { id: 'C7', status: 'n/a', detail: 'deltas already merged' };
  const um = (projection && projection.unstampedMutations) || [];
  if (!um.length) return { id: 'C7', status: 'pass', detail: 'every mutation delta is stamped' };  // nothing to consult — silent pass (GT-16)
  if (noCas) return { id: 'C7', status: 'pass', detail: 'waived (--no-cas)' };
  const problem = configCasProblem(cwd);                       // consumption-time only
  if (problem) return { id: 'C7', status: 'blocked', detail: `${problem} — a broken config never equals a waiver` };
  if (configCas(cwd) === 'optional') return { id: 'C7', status: 'pass', detail: 'waived (process-config cas: optional)' };
  return { id: 'C7', status: 'blocked',
    detail: `unstamped mutation delta(s): ${um.join(', ')} — run: apriori stamp <store-file> (or waive with --no-cas / a process-config cas: optional row)` };
}

// The whole evaluation. → { code, stage, checks, result, blocked, errors }
function runGate(opts) {
  const cwd = opts.cwd || process.cwd();
  const res = { code: 0, stage: null, checks: [], result: 'PASS', blocked: 0, errors: [], change: opts.change || null };
  if (!opts.change) return err(res, USAGE);   // the ONE usage constant — every path lists the same flags
  const nameCheck = require('./resolve').validateChangeName(opts.change);
  if (!nameCheck.ok) return err(res, `invalid change name '${opts.change}' (${nameCheck.kind}) — bare kebab-case, not date-prefixed, not a reserved name`);
  const loc = resolveChange(cwd, opts.change);
  if (loc.error) return err(res, loc.error);
  res.stage = loc.stage;
  const flowPath = path.join(loc.dir, 'flow-state.md');
  // mapping m1: a hotfix bundle is not this gate's object. It is refused with a pointer at
  // its own preflight rather than adapted — the seven checks below stay exactly as they are.
  const hotfixPath = path.join(loc.dir, 'hotfix-state.md');
  if (fs.existsSync(hotfixPath)) {
    return err(res, fs.existsSync(flowPath)
      ? `'${opts.change}' carries BOTH flow-state.md and hotfix-state.md — a bundle has one identity; delete the one that does not belong`
      : `'${opts.change}' is a hotfix bundle, not a formal change — its mechanical exit conditions are \`apriori hotfix archive ${opts.change}\` (the gate's seven checks do not apply to the lane)`);
  }
  if (!fs.existsSync(flowPath)) return err(res, `no readable flow-state.md at ${flowPath} — tier-aware checks are impossible`);
  let state;
  try { state = parseFlowState(fs.readFileSync(flowPath, 'utf8')); }
  catch (e) { return err(res, `flow-state unreadable: ${e.message}`); }
  const tc = resolveTestCmd(opts, cwd);
  if (tc.kind === 'error') return err(res, tc.error);

  const idPattern = opts.idPattern === undefined ? null : opts.idPattern;
  const b = tc.kind === 'absent'
    ? checkBindingSkipped(cwd, opts.change, loc.stage, idPattern)
    : checkBinding(cwd, opts.change, loc.stage, tc.value, idPattern);
  if (b.infra) { for (const e of b.infra) res.errors.push(`verify: ${e}`); res.result = 'ERROR'; res.code = 2; return res; }
  res.checks.push(b.check);
  const tier = TIER_ENUM.includes(state.tier) ? state.tier : null;
  res.checks.push(checkTasks(loc.dir, tier));
  res.checks.push(checkFlowState(state, opts.change));
  const rdDefect = reviewDirDefect(loc.dir);
  if (rdDefect) {
    res.checks.push({ id: 'C4', status: 'blocked', detail: rdDefect });
    res.checks.push({ id: 'C5', status: 'blocked', detail: rdDefect });
  } else {
    res.checks.push(checkLedger(tier, loc.stage, loc.dir));
    res.checks.push(checkEvidence(loc.dir));
  }

  res.checks.push(checkKb(cwd, loc.dir));
  res.checks.push(checkCas(b.projection, loc.stage, !!opts.noCas, cwd));

  // ERROR(2) > BLOCKED(1) > INCOMPLETE(3) > PASS(0). The ERROR rung is served by the early
  // returns above, so only the lower three are decided here. `blocked` counts blocked only:
  // an unrun check is not a block, and must not inflate the number a human reads.
  res.blocked = res.checks.filter((c) => c.status === 'blocked').length;
  const skipped = res.checks.some((c) => c.status === 'skipped');
  res.result = res.blocked ? 'BLOCKED' : skipped ? 'INCOMPLETE' : 'PASS';
  res.code = res.blocked ? 1 : skipped ? 3 : 0;
  return res;
}

function toJson(res) {
  return { change: res.change, stage: res.stage, checks: res.checks, result: res.result, blocked: res.blocked, errors: res.errors };
}

const USAGE = 'usage: apriori gate --change <name> [--test-cmd "<cmd>"] [--id-pattern <re>] [--cwd <dir>] [--json] [--no-cas]';

function cli(argv) {
  return withStrict(argv, { sub: 'gate', usage: USAGE, positionals: 0,
    flags: { '--change': 'value', '--test-cmd': 'value', '--id-pattern': 'value', '--cwd': 'value', '--json': 'flag', '--no-cas': 'flag' },
    jsonError: (m) => JSON.stringify({ change: null, stage: null, checks: [], result: 'ERROR', blocked: 0, errors: [m] }, null, 2) }, (f) => {
    const a = { change: f['--change'] || null, testCmd: ('--test-cmd' in f) ? f['--test-cmd'] : null,   // PRESENCE, not truthiness — an empty flag is an error, never a config fallback
      idPattern: ('--id-pattern' in f) ? f['--id-pattern'] : null,   // PRESENCE, not truthiness (GT-24 empty flag)
      cwd: f['--cwd'] || process.cwd(), json: !!f['--json'], noCas: !!f['--no-cas'] };
    const res = runGate(a);
    if (a.json) { console.log(JSON.stringify(toJson(res), null, 2)); return res.code; }
    for (const e of res.errors) console.error('gate: ' + e);
    const mark = { pass: '✓', blocked: '✗', 'n/a': '–', skipped: '○' };
    for (const c of res.checks) console.log(`${mark[c.status]} ${c.id} ${c.status === 'blocked' ? 'BLOCKED — ' : ''}${c.detail}`);
    if (res.code === 0) console.log(`\nGATE: PASS — ${CAVEAT}`);
    else if (res.code === 1) console.log(`\nGATE: BLOCKED (${res.blocked} item(s))`);
    else if (res.code === 3) console.log('\nGATE: INCOMPLETE — C1 did not run; PASS was not reached');
    return res.code;
  });
}

module.exports = { runGate, resolveChange, classifyStatus, cli };
