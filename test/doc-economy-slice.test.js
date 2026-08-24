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
  ok(EN, 'a failing test bound to every Scenario ID');
  ok(CN, '让每个 Scenario ID 都绑定一条失败测试');
  not(EN, 'one failing test per spec scenario');
  not(CN, '每个 spec 场景一条失败测试');
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
