'use strict';
/*
 * apriori doctor — diagnose the project↔apriori seam. Seven checks, one exit code:
 * 0 = HEALTHY · 1 = FINDINGS · 2 = UNUSABLE (Node floor, uninitialized, usage error).
 * Doctor never repairs and never writes; its ONLY side effect is D5 running the
 * project's test command once (--no-run removes even that). Findings name their fixer.
 */
const fs = require('fs');
const path = require('path');
const { TOOLS, detectTools } = require('./init');
const { checkRunbookFreshness } = require('./check');
const { collectScenarios, parseTap, zeroTapParsed, runTestCommand, configTestCmd, DEFAULT_ID } = require('./spec-runner');
const { activeChanges, parseFlowState } = require('./status');
const { containsReal } = require('./archive-merge');
const { withStrict } = require('./args');

const NODE_FLOOR = 18;

// type-honest probes: doctor's whole job is malformed scaffolds — a file impersonating a
// directory (or vice versa) must become a FINDING, never a false pass or a crash
function isDir(p) { try { return fs.statSync(p).isDirectory(); } catch { return false; } }
function isFile(p) { try { return fs.statSync(p).isFile(); } catch { return false; } }
function readIfFile(p) { try { return fs.statSync(p).isFile() ? fs.readFileSync(p, 'utf8') : null; } catch { return null; } }

// D5's classifier over a runTestCommand result — exported for the Windows-safe signal test (DR-06)
function classifyProbe(run) {
  // run = runTestCommand's shape: { out, status, signal, error }
  const { out } = run;
  if (run.error) return { id: 'D5', status: 'finding', detail: `test command failed to spawn: ${run.error}`, fix: 'fix the test command' };
  if (run.signal) return { id: 'D5', status: 'finding', detail: `test command was killed by signal ${run.signal}`, fix: 'fix the test command' };
  const idRe = new RegExp(DEFAULT_ID);
  const { results, untagged, untaggedFails, bailout } = parseTap(out, idRe);
  if (bailout) return { id: 'D5', status: 'finding', detail: `test run aborted: ${bailout}`, fix: 'fix the test command' };
  if (!out.trim()) return { id: 'D5', status: 'finding', detail: 'test command produced no output', fix: 'fix the test command' };
  if (zeroTapParsed(out, results, untagged))
    return { id: 'D5', status: 'finding', detail: 'output is not TAP — node test runner needs --test-reporter=tap', fix: 'emit TAP from the test command' };
  const parsed = [...results.values()].reduce((s, r) => s + r.pass + r.fail, 0) + untagged.length;
  const failCount = [...results.values()].reduce((s, r) => s + r.fail, 0) + untaggedFails;
  // an unexplained non-zero exit is classified BEFORE any ok branch — a non-zero `1..0` run lands here
  if (run.status !== null && run.status !== 0 && failCount === 0)
    return { id: 'D5', status: 'finding', detail: `test command exited ${run.status} unexplained by TAP — truncated?`, fix: 'fix the test command' };
  if (parsed === 0) {
    if (/^1\.\.0\b/m.test(out)) return { id: 'D5', status: 'ok', detail: 'TAP plumbing OK (empty suite, 1..0)' };
    return { id: 'D5', status: 'finding', detail: 'TAP stream truncated or malformed (version/plan but zero result lines)', fix: 'fix the test command' };
  }
  const pass = parsed - failCount;
  return { id: 'D5', status: 'ok', detail: `TAP plumbing OK (${pass}p/${failCount}f — test failures are verify's business, not doctor's)` };
}

// The whole diagnosis. → { code, result, findings, checks, errors }
function runDoctor(opts = {}) {
  const cwd = opts.cwd || process.cwd();
  const checks = [], errors = [];
  const finish = (code) => {
    const findings = checks.filter((c) => c.status === 'finding').length;
    const result = code === 2 ? 'UNUSABLE' : (findings ? 'FINDINGS' : 'HEALTHY');
    return { code: code !== undefined ? code : (findings ? 1 : 0), result, findings, checks, errors };
  };

  // D1 — Node floor (version injectable for tests, DR-12)
  const major = parseInt((opts.nodeVersion || process.versions.node), 10);
  if (major < NODE_FLOOR) {
    checks.push({ id: 'D1', status: 'finding', detail: `Node ${opts.nodeVersion || process.versions.node} is below the supported floor (>= ${NODE_FLOOR})`, fix: 'upgrade Node' });
    errors.push(`Node below the supported floor (>= ${NODE_FLOOR})`);
    return finish(2);
  }
  checks.push({ id: 'D1', status: 'ok', detail: `Node ${opts.nodeVersion || process.versions.node} >= ${NODE_FLOOR}` });

  // D2 — init scaffold
  const ap = path.join(cwd, 'apriori');
  if (!isDir(ap)) {
    checks.push({ id: 'D2', status: 'finding', detail: `no apriori/ here — not an apriori project yet`, fix: `run 'apriori init'` });
    errors.push(`no apriori/ directory — run 'apriori init'`);
    return finish(2);
  }
  const gaps = [];
  if (!isFile(path.join(ap, 'runbook.md'))) gaps.push([`apriori/runbook.md ${fs.existsSync(path.join(ap, 'runbook.md')) ? 'is not a regular file' : 'missing'}`, `apriori init`]);
  if (!isDir(path.join(ap, 'specs'))) gaps.push([`apriori/specs/ ${fs.existsSync(path.join(ap, 'specs')) ? 'is not a directory' : 'missing (half-initialized scaffold)'}`, `apriori init`]);
  const giText = readIfFile(path.join(ap, '.gitignore'));
  if (giText === null || !/^tmp\/$/m.test(giText)) gaps.push(['apriori/.gitignore missing, unreadable, or missing its tmp/ line', `apriori update`]);
  if (!isDir(path.join(ap, 'tmp'))) gaps.push([`apriori/tmp/ ${fs.existsSync(path.join(ap, 'tmp')) ? 'is not a directory' : 'dir missing'}`, `apriori update / mkdir`]);
  if (gaps.length) for (const [detail, fix] of gaps) checks.push({ id: 'D2', status: 'finding', detail, fix });
  else checks.push({ id: 'D2', status: 'ok', detail: 'scaffold complete' + (fs.existsSync(path.join(ap, 'process-config.md')) ? '' : ' (no process-config.md — optional, defaults apply)') });

  // D3 — runbook freshness (absence OR wrong type is D2's finding; D3 must never contradict or crash)
  if (!isFile(path.join(ap, 'runbook.md')))
    checks.push({ id: 'D3', status: 'n/a', detail: 'runbook missing or not a regular file — see D2; freshness not checkable' });
  else {
    const warn = checkRunbookFreshness(cwd);
    checks.push(warn.length
      ? { id: 'D3', status: 'finding', detail: warn[0], fix: 'apriori update' }
      : { id: 'D3', status: 'ok', detail: 'runbook copy matches the installed CLI' });
  }

  // D4 — tool pointers for DETECTED tools only
  const detected = detectTools(cwd);
  if (!detected.length) checks.push({ id: 'D4', status: 'n/a', detail: 'no known AI-tool markers detected' });
  else {
    let broken = 0;
    for (const key of detected) {
      const t = TOOLS[key];
      const rules = path.join(cwd, t.rules);
      const rulesText = readIfFile(rules);
      if (rulesText === null || !rulesText.includes('apriori/runbook.md')) {
        checks.push({ id: 'D4', status: 'finding', detail: `${t.name}: ${t.rules} ${rulesText !== null ? 'lost its runbook pointer' : (fs.existsSync(rules) ? 'is not a regular readable file' : 'is missing')}`, fix: 'apriori init' });
        broken++;
      }
      if (t.command && !isFile(path.join(cwd, t.command))) {
        checks.push({ id: 'D4', status: 'finding', detail: `${t.name}: command file ${t.command} is missing`, fix: 'apriori init' });
        broken++;
      }
    }
    if (!broken) checks.push({ id: 'D4', status: 'ok', detail: `pointers intact for: ${detected.join(', ')}` });
  }

  // D5 — TAP probe (the one declared side effect; --no-run skips)
  const testCmd = opts.testCmd || configTestCmd(cwd);
  if (!testCmd) checks.push({ id: 'D5', status: 'n/a', detail: 'no test command configured — pass --test-cmd or set one via apriori init --test-cmd' });
  else if (opts.noRun) checks.push({ id: 'D5', status: 'n/a', detail: 'probe skipped (--no-run)' });
  else checks.push(classifyProbe(runTestCommand(testCmd, cwd)));

  // D6 — store health (no test run; default ID pattern only)
  const specsDir = path.join(ap, 'specs');
  if (!fs.existsSync(specsDir)) checks.push({ id: 'D6', status: 'n/a', detail: 'no store dir — see D2' });
  else {
    const { byId, unidentified, files, duplicates } = collectScenarios([specsDir], new RegExp(DEFAULT_ID));
    if (!files.length || (byId.size === 0 && unidentified.length === 0))
      checks.push({ id: 'D6', status: 'n/a', detail: 'empty store — normal for a new project' });
    else {
      let bad = 0;
      if (unidentified.length) { checks.push({ id: 'D6', status: 'finding', detail: `scenario(s) without a bindable ${DEFAULT_ID} ID: ${unidentified.map(([, t]) => t.slice(0, 40)).join(' · ')}`, fix: 'add leading IDs' }); bad++; }
      if (duplicates.length) { checks.push({ id: 'D6', status: 'finding', detail: `duplicate scenario IDs: ${duplicates.map((d) => d.id).join(', ')}`, fix: 'deduplicate IDs' }); bad++; }
      if (!bad) checks.push({ id: 'D6', status: 'ok', detail: `${byId.size} scenario(s), all bindable, no duplicates` });
    }
  }

  // D7 — changes overview
  const actives = activeChanges(cwd);
  const notes = [];
  let d7bad = 0;
  for (const c of actives) {
    const fp = path.join(cwd, 'apriori', 'changes', c, 'flow-state.md');
    if (!fs.existsSync(fp)) { checks.push({ id: 'D7', status: 'finding', detail: `${c}: no flow-state.md`, fix: 'apriori new / restore the file' }); d7bad++; continue; }
    let st;
    try { st = parseFlowState(fs.readFileSync(fp, 'utf8')); }
    catch (e) { checks.push({ id: 'D7', status: 'finding', detail: `${c}: flow-state unreadable (${e.message})`, fix: 'fix the file' }); d7bad++; continue; }
    if (!st.change) { checks.push({ id: 'D7', status: 'finding', detail: `${c}: flow-state has no 'change:' key`, fix: 'fix the file' }); d7bad++; }
    else if (st.change !== c) { checks.push({ id: 'D7', status: 'finding', detail: `${c}: flow-state says 'change: ${st.change}' — mismatches the dir`, fix: 'fix the file' }); d7bad++; }
    else notes.push(`${c} @ ${st['current-step'] || '?'}`);
  }
  const archRoot = path.join(cwd, 'apriori', 'changes', 'archive');
  if (fs.existsSync(archRoot)) {
    for (const b of fs.readdirSync(archRoot).sort()) {
      if (!/^\d{4}-\d{2}-\d{2}T\d{4}-/.test(b)) continue;
      const dir = path.join(archRoot, b);
      let isDir = false;
      try { isDir = fs.statSync(dir).isDirectory(); } catch { continue; }
      if (!isDir) continue;
      if (!containsReal(archRoot, dir)) { notes.push(`${b}: skipped (escapes archive/ — symlink?)`); continue; }
      const fp = path.join(dir, 'flow-state.md');
      if (!fs.existsSync(fp)) continue;
      const st = parseFlowState(fs.readFileSync(fp, 'utf8'));
      const step = st['current-step'];
      if (step && step !== 'DONE' && step !== 'ABANDONED') notes.push(`archived ${b} @ ${step} — gate ④ possibly pending`);
    }
  }
  if (!d7bad) checks.push(actives.length || notes.length
    ? { id: 'D7', status: 'ok', detail: notes.join('; ') || `${actives.length} active change(s), flow-states valid` }
    : { id: 'D7', status: 'n/a', detail: 'no changes yet' });
  else if (notes.length) checks.push({ id: 'D7', status: 'ok', detail: notes.join('; ') });

  return finish();
}

function toJson(res) {
  return { result: res.result, findings: res.findings, checks: res.checks, errors: res.errors };
}

const USAGE = 'usage: apriori doctor [--test-cmd "<cmd>"] [--no-run] [--cwd <dir>] [--json]';

function cli(argv) {
  return withStrict(argv, { sub: 'doctor', usage: USAGE, positionals: 0,
    flags: { '--test-cmd': 'value', '--no-run': 'flag', '--cwd': 'value', '--json': 'flag' },
    jsonError: (m) => JSON.stringify({ result: 'UNUSABLE', findings: 0, checks: [], errors: [m] }, null, 2) }, (f) => {
    const a = { testCmd: f['--test-cmd'] || null, noRun: !!f['--no-run'], cwd: f['--cwd'] || process.cwd(), json: !!f['--json'] };
    const res = runDoctor(a);
    if (a.json) { console.log(JSON.stringify(toJson(res), null, 2)); return res.code; }
    for (const e of res.errors) console.error('doctor: ' + e);
    const mark = { ok: '✓', finding: '✗', 'n/a': '–' };
    for (const c of res.checks) console.log(`${mark[c.status]} ${c.id} ${c.detail}${c.fix ? `  → ${c.fix}` : ''}`);
    console.log(res.code === 2 ? '\nDOCTOR: UNUSABLE (see errors)'
      : res.findings ? `\nDOCTOR: ${res.findings} finding(s)` : '\nDOCTOR: HEALTHY');
    return res.code;
  });
}

module.exports = { runDoctor, classifyProbe, cli };
