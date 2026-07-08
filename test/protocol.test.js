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

test('PR-11 hard guarantees must be exercised by a fault-injecting test (§4.8 + P8)', () => {
  // verification matrix carries the guarantee-claim discipline
  assert.match(EN, /Guarantee-claim discipline/);
  assert.match(EN, /injects\*\* the adversarial condition|injects the adversarial condition/);
  assert.match(EN, /crash durability/);
  assert.match(EN, /scope the wording down to what is actually verified/);
  // improvement #2: match injection to the claim on its SUCCESS path; fsync(file)+fsync(dir) gotcha
  assert.match(EN, /killing the process AFTER the success is acknowledged, then restarting/);
  assert.match(EN, /an error-path test does not prove a success-path guarantee/);
  assert.match(EN, /both the temp file AND its containing directory/);
  assert.match(EN, /read it back through the app's own load path after a real restart/);
  // P8 dimension 5 names it a spec-vs-code gap
  assert.match(block(EN, /^### P8 — STEP5 consistency reviewer.*$/m), /Guarantee claims:/);
  assert.match(block(EN, /^### P8 — STEP5 consistency reviewer.*$/m), /unexercised hard guarantee is a spec-vs-code gap/);
  assert.match(CN, /保证声明纪律/);
  assert.match(CN, /注入对抗条件/);
  assert.match(CN, /把措辞收窄到实际验证到的程度/);
  assert.match(CN, /在成功被确认之后杀掉进程、再重启、验证数据仍在/);
  assert.match(CN, /测错误路径证明不了成功路径的保证/);
  assert.match(CN, /临时文件和它的承载目录都做 `fsync`/);
  assert.match(CN, /真重启后经应用自己的读回路读出来/);
  const p8cn = block(CN, /^### P8 —— STEP5 一致性评审方.*$/m);
  assert.match(p8cn, /保证声明:/);
  assert.match(p8cn, /未经验证的硬保证是规格-代码缺口/);
  assert.match(p8cn, /不标 advisory/);
});

test('PR-12 flow-state persists the reviewer resumable session id (schema + R2)', () => {
  // schema field
  assert.match(EN, /reviewer-session: <id or n\/a>/);
  assert.match(EN, /resumes the SAME\s*\n?\s*#*\s*session \(R2\)/);
  // R2 names it as the persistence point
  assert.match(EN, /record the reviewer's session id in flow-state's `reviewer-session` field/);
  assert.match(CN, /reviewer-session: <id 或 n\/a>/);
  assert.match(CN, /记进 flow-state 的 `reviewer-session` 字段/);
  // ledger round stage-prefix disambiguation
  assert.match(EN, /label rounds with\s*\n?\s*#*\s*their step \(STEP0·r1, STEP5·r1\)/);
  assert.match(CN, /前缀\(STEP0·r1、STEP5·r1\)/);
});

test('PR: P4 produces tasks.md as a STEP2 output (both languages)', () => {
  assert.match(block(EN, /^### P4 — STEP2 propose.*$/m), /write proposal\.md, all spec docs, the design doc, and tasks\.md/);
  assert.match(block(EN, /^### P4 — STEP2 propose.*$/m), /tasks\.md — the ordered implementation checklist STEP5 consumes/);
  const p4cn = block(CN, /^### P4 —— STEP2 propose.*$/m);
  assert.match(p4cn, /编写 proposal\.md、全部规格文档、设计文档与 tasks\.md/);
  assert.match(p4cn, /tasks\.md —— STEP5 消费的有序实现清单;STEP2 就是它的产出步骤/);
});

test('PR-13 UI render-and-look drives spec boundaries, not the happy path (P7, both languages)', () => {
  const p7en = block(EN, /^### P7 — STEP5 apply.*$/m);
  assert.match(p7en, /Drive the SPEC BOUNDARIES, not just the happy path/);
  assert.match(p7en, /min AND max/);
  assert.match(p7en, /must be REACHABLE and exercised through the real UI/);
  assert.match(p7en, /hard cap below the max/);
  assert.match(p7en, /pre-filters what the server is spec'd to reject/);
  assert.match(p7en, /spec-vs-code gap/);
  assert.match(p7en, /surface the rejection to the user/);
  const p7cn = block(CN, /^### P7 —— STEP5 apply.*$/m);
  assert.match(p7cn, /要压\*\*规格边界\*\*、不止 happy path/);
  assert.match(p7cn, /min 和 max 都要/);
  assert.match(p7cn, /都必须能从真实 UI \*\*触达\*\*并被走一遍/);
  assert.match(p7cn, /上限被硬编码在规格 max 之下/);
  assert.match(p7cn, /预先过滤掉了服务端本该拒绝的东西/);
  assert.match(p7cn, /规格-代码缺口/);
  assert.match(p7cn, /把拒绝呈现给用户/);
});
