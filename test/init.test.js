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

test('IN-03 non-interactive via flags parses tools/test-cmd/yes', () => {
  const a = init.parseArgs(['--tools', 'claude,cursor', '--test-cmd', 'npm test', '--yes']);
  assert.deepStrictEqual(a.tools, ['claude', 'cursor']);
  assert.strictEqual(a.testCmd, 'npm test');
  assert.strictEqual(a.yes, true);
});

test('IN-04 the protocol runbook is written once, self-contained, regardless of tool count', () => {
  const root = tmp();
  init.scaffold(root, ['claude', 'cursor', 'codex']);
  const rb = read(root, 'apriori/runbook.md');
  assert.ok(rb.includes('# Apriori RUNBOOK'));           // the real runbook, not a placeholder
  assert.ok(rb.includes('## 1. Hard Rules'));            // self-contained: carries the protocol
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
