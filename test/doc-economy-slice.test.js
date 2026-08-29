'use strict';
// Documentation-economy slice — only the contracts unique to this slice. Session-start/
// kickoff/command.md entry-point coverage lives in mode.test.js MD-16 and init.test.js
// IN-05; the Review & Deliver KB-precondition wording lives in lean-closeout.test.js LC-07.
const { test } = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.join(__dirname, '..');
const EN = fs.readFileSync(path.join(ROOT, 'RUNBOOK.md'), 'utf8');
const CN = fs.readFileSync(path.join(ROOT, 'RUNBOOK_cn.md'), 'utf8');
const README = fs.readFileSync(path.join(ROOT, 'README.md'), 'utf8');
const README_CN = fs.readFileSync(path.join(ROOT, 'README_cn.md'), 'utf8');
const CONCEPTS = fs.readFileSync(path.join(ROOT, 'docs', 'concepts.md'), 'utf8');
const CONCEPTS_CN = fs.readFileSync(path.join(ROOT, 'docs', 'concepts_cn.md'), 'utf8');
const CI_DOC = fs.readFileSync(path.join(ROOT, 'docs', 'ci.md'), 'utf8');
const CI_DOC_CN = fs.readFileSync(path.join(ROOT, 'docs', 'ci_cn.md'), 'utf8');
const ok = (t, s) => assert.ok(t.includes(s), `expected: ${s}`);
const not = (t, s) => assert.ok(!t.includes(s), `unexpected: ${s}`);

test('DE-A no format shopping, no self-measurement', () => {
  ok(EN, 'another active or archived change to learn a formatting convention');
  ok(CN, '另一个 active 或 archive 的 change');
  ok(EN, 'Claude/session transcripts or logs');
  ok(CN, 'Claude/会话记录或日志');
});

test('DE-B scenarios modeled by observable outcome, every ID still bound RED-first', () => {
  ok(EN, 'Model by observable outcome, not by input example');
  ok(CN, '按可观察结果类别建模,不按输入样例');
  ok(EN, "a failing test that proves every scenario's behavior with real evidence");
  ok(CN, '能用真实证据证明每个 scenario 行为的失败测试');
  not(EN, 'one failing test per spec scenario');
  not(CN, '每个 spec 场景一条失败测试');
  // R02-05 regression guard: the /goal template must not reintroduce a hard "every scenario ID
  // must appear in a test name" gate — that directly conflicts with the advisory default and
  // is what drove R01's TAP-adapter busywork.
  not(EN, 'appears in at least one test name');
  not(CN, 'appears in at least one test name');
  not(EN, 'list any missing IDs');
  not(CN, 'list any missing IDs');
  // R02-06 regression guard: same-root-cause residue named by review round 2 — README's
  // command cheat sheet and docs/concepts.md must not reassert ID-in-test-name as a hard gate.
  not(README, 'bind every scenario ID to a passing test');
  not(README_CN, '把每条 scenario ID 绑定到绿测试');
  not(CONCEPTS, 'named with the scenario');
  not(CONCEPTS_CN, '测试名带 scenario ID）');
  not(CONCEPTS, 'grep-level CI check can enforce');
  not(CONCEPTS_CN, '可 grep 的可追溯性检查');
  // R02-07 regression guard: docs/ci(_cn).md must not reassert verify as "every scenario
  // passing, no orphans" or list unbound/orphan as exit-1 gaps.
  not(CI_DOC, 'no orphans');
  not(CI_DOC_CN, '无孤儿');
  not(CI_DOC, 'unbound/red/orphan/duplicate');
  not(CI_DOC_CN, 'unbound/red/orphan/重复');
});

test('DE-C flow-state stays a checkpoint: Evidence/Open/Next/gates', () => {
  ok(EN, 'never a retelling of the implementation or tests');
  ok(CN, '绝不复述实现或测试');
  ok(EN, 'delete the line on close, never a resolution history');
  ok(CN, '关闭后删掉这一行,绝不留解决史');
  ok(EN, 'the next step only, never a task list or history');
  ok(CN, '只写下一步,绝不是任务清单或历史');
  ok(EN, 'stays one short command+result line');
  ok(CN, '只留一行简短的命令+结果');
});

test('DE-D missing truth is legitimate; only an explicit decision creates it; existing C6 unweakened', () => {
  ok(EN, 'a legitimate state, not a gap to fill by default');
  ok(CN, '这是一个正当状态,不是默认要补的缺口');
  ok(EN, 'explicitly decides to persist a durable, cross-change contract');
  ok(CN, '明确决定为这个模块沉淀一份跨 change 的持久契约');
  ok(EN, 'its freshness (C6) still binds at closeout');
  ok(CN, '它的新鲜度(C6)在收官时仍然生效');
});
