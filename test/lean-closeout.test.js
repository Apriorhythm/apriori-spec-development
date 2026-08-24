'use strict';
// Slice C — lean-closeout. Locks the normal ACCEPT+unchanged-code close to four logical
// actions in both editions; keeps the source-commit/KB-truth rule as a precondition (not a
// closeout step, and not something `apriori archive` itself performs); keeps the archived
// bundle frozen (no post-archive write-back, including `phase:`); keeps C1 (bound by the
// pre-archive gate) and archive's own readiness/CAS preflight as distinct responsibilities;
// and pins the four commands the normal path stops rerunning after archive.
const { test } = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.join(__dirname, '..');
const EN = fs.readFileSync(path.join(ROOT, 'RUNBOOK.md'), 'utf8');
const CN = fs.readFileSync(path.join(ROOT, 'RUNBOOK_cn.md'), 'utf8');
const CMD = fs.readFileSync(path.join(ROOT, 'templates', 'command.md'), 'utf8');

// isolate the Review & Deliver section: its heading through the next same-or-shallower heading
function section(text, headingRe) {
  const m = text.match(headingRe);
  if (!m) return '';
  const rest = text.slice(m.index);
  const next = rest.slice(m[0].length).search(/^### /m);
  return next < 0 ? rest : rest.slice(0, m[0].length + next);
}

const enRD = section(EN, /^### Review & Deliver.*$/m);
const cnRD = section(CN, /^### Review & Deliver.*$/m);

test('LC-01 Review & Deliver section exists in both editions', () => {
  assert.ok(enRD, 'EN Review & Deliver section present');
  assert.ok(cnRD, 'CN Review & Deliver section present');
});

test('LC-02 the normal close is exactly four logical actions (both editions)', () => {
  assert.match(enRD, /four logical actions, no more/);
  assert.match(cnRD, /四个逻辑动作,不多不少/);
});

test('LC-03 action 1 — one self-contained review file plus a short flow-state update', () => {
  assert.match(enRD, /one self-contained review file, plus a short flow-state update/);
  assert.match(cnRD, /一个 self-contained 评审文件,外加一次简短的 flow-state 更新/);
});

test('LC-04 action 2 — one verification action: check, then a full (non-review-ready) gate that binds C1', () => {
  assert.match(enRD, /run `apriori check`, then a full `apriori gate --change <name>` \(not `--review-ready`\), which binds C1/);
  assert.match(cnRD, /跑一次 `apriori check`,再跑一次完整的 `apriori gate --change <name>`\(不带 `--review-ready`\),在这些仍未变化的输入上绑定 C1/);
});

test('LC-05 action 3 — archive runs --write directly, no dry-run first, and only merges specs + moves the bundle', () => {
  assert.match(enRD, /run `apriori archive --change <name> --write --changes-dir apriori\/changes` directly/);
  assert.match(enRD, /dry-running first re-checks nothing/);
  assert.match(enRD, /archive merges the delta specs into `apriori\/specs` and moves the bundle, and nothing else/);
  assert.match(cnRD, /直接跑 `apriori archive --change <name> --write --changes-dir apriori\/changes`/);
  assert.match(cnRD, /先跑一次 dry-run 不会多核实出任何东西/);
  assert.match(cnRD, /归档把增量 spec 合并进 `apriori\/specs` 并搬移 bundle,仅此而已/);
});

test('LC-06 action 4 — a local closeout commit, then stop', () => {
  assert.match(enRD, /commit the closeout locally, and stop/);
  assert.match(cnRD, /本地提交收尾,然后停止/);
});

test('LC-07 KB truth update (source-commit + Contract/Decisions) is a precondition, not a closeout step', () => {
  assert.match(enRD, /KB update is a precondition, not a closeout step/);
  assert.match(enRD, /commit the implementation and point `source-commit` at it/);
  assert.match(enRD, /update `apriori\/truth\/<module>\.md` — Contract section from the final implementation/);
  assert.match(cnRD, /知识库更新是前置条件,不是收尾步骤/);
  assert.match(cnRD, /提交实现,让 `source-commit` 指向它/);
  assert.match(cnRD, /更新 `apriori\/truth\/<module>\.md`——Contract 段按最终实现写/);
});

test('LC-08 archive itself never writes apriori/truth/ — only the precondition does', () => {
  assert.match(enRD, /`apriori archive` never touches `apriori\/truth\/`/);
  assert.match(cnRD, /`apriori archive` 从不碰 `apriori\/truth\/`/);
  // regression guard: the old (wrong) claim that archive itself updates truth must not return
  assert.doesNotMatch(enRD, /[Aa]rchive itself merges[\s\S]{0,40}updates `apriori\/truth/);
  assert.doesNotMatch(cnRD, /归档本身按上面接口的归档算法合并;更新 `apriori\/truth/);
});

test('LC-09 the archived bundle is frozen: nothing, including phase:, is written back after archive', () => {
  assert.match(enRD, /The archived bundle is frozen: nothing, including `phase:`, is written back to it/);
  assert.match(cnRD, /归档后的 bundle 是冻结的:任何东西,包括 `phase:`,都不再回写/);
  // regression guard: closeout must not claim it rewrites phase: done into the archived flow-state
  assert.doesNotMatch(enRD, /phase: done. recorded in the archived flow-state/);
  assert.doesNotMatch(cnRD, /归档后的 flow-state 里记着 `phase: done`/);
});

test('LC-10 §3 phase field: archived stage is terminal, done is a compat value nothing writes back', () => {
  assert.match(EN, /A normal archive moves\s*\n?\s*#* *the bundle at `review`, and the archived stage is terminal/);
  assert.match(EN, /`done` stays a legal, readable value; nothing writes it back/);
  assert.match(CN, /正常归档在 `review` 搬移 bundle,\s*\n?\s*#* *归档态即终态/);
  assert.match(CN, /`done` 仍是合法可读值,但没有东西会回写它/);
  // regression guard: the old "done is set after the closeout" instruction must not survive
  assert.doesNotMatch(EN, /`done` is set after the closeout/);
  assert.doesNotMatch(CN, /收官之后才置 `done`/);
});

test('LC-11 C1 and archive readiness are distinct responsibilities — archive readiness is never called "the same" as a post-archive gate', () => {
  assert.match(enRD, /step 2 already bound C1 on these inputs, step 3 already re-checked archive's own readiness and CAS/);
  assert.match(cnRD, /动作二已经在这些输入上绑定过 C1,动作三已经复核过归档自身的就绪度和 CAS/);
  // regression guard: the old over-claim that archive re-derives "the same" post-archive-gate result must not survive
  assert.doesNotMatch(enRD, /re-derives the same readiness a post-archive gate would report/);
  assert.doesNotMatch(cnRD, /重新推导出归档后 gate 会给出的同一份就绪结论/);
});

test('LC-12 the normal path default-drops a separate pre-gate test rerun, all four post-archive commands, and narration', () => {
  assert.match(enRD, /do not rerun the test command separately before step 2's gate/);
  assert.match(enRD, /do not rerun `apriori verify`, `check`, `gate`, or `status` after archive/);
  assert.match(enRD, /do not narrate the full review, flow-state, or command output back to the human/);
  assert.match(cnRD, /不在动作二的 gate 之前单独重跑一次测试命令/);
  assert.match(cnRD, /归档之后不重跑 `apriori verify`、`check`、`gate` 或 `status`/);
  assert.match(cnRD, /不把完整的评审、flow-state 和命令输出向人复述一遍/);
});

test('LC-13 all four post-archive commands (verify, check, gate, status) are named in one disabled-by-default clause', () => {
  const enClause = (enRD.match(/do not rerun[^;]*after archive/) || [''])[0];
  for (const tok of ['`apriori verify`', '`check`', '`gate`', '`status`']) assert.ok(enClause.includes(tok), `EN clause names ${tok}`);
  const cnClause = (cnRD.match(/归档之后不重跑[^;]*或 `status`/) || [''])[0];
  for (const tok of ['`apriori verify`', '`check`', '`gate`', '`status`']) assert.ok(cnClause.includes(tok), `CN clause names ${tok}`);
});

test('LC-14 re-verify conditions still send the change back to Build & Test (both editions)', () => {
  for (const re of [/REVISE/, /conflict, CAS, readiness, or structural problem/,
                    /business file changes between gate \(action 2\) and archive \(action 3\)/,
                    /`apriori check` fails/])
    assert.match(enRD, re, String(re));
  for (const re of [/REVISE/, /冲突、CAS、就绪度或结构问题/,
                    /gate\(动作二\)与归档\(动作三\)之间业务文件发生了变化/,
                    /`apriori check` 失败/])
    assert.match(cnRD, re, String(re));
});

test('LC-15 no new closeout command surface: no deliver command, journal, or hash database', () => {
  for (const doc of [EN, CN, CMD]) {
    assert.doesNotMatch(doc, /apriori deliver\b/);
    assert.doesNotMatch(doc, /\bjournal\b/i);
    assert.doesNotMatch(doc, /hash[ -]?(database|db)\b/i);
  }
});

test('LC-16 templates/command.md stays generic — it does not hardcode closeout steps', () => {
  for (const re of [/apriori archive/, /apriori gate/, /apriori check/, /dry-run/i])
    assert.doesNotMatch(CMD, re, String(re));
});
