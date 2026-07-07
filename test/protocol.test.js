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

test('PR-07 the brainstorm stance is a structured diverge→converge→funnel, entered via P13', () => {
  const en = block(EN, /^### Brainstorm — optional pre-STEP0 stance.*$/m);
  assert.ok(en, 'EN Brainstorm block present');
  assert.match(en, /never write code/);
  assert.match(en, /no required output/);
  assert.match(en, /no flow-state entry|not a tracked step/);
  assert.match(en, /\*\*P13\*\*/);                             // entered via P13
  // diverge movement
  assert.match(en, /Open threads, not interrogations/);
  assert.match(en, /Ground everything in the actual codebase/);
  assert.match(en, /2-3 ASCII UI-mockup variants/);
  assert.match(en, /risks and unknowns unprompted/i);
  // converge movement
  assert.match(en, /exactly one question per message/);
  assert.match(en, /purpose · target users · core scenarios · UI shape \(when user-facing\) · data & content · constraints · non-goals · success criteria/);
  assert.match(en, /explicitly deferred with the human's consent/);
  assert.match(en, /observed need or a speculation/);          // scope-creep probing (lab: OpenSpec's move)
  assert.match(en, /deferred\/staged path/);
  assert.match(en, /fatigue or impatience/);                   // fatigue batching (lab: V3's spontaneous move, now a rule)
  assert.match(en, /recommended defaults/);
  assert.match(en, /2-3 candidate approaches with tradeoffs and your recommendation/);
  // funnel
  assert.match(en, /must funnel into the pipeline/);
  assert.match(en, /start \*\*STEP0\*\*/);                     // branch 1
  assert.match(en, /explore track's intent card/);            // branch 2
  assert.match(en, /no third resting place/);                 // the binary is exhaustive
  // P13 exists in §5 AND its body mirrors the stance (hard gate, diverge, converge, funnel)
  const p13en = block(EN, /^### P13 — brainstorm kickoff.*$/m);
  assert.ok(p13en, 'EN P13 block present');
  assert.match(p13en, /write NOTHING durable/);
  assert.match(p13en, /no `apriori new`,\s*\nno flow-state|no `apriori new`, no flow-state/);
  assert.match(p13en, /one plain sentence/);
  assert.match(p13en, /read the actual codebase/);
  assert.match(p13en, /surface risks and unknowns without being asked/);
  assert.match(p13en, /2-3 UI-mockup variants/);
  assert.match(p13en, /the winning UI sketch if any/);
  assert.match(p13en, /one question per message/);
  assert.match(p13en, /staged path/);
  assert.match(p13en, /recommended\s+defaults/);
  assert.match(p13en, /2-3 candidate approaches/);
  assert.match(p13en, /I decide when it is stateable/);
  assert.match(p13en, /`req-v1` starting\s*\nmaterial|`req-v1` starting material/);
  const cn = block(CN, /^### 脑暴 —— STEP0 前的可选姿态.*$/m);
  assert.ok(cn, 'CN Brainstorm block present');
  assert.match(cn, /绝不写代码/);
  assert.match(cn, /无必需产出/);
  assert.match(cn, /无 flow-state 条目|不是被追踪的步骤/);
  assert.match(cn, /P13/);
  // CN parity clause-by-clause with the EN assertions above
  assert.match(cn, /开线头而非审问/);
  assert.match(cn, /扎根真实代码库/);
  assert.match(cn, /不等人问就把风险和未知摆出来/);
  assert.match(cn, /2-3 个 ASCII 界面草图变体/);
  assert.match(cn, /每条消息恰好一个问题/);
  assert.match(cn, /给具体选项/);
  assert.match(cn, /目的 · 目标用户 · 核心场景 · 界面形态\(面向用户时\) · 数据与内容 · 约束 · 非目标 · 成功判据/);
  assert.match(cn, /经人同意明确搁置/);
  assert.match(cn, /观察到的真需求/);
  assert.match(cn, /把代价说白/);
  assert.match(cn, /缓做\/分级路线/);
  assert.match(cn, /疲劳或不耐烦/);
  assert.match(cn, /推荐默认值/);
  assert.match(cn, /2-3 个候选方案的取舍对比和你的推荐/);
  assert.match(cn, /必须漏斗进流程/);
  assert.match(cn, /STEP0/);                                   // branch 1
  assert.match(cn, /探索轨的意图卡/);                          // branch 2
  // CN P13 body mirrors the stance too
  const p13cn = block(CN, /^### P13 —— 脑暴启动.*$/m);
  assert.ok(p13cn, 'CN P13 block present');
  assert.match(p13cn, /不留任何持久物/);
  assert.match(p13cn, /不建 flow-state/);
  assert.match(p13cn, /一句大白话/);
  assert.match(p13cn, /读真实代码库/);
  assert.match(p13cn, /不等我问就把风险和未知摆出来/);
  assert.match(p13cn, /2-3 个界面草图变体/);
  assert.match(p13cn, /胜出的界面草图如有/);
  assert.match(p13cn, /每条消息一个问题/);
  assert.match(p13cn, /缓做路线/);
  assert.match(p13cn, /推荐默认值/);
  assert.match(p13cn, /2-3 个候选方案/);
  assert.match(p13cn, /由我判定/);
  assert.match(p13cn, /`req-v1` 起始材料/);
});

test('PR-09 brainstorm exit is human-gated, artifact-free until approval, carries a requirement seed', () => {
  const en = block(EN, /^### Brainstorm — optional pre-STEP0 stance.*$/m);
  // hard gate: no durable artifacts before approval, stated in plain language
  assert.match(en, /never create workflow artifacts either/);
  assert.match(en, /no requirement doc, no spec\/proposal\/design file, no `apriori new`, no flow-state/);
  assert.match(en, /plain-language sentence/);
  assert.match(en, /never recite protocol internals/);
  // human-gated exit: propose only after approaches comparison; human judges stateable
  assert.match(en, /you may \*propose\* exiting/);
  assert.match(en, /the human's judgment, not yours/);
  // requirement seed carried into STEP0 — every field the scenario names
  assert.match(en, /kickoff requirement draft/);
  assert.match(en, /goal, users, chosen approach \(and the UI sketch that won, if any\), success criteria, constraints, non-goals \*\*with the reasons they were cut\*\*, open questions/);
  assert.match(en, /`req-v1` starting material/);
  const cn = block(CN, /^### 脑暴 —— STEP0 前的可选姿态.*$/m);
  assert.match(cn, /绝不创建工作流产物/);
  assert.match(cn, /不跑 `apriori new`/);
  assert.match(cn, /一句大白话/);
  assert.match(cn, /绝不对人背诵协议内部词汇/);
  assert.match(cn, /提议\*退出|\*提议\*退出/);
  assert.match(cn, /由人判定,不由你/);
  assert.match(cn, /kickoff 需求草稿/);
  assert.match(cn, /目标、用户、选定方案\(以及胜出的界面草图,如有\)、成功判据、约束、非目标\*\*连同砍掉它们的理由\*\*、遗留开放问题/);
  assert.match(cn, /`req-v1` 起始材料/);
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

test('PR-10 UI projects render-and-look during implementation; E2E sits above the binding gate', () => {
  // P7: implementation-time visual self-check with ephemeral storage
  const p7en = block(EN, /^### P7 — STEP5 apply.*$/m);
  assert.match(p7en, /don't fly blind/);
  assert.match(p7en, /Playwright screenshots/);
  assert.match(p7en, /simulated clicks/);
  assert.match(p7en, /`apriori\/tmp\/` \(gitignored/);
  assert.match(p7en, /textual observation/);
  // verification matrix: TAP binding vs the E2E/visual layer
  assert.match(EN, /bind to `apriori verify` via unit\/component tests/);
  assert.match(EN, /speaks TAP, which Playwright does not emit/);
  assert.match(EN, /on top of\*\* the binding gate as an additional exit condition/);
  assert.match(EN, /emitting a textual pass\/fail/);
  assert.match(EN, /baseline images belong to the project's own test suite/);
  const p7cn = block(CN, /^### P7 —— STEP5 apply.*$/m);
  assert.match(p7cn, /不许盲飞/);
  assert.match(p7cn, /Playwright 对运行中页面截图/);
  assert.match(p7cn, /模拟点击/);
  assert.match(p7cn, /apriori\/tmp\//);
  assert.match(p7cn, /一行文本观察/);
  assert.match(CN, /经单测\/组件测绑定给 `apriori verify`/);
  assert.match(CN, /只认 TAP,而 Playwright 不输出 TAP/);
  assert.match(CN, /绑定闸口之上作为额外退出条件/);
  assert.match(CN, /文本化 pass\/fail/);
  assert.match(CN, /基线图属于项目自己的测试套件/);
  // README mirrors the matrix (both languages), including baseline ownership
  assert.match(README, /screenshot self-checks land in the gitignored `apriori\/tmp\/`/);
  assert.match(README, /baseline images belong to the project's own test suite/);
  assert.match(README_CN, /截图自查落在已被 gitignore 的 `apriori\/tmp\/`/);
  assert.match(README_CN, /基线图属于项目自己的测试套件/);
});
