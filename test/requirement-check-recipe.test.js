'use strict';
// requirement-check-recipe — PR-67 (both operator editions carry the optional requirement-level
// independent check: its reviewer, inputs, landing place, disposition and completion condition) and
// PR-68 (the guide keeps a requirement-level check's successor checklist beside the requirement's
// sources). Claude × Astra consensus R59 §三 batch 2 and §五; owner "执行" 2026-10-02.
const { test } = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.join(__dirname, '..');
const read = (p) => fs.readFileSync(path.join(ROOT, p), 'utf8');
const flat = (s) => s.replace(/\s+/g, ' ');
const blocksOf = (t) => t.match(/```text\n[\s\S]*?```/g) || [];

test('PR-67 both operator editions carry the requirement-level check, its landing place and its completion condition', () => {
  const en = read('docs/operator.md'), cn = read('docs/operator_cn.md');
  const rc = blocksOf(en).find((b) => b.includes('requirement-level independent check'));
  assert.ok(rc, 'the requirement-level check recipe block is missing');
  assert.ok(cn.includes(rc), 'the Chinese edition does not carry the identical recipe block');
  const goal = flat(rc.split('\n')[1]);
  assert.match(goal, /the agreed scope is checked, every necessary fix and its re-check are closed, every follow-up has its landing spot, nothing blocking is left open, and the owner has the report/);
  assert.match(goal, /— OR you stopped at a human stop \(§1 R1\), at an actual capability block or at a set execution bound, and your last message names it, what is still open and the decision the owner must make; that outcome hands the requirement back and is never a delivery\. While what remains can be advanced within your delegation, continue\./);
  const body = flat(rc);
  assert.match(body, /the inputs listed apart from P3's default input/);
  assert.match(body, /Run the independent reviewer \(not this session's model or context: codex exec, or a fresh session\)/);
  assert.match(body, /reconciles every `in` row of the checklist against the built code — corrected rows against their ruling — filling `implementation` and `verification`/);
  assert.match(body, /checks every delivery dependency handed outside the workflow; and checks the assertion and run conditions behind each tick/);
  assert.match(body, /It reads the code; it does not fix it\./);
  assert.match(body, /Never mark a row reconciled the reviewer did not check\./);
  // batch review SST-2: the fix procedure itself — changes with their own P3, then the requirement-level re-check
  assert.match(body, /a necessary fix → one or more changes, each registering the report in Ground, carrying the finding's id and passing its own P3; then resume the requirement-level reviewer on the fixes and what they affect, its re-check landing in <dir>/);
  const para = flat(en.slice(en.indexOf('**Requirement-level independent check'), en.indexOf(rc)));
  assert.match(para, /never in an archived bundle, and never in a change's `review\/` \(a file there is read as a review family and could pass for that change's independent review\)/);
  assert.match(para, /The report pins the code commit it checked, the source versions and the scope/);
  assert.match(para, /a necessary fix lands in one or more changes, each registering the report as source material in Ground, carrying the finding's id and passing its own P3; the requirement-level reviewer then re-checks the fixes and what they affect, writing back to the requirement's directory\./);   // SST-2
  assert.match(para, /The changes' P3 and this re-check close separately, and an earlier check's conclusions are never P3's default input\./);
  assert.match(para, /A clean check opens no change; its report and checklist are kept all the same\./);
  assert.match(para, /\*\*owner acceptance walk\*\*.*a guard before any real side effect.*real side effects only with their one-shot authorization; problems recorded first and classified after/);
  const cpara = flat(cn.slice(cn.indexOf('**需求级独立核对'), cn.indexOf(rc)));
  for (const re of [/必要修复落到一个或多个 change,每个都在 Ground 把这份报告登记为来源材料、承接该发现的 id、走自己的 P3;之后需求级评审方复核这些修复及其影响到的路径,结果写回需求目录/,   // SST-2
                    /不进任何已归档的 bundle,也不进任何 change 的 `review\/`/, /报告钉住被核对的代码提交、来源版本和核对范围/,
                    /各 change 的 P3 与这次复核分别闭合,先前核对的结论永远不进 P3 的默认输入/, /核对干净时不开 change,报告和清单照样保留/, /\*\*所有者验收剧本\*\*/])
    assert.match(cpara, re, String(re));
});

test('PR-68 the guide places a requirement-level check\'s successor in the requirement\'s directory', () => {
  const g = flat(read('guides/prototype-walk.md'));
  assert.match(g, /One exception to where a successor lives: a \*\*requirement-level check\*\* \(`docs\/operator\.md`\), run after the requirement's last change is archived, keeps its successor in the requirement's document directory — beside the sources, where no change bundle is frozen over it — and from then on that is the one current checklist; the changes that carry its fixes reference it and never copy it\./);
  assert.match(g, /or, for a requirement-level check, in the requirement's document directory \(§9\) — never the frozen original\./);
});
