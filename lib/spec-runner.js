'use strict';
/*
 * spec-runner — bind spec scenario IDs to test runs, report per-scenario red/green.
 * VISION endgame, weak form: "spec IS the test suite". Zero deps — pure Node stdlib.
 * Coupling surface is tiny and language-agnostic: markdown scenarios + a TAP-emitting test command.
 */
const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const DEFAULT_ID = '[A-Z]+-\\d+';
const SCENARIO_RE = /^####\s+Scenario:\s+(.*)$/gm;
const TAP_RE = /^(ok|not ok)\s+\d+\s+-\s+(.*)$/gm;

function leadId(text, idRe) {
  const m = text.trim().match(idRe);
  return m && m.index === 0 ? m[0] : null;
}

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

// Collect scenarios from spec files → { byId: Map<id,[titles]>, unidentified: [[file,title]], files }
function collectScenarios(specTargets, idRe) {
  const byId = new Map();
  const unidentified = [];
  const files = [...new Set(specTargets.flatMap(mdFiles))].sort();
  for (const f of files) {
    const text = fs.readFileSync(f, 'utf8');
    let m;
    SCENARIO_RE.lastIndex = 0;
    while ((m = SCENARIO_RE.exec(text)) !== null) {
      const id = leadId(m[1], idRe);
      if (id) { if (!byId.has(id)) byId.set(id, []); byId.get(id).push(m[1]); }
      else unidentified.push([f, m[1]]);
    }
  }
  return { byId, unidentified, files };
}

// Parse TAP text → { results: Map<id,{pass,fail}>, untagged: [] }
function parseTap(out, idRe) {
  const results = new Map();
  const untagged = [];
  let m;
  TAP_RE.lastIndex = 0;
  while ((m = TAP_RE.exec(out)) !== null) {
    const id = leadId(m[2], idRe);
    if (id === null) { untagged.push(m[2]); continue; }
    const cur = results.get(id) || { pass: 0, fail: 0 };
    cur[m[1] === 'ok' ? 'pass' : 'fail']++;
    results.set(id, cur);
  }
  return { results, untagged };
}

function runTestCommand(cmd, cwd) {
  const r = spawnSync(cmd, { shell: true, cwd, encoding: 'utf8' });
  return (r.stdout || '') + '\n' + (r.stderr || '');
}

// Pure evaluation: cross-reference scenarios vs results → verdict object
function evaluate(byId, unidentified, results) {
  const specIds = [...byId.keys()].sort();
  const boundGreen = [], boundRed = [], unbound = [], orphan = [];
  for (const id of specIds) {
    const r = results.get(id);
    if (!r) unbound.push(id);
    else if (r.fail === 0) boundGreen.push(id);
    else boundRed.push(id);
  }
  for (const id of [...results.keys()].sort()) if (!byId.has(id)) orphan.push(id);
  const clean = !boundRed.length && !unbound.length && !orphan.length && !unidentified.length;
  return { boundGreen, boundRed, unbound, orphan, unidentified, clean };
}

function formatReport(v, results, fileCount) {
  const lines = [];
  const specCount = v.boundGreen.length + v.boundRed.length + v.unbound.length;
  const tagged = [...results.values()].reduce((s, r) => s + r.pass + r.fail, 0);
  lines.push(`specs: ${fileCount} file(s), ${specCount} identified scenario(s)`);
  lines.push(`tests: ${tagged} tagged result(s)\n`);
  const groups = [['BOUND-GREEN', v.boundGreen], ['BOUND-RED', v.boundRed],
                 ['UNBOUND (scenario, no test)', v.unbound], ['ORPHAN (test, no scenario)', v.orphan]];
  for (const [label, items] of groups) {
    if (!items.length) continue;
    lines.push(`${label === 'BOUND-GREEN' ? '✓' : '✗'} ${label}: ${items.length}`);
    for (const id of items) {
      const r = results.get(id);
      lines.push(`    ${id}${r ? `  ${r.pass}p/${r.fail}f` : ''}`);
    }
  }
  if (v.unidentified.length) {
    lines.push(`✗ UNIDENTIFIED (scenario, no ID — unbindable): ${v.unidentified.length}`);
    for (const [f, t] of v.unidentified) lines.push(`    ${path.basename(f)}: ${t.slice(0, 60)}`);
  }
  lines.push('\nRESULT: ' + (v.clean ? 'GREEN — spec is the test suite' : 'GAPS'));
  return lines.join('\n');
}

// Full verify run. opts: { specs:[], testCmd, idPattern, cwd }
function verify(opts) {
  const idRe = new RegExp(opts.idPattern || DEFAULT_ID);
  const { byId, unidentified, files } = collectScenarios(opts.specs, idRe);
  const out = runTestCommand(opts.testCmd, opts.cwd || '.');
  const { results } = parseTap(out, idRe);
  const verdict = evaluate(byId, unidentified, results);
  return { verdict, results, fileCount: files.length };
}

// machine-consumable shape for a verify run
function verifyJson(verdict, results, fileCount) {
  return {
    clean: verdict.clean,
    result: verdict.clean ? 'GREEN' : 'GAPS',
    specFiles: fileCount,
    boundGreen: verdict.boundGreen.map((id) => ({ id, ...results.get(id) })),
    boundRed: verdict.boundRed.map((id) => ({ id, ...results.get(id) })),
    unbound: verdict.unbound,
    orphan: verdict.orphan.map((id) => ({ id, ...results.get(id) })),
    unidentified: verdict.unidentified.map(([file, title]) => ({ file, title })),
  };
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
  if (!a.specs.length || !a.testCmd) { console.error('usage: apriori verify --specs <dir...> --test-cmd "<cmd>" [--id-pattern <re>] [--cwd <dir>] [--json]'); return 2; }
  const { verdict, results, fileCount } = verify(a);
  console.log(a.json ? JSON.stringify(verifyJson(verdict, results, fileCount), null, 2)
                     : formatReport(verdict, results, fileCount));
  return verdict.clean ? 0 : 1;
}

module.exports = { leadId, collectScenarios, parseTap, evaluate, formatReport, verifyJson, verify, cli, DEFAULT_ID };
