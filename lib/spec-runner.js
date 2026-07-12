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
// merge-family helpers shared with archive (3.1 projection); archive-merge never requires spec-runner
const am = require('./archive-merge');
const { withStrict } = require('./args');

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

// Shared scenario scan over one text. Fenced content is documentation; scenarios inside
// DEPRECATED requirement blocks (the marker REMOVED injects) are excluded in every form —
// they are neither demanded nor listed, and their lingering tests become ORPHAN.
function scanText(text, label, idRe, acc) {
  const clean = am.stripDeprecatedBlocks(stripFences(text));
  let m;
  SCENARIO_RE.lastIndex = 0;
  while ((m = SCENARIO_RE.exec(clean)) !== null) {
    const id = leadId(m[1], idRe);
    if (id) {
      if (!acc.byId.has(id)) { acc.byId.set(id, []); acc.idFiles.set(id, []); }
      acc.byId.get(id).push(m[1]);
      acc.idFiles.get(id).push(label);
    } else acc.unidentified.push([label, m[1]]);
  }
}

function dupsOf(acc) {
  return [...acc.byId.entries()].filter(([, titles]) => titles.length > 1)
    .map(([id]) => ({ id, files: [...new Set(acc.idFiles.get(id))] }));
}

// Collect scenarios from spec files.
// → { byId, unidentified:[[file,title]], files, missingTargets:[], duplicates:[{id,files}] }
function collectScenarios(specTargets, idRe) {
  const acc = { byId: new Map(), idFiles: new Map(), unidentified: [] };
  const missingTargets = specTargets.filter((t) => !fs.existsSync(t));
  const files = [...new Set(specTargets.flatMap(mdFiles))].sort();
  for (const f of files) scanText(fs.readFileSync(f, 'utf8'), f, idRe, acc);
  return { byId: acc.byId, unidentified: acc.unidentified, files, missingTargets, duplicates: dupsOf(acc) };
}

// Same collection over in-memory texts (the projection path) — label = store-relative suffix.
function collectScenariosFromTexts(texts, idRe) {
  const acc = { byId: new Map(), idFiles: new Map(), unidentified: [] };
  for (const [label, text] of texts) scanText(text, label, idRe, acc);
  return { byId: acc.byId, unidentified: acc.unidentified, files: [...texts.keys()], missingTargets: [], duplicates: dupsOf(acc) };
}

// ---- TAP lexer (tap-contract): TAP is a version-aware protocol, not a pile of regexes ----
const PLAN_LINE_RE = /^1\.\.(\d+)\s*(?:#.*)?$/;
const POINT_LINE_RE = /^(?:ok|not ok)(?:\s|$)/;
const POINT_NUM_RE = /^(?:ok|not ok)\s+(\d+)(?:\s|$)/;   // complete numeric token only — `ok 1abc` stays unnumbered
const SUPPORTED_TAP_VERSIONS = new Set([12, 13, 14]);

// split at the first UNESCAPED '#' (backslash escapes the next char); decode \\ and \# in the
// description ONLY (other backslash pairs stay literal) — so \# is never a directive delimiter
function splitDirective(rest) {
  let desc = '', directive = null;
  for (let i = 0; i < rest.length; i++) {
    const c = rest[i];
    if (c === '\\' && i + 1 < rest.length) { desc += c + rest[i + 1]; i++; continue; }
    if (c === '#') { directive = rest.slice(i + 1); break; }
    desc += c;
  }
  const isSkipTodo = directive !== null && /^\s*(skip|todo)/i.test(directive);
  const decoded = desc.replace(/\\([\\#])/g, '$1').trim();
  return { desc: decoded, isSkipTodo };
}

// does a text carry TAP-shaped tokens? (misrouted-channel detection — bail-out included)
function looksLikeTap(text) {
  return /^(?:TAP version |(?:not )?ok\b|1\.\.\d)/m.test(text || '') || /^\s*bail out!/im.test(text || '');
}

// Lex normalized stdout into typed top-level tokens. Line endings normalize first
// (CRLF and lone-CR both end a line — a failure never hides behind a line-ending style).
function lexTap(stdout) {
  const lines = stdout.replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n');
  const tokens = [], problems = [];
  let yamlOpen = -1;
  for (let idx = 0; idx < lines.length; idx++) {
    const line = lines[idx], n = idx + 1;
    if (yamlOpen >= 0) {                                   // inside a top-level YAML block: opaque
      if (line === '...') yamlOpen = -1;
      continue;
    }
    if (/^\s*bail out!/i.test(line) && line.trim()) {      // case-insensitive, indentation-blind
      tokens.push({ kind: 'bailout', line: line.trim(), n }); continue;
    }
    if (/^\s/.test(line)) continue;                        // indented = nested subtest detail
    if (line === '---') { yamlOpen = n; continue; }
    if (line.startsWith('TAP version ')) {
      const m = /^TAP version (\d+)$/.exec(line);
      tokens.push({ kind: 'version', num: m ? Number(m[1]) : null, raw: line, n }); continue;
    }
    let m;
    if ((m = PLAN_LINE_RE.exec(line))) { tokens.push({ kind: 'plan', total: Number(m[1]), n }); continue; }
    if (/^pragma [+-]\w+$/.test(line)) continue;           // the ONLY ignored TAP-14 construct
    if (POINT_LINE_RE.test(line)) {
      const fail = line.startsWith('not ok');
      const nm = POINT_NUM_RE.exec(line);
      let rest = line.slice(fail ? 'not ok'.length : 'ok'.length);
      if (nm) rest = rest.replace(/^\s+\d+/, '');
      rest = rest.replace(/^\s+/, '');
      const { desc, isSkipTodo } = splitDirective(rest);
      const description = desc.replace(/^-\s+/, '');       // the dash separator is optional (TAP)
      tokens.push({ kind: 'point', fail, num: nm ? Number(nm[1]) : null, description, isSkipTodo, line, n });
      continue;
    }
    // anything else at column 0 is diagnostics (comments, prose) — including `ok:`-style prefixes
  }
  if (yamlOpen >= 0) problems.push(`unterminated YAML diagnostic block opened at line ${yamlOpen} — a stray --- must not swallow the rest of the stream`);
  return { tokens, problems };
}

// Parse TAP stdout → { results, untagged, untaggedFails, unattributedFailures, bailout,
//                      plans, points, dupNumbers, tapProblems }
// A # SKIP / # TODO directive is neither pass nor fail — a skipped test proves nothing.
function parseTap(out, idRe) {
  const results = new Map();
  const untagged = [];
  const unattributedFailures = [];
  const { tokens, problems } = lexTap(out);
  const tapProblems = [...problems];

  // version discipline: at most one, leading, exact digits, inside the closed matrix
  const versions = tokens.filter((t) => t.kind === 'version');
  const firstBody = tokens.find((t) => t.kind !== 'version');
  if (versions.length > 1) tapProblems.push('multiple TAP version lines — one version promise per stream');
  for (const v of versions) {
    if (v.num === null) { tapProblems.push(`unparsable TAP version line at line ${v.n}: ${v.raw}`); continue; }
    if (!SUPPORTED_TAP_VERSIONS.has(v.num)) tapProblems.push(`TAP version ${v.num} is not supported (supported: 12, 13, 14, or no version line)`);
    if (firstBody && v.n > firstBody.n) tapProblems.push(`TAP version line at line ${v.n} arrives after the stream began — the version must lead`);
  }

  const bail = tokens.find((t) => t.kind === 'bailout');
  const bailout = bail ? bail.line : null;

  const pts = tokens.filter((t) => t.kind === 'point');
  const plans = tokens.filter((t) => t.kind === 'plan');
  if (plans.length === 1) {
    const plan = plans[0];
    if (pts.some((p) => p.n < plan.n) && pts.some((p) => p.n > plan.n))
      tapProblems.push(`TAP plan at line ${plan.n} sits mid-stream (points before and after) — a plan promises the whole stream`);
    for (const p of pts) if (p.num !== null && (p.num < 1 || p.num > plan.total))
      tapProblems.push(`test point number ${p.num} is outside the plan range 1..${plan.total}`);
  }
  const numSeen = new Set(), dupSet = new Set();
  for (const p of pts) if (p.num !== null) { if (numSeen.has(p.num)) dupSet.add(p.num); else numSeen.add(p.num); }
  const dupNumbers = [...dupSet].sort((a, b) => a - b);

  for (const p of pts) {
    const id = leadId(p.description, idRe);
    if (id !== null) {
      const cur = results.get(id) || { pass: 0, fail: 0, skip: 0 };
      if (p.isSkipTodo) cur.skip++;
      else cur[p.fail ? 'fail' : 'pass']++;
      results.set(id, cur);
    } else if (p.fail && !p.isSkipTodo) {
      unattributedFailures.push(p.line);
    } else {
      untagged.push(p.description);
    }
  }
  const untaggedFails = unattributedFailures.length;        // kept exported and compatible — doctor consumes it
  return { results, untagged, untaggedFails, unattributedFailures, bailout,
    plans: plans.map((p) => p.total), points: pts.length, dupNumbers, tapProblems };
}

// true when the test command produced output but not a single TAP result line was parsed —
// almost always means the runner used a human reporter (node: add --test-reporter=tap)
function zeroTapParsed(out, results, untagged, unattributedFailures = []) {
  if (results.size > 0 || untagged.length > 0 || unattributedFailures.length > 0) return false;
  if (!out.trim()) return false;
  // a TAP version line or plan (1..N) proves the reporter IS TAP — an empty suite is not a reporter problem
  if (/^TAP version \d+|^1\.\.\d+/m.test(out)) return false;
  return true;
}

function runTestCommand(cmd, cwd) {
  const r = spawnSync(cmd, { shell: true, cwd, encoding: 'utf8' });
  return {
    out: r.stdout || '',            // TAP parses from stdout ONLY (tap-contract)
    stderr: r.stderr || '',         // a separate diagnostics channel, reported verbatim
    status: r.status,               // null when killed by signal
    signal: r.signal || null,
    error: r.error ? String(r.error.message || r.error) : null,
  };
}

// Pure evaluation: cross-reference scenarios vs results → verdict object.
// A scenario whose only results are skips is UNBOUND — skips prove nothing.
function evaluate(byId, unidentified, results, unattributedFailures = []) {
  const specIds = [...byId.keys()].sort();
  const boundGreen = [], boundRed = [], unbound = [], orphan = [];
  for (const id of specIds) {
    const r = results.get(id);
    if (!r || (r.pass === 0 && r.fail === 0)) unbound.push(id);
    else if (r.fail === 0) boundGreen.push(id);
    else boundRed.push(id);
  }
  for (const id of [...results.keys()].sort()) if (!byId.has(id)) orphan.push(id);
  const unattributed = unattributedFailures;
  const clean = !boundRed.length && !unbound.length && !orphan.length && !unidentified.length && !unattributed.length;
  return { boundGreen, boundRed, unbound, orphan, unidentified, unattributed, clean };
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
  for (const p of run.tapProblems || []) errs.push(`TAP protocol: ${p}`);
  if (run.noTap)
    errs.push('test command produced output but ZERO TAP results were parsed on stdout — the command is probably not emitting TAP (node test runner: add --test-reporter=tap; TAP on stderr: append 2>&1)');
  // the TAP plan is a checked promise — defensive defaults keep legacy run shapes
  // (direct callers of this exported helper) valid; only verify-created runs carry the fields
  const plans = run.plans || [], points = run.points || 0, dupNumbers = run.dupNumbers || [];
  if (plans.length > 1)
    errs.push(`multiple TAP plans in one run (${plans.map((n) => `1..${n}`).join(', ')}) — cannot attribute test points to plans; run one TAP stream per verify (split the test command)`);
  else if (plans.length === 1 && plans[0] !== points)
    errs.push(`TAP plan declares ${plans[0]} test point(s) but ${points} were parsed — output truncated or garbled; refusing to trust this run`);
  else if (plans.length === 1 && dupNumbers.length)
    errs.push(`duplicate TAP test-point number(s): ${dupNumbers.join(', ')}`);
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
  if (v.unattributed && v.unattributed.length) {
    lines.push(`✗ UNATTRIBUTED FAILURES (not ok without a scenario ID): ${v.unattributed.length}`);
    for (const raw of v.unattributed.slice(0, 20))
      lines.push(`    ${raw.length > 120 ? raw.slice(0, 119) + '…' : raw}`);
    if (v.unattributed.length > 20) lines.push(`    … and ${v.unattributed.length - 20} more`);
  }
  if (v.unidentified.length) {
    lines.push(`✗ UNIDENTIFIED (scenario, no ID — unbindable): ${v.unidentified.length}`);
    for (const [f, t] of v.unidentified) lines.push(`    ${path.basename(f)}: ${t.slice(0, 60)}`);
  }
  if (extras.duplicates && extras.duplicates.length) {
    lines.push(`✗ DUPLICATE scenario IDs (ambiguous binding): ${extras.duplicates.length}`);
    for (const d of extras.duplicates) lines.push(`    ${d.id}: ${d.files.map((f) => path.basename(f)).join(', ')}`);
  }
  if (extras.stderr && extras.stderr.trim()) {
    const sl = extras.stderr.replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n').filter((l) => l.length);
    lines.push(`— STDERR DIAGNOSTICS (not TAP): ${sl.length} line(s)`);
    for (const raw of sl.slice(0, 20)) lines.push(`    ${raw.length > 120 ? raw.slice(0, 119) + '…' : raw}`);
    if (sl.length > 20) lines.push(`    … and ${sl.length - 20} more`);
  }
  const errs = extras.errors || [];
  lines.push('\nRESULT: ' + (errs.length ? 'ERROR — run not trustworthy (see stderr)'
    : (v.clean && !(extras.duplicates || []).length ? 'GREEN — spec is the test suite' : 'GAPS')));
  return lines.join('\n');
}

// Projection inputs for `verify --change` (all failure classes → run.errors, exit 2).
// Roots resolve against cwd exactly as `apriori status` resolves change dirs.
function buildChangeProjection(change, cwd) {
  const changesDir = path.resolve(cwd, 'apriori', 'changes');
  const storeRoot = path.resolve(cwd, 'apriori', 'specs');
  const projection = { change, modules: [], conflicts: [], unstampedMutations: [] };
  const d = am.discoverDeltas(changesDir, change);
  if (d.errors.length) return { projection, errors: d.errors, texts: null };
  const p = am.buildProjection(storeRoot, d.files, change);
  projection.modules = p.modules;
  projection.conflicts = p.conflicts;
  projection.unstampedMutations = p.unstampedMutations;      // WARN grade — cli prints, verdict untouched
  projection.notes = p.notes;
  const errors = [...p.validation, ...p.hygiene, ...p.casMismatches];
  if (p.conflicts.length) errors.push(`projection has ${p.conflicts.length} merge conflict(s) — no trustworthy projection: ${p.conflicts.join('; ')}`);
  return { projection, errors, texts: errors.length ? null : p.texts };
}

// Full verify run. opts: { specs:[], change, testCmd, idPattern, cwd }
function verify(opts) {
  const idRe = new RegExp(opts.idPattern || DEFAULT_ID);
  let collected, projection = null;
  if (opts.change) {
    const b = buildChangeProjection(opts.change, opts.cwd || '.');
    projection = b.projection;
    if (!b.texts) {
      // failed projection: fail closed WITHOUT running any tests
      const verdict = evaluate(new Map(), [], new Map(), []);
      return { verdict, results: new Map(), fileCount: 0, failCount: 0, scenarioCount: 0,
        missingTargets: [], duplicates: [], bailout: null, noTap: false, tapProblems: [], stderr: '',
        exec: { status: null, signal: null, error: null }, errors: b.errors, projection };
    }
    collected = collectScenariosFromTexts(b.texts, idRe);
  } else {
    collected = collectScenarios(opts.specs, idRe);
  }
  const { byId, unidentified, files, missingTargets, duplicates } = collected;
  const exec = runTestCommand(opts.testCmd, opts.cwd || '.');
  const { results, untagged, untaggedFails, unattributedFailures, bailout, plans, points, dupNumbers, tapProblems } = parseTap(exec.out, idRe);
  const verdict = evaluate(byId, unidentified, results, unattributedFailures);
  const failCount = [...results.values()].reduce((s, r) => s + r.fail, 0) + untaggedFails;
  const run = {
    verdict, results, fileCount: files.length, failCount,
    scenarioCount: byId.size + unidentified.length,
    missingTargets, duplicates, bailout, plans, points, dupNumbers,
    noTap: zeroTapParsed(exec.out, results, untagged, unattributedFailures)
      || (!exec.out.trim() && looksLikeTap(exec.stderr)),  // TAP went to stderr — same zero-TAP cure (2>&1)
    tapProblems,
    stderr: exec.stderr || '',
    exec: { status: exec.status, signal: exec.signal, error: exec.error },
  };
  if (projection) run.projection = projection;
  run.errors = infraErrors(run);
  return run;
}

// machine-consumable shape for a verify run
function verifyJson(run) {
  const { verdict: v, results } = run;
  const clean = v.clean && run.duplicates.length === 0 && run.errors.length === 0;
  const json = projectionless(run, clean);
  if (run.projection) json.projection = run.projection;   // ONLY --change runs carry this field
  return json;
}

function projectionless(run, clean) {
  const { verdict: v, results } = run;
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
    unattributedFailures: { count: (v.unattributed || []).length, lines: v.unattributed || [] },
    stderr: run.stderr || '',
  };
}

// Fallback test command from apriori/process-config.md's `test-cmd` row (written by init --test-cmd)
function configTestCmd(cwd) {
  const { value, problem } = require('./config').getConfig(cwd, 'test-cmd');
  if (problem) return { error: problem };
  return value;
}

const USAGE = 'usage: apriori verify --specs <dir...> --test-cmd "<cmd>" [--id-pattern <re>] [--cwd <dir>] [--json]\n   or: apriori verify --change <name> --test-cmd "<cmd>" [--id-pattern <re>] [--cwd <dir>] [--json]\n(--test-cmd may be omitted when apriori/process-config.md has a test-cmd row)';

function cli(argv) {
  return withStrict(argv, { sub: 'verify', usage: USAGE, positionals: 0,
    flags: { '--specs': 'multi', '--change': 'value', '--test-cmd': 'value', '--id-pattern': 'value', '--cwd': 'value', '--json': 'flag' } }, (f) => {
    const a = { specs: f['--specs'] || [], change: f['--change'] || null, testCmd: f['--test-cmd'] || null,
      idPattern: f['--id-pattern'] || DEFAULT_ID, cwd: f['--cwd'] || '.', json: !!f['--json'] };
    if (a.change && a.specs.length) {
      console.error('verify: --specs cannot be combined with --change — the projection defines the spec set');
      return 2;
    }
    if (!a.testCmd) {
      const c = configTestCmd(a.cwd);                    // init --test-cmd persists it there
      if (c && c.error) { console.error(`verify: ${c.error}`); return 2; }
      a.testCmd = c;
    }
    if ((!a.specs.length && !a.change) || !a.testCmd) { console.error(USAGE); return 2; }
    const run = verify(a);
    if (run.projection)
      for (const sfx of run.projection.unstampedMutations || []) console.error('warning: ' + am.unstampedWarning(sfx));
    if (run.errors.length && !a.json)
      for (const e of run.errors) console.error('error: ' + e);
    console.log(a.json ? JSON.stringify(verifyJson(run), null, 2)
                       : formatReport(run.verdict, run.results, run.fileCount, { duplicates: run.duplicates, errors: run.errors, stderr: run.stderr }));
    if (run.errors.length) return 2;
    return run.verdict.clean && run.duplicates.length === 0 ? 0 : 1;
  });
}

module.exports = { leadId, stripFences, collectScenarios, collectScenariosFromTexts, parseTap, looksLikeTap,
  zeroTapParsed, runTestCommand, evaluate, infraErrors, formatReport, verifyJson, verify,
  configTestCmd, cli, DEFAULT_ID };
