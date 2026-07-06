'use strict';
/*
 * apriori init — scaffold the single apriori/ root and write a thin pointer to the
 * self-contained runbook in each selected AI tool's native location/format.
 * Zero deps — pure Node stdlib. The protocol lives once (apriori/runbook.md); tools get pointers.
 */
const fs = require('fs');
const path = require('path');
const readline = require('readline');

const TEMPLATES = path.join(__dirname, '..', 'templates');

// The one adapter table — the only maintenance surface as tool conventions drift.
// level: 'command' = gets a /apriori-style entry; 'rule' = rule-level only (no slash command).
const TOOLS = {
  claude:   { name: 'Claude Code',   detect: ['CLAUDE.md', '.claude'],
              rules: 'CLAUDE.md', command: '.claude/commands/apriori.md', level: 'command' },
  codex:    { name: 'Codex',         detect: ['AGENTS.md', '.codex'],
              rules: 'AGENTS.md',  command: '.codex/prompts/apriori.md', level: 'command' },
  cursor:   { name: 'Cursor',        detect: ['.cursor'],
              rules: '.cursor/rules/apriori.mdc', mdc: true, level: 'rule' },
  copilot:  { name: 'GitHub Copilot', detect: ['.github'],
              rules: '.github/copilot-instructions.md', level: 'rule' },
  opencode: { name: 'OpenCode',      detect: ['AGENTS.md', '.opencode'],
              rules: 'AGENTS.md',  command: '.opencode/command/apriori.md', level: 'command' },
  windsurf: { name: 'Windsurf',      detect: ['.windsurf', '.windsurfrules'],
              rules: '.windsurf/rules/apriori.md', command: '.windsurf/workflows/apriori.md', level: 'command' },
};

const POINTER =
  'Development follows `apriori/runbook.md`. At session start, read it per its ' +
  'session-start rule and `apriori/changes/<change>/flow-state.md`, then continue ' +
  'from the recorded position.';

function detectTools(root) {
  return Object.keys(TOOLS).filter((k) => TOOLS[k].detect.some((m) => fs.existsSync(path.join(root, m))));
}

function ensureDir(p) { fs.mkdirSync(path.dirname(p), { recursive: true }); }

// Append a pointer to a rules file without duplicating; returns 'created'|'appended'|'skipped'.
// dryRun computes the action without writing (IN-07 preview).
function writePointer(root, rel, mdc, dryRun) {
  const p = path.join(root, rel);
  const body = mdc
    ? `---\ndescription: apriori spec-driven development\nalwaysApply: true\n---\n\n${POINTER}\n`
    : `${POINTER}\n`;
  if (!fs.existsSync(p)) { if (!dryRun) { ensureDir(p); fs.writeFileSync(p, body); } return 'created'; }
  const cur = fs.readFileSync(p, 'utf8');
  if (cur.includes('apriori/runbook.md')) return 'skipped';
  if (!dryRun) fs.writeFileSync(p, cur.replace(/\s*$/, '') + '\n\n' + body);
  return 'appended';
}

function writeCommand(root, rel, dryRun) {
  const p = path.join(root, rel);
  if (fs.existsSync(p)) return 'skipped';
  if (!dryRun) { ensureDir(p); fs.copyFileSync(path.join(TEMPLATES, 'command.md'), p); }
  return 'created';
}

// Scaffold the apriori/ root + per-tool pointers. Pure enough to unit-test.
// opts.dryRun computes actions without writing. Returns { actions:[{file,action}], levels:{tool:level} }
function scaffold(root, toolKeys, opts = {}) {
  const dry = !!opts.dryRun;
  const actions = [];
  const act = (file, action) => actions.push({ file, action });
  const seed = (rel, tmpl) => {
    const p = path.join(root, rel);
    if (!fs.existsSync(p)) { if (!dry) { ensureDir(p); fs.copyFileSync(path.join(TEMPLATES, tmpl), p); } act(rel, 'created'); }
    else act(rel, 'skipped');
  };

  // 1. apriori/ root: runbook + process-config (never clobbered) + working dirs
  seed('apriori/runbook.md', 'runbook.md');
  seed('apriori/process-config.md', 'process-config.md');
  if (!dry) for (const sub of ['specs', 'changes', 'changes/archive', 'review', 'truth'])
    fs.mkdirSync(path.join(root, 'apriori', sub), { recursive: true });

  // 2. per-tool pointers / commands
  const levels = {};
  for (const key of toolKeys) {
    const t = TOOLS[key];
    if (!t) continue;
    act(t.rules, writePointer(root, t.rules, t.mdc, dry));
    if (t.command) act(t.command, writeCommand(root, t.command, dry));
    levels[key] = t.level;
  }
  return { actions, levels };
}

function parseArgs(argv) {
  const a = { tools: null, testCmd: null, yes: false };
  for (let i = 0; i < argv.length; i++) {
    const k = argv[i];
    if (k === '--tools') a.tools = argv[++i].split(',').map((s) => s.trim()).filter(Boolean);
    else if (k === '--test-cmd') a.testCmd = argv[++i];
    else if (k === '--yes' || k === '-y') a.yes = true;
  }
  return a;
}

function report(scaffoldResult) {
  console.log('\n  Wrote:');
  for (const { file, action } of scaffoldResult.actions)
    console.log(`    ${action === 'skipped' ? '·' : '✓'} ${file}${action !== 'created' ? `  (${action})` : ''}`);
  const cmd = [], rule = [];
  for (const [k, lvl] of Object.entries(scaffoldResult.levels))
    (lvl.startsWith('command') ? cmd : rule).push(TOOLS[k].name + (lvl === 'command-experimental' ? ' (experimental)' : ''));
  if (cmd.length) console.log(`\n  /apriori command-level: ${cmd.join(', ')}`);
  if (rule.length) console.log(`  rule-level (no slash command, just point the agent at the runbook): ${rule.join(', ')}`);
  console.log('\n  Next: /apriori <change>  (or the kickoff prompt), then answer at each human gate.');
}

async function askTools(root) {
  const detected = new Set(detectTools(root));
  const keys = Object.keys(TOOLS);
  console.log('\n  Select AI tools to configure (space to toggle, enter to confirm):');
  keys.forEach((k, i) => console.log(`    ${detected.has(k) ? '◉' : '◯'} ${i + 1}. ${TOOLS[k].name}${detected.has(k) ? '  (detected)' : ''}`));
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  const answer = await new Promise((res) => rl.question('\n  numbers (comma-separated) or enter for detected: ', res));
  rl.close();
  const picked = answer.trim()
    ? answer.split(',').map((s) => keys[parseInt(s.trim(), 10) - 1]).filter(Boolean)
    : [...detected];
  return picked;
}

function preview(root, tools) {
  const plan = scaffold(root, tools, { dryRun: true });
  console.log('\n  About to write:');
  for (const { file, action } of plan.actions)
    console.log(`    ${action === 'skipped' ? '·' : '✓'} ${file}${action !== 'created' ? `  (${action})` : ''}`);
  console.log('\n  Existing files are appended-to or skipped, never overwritten.');
}

async function confirm(question) {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  const ans = await new Promise((res) => rl.question(question, res));
  rl.close();
  return /^(y|yes|)$/i.test(ans.trim());
}

async function cli(argv) {
  const a = parseArgs(argv);
  const root = process.cwd();
  let tools = a.tools;
  if (!tools) {
    if (!process.stdin.isTTY) { console.error('  non-interactive: pass --tools <a,b,...>'); return 2; }
    tools = await askTools(root);
  }
  if (!tools.length) { console.error('  no tools selected — nothing to do'); return 1; }
  preview(root, tools);                          // IN-07: preview before writing
  if (!a.yes && process.stdin.isTTY && !(await confirm('\n  Proceed? (Y/n) '))) { console.log('  aborted.'); return 0; }
  report(scaffold(root, tools, { testCmd: a.testCmd }));
  return 0;
}

module.exports = { TOOLS, POINTER, detectTools, writePointer, writeCommand, scaffold, parseArgs, cli };
