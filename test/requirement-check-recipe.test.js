'use strict';
// requirement-check-recipe — PR-67 (both operator editions carry the optional requirement-level
// independent check: its reviewer, inputs, landing place, disposition and completion condition) and
// PR-68 (the guide keeps a requirement-level check's successor checklist beside the requirement's
// sources). Claude × Astra consensus R59 §三 batch 2 and §五; owner "执行" 2026-10-02.
// check-recipe-revision (S16 consensus, owner "批准" 2026-10-23): any requirement before test, the
// version-pinned effective contracts, three added dimensions, fixes back into an in-flight change;
// PR-69 the script stands on its own; PR-70 the runbook says where lasting provenance goes; PR-71
// the concepts guide promises no reviewer tier.
const { test } = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.join(__dirname, '..');
const read = (p) => fs.readFileSync(path.join(ROOT, p), 'utf8');
const flat = (s) => s.replace(/\s+/g, ' ');
const blocksOf = (t) => t.match(/```text\n[\s\S]*?```/g) || [];

test('PR-67 both operator editions carry the requirement-level check, its inputs, its dimensions, its landing place and its completion condition', () => {
  const en = read('docs/operator.md'), cn = read('docs/operator_cn.md');
  const rc = blocksOf(en).find((b) => b.includes('requirement-level independent check'));
  assert.ok(rc, 'the requirement-level check recipe block is missing');
  assert.ok(cn.includes(rc), 'the Chinese edition does not carry the identical recipe block');
  const goal = flat(rc.split('\n')[1]);
  assert.match(goal, /the agreed scope is checked, every necessary fix and its re-check are closed, every follow-up has its landing spot, nothing blocking is left open, and the owner has the report/);
  assert.match(goal, /— OR you stopped at a human stop \(§1 R1\), at an actual capability block or at a set execution bound, and your last message names it, what is still open and the decision the owner must make; that outcome hands the requirement back and is never a delivery\. While what remains can be advanced within your delegation, continue\./);
  const body = flat(rc);
  assert.match(body, /the inputs listed apart from P3's default input/);
  assert.match(body, /each repository's commit checked and its comparison base/);
  assert.match(body, /the effective contracts at that version \(the store as of the comparison base with the deltas of <changes> applied in the order they merge, archived ones included; a version you cannot pin is a gap you report\)/);
  assert.match(body, /checks the existing behavior the changes touch and its callers, the other read and write entrances to the affected data for their permission and data scope, and concurrency, transactions and side-effect consistency on the affected paths/);
  assert.match(body, /A finding counts only once verified against the code; a refuted one is listed with the reason\./);
  assert.doesNotMatch(body, /the archived contracts of <changes>/);
  assert.match(body, /Run the independent reviewer \(not this session's model or context: codex exec, or a fresh session\)/);
  assert.match(body, /reconciles every `in` row of the checklist against the built code — corrected rows against their ruling — filling `implementation` and `verification`/);
  assert.match(body, /checks every delivery dependency handed outside the workflow; and checks the assertion and run conditions behind each tick/);
  assert.match(body, /It reads the code; it does not fix it\./);
  assert.match(body, /Never mark a row reconciled the reviewer did not check\./);
  // batch review SST-2: the fix procedure itself — changes with their own P3, then the requirement-level re-check
  assert.match(body, /a necessary fix → the in-flight change it belongs to, or a new change once that one is archived, each registering the report in Ground, carrying the finding's id and passing its own P3; then resume the requirement-level reviewer on the fixes and what they affect, its re-check landing in <dir>/);
  const para = flat(en.slice(en.indexOf('**Requirement-level independent check'), en.indexOf(rc)));
  assert.match(para, /\(optional — any requirement, split into several changes or not, before it goes to test; whether to run it is your call\)/);
  assert.match(para, /it already asks about established behavior and may read callers, and a later round looks at what a fix affects — but it is organized around one change\. This check reorganizes the scope and the inputs around the whole requirement\./);
  assert.match(para, /they say where evidence is owed, not a validated threshold for when a second look pays off/);
  assert.match(para, /the effective contracts at that version — the spec store as of the comparison base with the deltas of the requirement's changes applied in the order they merge, archived ones included, replacements and removals resolved rather than handed over side by side for the reviewer to guess \(a version it cannot pin is reported as a gap\)/);
  assert.match(para, /for each repository, the commit checked and its comparison base, with the whole requirement's diff/);
  assert.match(para, /the existing behavior the changes touch and its callers \(regression\); the other read and write entrances to the affected data — their permission and data scope — within the changes' reach; and concurrency, transactions and side-effect consistency on the affected paths\. A finding counts only once it is verified against the code; a refuted one is listed with the reason\./);
  assert.doesNotMatch(para, /when one requirement was split into several changes|after the requirement's last change is archived|nothing in the per-change flow looks at the requirement end to end/);
  assert.match(para, /never in an archived bundle, and never in a change's `review\/` \(a file there is read as a review family and could pass for that change's independent review\)/);
  assert.match(para, /The report pins the commit of each repository it checked, the source versions and the scope/);
  assert.match(para, /a necessary fix lands in the change it belongs to while that change is still in flight — fixed and reviewed there as usual — or, once that change is archived, in a new change; each change carrying a fix registers the report as source material in Ground, carries the finding's id and passes its own P3; the requirement-level reviewer then re-checks the fixes and what they affect, writing back to the requirement's directory\./);   // SST-2
  assert.match(para, /The changes' P3 and this re-check close separately, and an earlier check's conclusions are never P3's default input\./);
  assert.match(para, /A clean check opens no change; its report and checklist are kept all the same\./);
  assert.doesNotMatch(para, /owner acceptance walk/);   // the script now stands on its own (PR-69)
  const cpara = flat(cn.slice(cn.indexOf('**需求级独立核对'), cn.indexOf(rc)));
  for (const re of [/必要修复在所属 change 仍在途时落回该 change,照常修复和评审;所属 change 已归档时开新 change;承接修复的每个 change 都在 Ground 把这份报告登记为来源材料、承接该发现的 id、走自己的 P3;之后需求级评审方复核这些修复及其影响到的路径,结果写回需求目录/,   // SST-2
                    /\(可选——任何需求,拆没拆成几个 change 都可以,在提测之前;做不做由你决定\)/,
                    /以比较基线时点的规格库为底,把这个需求各 change 的 delta 按合并顺序应用上去\(已归档的也算在内\),替换和删除关系已经算好,而不是把两者并排交给评审方去猜\(钉不住版本时作为缺口报告\)/,
                    /它本来就问既有行为、可以读调用方,后续轮次也看修复影响到哪里——但它是按单个 change 组织的。这一步把检查范围和输入按整个需求重新组织/,
                    /它们说的是哪里需要证据,不是经过验证的「什么时候值得再看一遍」的阈值/,
                    /每个仓被核对的提交和比较基线,以及整个需求的 diff/,
                    /改动触及的既有行为及其调用方\(回归\);到达受影响数据的其他读写入口——它们的权限与数据范围——限于改动触及的范围;受影响路径上的并发、事务与副作用一致性。每条发现对照代码核实后才算数;被推翻的列出理由/,
                    /不进任何已归档的 bundle,也不进任何 change 的 `review\/`/, /报告钉住每个仓被核对的提交、来源版本和核对范围/,
                    /各 change 的 P3 与这次复核分别闭合,先前核对的结论永远不进 P3 的默认输入/, /核对干净时不开 change,报告和清单照样保留/])
    assert.match(cpara, re, String(re));
  assert.doesNotMatch(cpara, /一个需求拆成了几个 change、交付之前|在需求的最后一个 change 归档之后|所有者验收剧本/);
});

test('PR-68 the guide places a requirement-level check\'s successor in the requirement\'s directory, before test', () => {
  const g = flat(read('guides/prototype-walk.md'));
  assert.match(g, /One exception to where a successor lives: a \*\*requirement-level check\*\* \(`docs\/operator\.md`\), run before the requirement goes to test on the version it checks — whether or not every change is archived yet — keeps its successor in the requirement's document directory — beside the sources, where no change bundle is frozen over it — and from the start of the check that is the one current checklist: it carries every row over with its id, sources and evidence references and names the checklist and version it continues; a change still in flight references it instead of keeping its own progress in its own checklist, and the changes that carry its fixes reference it and never copy it\. Carrying a row over does not make its ruling a valid decision or its evidence a verified result\./);
  assert.doesNotMatch(g, /run after the requirement's last change is archived/);
  assert.match(g, /or, for a requirement-level check, in the requirement's document directory \(§9\) — never the frozen original\./);
});

test('PR-69 the owner acceptance or integration script stands on its own and is run before it is handed over', () => {
  const en = read('docs/operator.md'), cn = read('docs/operator_cn.md');
  const rc = blocksOf(en).find((b) => b.includes('requirement-level independent check'));
  const after = (t, marker) => flat(t.slice(t.indexOf(rc) + rc.length, t.indexOf(marker)));
  const p = after(en, '**Prototype walk');
  assert.match(p, /\*\*Owner acceptance or integration script \(optional — it can be delivered on its own, with or without a requirement-level check\):\*\*/);
  assert.match(p, /for you, or for whoever you hand it to \(front end, test\), derived from the applicable requirement sources, contracts and any existing checklist, with expectations you can see — on the page, or in the response of an API when only the back end is yours/);
  assert.match(p, /a guard before any real side effect, cleanup\); real side effects only with their one-shot authorization; problems recorded first and classified after \(script, data, code or configuration\)/);
  assert.match(p, /Before handing it over, the agent runs the steps it is already authorized and able to run, and says which path it actually ran and what it did not run; a mismatch between the script and the code is judged by the contract, a valid decision or the source, not by what the code happens to do\./);
  assert.match(p, /An API run does not stand in for a browser step, and handing the script to someone else is still yours to authorize\./);
  const c = after(cn, '**原型走查');
  for (const re of [/\*\*所有者验收或联调剧本\(可选——可以单独交付,做不做需求级核对都行\):\*\*/,
                    /给你,或给你转交的人\(前端、测试\)执行的剧本,从适用的需求来源、契约和已有清单派生,预期写成看得到的样子——页面上的,或者只做后端时接口的返回/,
                    /配一套 kit\(造数、命令、任何真实副作用之前的守卫、清理\);真实副作用只凭一次性授权;问题先记下、事后再分类\(剧本、数据、代码或配置\)/,
                    /交付之前,agent 先执行已有授权和能力范围内能执行的步骤,说明实际执行了哪条路径、哪些没有执行;剧本和代码对不上时,按契约、有效决定或来源判定,而不是按代码碰巧的行为/,
                    /接口跑通不能冒充浏览器步骤已验证;把剧本交给别人,仍要你授权/])
    assert.match(c, re, String(re));
  // no gate, no machine check: the paragraph is advice to the operator, not a rule the CLI enforces
  assert.doesNotMatch(p, /gate|must not be handed over/);
});

test('PR-70 the runbook says lasting provenance goes in the requirement body, never in the preamble or Notes', () => {
  const r = flat(read('RUNBOOK.md'));
  assert.match(r, /`## Notes` → commentary the merge ignores entirely — write WHY a block changed there \(any other non-`Requirement` `###` inside a requirement block is refused\)\. The file's preamble and `## Notes` never reach the merged spec: the source, the open status and the basis of a decision that a reader needs to understand the lasting contract go in the requirement's own body; an item that was once pending and now has a valid decision says how it was settled, so an old "to be confirmed" never reads as still blocking\./);
  // a fact the sentence relies on: the merge really drops Notes and the preamble, and keeps the body
  const am = require('../lib/archive-merge');
  const d = am.parseDeltaStrict('preamble text\n\n## ADDED Requirements\n\n### Requirement: R-P\nSource: PRD §3.4 item 5.\n\n#### Scenario: PV-01 x\n- WHEN a\n- THEN b\n\n## Notes\n\nwhy it changed\n');
  const merged = [...d.delta.ADDED.values()].join('\n');
  assert.match(d.delta.ADDED.get('R-P'), /Source: PRD §3\.4 item 5\./, 'the requirement body keeps its source line');
  assert.ok(!merged.includes('why it changed') && !merged.includes('preamble text'), 'Notes and the preamble are not merged');
});

test('PR-71 the concepts guide promises no reviewer tier for semantic faithfulness', () => {
  for (const f of ['docs/concepts.md', 'docs/concepts_cn.md']) {
    const t = read(f);
    assert.doesNotMatch(t, /fast and cheap is enough|快且便宜就够/, f);
  }
  assert.match(read('docs/concepts.md'), /\| a reviewer independent of the producer \(R2: a different model or a fresh session\) — no evidence so far shows which tier is enough \|/);
  assert.match(read('docs/concepts_cn.md'), /\| 独立于生产方的评审方\(R2:不同的模型或全新的会话\)——目前没有证据表明哪一档就够 \|/);
});
