'use strict';
const { test } = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const init = require('../lib/init');

function tmp() { return fs.mkdtempSync(path.join(os.tmpdir(), 'apriori-in-')); }
function read(root, rel) { return fs.readFileSync(path.join(root, rel), 'utf8'); }

test('IN-01 detects present tools and would pre-select them', () => {
  const root = tmp();
  fs.writeFileSync(path.join(root, 'CLAUDE.md'), 'x');
  fs.mkdirSync(path.join(root, '.cursor'));
  const d = init.detectTools(root);
  assert.ok(d.includes('claude') && d.includes('cursor'));
  assert.ok(!d.includes('windsurf'));
});

test('IN-02 the multi-select universe is the six supported tools', () => {
  assert.deepStrictEqual(Object.keys(init.TOOLS).sort(),
    ['claude', 'codex', 'copilot', 'cursor', 'opencode', 'windsurf'].sort());
});

test('IN-03 non-interactive via flags parses tools/test-cmd/yes/language', () => {
  const a = init.parseArgs(['--tools', 'claude,cursor', '--test-cmd', 'npm test', '--yes', '--language', '中文']);
  assert.deepStrictEqual(a.tools, ['claude', 'cursor']);
  assert.strictEqual(a.testCmd, 'npm test');
  assert.strictEqual(a.yes, true);
  assert.strictEqual(a.language, '中文');
  assert.strictEqual(init.parseArgs([]).language, null);   // default: no pin (auto)
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
  assert.ok(read(root, 'CLAUDE.md').includes('apriori/runbook.md'));
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

test('IN-10 arrow-key multiselect: parseKey, reducer, render (no numbers), end-to-end', async () => {
  // parseKey maps raw terminal bytes → key names
  assert.strictEqual(init.parseKey(Buffer.from('\x1b[A')), 'up');
  assert.strictEqual(init.parseKey(Buffer.from('\x1b[B')), 'down');
  assert.strictEqual(init.parseKey(Buffer.from(' ')), 'space');
  assert.strictEqual(init.parseKey(Buffer.from('\r')), 'enter');
  assert.strictEqual(init.parseKey(Buffer.from('a')), 'all');
  assert.strictEqual(init.parseKey(Buffer.from('\x03')), 'cancel');

  const items = [{ key: 'a', name: 'A' }, { key: 'b', name: 'B' }, { key: 'c', name: 'C' }];
  let st = { items, cursor: 0, selected: new Set() };
  st = init.reduceKey(st, 'up');    assert.strictEqual(st.cursor, 2);   // wraps to bottom
  st = init.reduceKey(st, 'down');  assert.strictEqual(st.cursor, 0);   // wraps to top
  st = init.reduceKey(st, 'space'); assert.ok(st.selected.has('a'));    // toggle current on
  st = init.reduceKey(st, 'space'); assert.ok(!st.selected.has('a'));   // toggle off
  st = init.reduceKey(st, 'all');   assert.strictEqual(st.selected.size, 3);  // all on
  st = init.reduceKey(st, 'all');   assert.strictEqual(st.selected.size, 0);  // all off

  // render shows a cursor + checkbox, a selected-footer, and NO numeric "1." "2." selection
  const menu = init.renderMenu({ items, cursor: 1, selected: new Set(['a', 'c']) });
  assert.match(menu, /❯ ◯ B/);      // cursor on row 1
  assert.match(menu, /◉ A/);        // 'a' selected
  assert.doesNotMatch(menu, /\d\.\s/);   // no "1. 2. 3."
  assert.match(menu, /space toggle · a all · enter confirm/);
  assert.match(menu, /selected: A, C/);                     // footer lists selected names in order
  assert.match(init.renderMenu({ items, cursor: 0, selected: new Set() }), /selected: \(none\)/);
  assert.doesNotMatch(menu, /\x1b\[/);                      // no ANSI when color off (default)
  // green when on — assert the FOOTER names specifically are green (not just the ◉ boxes)
  assert.match(init.renderMenu({ items, cursor: 0, selected: new Set(['a']) }, { color: true }), /selected: \x1b\[32mA\x1b\[0m/);

  // end-to-end driver with injected streams: down, space, down, space, enter → picks b, c
  const { PassThrough } = require('node:stream');
  const input = new PassThrough();
  const output = { write() {} };
  const p = init.multiselect({ items, preselected: [], input, output });
  for (const seq of ['\x1b[B', ' ', '\x1b[B', ' ', '\r']) {
    input.write(Buffer.from(seq));
    await new Promise((r) => setImmediate(r));
  }
  assert.deepStrictEqual(await p, ['b', 'c']);
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
