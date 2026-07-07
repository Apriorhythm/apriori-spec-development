'use strict';
// PR scenarios are protocol/doc behaviors — made executable as assertions over the runbook text.
const { test } = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.join(__dirname, '..');
const EN = fs.readFileSync(path.join(ROOT, 'RUNBOOK.md'), 'utf8');
const CN = fs.readFileSync(path.join(ROOT, 'RUNBOOK_cn.md'), 'utf8');
const README = fs.readFileSync(path.join(ROOT, 'README.md'), 'utf8');
const README_CN = fs.readFileSync(path.join(ROOT, 'README_cn.md'), 'utf8');

test('PR-01 STEP5 exit adds a deterministic spec-runner gate', () => {
  assert.match(EN, /`apriori verify` GREEN/);
  assert.match(EN, /Exit — ALL of:[\s\S]*apriori verify. GREEN/);
  assert.match(CN, /`apriori verify` GREEN/);
});

test('PR-02 P8 scope narrows to semantic faithfulness', () => {
  assert.match(EN, /Semantic faithfulness/);
  assert.match(EN, /already proven the mechanical/);
  assert.match(CN, /语义忠实/);
});

test('PR-03 archive action is native plain-files, no adapter', () => {
  assert.match(EN, /`apriori archive`/);
  assert.doesNotMatch(EN, /\/opsx:/);
  assert.doesNotMatch(CN, /\/opsx:/);
});

test('PR-04 the interface is single-path plain-files (runbook AND handbook)', () => {
  for (const doc of [EN, CN, README, README_CN]) {
    assert.doesNotMatch(doc, /\(adapter:/);
    assert.doesNotMatch(doc, /openspec\//);
    assert.doesNotMatch(doc, /\/opsx:/);
  }
});

test('PR-05 the disposable prototype rule still holds', () => {
  assert.match(EN, /prototype is disposable|`spike\/` is deleted/);
  assert.match(CN, /原型是一次性|`spike\/`/);
});

test('PR-06 a configurable language governs prose; machine tokens stay English', () => {
  // the runbook documents the language field + the "match the human" default
  assert.match(EN, /\*\*Language\.\*\*/);
  assert.match(EN, /match the language the human is using/);
  assert.match(EN, /Machine tokens are ALWAYS English/);
  // each machine token is itemized as English-only (not just the general rule)
  for (const tok of ['verdict lines', 'scenario IDs', 'ADDED', 'MODIFIED', 'REMOVED', 'file paths'])
    assert.ok(EN.includes(tok), `RUNBOOK Language rule must itemize "${tok}"`);
  assert.match(CN, /\*\*语言。\*\*/);
  assert.match(CN, /跟随人正在使用的语言/);
  assert.match(CN, /机器令牌.*永远是英文/);
  // and the scaffolded config carries the language field (default auto)
  const cfg = fs.readFileSync(path.join(ROOT, 'templates', 'process-config.md'), 'utf8');
  assert.match(cfg, /\| language \| auto \|/);
});

// isolate the Brainstorm block (heading → next ### heading) so assertions are section-scoped
function block(text, headingRe) {
  const m = text.match(headingRe);
  if (!m) return '';
  const rest = text.slice(m.index);
  const next = rest.slice(m[0].length).search(/^### /m);
  return next < 0 ? rest : rest.slice(0, m[0].length + next);
}

test('PR-07 an optional pre-STEP0 brainstorm stance funnels into the pipeline', () => {
  const en = block(EN, /^### Brainstorm — optional pre-STEP0 stance.*$/m);
  assert.ok(en, 'EN Brainstorm block present');
  assert.match(en, /never write code/);
  assert.match(en, /no required output/);
  assert.match(en, /no flow-state entry|not a tracked step/);
  assert.match(en, /must funnel into the pipeline/);
  assert.match(en, /start \*\*STEP0\*\*/);                     // branch 1
  assert.match(en, /explore track's intent card/);            // branch 2
  assert.match(en, /no third resting place/);                 // the binary is exhaustive
  const cn = block(CN, /^### 脑暴 —— STEP0 前的可选姿态.*$/m);
  assert.ok(cn, 'CN Brainstorm block present');
  assert.match(cn, /绝不写代码/);
  assert.match(cn, /无必需产出/);
  assert.match(cn, /无 flow-state 条目|不是被追踪的步骤/);
  assert.match(cn, /必须漏斗进流程/);
  assert.match(cn, /STEP0/);                                   // branch 1
  assert.match(cn, /探索轨的意图卡/);                          // branch 2
});

test('PR-08 proposal.md is a STEP2 artifact (table + P4 + STEP3 packet, both languages)', () => {
  // §4 artifact table row
  assert.match(EN, /\|[^|]*\|\s*`apriori\/changes\/<change>\/proposal\.md`[^\n]*STEP2/);
  assert.match(CN, /\|[^|]*\|\s*`apriori\/changes\/<change>\/proposal\.md`[^\n]*STEP2/);
  // P4 produces it (inside the P4 propose prompt)
  assert.match(block(EN, /^### P4 — STEP2 propose.*$/m), /write proposal\.md, all spec docs/);
  assert.match(block(CN, /^### P4 —— STEP2 propose.*$/m), /编写 proposal\.md/);
  // STEP3 gate packet includes it
  assert.match(EN, /assemble the packet — proposal\.md, design doc/);
  assert.match(CN, /备齐材料——proposal\.md、设计文档/);
});
