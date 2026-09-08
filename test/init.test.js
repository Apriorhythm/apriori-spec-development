'use strict';
const { test } = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const init = require('../lib/init');

function tmp() { return fs.mkdtempSync(path.join(os.tmpdir(), 'apriori-in-')); }
function read(root, rel) { return fs.readFileSync(path.join(root, rel), 'utf8'); }

test('IN-01 detects present tools (they feed the missing --tools guidance and doctor D4)', () => {
  const root = tmp();
  fs.writeFileSync(path.join(root, 'CLAUDE.md'), 'x');
  fs.mkdirSync(path.join(root, '.cursor'));
  const d = init.detectTools(root);
  assert.ok(d.includes('claude') && d.includes('cursor'));
  assert.ok(!d.includes('windsurf'));
});

test('IN-02 the tool universe is the six supported tools', () => {
  assert.deepStrictEqual(Object.keys(init.TOOLS).sort(),
    ['claude', 'codex', 'copilot', 'cursor', 'opencode', 'windsurf'].sort());
});

test('IN-04 the protocol runbook is written once, self-contained, regardless of tool count', () => {
  const root = tmp();
  init.scaffold(root, ['claude', 'cursor', 'codex']);
  const rb = read(root, 'apriori/runbook.md');
  assert.ok(rb.includes('# Apriori RUNBOOK'));           // the real runbook, not a placeholder
  assert.ok(rb.includes('## 1. Hard Rules'));            // self-contained: carries the protocol
  // single source: byte-identical to the package's own RUNBOOK.md (no template copy to drift)
  assert.strictEqual(rb, fs.readFileSync(path.join(__dirname, '..', 'RUNBOOK.md'), 'utf8'));
  // no per-tool runbook duplication — only pointers reference it
  assert.ok(read(root, 'CLAUDE.md').includes('apriori/runbook.md'));
  assert.ok(!read(root, '.cursor/rules/apriori.mdc').includes('# Apriori RUNBOOK'));
});

test('IN-05 per-tool native location and format (Cursor MDC frontmatter, Claude command)', () => {
  const root = tmp();
  init.scaffold(root, ['claude', 'cursor']);
  const mdc = read(root, '.cursor/rules/apriori.mdc');
  assert.match(mdc, /^---\ndescription:/);
  assert.match(mdc, /alwaysApply: true/);
  assert.ok(fs.existsSync(path.join(root, '.claude/commands/apriori.md')));
  const claudeMd = read(root, 'CLAUDE.md');
  assert.ok(claudeMd.includes('apriori/runbook.md'));
  assert.match(claudeMd, /apriori status --change <name>/);
  assert.match(claudeMd, /apriori\/changes\/<change>\/flow-state\.md/);
  assert.match(claudeMd, /first `## Next` entry/);
  assert.match(claudeMd, /never preload the full runbook/i);
  assert.doesNotMatch(claudeMd, /current mode\/phase minimal set/);
  assert.match(read(root, '.claude/commands/apriori.md'), /never preload the full runbook/i);
});

test('IN-06 additive and non-clobbering; re-running is safe', () => {
  const root = tmp();
  fs.writeFileSync(path.join(root, 'CLAUDE.md'), '# my existing rules\n');
  const first = init.scaffold(root, ['claude']);
  assert.ok(first.actions.some((a) => a.file === 'CLAUDE.md' && a.action === 'appended'));
  const body = read(root, 'CLAUDE.md');
  assert.ok(body.startsWith('# my existing rules'));       // original preserved
  assert.ok(body.includes('apriori/runbook.md'));          // pointer appended
  const second = init.scaffold(root, ['claude']);          // re-run
  assert.ok(second.actions.some((a) => a.file === 'CLAUDE.md' && a.action === 'skipped'));
  assert.strictEqual((read(root, 'CLAUDE.md').match(/apriori\/runbook\.md/g) || []).length, 1); // no dup
});

test('IN-07 dry-run previews actions without writing any file', () => {
  const root = tmp();
  const plan = init.scaffold(root, ['claude'], { dryRun: true });
  assert.ok(plan.actions.length > 0);
  assert.ok(!fs.existsSync(path.join(root, 'apriori', 'runbook.md'))); // nothing written
  assert.ok(!fs.existsSync(path.join(root, 'CLAUDE.md')));
});

test('IN-18 low-confidence markers detect nothing: .github alone and AGENTS.md alone attribute no tool', () => {
  // fixture 1: a .github/ dir WITHOUT copilot-instructions.md is not Copilot — no mis-add
  const r1 = tmp();
  fs.mkdirSync(path.join(r1, '.github'));
  assert.ok(!init.detectTools(r1).includes('copilot'), '.github alone still reads as Copilot');
  // fixture 2: AGENTS.md alone attributes nothing (it was double-attributed to codex AND opencode)
  const r2 = tmp();
  fs.writeFileSync(path.join(r2, 'AGENTS.md'), '# conventions\n');
  assert.deepStrictEqual(init.detectTools(r2), [], 'AGENTS.md alone still attributes a tool');
  // fixture 2b: AGENTS.md beside another tool's own marker — only THAT tool is detected
  const r3 = tmp();
  fs.writeFileSync(path.join(r3, 'AGENTS.md'), '# conventions\n');
  fs.mkdirSync(path.join(r3, '.opencode'));
  const d3 = init.detectTools(r3);
  assert.ok(d3.includes('opencode') && !d3.includes('codex'), `AGENTS.md still drags codex in: ${d3}`);
  // fixture 3: a GENUINELY present tool keeps being detected via its high-confidence marker
  const r4 = tmp();
  fs.mkdirSync(path.join(r4, '.github'));
  fs.writeFileSync(path.join(r4, '.github', 'copilot-instructions.md'), 'x');
  fs.mkdirSync(path.join(r4, '.codex'));
  const d4 = init.detectTools(r4);
  assert.ok(d4.includes('copilot'), 'a real Copilot project (.github/copilot-instructions.md) went undetected');
  assert.ok(d4.includes('codex'), 'a real Codex project (.codex/) went undetected');
});

test('IN-19 explicit --tools and the default path are unchanged by detection removal', () => {
  // the same explicit selection produces the same actions whether misleading markers exist or not
  const withMarkers = tmp();
  fs.mkdirSync(path.join(withMarkers, '.github'));
  fs.writeFileSync(path.join(withMarkers, 'AGENTS.md'), '# mine\n');
  const clean = tmp();
  fs.writeFileSync(path.join(clean, 'AGENTS.md'), '# mine\n');
  const a = init.scaffold(withMarkers, ['claude']);
  const b = init.scaffold(clean, ['claude']);
  assert.deepStrictEqual(a.actions, b.actions);
  assert.deepStrictEqual(a.levels, b.levels);
  // zero mis-add: no Copilot or Codex artifact was written for the unselected tools
  assert.ok(!fs.existsSync(path.join(withMarkers, '.github', 'copilot-instructions.md')));
  assert.ok(!fs.existsSync(path.join(withMarkers, '.codex')));
  // the user's AGENTS.md is untouched when neither codex nor opencode is selected
  assert.strictEqual(read(withMarkers, 'AGENTS.md'), '# mine\n');
});

test('IN-20 no interactive menu: every TTY/non-TTY × zero/single/multi cell has an explicit outlet', async () => {
  // the menu machinery is gone from the module surface
  for (const gone of ['multiselect', 'parseKey', 'reduceKey', 'renderMenu'])
    assert.ok(!(gone in init), `menu machinery still exported: ${gone}`);

  const { spawnSync } = require('node:child_process');
  const BIN = path.join(__dirname, '..', 'bin', 'apriori.js');
  const run = (args, cwd) => spawnSync('node', [BIN, 'init', ...args], { encoding: 'utf8', cwd });
  const COMPLETE = {
    claude: ['CLAUDE.md', '.claude/commands/apriori.md'],
    cursor: ['.cursor/rules/apriori.mdc'],
  };
  const assertComplete = (root, tools) => {
    for (const f of ['apriori/runbook.md', 'apriori/managed.json', 'apriori/.gitignore']
      .concat(...tools.map((t) => COMPLETE[t])))
      assert.ok(fs.existsSync(path.join(root, f)), `partial install: ${f} missing`);
  };

  // ---- non-TTY (spawned child, stdin is a pipe) ----
  // zero selection, no flag → refusal naming the flag, the known tools AND the detected ones:
  // a genuinely present tool is never silently left unconfigured
  const r0root = tmp();
  fs.mkdirSync(path.join(r0root, '.cursor'));
  const r0 = run([], r0root);
  assert.strictEqual(r0.status, 2, r0.stdout + r0.stderr);
  assert.match(r0.stderr, /--tools/);
  assert.match(r0.stderr, /claude, codex, cursor, copilot, opencode, windsurf/);
  assert.match(r0.stderr, /detected[^\n]*cursor/, 'the detected tool is not named — silent unconfiguration');
  // zero selection, empty flag value → refusal, exit non-zero
  const rE = run(['--tools', ''], tmp());
  assert.strictEqual(rE.status, 2);
  assert.match(rE.stderr, /--tools/);
  // zero selection via a list that PARSES to nothing (`,`, pure whitespace, ` , `) → the SAME
  // unified refusal as a missing flag: exit 2, known tools + detected tools + a legal retry
  // example, zero writes (batch C P3 acceptance: the `--tools ','` edge bypassed the diagnostic)
  for (const empt of [',', '  ', ' , ']) {
    const rCroot = tmp();
    fs.mkdirSync(path.join(rCroot, '.cursor'));
    const rC = run(['--tools', empt], rCroot);
    assert.strictEqual(rC.status, 2, `'--tools ${empt}': ${rC.stdout}${rC.stderr}`);
    assert.match(rC.stderr, /pass --tools/, `'--tools ${empt}' lost the flag guidance`);
    assert.match(rC.stderr, /claude, codex, cursor, copilot, opencode, windsurf/,
      `'--tools ${empt}' does not name the six known tools`);
    assert.match(rC.stderr, /detected[^\n]*cursor/, `'--tools ${empt}' does not name the detected tool`);
    assert.match(rC.stderr, /e\.g\. apriori init --tools /, `'--tools ${empt}' offers no legal retry example`);
    assert.ok(!fs.existsSync(path.join(rCroot, 'apriori')), `'--tools ${empt}' wrote files on refusal`);
  }
  // with nothing detected, the refusal still carries a legal retry example
  const rN = run(['--tools', ','], tmp());
  assert.strictEqual(rN.status, 2);
  assert.match(rN.stderr, /e\.g\. apriori init --tools /);
  // single tool → complete install
  const r1root = tmp();
  const r1 = run(['--tools', 'claude', '--yes'], r1root);
  assert.strictEqual(r1.status, 0, r1.stdout + r1.stderr);
  assertComplete(r1root, ['claude']);
  // multi tool → complete install for every selected tool
  const r2root = tmp();
  const r2 = run(['--tools', 'claude,cursor', '--yes'], r2root);
  assert.strictEqual(r2.status, 0, r2.stdout + r2.stderr);
  assertComplete(r2root, ['claude', 'cursor']);

  // ---- TTY (isTTY forced true in-process): the same outlets, no menu, no hang ----
  const prevTTY = process.stdin.isTTY;
  const prevCwd = process.cwd();
  const origErr = console.error, origLog = console.log;
  const errs = [];
  console.error = (...a) => errs.push(a.join(' '));
  console.log = () => {};
  try {
    process.stdin.isTTY = true;
    // zero selection → same refusal (would previously open the arrow-key menu and wait)
    const t0 = tmp();
    fs.mkdirSync(path.join(t0, '.codex'));
    process.chdir(t0);
    const code0 = await Promise.race([
      init.cli([]),
      new Promise((_, rej) => setTimeout(() => rej(new Error('menu still present: init without --tools did not return')), 2000).unref()),
    ]);
    assert.strictEqual(code0, 2);
    assert.match(errs.join('\n'), /--tools/);
    assert.match(errs.join('\n'), /codex/, 'the detected tool is not named on a TTY');
    // single and multi with --yes → complete install
    const t1 = tmp();
    process.chdir(t1);
    assert.strictEqual(await init.cli(['--tools', 'claude', '--yes']), 0);
    assertComplete(t1, ['claude']);
    const t2 = tmp();
    process.chdir(t2);
    assert.strictEqual(await init.cli(['--tools', 'claude,cursor', '--yes']), 0);
    assertComplete(t2, ['claude', 'cursor']);
  } finally {
    console.error = origErr;
    console.log = origLog;
    process.stdin.isTTY = prevTTY;
    process.chdir(prevCwd);
  }
});

test('IN-20 real PTY: an empty-parsed selection refuses with the full diagnostic on a genuine terminal', (t) => {
  // The in-process TTY cells above force isTTY; this cell runs the CLI under a REAL pty
  // (util-linux script(1) allocates one and -e propagates the child's exit code), so the
  // TTY branch is exercised as a terminal user would hit it — no isTTY monkey-patching.
  if (process.platform !== 'linux') { t.skip('real-PTY harness uses util-linux script(1)'); return; }
  const { spawnSync } = require('node:child_process');
  const BIN = path.join(__dirname, '..', 'bin', 'apriori.js');
  const root = tmp();
  fs.mkdirSync(path.join(root, '.cursor'));
  for (const argv of ['--tools ,', '']) {   // empty-parsed list AND missing flag: one refusal
    const r = spawnSync('script', ['-qe', '-c', `node ${BIN} init ${argv}`.trim(), '/dev/null'],
      { cwd: root, encoding: 'utf8' });
    // under script(1) the pty merges stderr into stdout
    const out = r.stdout + r.stderr;
    assert.strictEqual(r.status, 2, `init ${argv} on a real pty: ${out}`);
    assert.match(out, /pass --tools/);
    assert.match(out, /claude, codex, cursor, copilot, opencode, windsurf/);
    assert.match(out, /detected[^\n]*cursor/, `init ${argv}: detected tool unnamed on a real pty`);
    assert.match(out, /e\.g\. apriori init --tools /);
    assert.ok(!fs.existsSync(path.join(root, 'apriori')), `init ${argv} wrote files on refusal`);
  }
});

test('IN-08 reports command-level vs rule-level entry per tool', () => {
  const root = tmp();
  const { levels } = init.scaffold(root, ['claude', 'cursor', 'copilot']);
  assert.strictEqual(levels.claude, 'command');
  assert.strictEqual(levels.cursor, 'rule');          // no slash command
  assert.strictEqual(levels.copilot, 'rule');         // Copilot: rule-level, no slash command
});

test('IN-09 --language pins a language in the scaffolded config; default is auto', () => {
  const withLang = tmp();
  init.scaffold(withLang, ['claude'], { language: '中文' });
  assert.match(read(withLang, 'apriori/process-config.md'), /\| language \| 中文 \|/);
  const noLang = tmp();
  init.scaffold(noLang, ['claude']);
  assert.match(read(noLang, 'apriori/process-config.md'), /\| language \| auto \|/);   // default
  // an existing config is never overwritten
  const existing = tmp();
  fs.mkdirSync(path.join(existing, 'apriori'), { recursive: true });
  fs.writeFileSync(path.join(existing, 'apriori', 'process-config.md'), 'MINE\n');
  init.scaffold(existing, ['claude'], { language: '中文' });
  assert.strictEqual(read(existing, 'apriori/process-config.md'), 'MINE\n');
});

test('IN-11 a gitignored scratch dir for ephemeral instruments', () => {
  const root = tmp();
  init.scaffold(root, ['claude']);
  assert.ok(fs.statSync(path.join(root, 'apriori', 'tmp')).isDirectory());
  assert.strictEqual(read(root, 'apriori/.gitignore'), 'tmp/\n');
  // an existing .gitignore is never overwritten; re-run reports skipped
  fs.writeFileSync(path.join(root, 'apriori', '.gitignore'), 'tmp/\ncustom/\n');
  const { actions } = init.scaffold(root, ['claude']);
  assert.strictEqual(read(root, 'apriori/.gitignore'), 'tmp/\ncustom/\n');
  assert.ok(actions.some((a) => a.file === 'apriori/.gitignore' && a.action === 'skipped'));
});

test('IN-12 --test-cmd persists into the fresh config and verify uses it as default', () => {
  const root = tmp();
  init.scaffold(root, ['claude'], { testCmd: 'node -e "console.log(1)"' });
  const cfg = read(root, 'apriori/process-config.md');
  assert.match(cfg, /\| test-cmd \| node -e "console\.log\(1\)" \|/);
  // verify's fallback reader picks it up
  const { configTestCmd } = require('../lib/spec-runner');
  assert.strictEqual(configTestCmd(root), 'node -e "console.log(1)"');
  // an existing config is never rewritten
  const existing = tmp();
  fs.mkdirSync(path.join(existing, 'apriori'), { recursive: true });
  fs.writeFileSync(path.join(existing, 'apriori', 'process-config.md'), 'MINE\n');
  init.scaffold(existing, ['claude'], { testCmd: 'x' });
  assert.strictEqual(read(existing, 'apriori/process-config.md'), 'MINE\n');
});

// ---- update-manifest (IN-13..17): init records what it creates ----

const umPath = require('node:path');
const umFs = require('node:fs');
const umOs = require('node:os');
const umCrypto = require('node:crypto');
const umInit = require('../lib/init');
const umUpdate = require('../lib/update');
const umTmp = () => umFs.mkdtempSync(umPath.join(umOs.tmpdir(), 'apriori-inm-'));
const umSha = (p) => 'sha256:' + umCrypto.createHash('sha256').update(umFs.readFileSync(p)).digest('hex');
const umManifest = (root) => JSON.parse(umFs.readFileSync(umPath.join(root, 'apriori', 'managed.json'), 'utf8'));

test('IN-13 fresh init writes the manifest for exactly what it created', () => {
  const root = umTmp();
  umInit.scaffold(root, ['claude']);
  const m = umManifest(root);
  assert.strictEqual(m.version, 1);
  assert.deepStrictEqual(Object.keys(m.files).sort(), ['.claude/commands/apriori.md', 'apriori/runbook.md']);
  assert.strictEqual(m.files['apriori/runbook.md'], umSha(umPath.join(root, 'apriori', 'runbook.md')));
  assert.strictEqual(m.files['.claude/commands/apriori.md'], umSha(umPath.join(root, '.claude', 'commands', 'apriori.md')));
});

test('IN-14 add-tool init merges without adopting bystanders', () => {
  const root = umTmp();
  umInit.scaffold(root, ['claude']);
  const claudeHash = umManifest(root).files['.claude/commands/apriori.md'];
  // a user file already sits at codex's command path — init skips it, and it must gain NO entry
  const codexCmd = umPath.join(root, '.codex', 'prompts', 'apriori.md');
  umFs.mkdirSync(umPath.dirname(codexCmd), { recursive: true });
  umFs.writeFileSync(codexCmd, 'user file, was here first\n');
  umInit.scaffold(root, ['codex']);
  const m = umManifest(root);
  assert.strictEqual(m.files['.claude/commands/apriori.md'], claudeHash);   // preserved
  assert.ok(!('.codex/prompts/apriori.md' in m.files), 'bystander adopted!');
  const { actions } = umUpdate.run(root);
  const row = actions.find((a) => a.file === '.codex/prompts/apriori.md');
  assert.ok(row && /unmanaged/.test(row.action));
  assert.strictEqual(umFs.readFileSync(codexCmd, 'utf8'), 'user file, was here first\n');
});

test('IN-15 the delete-and-reinit cure closes cleanly', () => {
  const root = umTmp();
  umInit.scaffold(root, ['claude']);
  const cmd = umPath.join(root, '.claude', 'commands', 'apriori.md');
  umFs.appendFileSync(cmd, '\nlocal edits\n');            // modified…
  umFs.rmSync(cmd);                                        // …then deleted, per the cure
  umInit.scaffold(root, ['claude']);                       // re-init recreates it
  assert.strictEqual(umManifest(root).files['.claude/commands/apriori.md'], umSha(cmd));
  const { actions } = umUpdate.run(root);
  const row = actions.find((a) => a.file === '.claude/commands/apriori.md');
  assert.strictEqual(row.action, 'up-to-date');
});

test('IN-16 init dry-run leaves the manifest alone', () => {
  const root = umTmp();
  umInit.scaffold(root, ['claude'], { dryRun: true });
  assert.ok(!umFs.existsSync(umPath.join(root, 'apriori', 'managed.json')));
  umInit.scaffold(root, ['claude']);
  const before = umFs.readFileSync(umPath.join(root, 'apriori', 'managed.json'), 'utf8');
  umInit.scaffold(root, ['codex'], { dryRun: true });
  assert.strictEqual(umFs.readFileSync(umPath.join(root, 'apriori', 'managed.json'), 'utf8'), before);
});

test('IN-17 a hygiene-invalid manifest blocks init', () => {
  const root = umTmp();
  umInit.scaffold(root, ['claude']);
  umFs.writeFileSync(umPath.join(root, 'apriori', 'managed.json'), '{ broken');
  assert.throws(() => umInit.scaffold(root, ['codex']), /managed\.json/);
  assert.ok(!umFs.existsSync(umPath.join(root, '.codex')), 'scaffolding ran despite invalid manifest');
});
