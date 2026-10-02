'use strict';
// runbook-english-only — the runbook has one edition, in English (owner 2026-10-02).
// `apriori init` only ever installed RUNBOOK.md; RUNBOOK_cn.md was a repository-only mirror that
// every rule change had to be written into twice. These pin the single source and the guard that
// keeps a Chinese runbook edition from coming back unnoticed.
const { test } = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const crypto = require('node:crypto');
const { spawnSync } = require('node:child_process');

const ROOT = path.join(__dirname, '..');
const read = (rel) => fs.readFileSync(path.join(ROOT, rel), 'utf8');
const BIN = path.join(ROOT, 'bin', 'apriori.js');

test('PR-63 one English runbook, no Chinese edition, and nothing live points at one', () => {
  assert.ok(!fs.existsSync(path.join(ROOT, 'RUNBOOK_cn.md')), 'RUNBOOK_cn.md still exists');
  const en = read('RUNBOOK.md');
  const header = en.slice(0, en.search(/^##\s/m));
  assert.doesNotMatch(header, /RUNBOOK_cn|中文|Languages:/, 'the runbook header still carries a language switcher');
  // every Chinese human document that points at the runbook names the English one
  const cnDocs = ['README_cn.md', ...fs.readdirSync(path.join(ROOT, 'docs')).filter((f) => /_cn\.md$/.test(f)).map((f) => `docs/${f}`)];
  for (const rel of cnDocs) assert.doesNotMatch(read(rel), /RUNBOOK_cn/, `${rel} still points at RUNBOOK_cn.md`);
  for (const rel of ['README_cn.md', 'docs/operator_cn.md', 'docs/concepts_cn.md', 'docs/cli_cn.md'])
    assert.match(read(rel), /RUNBOOK\.md/, `${rel} no longer names the runbook it points at`);
  // the English P3 block keeps its frozen bytes (RIB-10)
  const p3 = en.match(/### P3 [\s\S]*?(?=### P4 )/);
  assert.ok(p3, 'P3 section not found');
  assert.strictEqual(crypto.createHash('sha256').update(p3[0]).digest('hex').slice(0, 16), '97a85ca560d41c70');
});

test('CK-23 the runbook has no Chinese edition, and one that reappears fails', () => {
  const mk = (files) => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'apriori-ck23-'));
    fs.mkdirSync(path.join(root, 'apriori/specs'), { recursive: true });
    fs.writeFileSync(path.join(root, 'apriori/specs/s.md'), '#### Scenario: XX-01 a\n- t\n');
    for (const [rel, c] of Object.entries(files)) {
      fs.mkdirSync(path.dirname(path.join(root, rel)), { recursive: true });
      fs.writeFileSync(path.join(root, rel), c);
    }
    return root;
  };
  const run = (root) => spawnSync('node', [BIN, 'check', '--self'], { encoding: 'utf8', cwd: root });
  // the real runbook text, alone: no one-sided-pair failure for it, and the runbook checks run on it
  const alone = run(mk({ 'RUNBOOK.md': read('RUNBOOK.md') }));
  assert.doesNotMatch(alone.stdout, /one-sided EN\/CN pair: RUNBOOK_cn\.md/, alone.stdout);
  assert.doesNotMatch(alone.stdout, /RUNBOOK\.md: phrase-table entry missing|RUNBOOK\.md: missing the `< \/dev\/null`/, alone.stdout);
  // the runbook checks still bite on the English text
  const broken = run(mk({ 'RUNBOOK.md': read('RUNBOOK.md').replace(/< \/dev\/null/g, '') }));
  assert.match(broken.stdout, /RUNBOOK\.md: missing the `< \/dev\/null` non-interactive guidance/, broken.stdout);
  // a Chinese edition that reappears fails, named
  const back = run(mk({ 'RUNBOOK.md': read('RUNBOOK.md'), 'RUNBOOK_cn.md': '# 运行手册\n' }));
  assert.strictEqual(back.status, 1, back.stdout);
  assert.match(back.stdout, /RUNBOOK_cn\.md: a Chinese runbook edition must not exist/, back.stdout);
  // the other EN/CN pairs are guarded as before
  const one = run(mk({ 'RUNBOOK.md': read('RUNBOOK.md'), 'docs/concepts.md': '## A\n' }));
  assert.match(one.stdout, /one-sided EN\/CN pair: docs\/concepts_cn\.md is missing/, one.stdout);
});
