#!/usr/bin/env node
// golden-path — prove the README Quickstart end-to-end, exactly as documented (GP-01..05).
// The expected per-block exit sequence lives HERE, beside the contract it enforces:
// README "## Quickstart", its ```shell blocks in order — install/doctor 0, red verify 1,
// green verify 0, gate→check 0. Drift between README and this sequence FAILS the run (GP-04).
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

export const EXPECTS = [0, 1, 0, 0];

// GP-01: pure text seam — never touches the filesystem
export function extractBlocks(readmeText) {
  // fence-aware: heading-looking lines INSIDE ```shell blocks (heredoc'd delta specs) must not
  // terminate the Quickstart section
  const lines = readmeText.split('\n');
  const sectionLines = [];
  let inSection = false, inFence = false;
  for (const ln of lines) {
    if (ln.startsWith('```')) inFence = !inFence;
    if (!inFence && ln.startsWith('## ') && !ln.startsWith('### ')) {
      if (inSection) break;
      inSection = ln.trim() === '## Quickstart';
      continue;
    }
    if (inSection) sectionLines.push(ln);
  }
  if (!inSection && sectionLines.length === 0) throw new Error('no "## Quickstart" section in the given README text');
  const section = sectionLines.join('\n');
  return [...section.matchAll(/```shell\n([\s\S]*?)```/g)].map((m) => m[1]);
}

// GP-02/05: assemble the walk. One resolver rule: binDir is prepended to PATH and that same
// env drives the block walk AND every final assertion (never a bash function, never a global).
export function buildPlan(blocks, mode, opts = {}) {
  if (blocks.length !== EXPECTS.length)
    throw new Error(`README drift: ${blocks.length} shell block(s) in Quickstart, contract expects ${EXPECTS.length}`);
  const lines = ['#!/bin/bash', '# assembled by golden-path.mjs — runs WITHOUT set -e: documented reds must not abort the walk'];
  // bash-native binDir normalization + preflight (GPSPEC-4): cd&&pwd yields the same form command -v returns
  lines.push(`BD="$(cd "${opts.binDir.replace(/\\/g, '/')}" && pwd)"`);
  lines.push('case "$(command -v apriori)" in "$BD"/*) ;; *) echo "PREFLIGHT: apriori resolves outside $BD: $(command -v apriori)"; exit 90;; esac');
  blocks.forEach((block, i) => {
    let body = block.trimEnd();
    if (i === 0) {
      body = body.split('\n').map((ln) => {
        if (!ln.startsWith('npm i -g apriori-cli')) return ln;
        return mode === 'packed'
          ? `npm i -g "${opts.tgz.replace(/\\/g, '/')}" --prefix "${opts.prefix.replace(/\\/g, '/')}"`
          : 'true # local mode: checkout bin shimmed onto PATH';
      }).join('\n');
    }
    lines.push(`# ---- block ${i + 1} ----`);
    lines.push(body);
    lines.push(`echo "__BLOCK_${i + 1}_EXIT=$?"`);
  });
  return { script: lines.join('\n') + '\n', expects: EXPECTS };
}

function fail(msg) { console.error('golden-path: ' + msg); process.exit(1); }

// the sentinel comparison as a pure seam (GP-04 asserts its message directly)
export function assertSentinels(stdout, expects) {
  for (let i = 0; i < expects.length; i++) {
    const m = (stdout || '').match(new RegExp(`__BLOCK_${i + 1}_EXIT=(\\d+)`));
    if (!m) throw new Error(`block ${i + 1}: no exit sentinel — the walk died inside or before this block`);
    if (Number(m[1]) !== expects[i]) throw new Error(`block ${i + 1}: exit ${m[1]}, contract expects ${expects[i]}`);
  }
}

export function main(argv) {
  const mode = argv.includes('--packed') ? 'packed' : (argv.includes('--local') ? 'local' : null);
  if (!mode) fail('usage: golden-path.mjs --local | --packed <tgz>');
  const here = path.dirname(fileURLToPath(import.meta.url));
  const checkout = path.join(here, '..');
  const work = fs.mkdtempSync(path.join(os.tmpdir(), 'apriori-golden-'));
  let binDir, tgz = null, prefix = null;
  if (mode === 'local') {
    binDir = path.join(work, 'shim-bin');
    fs.mkdirSync(binDir, { recursive: true });
    const shim = path.join(binDir, 'apriori');
    fs.writeFileSync(shim, `#!/bin/sh\nexec node "${path.join(checkout, 'bin', 'apriori.js').replace(/\\/g, '/')}" "$@"\n`);
    fs.chmodSync(shim, 0o755);
  } else {
    tgz = path.resolve(argv[argv.indexOf('--packed') + 1] || '');
    if (!fs.existsSync(tgz)) fail(`tarball not found: ${tgz}`);
    prefix = path.join(work, 'prefix');
    fs.mkdirSync(prefix, { recursive: true });
    binDir = process.platform === 'win32' ? prefix : path.join(prefix, 'bin');
    // install BEFORE the walk so the preflight can resolve inside the prefix
    const inst = spawnSync('npm', ['i', '-g', tgz, '--prefix', prefix], { encoding: 'utf8', shell: process.platform === 'win32' });
    if (inst.status !== 0) fail(`npm i -g failed: ${inst.stderr}`);
  }
  const env = { ...process.env, PATH: binDir + path.delimiter + process.env.PATH };
  // sanitize test-runner inheritance: a nested `node --test` inside the walk must behave like a
  // fresh invocation, not like a child of THIS process's test run
  delete env.NODE_TEST_CONTEXT;
  delete env.NODE_OPTIONS;
  const readme = fs.readFileSync(path.join(checkout, 'README.md'), 'utf8');
  const { script, expects } = buildPlan(extractBlocks(readme), mode, { binDir, tgz, prefix });
  const scriptPath = path.join(work, 'walk.sh');
  fs.writeFileSync(scriptPath, script);
  const run = spawnSync('bash', [scriptPath], { cwd: work, env, encoding: 'utf8' });
  process.stdout.write(run.stdout || '');
  process.stderr.write(run.stderr || '');
  // parse sentinels — a missing one means the script itself died (named)
  try { assertSentinels(run.stdout, expects); } catch (e) { fail(e.message); }
  // GP-03: final state, asserted through the SAME medium and env as the walk
  const demo = path.join(work, 'hello-apriori');
  const assertCmd = (label, cmd, expect = 0) => {
    const r = spawnSync('bash', ['-c', cmd], { cwd: demo, env, encoding: 'utf8' });
    if (r.status !== expect) fail(`final-state ${label}: exit ${r.status}, expected ${expect}\n${r.stdout}${r.stderr}`);
  };
  assertCmd('store verify', 'apriori verify --specs apriori/specs');
  assertCmd('check', 'apriori check');
  assertCmd('doctor', 'apriori doctor --no-run');
  const archiveDir = path.join(demo, 'apriori', 'changes', 'archive');
  const archived = fs.existsSync(archiveDir) && fs.readdirSync(archiveDir).some((b) => b.endsWith('-hello'));
  if (!archived) fail('final-state: archived demo change not found under apriori/changes/archive/');
  console.log(`golden-path: OK (${mode}) — ${expects.length} blocks, exits [${expects.join(', ')}], final state green`);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main(process.argv.slice(2));
