'use strict';
/*
 * apriori init — scaffold the single apriori/ root and write a thin pointer to the
 * self-contained runbook in each selected AI tool's native location/format.
 * Zero deps — pure Node stdlib. The protocol lives once (apriori/runbook.md); tools get pointers.
 */
const fs = require('fs');
const path = require('path');
const readline = require('readline');
const { withStrict } = require('./args');

const TEMPLATES = path.join(__dirname, '..', 'templates');
// The runbook ships once, as the package's own RUNBOOK.md — no template duplicate (IN-04).
const RUNBOOK_SRC = path.join(__dirname, '..', 'RUNBOOK.md');

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
  const seed = (rel, srcAbs) => {
    const p = path.join(root, rel);
    if (!fs.existsSync(p)) { if (!dry) { ensureDir(p); fs.copyFileSync(srcAbs, p); } act(rel, 'created'); }
    else act(rel, 'skipped');
  };

  // 1. apriori/ root: runbook + process-config (never clobbered) + working dirs
  seed('apriori/runbook.md', RUNBOOK_SRC);
  seed('apriori/process-config.md', path.join(TEMPLATES, 'process-config.md'));
  // ephemeral scratch (P7 screenshot self-checks etc.) — gitignored, never committed (IN-11)
  const gi = path.join(root, 'apriori', '.gitignore');
  if (!fs.existsSync(gi)) { if (!dry) { ensureDir(gi); fs.writeFileSync(gi, 'tmp/\n'); } act('apriori/.gitignore', 'created'); }
  else act('apriori/.gitignore', 'skipped');
  // pin a language and/or persist a test command in the scaffolded config (only on a freshly-created config)
  if ((opts.language || opts.testCmd) && !dry) {
    const cfg = path.join(root, 'apriori', 'process-config.md');
    const created = actions.some((a) => a.file === 'apriori/process-config.md' && a.action === 'created');
    if (created) {
      let body = fs.readFileSync(cfg, 'utf8');
      if (opts.language) body = body.replace(/(\| language \| )auto( \|)/, `$1${opts.language}$2`);
      if (opts.testCmd)  // consumed by `apriori verify` as the default when --test-cmd is omitted
        body = body.replace(/^(\| language \|.*)$/m, `$1\n| test-cmd | ${opts.testCmd} | any shell command emitting TAP — \`apriori verify\`'s default | (none) |`);
      fs.writeFileSync(cfg, body);
    }
  }
  if (!dry) for (const sub of ['specs', 'changes', 'changes/archive', 'review', 'truth', 'tmp'])
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
  const a = { tools: null, testCmd: null, yes: false, language: null };
  for (let i = 0; i < argv.length; i++) {
    const k = argv[i];
    if (k === '--tools') a.tools = argv[++i].split(',').map((s) => s.trim()).filter(Boolean);
    else if (k === '--test-cmd') a.testCmd = argv[++i];
    else if (k === '--language') a.language = argv[++i];
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
  console.log('\n  Next — two doors:');
  console.log('    idea still fuzzy?  /apriori           (no arguments — brainstorm first, nothing written until you approve)');
  console.log('    change is clear?   /apriori <change>  (or the kickoff prompt), then answer at each human gate.');
}

// --- arrow-key multi-select (pure Node, zero deps) ---------------------------
// key names from a raw stdin chunk
function parseKey(buf) {
  const s = buf.toString('utf8');
  if (s === '\x1b[A' || s === 'k') return 'up';
  if (s === '\x1b[B' || s === 'j') return 'down';
  if (s === ' ') return 'space';
  if (s === '\r' || s === '\n') return 'enter';
  if (s === 'a') return 'all';
  if (s === '\x03' || s === '\x1b') return 'cancel';   // Ctrl-C / Esc
  return null;
}

// pure reducer: (state, key) → state. state = { items, cursor, selected:Set }
function reduceKey(state, key) {
  const n = state.items.length;
  if (!n) return state;
  if (key === 'up') return { ...state, cursor: (state.cursor - 1 + n) % n };
  if (key === 'down') return { ...state, cursor: (state.cursor + 1) % n };
  if (key === 'space') {
    const selected = new Set(state.selected);
    const id = state.items[state.cursor].key;
    if (selected.has(id)) selected.delete(id); else selected.add(id);
    return { ...state, selected };
  }
  if (key === 'all') {
    const selected = state.selected.size === n ? new Set() : new Set(state.items.map((i) => i.key));
    return { ...state, selected };
  }
  return state;
}

const paint = (s, code, on) => (on ? `\x1b[${code}m${s}\x1b[0m` : s);

function renderMenu(state, opts = {}) {
  const c = !!opts.color;
  const lines = ['  Select AI tools  (↑/↓ move · space toggle · a all · enter confirm):'];
  state.items.forEach((it, i) => {
    const cur = i === state.cursor ? '❯' : ' ';
    const box = state.selected.has(it.key) ? paint('◉', 32, c) : '◯';   // green when selected
    lines.push(`  ${cur} ${box} ${it.name}${it.detected ? '  (detected)' : ''}`);
  });
  const names = state.items.filter((i) => state.selected.has(i.key)).map((i) => i.name);
  // footer is ALWAYS present (stable line count for in-place redraw)
  lines.push(`  selected: ${names.length ? paint(names.join(', '), 32, c) : '(none)'}`);
  return lines.join('\n') + '\n';
}

// selected keys, in item order
function selectedKeys(state) { return state.items.filter((i) => state.selected.has(i.key)).map((i) => i.key); }

// interactive driver; input/output default to the real TTY but are injectable for tests
function multiselect({ items, preselected = [], input = process.stdin, output = process.stdout } = {}) {
  return new Promise((resolve) => {
    let state = { items, cursor: 0, selected: new Set(preselected) };
    let first = true;
    const color = output.isTTY === true;                 // color only on a real terminal
    const render = () => {
      const menu = renderMenu(state, { color });
      const lineCount = menu.split('\n').length - 1;
      if (!first) output.write(`\x1b[${lineCount}A\x1b[0J`);   // redraw in place
      first = false;
      output.write(menu);
    };
    const cleanup = () => {
      if (input.setRawMode) input.setRawMode(false);
      input.pause();
      input.removeListener('data', onData);
    };
    const onData = (buf) => {
      const key = parseKey(buf);
      if (key === 'cancel') { cleanup(); output.write('\n'); process.exit(130); }
      if (key === 'enter') { cleanup(); output.write('\n'); resolve(selectedKeys(state)); return; }
      const next = reduceKey(state, key);
      if (next !== state) { state = next; render(); }
    };
    if (input.setRawMode) input.setRawMode(true);
    input.resume();
    render();
    input.on('data', onData);
  });
}

async function askTools(root) {
  const detected = new Set(detectTools(root));
  const items = Object.keys(TOOLS).map((k) => ({ key: k, name: TOOLS[k].name, detected: detected.has(k) }));
  return multiselect({ items, preselected: [...detected] });
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

const USAGE = 'usage: apriori init [--tools <a,b,...>] [--test-cmd "<cmd>"] [--language <lang>] [--yes]';

async function cli(argv) {
  return withStrict(argv, { sub: 'init', usage: USAGE, positionals: 0, aliases: { '-y': '--yes' },
    flags: { '--tools': 'value', '--test-cmd': 'value', '--language': 'value', '--yes': 'flag' } }, async (f) => {
    const a = { tools: f['--tools'] ? f['--tools'].split(',').map((x) => x.trim()).filter(Boolean) : null,
      testCmd: f['--test-cmd'] || null, language: f['--language'] || null, yes: !!f['--yes'] };
    const root = process.cwd();
    let tools = a.tools;
    if (!tools) {
      if (!process.stdin.isTTY) { console.error('  non-interactive: pass --tools <a,b,...>'); return 2; }
      tools = await askTools(root);
    }
    if (!tools.length) { console.error('  no tools selected — nothing to do'); return 1; }
    preview(root, tools);                          // IN-07: preview before writing
    if (!a.yes && process.stdin.isTTY && !(await confirm('\n  Proceed? (Y/n) '))) { console.log('  aborted.'); return 0; }
    report(scaffold(root, tools, { testCmd: a.testCmd, language: a.language }));
    return 0;
  });
}

module.exports = { TOOLS, POINTER, detectTools, writePointer, writeCommand, scaffold, parseArgs, cli,
  parseKey, reduceKey, renderMenu, selectedKeys, multiselect };
