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
const { encodeCell } = require('./config');

const TEMPLATES = path.join(__dirname, '..', 'templates');
// The runbook ships once, as the package's own RUNBOOK.md — no template duplicate (IN-04).
const RUNBOOK_SRC = path.join(__dirname, '..', 'RUNBOOK.md');

// The one adapter table — the only maintenance surface as tool conventions drift.
// level: 'command' = gets a /apriori-style entry; 'rule' = rule-level only (no slash command).
// `detect` carries HIGH-CONFIDENCE markers only (batch C): a marker names ITS tool and no other.
// `.github/` alone is not Copilot (every GitHub repo has one) and `AGENTS.md` alone names no
// single tool (it was double-attributed to codex AND opencode) — both are gone; a genuinely
// present tool is still found by its own file (.github/copilot-instructions.md, .codex/,
// .opencode/). `rules` locations are untouched: codex and opencode still WRITE AGENTS.md.
const TOOLS = {
  claude:   { name: 'Claude Code',   detect: ['CLAUDE.md', '.claude'],
              rules: 'CLAUDE.md', commands: { apriori: '.claude/commands/apriori.md', discuss: '.claude/commands/apriori-discuss.md' }, level: 'command' },
  codex:    { name: 'Codex',         detect: ['.codex'],
              rules: 'AGENTS.md',  commands: { apriori: '.codex/prompts/apriori.md', discuss: '.codex/prompts/apriori-discuss.md' }, level: 'command' },
  cursor:   { name: 'Cursor',        detect: ['.cursor'],
              rules: '.cursor/rules/apriori.mdc', mdc: true, level: 'rule' },
  copilot:  { name: 'GitHub Copilot', detect: ['.github/copilot-instructions.md'],
              rules: '.github/copilot-instructions.md', level: 'rule' },
  opencode: { name: 'OpenCode',      detect: ['.opencode'],
              rules: 'AGENTS.md',  commands: { apriori: '.opencode/command/apriori.md', discuss: '.opencode/command/apriori-discuss.md' }, level: 'command' },
  windsurf: { name: 'Windsurf',      detect: ['.windsurf', '.windsurfrules'],
              rules: '.windsurf/rules/apriori.md', commands: { apriori: '.windsurf/workflows/apriori.md', discuss: '.windsurf/workflows/apriori-discuss.md' }, level: 'command' },
};

const POINTER =
  'Development follows `apriori/runbook.md`. At session start, run `apriori status ' +
  '--change <name>`, read `apriori/changes/<change>/flow-state.md`, and continue from its ' +
  'first `## Next` entry. Read a runbook section only when status, Next, a blocked command, ' +
  'or an uncertain fact points there — never preload the full runbook.';

// Every PREVIOUS generation of the pointer paragraph this tool ever wrote into a rules file,
// verbatim — the analogue of managed.TEMPLATE_GENERATIONS for the one paragraph init appends
// to a user-owned file. `update` upgrades exactly one of these to POINTER and touches nothing
// else in the file; a paragraph that matches none of them is the user's (hand-edited) and is
// left alone. APPEND the outgoing text here whenever POINTER changes.
const POINTER_GENERATIONS = [
  'Development follows `apriori/runbook.md`. At session start, read its Session start/Context economy map and `apriori/changes/<change>/flow-state.md`, load only the current mode/phase minimal set, then continue from the recorded position.',   // 6.0 context-economy map
  'Development follows `apriori/runbook.md`. At session start, read it per its session-start rule and `apriori/changes/<change>/flow-state.md`, then continue from the recorded position.',   // 6.0 session-start rule
];

// The pointer paragraph of a rules file, judged: `current` (POINTER is there), `upgraded` (an
// old generation was there — `text` carries the file with ONLY that paragraph replaced),
// `hand-edited` (something names the runbook, but it is no shipped generation), `none`.
function upgradePointer(text) {
  if (text.includes(POINTER)) return { kind: 'current', text };
  for (const old of POINTER_GENERATIONS)
    if (text.includes(old)) return { kind: 'upgraded', text: text.replace(old, () => POINTER) };
  if (text.includes('apriori/runbook.md')) return { kind: 'hand-edited', text };
  return { kind: 'none', text };
}

const KNOWN = () => Object.keys(TOOLS).join(', ');
// the whole list, before anything is written: one unknown key refuses the run (fail-closed)
function unknownTool(keys) {
  const bad = (keys || []).find((k) => !Object.prototype.hasOwnProperty.call(TOOLS, k));
  return bad === undefined ? null : `unknown tool '${bad}' — known tools: ${KNOWN()}`;
}

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
  const up = upgradePointer(cur);
  // an OLD generation is upgraded in place — only that paragraph; the current one, or a
  // hand-edited pointer, is the user's file as it stands
  if (up.kind === 'upgraded') { if (!dryRun) fs.writeFileSync(p, up.text); return 'pointer updated'; }
  if (up.kind !== 'none') return 'skipped';
  if (!dryRun) fs.writeFileSync(p, cur.replace(/\s*$/, '') + '\n\n' + body);
  return 'appended';
}

// The command templates this package ships, indexed by template id. `TOOLS[k].commands`
// maps the same ids to each tool's native path — the mechanism carries N templates;
// the shipped configuration is still K=1 (only `apriori`).
const TEMPLATE_SRC = { apriori: path.join(TEMPLATES, 'command.md'),
                       discuss: path.join(TEMPLATES, 'discuss.md') };

function writeCommand(root, rel, srcAbs, dryRun) {
  const p = path.join(root, rel);
  if (fs.existsSync(p)) return 'skipped';
  if (!dryRun) { ensureDir(p); fs.copyFileSync(srcAbs, p); }
  return 'created';
}

// Scaffold the apriori/ root + per-tool pointers. Pure enough to unit-test.
// opts.dryRun computes actions without writing. Returns { actions:[{file,action}], levels:{tool:level} }
function scaffold(root, toolKeys, opts = {}) {
  const dry = !!opts.dryRun;
  // the whole tool list is validated FIRST — an unknown key never reaches a write (BD-01)
  const unknown = unknownTool(toolKeys);
  if (unknown) throw new Error(unknown);
  // manifest hygiene FIRST: an untrustworthy managed.json blocks init before any write (IN-17)
  const managed = require('./managed');
  const tools = opts.tools || TOOLS;                      // test-only injection (K=2)
  const srcs = opts.templateSrc || TEMPLATE_SRC;
  const manifest = managed.readManifest(root, tools);
  const created = [];                                     // rels created THIS run — the only manifest writes
  // each file is recorded the moment it is created: a later step that throws (a rules path that is a
  // directory, a tool directory that is a file …) must not leave anything this run created unrecorded —
  // init never adopts what it finds, so an unrecorded file of its own would stay unmanaged on every retry
  const record = (rel) => {
    created.push(rel);
    if (dry) return;
    const files = manifest ? { ...manifest.files } : {};
    for (const r of created) files[r] = managed.hashFile(path.join(root, r));
    managed.writeManifest(root, files);
  };
  const actions = [];
  const act = (file, action) => actions.push({ file, action });
  const seed = (rel, srcAbs) => {
    const p = path.join(root, rel);
    if (!fs.existsSync(p)) { if (!dry) { ensureDir(p); fs.copyFileSync(srcAbs, p); } act(rel, 'created'); return true; }
    act(rel, 'skipped'); return false;
  };

  // 1. apriori/ root: runbook + process-config (never clobbered) + working dirs
  if (seed('apriori/runbook.md', RUNBOOK_SRC)) record('apriori/runbook.md');
  // the guide the runbook names for a prototype walk — tool-owned, one exact file
  const guideAct = managed.installGuide(root, dry);
  act(managed.GUIDE_REL, guideAct);
  if (guideAct === 'created') record(managed.GUIDE_REL);
  seed('apriori/process-config.md', path.join(TEMPLATES, 'process-config.md'));
  // ephemeral scratch (P7 screenshot self-checks etc.) — gitignored, never committed (IN-11)
  const gi = path.join(root, 'apriori', '.gitignore');
  if (!fs.existsSync(gi)) { if (!dry) { ensureDir(gi); fs.writeFileSync(gi, 'tmp/\n'); } act('apriori/.gitignore', 'created'); }
  else act('apriori/.gitignore', 'skipped');
  // pin a language and/or persist a test command in the scaffolded config (only on a freshly-created config).
  // Both go through config.encodeCell — the serializer twin of the reader — and a CALLBACK
  // replacement: a template string would read `$&` / `$1` inside the command as replacement
  // patterns, and a bare `|` would split the cell (6.2, A-4). A value the cell cannot carry
  // throws before the write; the CLI validates the same way before it touches anything.
  if ((opts.language || opts.testCmd) && !dry) {
    const cfg = path.join(root, 'apriori', 'process-config.md');
    const created = actions.some((a) => a.file === 'apriori/process-config.md' && a.action === 'created');
    if (created) {
      const cell = (label, v) => { const e = encodeCell(v); if (e.error) throw new Error(`${label} ${e.error}`); return e.cell; };
      let body = fs.readFileSync(cfg, 'utf8');
      if (opts.language) { const c = cell('--language', opts.language); body = body.replace(/(\| language \| )auto( \|)/, (m, a, b) => a + c + b); }
      if (opts.testCmd) {  // consumed by `apriori verify` as the default when --test-cmd is omitted
        const c = cell('--test-cmd', opts.testCmd);
        body = body.replace(/^(\| language \|.*)$/m, (m) => `${m}\n| test-cmd | ${c} | any shell command emitting TAP — \`apriori verify\`'s default | (none) |`);
      }
      fs.writeFileSync(cfg, body);
    }
  }
  if (!dry) for (const sub of ['specs', 'changes', 'changes/archive', 'truth', 'tmp'])
    fs.mkdirSync(path.join(root, 'apriori', sub), { recursive: true });

  // 2. per-tool pointers / commands
  const levels = {};
  for (const key of toolKeys) {
    const t = tools[key];
    if (!t) continue;
    act(t.rules, writePointer(root, t.rules, t.mdc, dry));
    for (const [tplId, rel] of Object.entries(t.commands || {})) {
      const src = srcs[tplId];
      if (!src) throw new Error(`no template source registered for '${tplId}'`);
      const cmdAct = writeCommand(root, rel, src, dry);
      act(rel, cmdAct);
      if (cmdAct === 'created') record(rel);               // pre-existing files are never adopted
    }
    levels[key] = t.level;
  }
  // 3. the managed manifest: ONLY what THIS run created, merged over valid existing entries (a
  // recreated missing file gets a fresh hash — the delete-and-reinit cure closes). record() already
  // wrote it as each file appeared; dry-run reports the would-be entries and touches nothing.
  if (created.length) act('apriori/managed.json', manifest ? 'merged' : 'created');
  return { actions, levels };
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
  console.log('\n  Next — /apriori routes by intent:');
  console.log('    discuss first   /apriori                                   (with no arguments)');
  console.log('                    /apriori discuss foo without starting development');
  console.log('                    free text that does not identify a change to work on also enters discussion;');
  console.log('                    mentioning an existing change does not authorize development, and nothing');
  console.log('                    durable is written without approval to save or develop.');
  console.log('    start the work  /apriori implement add-reopen              (or the kickoff prompt)');
  console.log('                    work starts or resumes only when you identify a change to work on and');
  console.log('                    have not limited the request to discussion; then answer at each human gate.');
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
      testCmd: ('--test-cmd' in f) ? f['--test-cmd'] : null,            // PRESENCE, not truthiness: an empty flag is an error; the RAW value is validated (F4)
      language: ('--language' in f) ? f['--language'] : null, yes: !!f['--yes'] };
    const root = process.cwd();
    // the tool list is validated BEFORE the interactive prompt, the preview and any write (BD-01)
    const unknown = unknownTool(a.tools);
    if (unknown) { console.error(`  ${unknown}`); return 2; }
    // the values the config table must carry, validated BEFORE anything is written (A-4)
    if (a.testCmd !== null && a.testCmd.trim() === '') { console.error('  empty --test-cmd — pass a command or omit the flag'); return 2; }
    if (a.language !== null && a.language.trim() === '') { console.error('  empty --language — pass a language or omit the flag'); return 2; }
    for (const [label, v] of [['--test-cmd', a.testCmd], ['--language', a.language]]) {
      if (v === null) continue;
      const e = encodeCell(v);
      if (e.error) { console.error(`  ${label} ${e.error}`); return 2; }
    }
    const tools = a.tools;
    // No interactive menu (batch C): missing --tools — and a selection that PARSES to nothing
    // (`--tools ','`, pure whitespace) — is ONE unified refusal on a TTY and off one alike.
    // The message names the flag, the six known tools, what detection found, and a legal retry
    // example, so a genuinely present tool is never silently left unconfigured (P3 acceptance:
    // the empty-parsed list used to short-circuit past this diagnostic with a bare exit 1).
    if (!tools || !tools.length) {
      console.error(`  pass --tools <a,b,...> — known tools: ${KNOWN()}`);
      const detected = detectTools(root);
      if (detected.length)
        console.error(`  detected in this project: ${detected.join(', ')} — e.g. apriori init --tools ${detected.join(',')}`);
      else
        console.error('  e.g. apriori init --tools claude');
      return 2;
    }
    try {
      preview(root, tools);                        // IN-07: preview before writing
      if (!a.yes && process.stdin.isTTY && !(await confirm('\n  Proceed? (Y/n) '))) { console.log('  aborted.'); return 0; }
      report(scaffold(root, tools, { testCmd: a.testCmd, language: a.language }));
    } catch (e) { console.error('  ' + e.message); return 1; }   // e.g. hygiene-invalid managed.json
    return 0;
  });
}

module.exports = { TOOLS, TEMPLATE_SRC, POINTER, POINTER_GENERATIONS, upgradePointer, detectTools, scaffold, cli };
