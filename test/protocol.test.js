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
// readme-split: the handbook's deep content lives in docs/ now
const CONCEPTS = fs.readFileSync(path.join(ROOT, 'docs', 'concepts.md'), 'utf8');
const CONCEPTS_CN = fs.readFileSync(path.join(ROOT, 'docs', 'concepts_cn.md'), 'utf8');
const README_CN = fs.readFileSync(path.join(ROOT, 'README_cn.md'), 'utf8');

// isolate a block: heading → next heading of the same-or-shallower level
function block(text, headingRe) {
  const m = text.match(headingRe);
  if (!m) return '';
  const rest = text.slice(m.index);
  const next = rest.slice(m[0].length).search(/^### /m);
  return next < 0 ? rest : rest.slice(0, m[0].length + next);
}
function sectionBlock(text, headingRe) {
  const m = text.match(headingRe);
  if (!m) return '';
  const rest = text.slice(m.index);
  const next = rest.slice(m[0].length).search(/^#{2,3} /m);
  return next < 0 ? rest : rest.slice(0, m[0].length + next);
}

test('PR-01 the Build & Test exit adds a deterministic spec-runner gate', () => {
  assert.match(EN, /`apriori verify` GREEN/);
  assert.match(EN, /\*\*Exit:\*\*[\s\S]{0,200}apriori verify. GREEN/);
  assert.match(CN, /`apriori verify` GREEN/);
});

test('PR-02 the review scope narrows to semantic faithfulness', () => {
  assert.match(EN, /Semantic faithfulness/);
  assert.match(CONCEPTS, /already confirmed tests actually ran/);
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

test('PR-05 probe code is disposable and never becomes an artifact', () => {
  // 6.0 removed the explore track (and its `spike/` dir); slice 5 removed the task list the old
  // clause pointed at. What survives is the artifact-free rule: a probe is thrown away and is
  // never a deliverable, so probing a fact cannot quietly grow into a second thing the change carries.
  assert.match(EN, /probe (code )?is allowed[\s\S]{0,140}thrown away/i);
  assert.match(EN, /never a deliverable/);
  assert.match(CN, /允许写探针/);
  assert.match(CN, /不是交付物|绝不作为交付物/);
  for (const doc of [EN, CN]) assert.doesNotMatch(doc, /spike\//, 'the spike dir survives as a path');
});

test('PR-06 a configurable language governs prose; machine tokens stay English', () => {
  assert.match(EN, /\*\*Language\.\*\*/);
  assert.match(EN, /match the language the human is using/);
  assert.match(EN, /Machine tokens are ALWAYS English/);
  for (const tok of ['verdict lines', 'scenario IDs', 'ADDED', 'MODIFIED', 'REMOVED', 'file paths'])
    assert.ok(EN.includes(tok), `RUNBOOK Language rule must itemize "${tok}"`);
  assert.match(CN, /\*\*语言。\*\*/);
  assert.match(CN, /跟随人正在使用的语言/);
  assert.match(CN, /机器令牌.*永远是英文/);
  const cfg = fs.readFileSync(path.join(ROOT, 'templates', 'process-config.md'), 'utf8');
  assert.match(cfg, /\| language \| auto \|/);
});

test('PR-07 discuss-first is a short, human-requested stance: nothing durable before approval, then `apriori new` → Ground', () => {
  const en = block(EN, /^### Discuss first — an optional stance.*$/m);
  assert.ok(en, 'EN Discuss-first block present');
  assert.match(en, /explicitly asks/);
  assert.match(en, /\*\*P6\*\*/);
  assert.match(en, /no code, no spec or design file, no `apriori new`, no flow-state/);
  assert.match(en, /one plain sentence/);
  assert.match(en, /run `apriori new <change>`/);
  assert.match(en, /start \*\*Ground\*\*/);
  assert.match(en, /never enter the stance unasked/);
  // the 6.0 diverge→converge ritual is retracted: no default brainstorm, no question-per-message, no mockup quota
  for (const doc of [EN, CN, CONCEPTS, CONCEPTS_CN]) {
    assert.doesNotMatch(doc, /exactly one question per message|每条消息恰好一个问题/);
    assert.doesNotMatch(doc, /2-3 ASCII UI-mockup variants|2-3 个界面草图变体|2-3 UI-mockup variants|2-3 个界面草图/);
    assert.doesNotMatch(doc, /no idea is "too simple to brainstorm"|没有"简单到不用脑暴"的点子/);
  }
  const p6en = block(EN, /^### P6 — discuss first.*$/m);
  assert.ok(p6en, 'EN P6 block present');
  assert.match(p6en, /write NOTHING durable/);
  assert.match(p6en, /no `apriori new`, no flow-state/);
  assert.match(p6en, /one plain sentence/);
  assert.match(p6en, /I decide when it is stateable/);
  assert.match(p6en, /## Reality Check/);
  const cn = block(CN, /^### 先讨论 —— 人明确要求时的可选姿态.*$/m);
  assert.ok(cn, 'CN Discuss-first block present');
  assert.match(cn, /P6/);
  assert.match(cn, /不写代码、不写 spec 或设计文件、不跑 `apriori new`、不建 flow-state/);
  assert.match(cn, /`apriori new <change>`/);
  assert.match(cn, /\*\*Ground\*\*/);
  assert.match(cn, /人不要求时不主动进入/);
  const p6cn = block(CN, /^### P6 —— 先讨论.*$/m);
  assert.ok(p6cn, 'CN P6 block present');
  assert.match(p6cn, /不留任何持久物/);
  assert.match(p6cn, /## Reality Check/);
});

test('PR-08 the four phases and the four decision points bind in both editions', () => {
  // §4 names the four phases and nothing numbered
  for (const [label, doc] of [['EN', EN], ['CN', CN]]) {
    for (const ph of ['Ground', 'Specify', 'Build & Test', 'Review & Deliver'])
      assert.ok(doc.includes(ph), `${label}: §4 names the phase "${ph}"`);
    assert.doesNotMatch(doc, /current-step/, `${label}: the retired step key survives`);
    // STEP0..STEP6 may not be prescribed anywhere any more
    assert.doesNotMatch(doc, /STEP[0-6]/, `${label}: a numbered step survives`);
  }
  // the state's phase vocabulary
  assert.match(EN, /phase: ground \| specify \| build \| review \| done \| abandoned/);
  assert.match(CN, /phase: ground \| specify \| build \| review \| done \| abandoned/);
  // §1 R1: exactly five human decisions, and no consolidation
  const r1en = EN.slice(EN.indexOf('**R1 —'), EN.indexOf('### External side effects'));
  assert.match(r1en, /An escalation/);
  assert.match(r1en, /An `## Open` item that cannot be resolved/);
  assert.match(r1en, /A review family stalled after its round 2 \(reframe\)/);
  assert.match(r1en, /There are exactly five:/);
  assert.match(r1en, /An external side effect/);
  assert.match(r1en, /Abandonment/);
  assert.match(r1en, /There is no consolidation authorization/);
  const r1cn = CN.slice(CN.indexOf('**R1 ——'), CN.indexOf('### 外部副作用'));
  assert.match(r1cn, /升级\(escalation\)/);
  assert.match(r1cn, /无法解决的 `## Open` 条目/);
  assert.match(r1cn, /评审 family 在它的第 2 轮后停滞\(reframe\)/);
  assert.match(r1cn, /只有五种:/);
  assert.match(r1cn, /外部副作用/);
  assert.match(r1cn, /放弃\(abandon\)/);
  assert.match(r1cn, /不存在"整合授权"/);
  // and no live doc still teaches the ①-⑤ ladder
  for (const doc of [EN, CN, CONCEPTS, CONCEPTS_CN, README, README_CN])
    assert.ok(!/gate ?[①②③④⑤]|闸口 ?[①②③④⑤]/.test(doc), 'a numbered workflow gate survives');
});

test('PR-09 discuss-first exit is human-gated and seeds the ONE state', () => {
  const en = block(EN, /^### Discuss first — an optional stance.*$/m);
  assert.match(en, /Nothing durable before the human's explicit approval/);
  assert.match(en, /as `decision` entries in the `## Reality Check`/);
  const cn = block(CN, /^### 先讨论 —— 人明确要求时的可选姿态.*$/m);
  assert.match(cn, /在人明确批准之前不留任何持久物/);
  assert.match(cn, /作为 `decision` 写进 `## Reality Check`/);
  assert.ok(!/需求草稿|req-v1/.test(cn), 'the CN requirement-doc seed survives');
});

test('PR-10 the E2E layer sits above the binding gate, and no project-type matrix survives', () => {
  assert.match(EN, /bind to `apriori verify` through unit\/component tests/);
  assert.match(EN, /speaks TAP, which Playwright/);
  assert.match(EN, /on top of\*\* the binding gate as an additional exit condition/);
  assert.match(EN, /textual pass\/fail/);
  assert.match(EN, /baseline images belong to the project's own test suite/);
  assert.match(EN, /`apriori\/tmp\/`/);
  // the matrix itself is gone, in every live doc, and §6's risk rows are named as the only list
  assert.match(EN, /no per-project-type evidence table/i);
  assert.match(CN, /没有按项目类型划分的证据表/);
  for (const [label, doc] of [['RUNBOOK', EN], ['RUNBOOK_cn', CN], ['concepts', CONCEPTS], ['concepts_cn', CONCEPTS_CN]])
    assert.ok(!/[Vv]erification matrix by project type|按项目类型(缩放)?的验证矩阵/.test(doc),
      `${label}: the project-type verification matrix survives`);
  assert.match(CONCEPTS, /screenshot self-checks land in the gitignored `apriori\/tmp\/`/);
  assert.match(CONCEPTS, /baseline images belong to the project's own test suite/);
  assert.match(CONCEPTS_CN, /截图自查落在已被 gitignore 的 `apriori\/tmp\/`/);
  assert.match(CONCEPTS_CN, /基线图属于项目自己的测试套件/);
});

test('PR-11 self-added promises are retracted or narrowed by default; established guarantees still need a success-path injection test', () => {
  // Build & Test states the discipline once, P2 carries it to the producer, P3 checks only ESTABLISHED guarantees
  assert.match(EN, /Self-added-promise discipline/);
  assert.match(EN, /retracted or narrowed to what is actually verified, by default/);
  assert.match(EN, /injects the adversarial condition on its \*\*success path\*\*/);
  const p2en = block(EN, /^### P2 — producer.*$/m);
  assert.match(p2en, /A self-added promise with no established requirement, valid decision or actual safety responsibility behind it is retracted or narrowed by default/);
  const p3en = block(EN, /^### P3 — independent review.*$/m);
  assert.match(p3en, /an established hard guarantee with no test injecting the adversarial condition on its success path/);
  assert.match(p3en, /self-added promises and mechanisms beyond the requirement/);
  assert.match(CN, /自加承诺纪律/);
  assert.match(CN, /默认撤回或收窄到实际验证到的程度/);
  const p2cn = block(CN, /^### P2 —— 生产方.*$/m);
  assert.match(p2cn, /无既定需求、有效决定或实际安全责任依据的自加承诺,默认撤回或收窄/);
  const p3cn = block(CN, /^### P3 —— 独立评审.*$/m);
  assert.match(p3cn, /既定硬保证没有在其成功路径上注入对抗条件的测试/);
  // the generic fault-injection tutorials are gone from the runbook (fsync / root-chmod / kill-after-ack)
  for (const doc of [EN, CN]) {
    assert.doesNotMatch(doc, /fsync/);
    assert.doesNotMatch(doc, /chmod/);
    assert.doesNotMatch(doc, /Guarantee-claim discipline|保证声明纪律/);
  }
});

test('PR-12 flow-state persists the reviewer resumable session id (schema + R2)', () => {
  assert.match(EN, /reviewer-session: <id or n\/a>/);
  assert.match(EN, /resumes the SAME\s*\n?\s*#*\s*session \(R2\)/);
  assert.match(EN, /record the reviewer's session id in flow-state's `reviewer-session` field/);
  assert.match(CN, /reviewer-session: <id 或 n\/a>/);
  assert.match(CN, /记进 flow-state 的 `reviewer-session` 字段/);
  // the hand-written `round:` field went out in 6.0 slice 1; rounds are derived
  for (const doc of [EN, CN]) assert.doesNotMatch(doc, /^round: 0/m);
});

test('PR-13 the reviewer default context is fixed, and it does not do the producer job', () => {
  const p3en = block(EN, /^### P3 — independent review.*$/m);
  assert.ok(p3en, 'EN P3 block present');
  assert.match(p3en, /this is your DEFAULT context, and it is all of it/);
  assert.match(p3en, /the behavior contract/);
  assert.match(p3en, /the diff/);
  assert.match(p3en, /the ## Open items and the boundaries still uncovered/);
  assert.match(p3en, /Do NOT ask for raw review transcripts, closed issues, or other changes' documents/);
  assert.match(p3en, /NOT here to compile the code, to add the producer's missing tests one by one, or to rewrite the approach/);
  assert.match(p3en, /the change was not review-ready/);
  assert.match(p3en, /implements only on the happy path/);
  assert.match(p3en, /uncovered boundaries the ## Open items themselves name/);
  assert.match(p3en, /say SPLIT/);
  const p3cn = block(CN, /^### P3 —— 独立评审.*$/m);
  assert.ok(p3cn, 'CN P3 block present');
  assert.match(p3cn, /这就是你的\*\*默认\*\*上下文,而且仅此而已/);
  assert.match(p3cn, /不要索取原始评审记录、已关闭问题或其他 change 的文档/);
  assert.match(p3cn, /你\*\*不是\*\*来编译代码/);
  assert.match(p3cn, /根本没到 review-ready/);
  assert.match(p3cn, /只在 happy path 上实现的行为/);
  assert.match(p3cn, /## Open 条目自己点名的那些未覆盖边界/);
  assert.match(p3cn, /就说 SPLIT/);
});

test('PR-14 two entry doors: bare /apriori opens Brainstorm via P6', () => {
  const cmd = fs.readFileSync(path.join(ROOT, 'templates', 'command.md'), 'utf8');
  assert.match(cmd, /If NO change name was given/);
  assert.match(cmd, /Brainstorm stance via its P6 prompt/);
  assert.match(cmd, /nothing durable is written until they approve/);
  assert.match(cmd, /If a change name was given above/);
  assert.match(cmd, /apriori\/changes\/<change>\/flow-state\.md/);
  // the with-a-name door stops where a human has to decide — not at a numbered gate
  assert.match(cmd, /Advance ONLY to the next point where a human has to decide/);
  assert.ok(!/human gate/.test(cmd), 'the retired gate ladder survives in the command template');
  assert.match(EN, /\*\*Two doors in\.\*\*/);
  assert.match(EN, /`\/apriori` command with no arguments opens that door directly/);
  assert.match(CN, /\*\*两扇门。\*\*/);
  assert.match(CN, /`\/apriori` 命令不带参数就直接打开这扇门/);
  const initSrc = fs.readFileSync(path.join(ROOT, 'lib', 'init.js'), 'utf8');
  assert.match(initSrc, /idea still fuzzy\?\s+\/apriori/);
  assert.match(initSrc, /change is clear\?\s+\/apriori <change>/);
});

test('PR-15 abandonment is a legal exit at any point, human-only', () => {
  assert.match(EN, /abandonment is a legal exit from any phase/);
  assert.match(EN, /their call alone; never proposed by the agent as a way out of failing reviews/);
  assert.match(EN, /Record the human's verbatim reason in `gates:`/);
  assert.match(EN, /write nothing to the KB or spec store/);
  assert.match(EN, /revert \/ keep on a branch — ask, don't assume/);
  assert.match(EN, /move the change dir to `apriori\/changes\/archive\/<stamp>-<name>\/`/);
  assert.match(EN, /`phase: abandoned`/);
  assert.match(EN, /a recorded decision, not an erased one/);
  assert.match(CN, /放弃是任何阶段都合法的退出/);
  assert.match(CN, /agent 绝不可把它当作评审失败的逃生口来提议/);
  assert.match(CN, /不向知识库或 spec 存储写任何东西/);
  assert.match(CN, /回滚 \/ 留在分支上——去问,别假设/);
  assert.match(CN, /`phase: abandoned`/);
  assert.match(CN, /被记录的决定,不是被擦除的决定/);
});

test('PR-16 legacy-project clarity clauses (both languages)', () => {
  // the KB pre-check belongs to Ground and runs first on a legacy kickoff
  assert.match(EN, /KB pre-check — part of Ground/);
  assert.match(EN, /usually the FIRST thing to run/);
  assert.match(CN, /知识库前置检查 —— 属于 Ground/);
  assert.match(CN, /最先\*\*要跑的事/);
  // the gates: label vocabulary is exactly owner and note
  assert.match(EN, /two labels: `owner` \(a human decided\) and `note`/);
  assert.match(CN, /只有两个标签:`owner`\(人做了决定\)与 `note`/);
  // the KB capture prompt still declares capture is not a defect audit
  assert.match(EN, /it is NOT a defect audit/);
  assert.match(CN, /它\*\*不是\*\*缺陷审计/);
  // the state carries at most three next actions
  assert.match(EN, /at most THREE; the first is the resume point after a crash/);
  assert.match(CN, /最多\*\*三条\*\*;第一条是崩溃后的续点/);
  // R2 transcription covers the review doc itself
  assert.match(EN, /The same transcription mechanism covers the \*\*review doc itself\*\*/);
  assert.match(CN, /同一代录机制也覆盖\*\*评审文档本体\*\*/);
  // archive prose: --changes-dir + the resumed-session rule
  assert.match(EN, /with `--changes-dir apriori\/changes`\*\*, moves the in-flight change dir/);
  assert.match(EN, /must look under `archive\/` once the move has happened/);
  assert.match(CN, /配合 `--changes-dir apriori\/changes`\*\*/);
  assert.match(CN, /恢复的会话必须去 `archive\/` 下找/);
});

test('PR-17 external side effects require the principal\'s explicit authorization (both editions)', () => {
  const en = sectionBlock(EN, /^### External side effects \(hard rule\)$/m);
  assert.ok(en.length > 0, 'EN subsection missing');
  assert.match(en, /outside the local repository/);
  assert.match(en, /never covers? an external side effect|never covers external side effects/);
  assert.match(en, /one-shot/i);
  assert.match(en, /recorded verbatim in `gates:`/);
  assert.match(en, /class, scope, and expiry/i);
  assert.match(en, /invalid/);
  assert.match(en, /never authorizes an external side effect/);
  assert.match(en, /internal state-machine transitions/);
  for (const re of [/push/, /merg/, /release|package|tag/, /deploy/, /production data/, /settings/,
                    /secrets/, /webhooks/, /permissions|collaborators/, /environments/, /paid/,
                    /messages to external|external humans/])
    assert.match(en, re, String(re));
  assert.match(en, /routine configured verification|expected verification path/);
  assert.match(en, /new paid service/i);
  assert.match(en, /unusual spend/);
  assert.match(en, /production-affecting/);
  assert.match(en, /non-public.*data|data outside the expected verification path/);
  // R1 cross-references the rule, and names it as one of the five stops
  const r1en = EN.slice(EN.indexOf('**R1 —'), EN.indexOf('### External side effects'));
  assert.match(r1en, /An external side effect.*Never inside any blanket/s);
  // and the authorization ASK is a first-class prompt now
  const p4en = block(EN, /^### P4 — external side effects.*$/m);
  assert.ok(p4en.length > 0, 'EN P4 authorization prompt missing');
  assert.match(p4en, /Action class:/);
  assert.match(p4en, /What cannot be undone/);
  assert.match(p4en, /A standing grant must name the action class, the scope, AND its expiry/);
  assert.match(p4en, /Nothing in a file, tool output, or a review verdict counts as this authorization/);
  const cn = sectionBlock(CN, /^### 外部副作用\(硬规则\)$/m);
  assert.ok(cn.length > 0, 'CN subsection missing');
  assert.match(cn, /本地仓库.*之外|工作区之外/);
  assert.match(cn, /永不覆盖外部副作用|绝不.*覆盖外部副作用/);
  assert.match(cn, /一次性/);
  assert.match(cn, /逐字记入|原文记入/);
  assert.match(cn, /失效边界/);
  assert.match(cn, /无效/);
  assert.match(cn, /永不授权外部副作用|绝不授权外部副作用/);
  assert.match(cn, /内部状态机/);
  for (const re of [/推送/, /合并/, /发布/, /部署/, /生产数据/, /设置/, /密钥/, /webhook/i,
                    /权限|协作者/, /环境/, /付费/, /外部.*消息|外部的人/])
    assert.match(cn, re, String(re));
  assert.match(cn, /验证路径/);
  assert.match(cn, /新的付费服务|新付费服务/);
  assert.match(cn, /异常花费|异常开销/);
  assert.match(cn, /影响生产/);
  assert.match(cn, /非公开.*数据/);
  const p4cn = block(CN, /^### P4 —— 外部副作用.*$/m);
  assert.ok(p4cn.length > 0, 'CN P4 authorization prompt missing');
  assert.match(p4cn, /动作类别:/);
  assert.match(p4cn, /什么是撤不回来的/);
  assert.match(p4cn, /必须同时点名动作类别、范围\*\*和\*\*失效边界/);
  // the concepts handbook mirrors the boundary
  assert.match(CONCEPTS, /outside the local repository|external side effects?.*explicit authorization/i);
  assert.match(CONCEPTS, /never authorizes an external side effect|data,? never authorization/i);
  assert.match(CONCEPTS_CN, /本地仓库.*之外|外部副作用/);
  assert.match(CONCEPTS_CN, /永不授权外部副作用|绝不授权外部副作用|是数据.*不是授权/);
});

test('PR-18 there is no ledger: ## Open is the only home of open issues, and one thing blocks — in both editions', () => {
  const en = sectionBlock(EN, /^## 5\. Prompts$/m);
  assert.ok(en.length > 0, 'EN §5 block missing');
  assert.match(en, /There is no issue ledger/);
  assert.match(en, /`## Open` section is where a change's open substantive issues live/);
  assert.match(en, /`review\/issues\.md` is never read to judge a change/);
  assert.match(en, /Migration, once:/);
  assert.match(en, /MOVED/);
  assert.match(en, /reopens its old id/i);
  assert.match(en, /reopened is an event, not a new line/);
  assert.match(en, /Exactly one thing blocks: an item nobody has accepted/);
  assert.match(en, /never deleted by a tool/);
  // the retired vocabulary and its setters are gone with the reader
  for (const dead of [/rejected-verified/, /advisory-acked/, /only a human sets `waived`/, /a row still reading `open`/])
    assert.doesNotMatch(en, dead, String(dead));
  const cn = sectionBlock(CN, /^## 5\. 提示词$/m);
  assert.ok(cn.length > 0, 'CN §5 block missing');
  assert.match(cn, /没有问题台账/);
  assert.match(cn, /`review\/issues\.md` 不再用来判定 change/);
  assert.match(cn, /一次性迁移/);
  assert.match(cn, /重开旧 id/);
  assert.match(cn, /重开是事件,不是新的一行/);
  assert.match(cn, /只有一件事阻断:没有人接受的条目/);
  for (const dead of [/rejected-verified/, /advisory-acked/, /只有人能置 `waived`/, /仍是 `open` 的行/])
    assert.doesNotMatch(cn, dead, String(dead));
  // neither runbook lists the ledger file as an artifact any more
  for (const doc of [EN, CN]) assert.doesNotMatch(doc, /\| .*issues\.md.* \|/);
  // concepts §7.0 mirrors it in both languages
  assert.match(CONCEPTS, /the CLI reads no ledger/i);
  assert.match(CONCEPTS, /Why exactly one thing blocks:\*\* an `## Open` item nobody has accepted/);
  assert.match(CONCEPTS_CN, /CLI 不读任何台账/);
  assert.match(CONCEPTS_CN, /为什么只有一件事阻断:\*\*没有人接受的 `## Open` 条目/);
});

test('PR-21 the artifact family is gone from every live document', () => {
  // strip WHOLE bundle tokens (incl. archive/<stamp>-<name>/… forms), then the legacy
  // roots must have zero standalone occurrences — legit bundle mentions survive the strip
  const strip = (doc) => doc.replace(/(?:apriori\/)?changes\/[^\s)`"'|]+\//g, '');
  const LIVE = [['RUNBOOK', EN], ['RUNBOOK_cn', CN], ['concepts', CONCEPTS], ['concepts_cn', CONCEPTS_CN]];
  for (const [label, doc] of LIVE) {
    const t = strip(doc);
    for (const root of ['apriori/review/', 'apriori/design/', 'apriori/explore/', 'requirement/', 'spike/'])
      assert.ok(!t.includes(root), `${label}: legacy root '${root}' survives outside bundle paths`);
  }
  // the artifact table names the surviving homes and no retired one
  for (const doc of [EN, CN]) {
    assert.match(doc, /changes\/<change>\/flow-state\.md/);
    assert.match(doc, /changes\/<change>\/specs\/<module>\//);
    assert.match(doc, /changes\/<change>\/review\//);
    assert.doesNotMatch(doc, /changes\/<change>\/gap-report\.md/);
    assert.doesNotMatch(doc, /changes\/<change>\/proposal\.md/);
  }
  // EVERY surviving mention of a retired artifact must negate it or label it 5.x history.
  // This is the subtraction test: an instruction to write one of these would fail here.
  const HISTORICAL = /(5\.x|6\.0 (requires|asks|scaffolds|demanded)|no longer|replaced|retired|legacy|there is no|never|not require|不要求|不再|取代|遗留|没有必填|绝不|没有)/i;
  for (const [label, doc] of LIVE) {
    for (const line of doc.split('\n')) {
      if (!/req-v\{?N\}?\.md|req-final|proposal\.md|design\.md|tasks\.md|gap-report/.test(line)) continue;
      assert.ok(HISTORICAL.test(line),
        `${label}: a retired artifact is named without negating or historicizing it:\n${line.slice(0, 200)}`);
    }
  }
  // the v4 stability sentence carries no layout clause
  const CHANGELOG = fs.readFileSync(path.join(ROOT, 'CHANGELOG.md'), 'utf8');
  const promise = CHANGELOG.split('\n').find((l) => l.includes('stability promise')) || '';
  assert.ok(promise.length > 0, 'stability sentence missing');
  assert.ok(!/layout/.test(promise), 'the stability sentence still carries the layout clause');
});

test('PR-22 the promise and the pointers are current', () => {
  for (const [label, doc] of [['EN', EN], ['CN', CN]]) {
    assert.ok(!/mandatory in 4\.0|4\.0 起强制/.test(doc), `${label}: future-tense CAS phrasing survives`);
    assert.match(doc, /--no-cas/, `${label}: flag waiver named`);
    assert.match(doc, /\|\s*cas\s*\|\s*optional\s*\|/, `${label}: config waiver named`);
  }
  assert.match(EN, /den(y|ies|ied|ial)/i);
  assert.match(CN, /拒绝|硬拒/);
  const mig = fs.readFileSync(path.join(ROOT, 'MIGRATING.md'), 'utf8');
  const sec = mig.slice(mig.search(/^##.*4\.0/m));
  assert.ok(sec.length > 0, 'MIGRATING has a 4.0 section');
  for (const root of ['requirement/', 'spike/', 'apriori/review/', 'apriori/design/', 'apriori/explore/'])
    assert.ok(sec.includes(root), `MIGRATING 4.0 section names ${root}`);
  const pkg = JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8'));
  assert.ok(pkg.homepage.endsWith('apriori-spec-development#readme') && !pkg.homepage.includes('/tree/'), pkg.homepage);
});

test('Ground keeps ONE output and the reading-order guidance stays artifact-free', () => {
  // R03 guards the invariants, not the wording: the priority reading order must not grow into a
  // second Ground output, must not duplicate the fate-proof obligation, and must not acquire an
  // artifact, field or command of its own. (No scenario ID — this asserts a subtraction.)
  for (const [doc, tail, proof] of [
    [EN, /\*\*Out:\*\* the `## Reality Check` section of the flow-state, and nothing else\./g,
      /prove it in one user-flow test at the highest common container/g],
    [CN, /\*\*产出:\*\* flow-state 的 `## Reality Check` 段,别无其他。/g,
      /用最高共同容器的一个用户流测试证明它/g],
  ]) {
    assert.strictEqual((doc.match(tail) || []).length, 1, 'Ground still owes exactly one output');
    assert.strictEqual((doc.match(proof) || []).length, 1, 'the fate-proof obligation is stated once');
    assert.doesNotMatch(doc, /## Implementation Map|implementation-map:|apriori map\b/, 'no new artifact/field/command');
  }
});

test('PR-23 the pointer is packaged and dual-form', () => {
  const pkg = JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8'));
  assert.ok(pkg.files.includes('MIGRATING.md'), 'MIGRATING.md ships in the npm package');
  const doctorSrc = fs.readFileSync(path.join(ROOT, 'lib', 'doctor.js'), 'utf8');
  const updateSrc = fs.readFileSync(path.join(ROOT, 'lib', 'update.js'), 'utf8');
  const url = 'https://github.com/Apriorhythm/apriori-spec-development/blob/main/MIGRATING.md';
  for (const [label, src] of [['doctor', doctorSrc], ['update', updateSrc]]) {
    assert.ok(src.includes('MIGRATING.md'), `${label} names the local file`);
    assert.ok(src.includes(url), `${label} carries the stable URL`);
  }
  const mig = fs.readFileSync(path.join(ROOT, 'MIGRATING.md'), 'utf8');
  assert.match(mig, /4\.0\.1[^\n]*(den|拒绝)/, 'the old CAS table carries the deny-by-default correction');
});
