'use strict';
/*
 * spec-runner — bind spec scenario IDs to test runs, report per-scenario red/green.
 * VISION endgame, weak form: "spec IS the test suite". Zero deps — pure Node stdlib.
 * Coupling surface is tiny and language-agnostic: markdown scenarios + a TAP-emitting test command.
 *
 * FAIL-CLOSED: a deterministic gate must refuse to say GREEN when its inputs are missing,
 * its instrument misbehaved, or its evidence is ambiguous. Vacuous success is a bug.
 * Exit codes: 0 = GREEN · 1 = spec/test gaps · 2 = invocation or infrastructure error.
 */
const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const DEFAULT_ID = '[A-Z]+-\\d+';
const SCENARIO_RE = /^####\s+Scenario:\s+(.*)$/gm;
// TAP result line, directive split off separately (# SKIP / # TODO)
const TAP_RE = /^(ok|not ok)\s+\d+\s+-\s+(.*)$/gm;

// Leading scenario/test ID. The match must end at a word boundary: `XX-01b` is NOT `XX-01` —
// silently truncating would merge two different scenarios into one binding.
function leadId(text, idRe) {
  const m = text.trim().match(idRe);
  if (!m || m.index !== 0) return null;
  const next = text.trim()[m[0].length];
  if (next !== undefined && /[A-Za-z0-9_]/.test(next)) return null;
  return m[0];
}

function stripFences(text) { return text.replace(/```[\s\S]*?```/g, ''); }

function mdFiles(target) {
  if (!fs.existsSync(target)) return [];
  const st = fs.statSync(target);
  if (st.isFile()) return [target];
  const out = [];
  for (const e of fs.readdirSync(target, { withFileTypes: true })) {
    const p = path.join(target, e.name);
    if (e.isDirectory()) out.push(...mdFiles(p));
    else if (e.name.endsWith('.md')) out.push(p);
  }
  return out.sort();
}

// Collect scenarios from spec files.
// → { byId, unidentified:[[file,title]], files, missingTargets:[], duplicates:[{id,files}] }
// Code-fence content is excluded: an example scenario inside ``` is documentation, not a spec.
function collectScenarios(specTargets, idRe) {
  const byId = new Map();          // id -> [titles]
  const idFiles = new Map();       // id -> [files] (for duplicate reporting)
  const unidentified = [];
  const missingTargets = specTargets.filter((t) => !fs.existsSync(t));
  const files = [...new Set(specTargets.flatMap(mdFiles))].sort();
  for (const f of files) {
    const text = stripFences(fs.readFileSync(f, 'utf8'));
    let m;
    SCENARIO_RE.lastIndex = 0;
    while ((m = SCENARIO_RE.exec(text)) !== null) {
      const id = leadId(m[1], idRe);
      if (id) {
        if (!byId.has(id)) { byId.set(id, []); idFiles.set(id, []); }
        byId.get(id).push(m[1]);
        idFiles.get(id).push(f);
      } else unidentified.push([f, m[1]]);
    }
  }
  const duplicates = [...byId.entries()].filter(([, titles]) => titles.length > 1)
    .map(([id]) => ({ id, files: [...new Set(idFiles.get(id))] }));
  return { byId, unidentified, files, missingTargets, duplicates };
}

// Parse TAP text → { results: Map<id,{pass,fail,skip}>, untagged: [], bailout: string|null }
// A # SKIP / # TODO directive is neither pass nor fail — a skipped test proves nothing.
function parseTap(out, idRe) {
  const results = new Map();
  const untagged = [];
  let untaggedFails = 0;
  const bm = out.match(/^Bail out!(.*)$/m);
  const bailout = bm ? bm[0].trim() : null;
  let m;
  TAP_RE.lastIndex = 0;
  while ((m = TAP_RE.exec(out)) !== null) {
    const hash = m[2].search(/#\s*(SKIP|TODO)\b/i);
    const name = hash >= 0 ? m[2].slice(0, hash).trim() : m[2];
    const directive = hash >= 0;
    const id = leadId(name, idRe);
    if (id === null) { untagged.push(name); if (m[1] === 'not ok' && !directive) untaggedFails++; continue; }
    const cur = results.get(id) || { pass: 0, fail: 0, skip: 0 };
    if (directive) cur.skip++;
    else cur[m[1] === 'ok' ? 'pass' : 'fail']++;
    results.set(id, cur);
  }
  return { results, untagged, untaggedFails, bailout };
}

// true when the test command produced output but not a single TAP result line was parsed —
// almost always means the runner used a human reporter (node: add --test-reporter=tap)
function zeroTapParsed(out, results, untagged) {
  if (results.size > 0 || untagged.length > 0) return false;
  if (!out.trim()) return false;
  // a TAP version line or plan (1..N) proves the reporter IS TAP — an empty suite is not a reporter problem
  if (/^TAP version \d+|^1\.\.\d+/m.test(out)) return false;
  return true;
}

function runTestCommand(cmd, cwd) {
  const r = spawnSync(cmd, { shell: true, cwd, encoding: 'utf8' });
  return {
    out: (r.stdout || '') + '\n' + (r.stderr || ''),
    status: r.status,               // null when killed by signal
    signal: r.signal || null,
    error: r.error ? String(r.error.message || r.error) : null,
  };
}

// Pure evaluation: cross-reference scenarios vs results → verdict object.
// A scenario whose only results are skips is UNBOUND — skips prove nothing.
function evaluate(byId, unidentified, results) {
  const specIds = [...byId.keys()].sort();
  const boundGreen = [], boundRed = [], unbound = [], orphan = [];
  for (const id of specIds) {
    const r = results.get(id);
    if (!r || (r.pass === 0 && r.fail === 0)) unbound.push(id);
    else if (r.fail === 0) boundGreen.push(id);
    else boundRed.push(id);
  }
  for (const id of [...results.keys()].sort()) if (!byId.has(id)) orphan.push(id);
  const clean = !boundRed.length && !unbound.length && !orphan.length && !unidentified.length;
  return { boundGreen, boundRed, unbound, orphan, unidentified, clean };
}

// Fail-closed guard: reasons this run cannot be trusted regardless of the TAP picture.
// Returns [] when the run is trustworthy.
function infraErrors(run) {
  const errs = [];
  for (const t of run.missingTargets) errs.push(`spec target does not exist: ${t}`);
  if (!run.missingTargets.length && run.fileCount === 0)
    errs.push('no spec files found under the given targets — nothing to verify');
  if (run.fileCount > 0 && run.scenarioCount === 0)
    errs.push('spec files contain zero scenarios — nothing to verify');
  if (run.exec.error) errs.push(`test command failed to spawn: ${run.exec.error}`);
  if (run.exec.signal) errs.push(`test command was killed by signal ${run.exec.signal}`);
  if (run.bailout) errs.push(`test run aborted: ${run.bailout}`);
  if (run.noTap)
    errs.push('test command produced output but ZERO TAP results were parsed — the command is probably not emitting TAP (node test runner: add --test-reporter=tap)');
  if (run.exec.status !== null && run.exec.status !== 0 && run.failCount === 0)
    errs.push(`test command exited with status ${run.exec.status} but no parsed TAP failure explains it — the TAP picture is incomplete or truncated; refusing to trust this run`);
  return errs;
}

function formatReport(v, results, fileCount, extras = {}) {
  const lines = [];
  const specCount = v.boundGreen.length + v.boundRed.length + v.unbound.length;
  const tagged = [...results.values()].reduce((s, r) => s + r.pass + r.fail, 0);
  const skipped = [...results.values()].reduce((s, r) => s + (r.skip || 0), 0);
  lines.push(`specs: ${fileCount} file(s), ${specCount} identified scenario(s)`);
  lines.push(`tests: ${tagged} tagged result(s)${skipped ? `, ${skipped} skipped (not counted)` : ''}\n`);
  const groups = [['BOUND-GREEN', v.boundGreen], ['BOUND-RED', v.boundRed],
                 ['UNBOUND (scenario, no test)', v.unbound], ['ORPHAN (test, no scenario)', v.orphan]];
  for (const [label, items] of groups) {
    if (!items.length) continue;
    lines.push(`${label === 'BOUND-GREEN' ? '✓' : '✗'} ${label}: ${items.length}`);
    for (const id of items) {
      const r = results.get(id);
      lines.push(`    ${id}${r ? `  ${r.pass}p/${r.fail}f${r.skip ? `/${r.skip}s` : ''}` : ''}`);
    }
  }
  if (v.unidentified.length) {
    lines.push(`✗ UNIDENTIFIED (scenario, no ID — unbindable): ${v.unidentified.length}`);
    for (const [f, t] of v.unidentified) lines.push(`    ${path.basename(f)}: ${t.slice(0, 60)}`);
  }
  if (extras.duplicates && extras.duplicates.length) {
    lines.push(`✗ DUPLICATE scenario IDs (ambiguous binding): ${extras.duplicates.length}`);
    for (const d of extras.duplicates) lines.push(`    ${d.id}: ${d.files.map((f) => path.basename(f)).join(', ')}`);
  }
  const errs = extras.errors || [];
  lines.push('\nRESULT: ' + (errs.length ? 'ERROR — run not trustworthy (see stderr)'
    : (v.clean && !(extras.duplicates || []).length ? 'GREEN — spec is the test suite' : 'GAPS')));
  return lines.join('\n');
}

// Full verify run. opts: { specs:[], testCmd, idPattern, cwd }
function verify(opts) {
  const idRe = new RegExp(opts.idPattern || DEFAULT_ID);
  const { byId, unidentified, files, missingTargets, duplicates } = collectScenarios(opts.specs, idRe);
  const exec = runTestCommand(opts.testCmd, opts.cwd || '.');
  const { results, untagged, untaggedFails, bailout } = parseTap(exec.out, idRe);
  const verdict = evaluate(byId, unidentified, results);
  const failCount = [...results.values()].reduce((s, r) => s + r.fail, 0) + untaggedFails;
  const run = {
    verdict, results, fileCount: files.length, failCount,
    scenarioCount: byId.size + unidentified.length,
    missingTargets, duplicates, bailout,
    noTap: zeroTapParsed(exec.out, results, untagged),
    exec: { status: exec.status, signal: exec.signal, error: exec.error },
  };
  run.errors = infraErrors(run);
  return run;
}

// machine-consumable shape for a verify run
function verifyJson(run) {
  const { verdict: v, results } = run;
  const clean = v.clean && run.duplicates.length === 0 && run.errors.length === 0;
  return {
    clean,
    result: run.errors.length ? 'ERROR' : (clean ? 'GREEN' : 'GAPS'),
    errors: run.errors,
    specFiles: run.fileCount,
    exec: run.exec,
    duplicates: run.duplicates,
    boundGreen: v.boundGreen.map((id) => ({ id, ...results.get(id) })),
    boundRed: v.boundRed.map((id) => ({ id, ...results.get(id) })),
    unbound: v.unbound,
    orphan: v.orphan.map((id) => ({ id, ...results.get(id) })),
    unidentified: v.unidentified.map(([file, title]) => ({ file, title })),
  };
}

// Fallback test command from apriori/process-config.md's `test-cmd` row (written by init --test-cmd)
function configTestCmd(cwd) {
  const p = path.join(cwd || '.', 'apriori', 'process-config.md');
  if (!fs.existsSync(p)) return null;
  const m = fs.readFileSync(p, 'utf8').match(/^\|\s*test-cmd\s*\|\s*(.+?)\s*\|/m);
  return m ? m[1] : null;
}

function cli(argv) {
  const a = { specs: [], testCmd: null, idPattern: DEFAULT_ID, cwd: '.', json: false };
  for (let i = 0; i < argv.length; i++) {
    const k = argv[i];
    if (k === '--specs') while (argv[i + 1] && !argv[i + 1].startsWith('--')) a.specs.push(argv[++i]);
    else if (k === '--test-cmd') a.testCmd = argv[++i];
    else if (k === '--id-pattern') a.idPattern = argv[++i];
    else if (k === '--cwd') a.cwd = argv[++i];
    else if (k === '--json') a.json = true;
  }
  if (!a.testCmd) a.testCmd = configTestCmd(a.cwd);   // init --test-cmd persists it there
  if (!a.specs.length || !a.testCmd) { console.error('usage: apriori verify --specs <dir...> --test-cmd "<cmd>" [--id-pattern <re>] [--cwd <dir>] [--json]\n(--test-cmd may be omitted when apriori/process-config.md has a test-cmd row)'); return 2; }
  const run = verify(a);
  if (run.errors.length && !a.json)
    for (const e of run.errors) console.error('error: ' + e);
  console.log(a.json ? JSON.stringify(verifyJson(run), null, 2)
                     : formatReport(run.verdict, run.results, run.fileCount, { duplicates: run.duplicates, errors: run.errors }));
  if (run.errors.length) return 2;
  return run.verdict.clean && run.duplicates.length === 0 ? 0 : 1;
}

module.exports = { leadId, stripFences, collectScenarios, parseTap, zeroTapParsed, runTestCommand,
  evaluate, infraErrors, formatReport, verifyJson, verify, configTestCmd, cli, DEFAULT_ID };
