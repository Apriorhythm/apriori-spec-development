'use strict';
// SR — card G's five shared-rule rewrite sites, made executable over the runbook text.
// Every meaning is asserted inside the BLOCK that must carry it (never across the whole file:
// PR-14's lesson — a table elsewhere can mask a deletion in the bullets), in the one English runbook.
// SR-06 is the degradation harness: deleting any one meaning must turn its own check red and
// name that meaning, so a green suite cannot mean "the assertion never bound".
const { test } = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.join(__dirname, '..');
const read = (p) => fs.readFileSync(path.join(ROOT, p), 'utf8');
const docs = () => ({ EN: read('RUNBOOK.md'), CMD: read('templates/command.md') });   // the runbook is English only (runbook-english-only)

// heading/paragraph → the first following delimiter; the start match itself is always kept
function upto(text, startRe, endRe, label) {
  const m = text.match(startRe);
  assert.ok(m, `block start not found: ${label}`);
  const rest = text.slice(m.index);
  const j = rest.slice(m[0].length).search(endRe);
  return j < 0 ? rest : rest.slice(0, m[0].length + j);
}
function between(text, startStr, endStr, label) {
  const i = text.indexOf(startStr), j = text.indexOf(endStr);
  assert.ok(i >= 0 && j > i, `block not found: ${label}`);
  return text.slice(i, j);
}

// lazy, one extractor per block: a cut that destroys ONE block must not blind the others
const BLOCKS = {
    'EN §0 step 4':           (d) => upto(d.EN, /^4\. Read a runbook section only when/m, /\n\n/, 'EN §0 step 4'),
    'EN §0 two doors':        (d) => upto(d.EN, /\*\*Two doors in/, /\n\n/, 'EN §0 two doors'),
    'EN §0 fix packet':       (d) => upto(d.EN, /- \*\*REVISE cuts the session/, /\n- \*\*/, 'EN §0 fix packet'),
    'EN §1 R1':               (d) => between(d.EN, '**R1 —', '### External side effects', 'EN §1 R1'),
    'EN §1 R2':               (d) => upto(d.EN, /\*\*R2 — Reviews must be genuinely external/, /\n\n\*\*R3 —/, 'EN §1 R2'),
    'EN §1 R4':               (d) => upto(d.EN, /\*\*R4 — The review round/, /\*\*Enforcement boundary/, 'EN §1 R4'),
    'EN §3 ## Next':          (d) => upto(d.EN, /^## Next {2,}# at most THREE/m, /\ngates:/, 'EN §3 ## Next'),
    'EN §4 head':             (d) => upto(d.EN, /^## 4\. The Flow/m, /\*\*Artifact paths\*\*/, 'EN §4 head'),
    'EN §4 Specify':          (d) => upto(d.EN, /^### Specify — /m, /^### /m, 'EN §4 Specify'),
    'EN §4 Review':           (d) => upto(d.EN, /^### Review & Deliver — /m, /^### ABANDONED/m, 'EN §4 Review'),
  'command template':    (d) => d.CMD,
};

// [rewrite, meaning id, block, regex] — the regex is also the degradation cut in SR-06
const MEANINGS = [
  // ① 读取路径 —— 触发 / 允许动作 / 完成条件 / 失败去向
  ['(1) reading path', '1-EN-trigger-four', 'EN §0 step 4',
    /Read a runbook section only when `status`, `## Next`, a blocked command, or an uncertain fact points you there/],
  ['(1) reading path', '1-EN-only-that-section', 'EN §0 step 4', /read only the section it names/],
  ['(1) reading path', '1-EN-stop-when-answered', 'EN §0 step 4', /stopping once that section answers/],
  ['(1) reading path', '1-EN-pointer-is-next-trigger', 'EN §0 step 4', /points at another section is the next trigger/],
  ['(1) reading path', '1-EN-unanswered-goes-to-open', 'EN §0 step 4',
    /an `assumption`, then an `## Open` item \(§4 Ground\)/],
  ['(1) reading path', '1-EN-no-default-list', 'EN §0 step 4', /never preload the full runbook/],
  ['(1) reading path', '1-CMD-only-that-section', 'command template', /and read only that\s+section — stop once it answers/],

  // ② 共享路由 —— R9 的四行条件表，严格转写，不新增授权类型
  ['(2) shared routing', '2-EN-by-delegation-not-phase', 'EN §1 R1', /routed by the delegation, not by the phase/],
  ['(2) shared routing', '2-EN-row-outside-hands-back', 'EN §1 R1',
    /outside the delegation or against an explicit limit \| Report the specific reason and hand back/],
  ['(2) shared routing', '2-EN-row-complete-reports', 'EN §1 R1',
    /The delegated result is complete[^|]*\| Report and finish/],
  ['(2) shared routing', '2-EN-row-continue-inside', 'EN §1 R1',
    /next necessary action is inside the delegation \| Continue/],
  ['(2) shared routing', '2-EN-row-capability-block', 'EN §1 R1',
    /never dress it up as waiting for the human/],
  ['(2) shared routing', '2-EN-limited-is-normal-end', 'EN §1 R1', /a normal ending, not a sixth stop class/],
  ['(2) shared routing', '2-EN-phase-is-not-a-handback', 'EN §1 R1',
    /A phase change, a prerequisite you can establish yourself, or the protocol's own fix loop/],
  ['(2) shared routing', '2-EN-no-false-completion', 'EN §1 R1', /never license claiming completion/],
  ['(2) shared routing', '2-EN-entry-name-grants-nothing', 'EN §1 R1',
    /grants no permission, and it revokes none the human already gave/],
  ['(2) shared routing', '2-EN-doors-point-at-routing', 'EN §0 two doors', /the delegation, and §1 R1 routes by it/],
  ['(2) shared routing', '2-CMD-not-a-sixth-stop', 'command template', /not a sixth\s+stop/],

  // ③ 阶段 Exit —— 「阶段条件满足」与「当前委托是否完成」分开
  ['(3) phase exit', '3-EN-exit-is-phase-condition', 'EN §4 head',
    /is a phase condition, not a verdict on the delegation/],
  ['(3) phase exit', '3-EN-routing-decides-next', 'EN §4 head',
    /whether you then advance, finish and report, or hand back is §1 R1's routing/],
  ['(3) phase exit', '3-EN-specify-splits-the-two', 'EN §4 Specify', /that is the phase condition[^\n]*§1 R1 routes what follows/],
  ['(3) phase exit', '3-EN-specify-limited-ends-here', 'EN §4 Specify', /a delegation limited to the spec ends here/],

  // ④ 评审输入与修复回路 —— P3 默认输入与 Fix Packet 的实际边界保留
  ['(4) review input & fix loop', '4-EN-r2-four-inputs', 'EN §1 R2',
    /exactly the four inputs §4 names/],
  ['(4) review input & fix loop', '4-EN-fix-loop-no-new-auth', 'EN §0 fix packet',
    /inside the delegation it runs without new authorization/],
  ['(4) review input & fix loop', '4-EN-fix-loop-not-a-handback', 'EN §0 fix packet', /the fresh session is not a hand-back/],
  ['(4) review input & fix loop', '4-EN-fix-outside-hands-back', 'EN §0 fix packet',
    /change the requirement, widen the goal, or take an external side effect/],
  ['(4) review input & fix loop', '4-EN-revise-does-not-widen-input', 'EN §4 Review',
    /A REVISE round does not widen that default input/],

  // ⑤ 已有数量限制 —— 只明确触发对象、计数方式与例外，保留原义
  ['(5) existing limits', '5-EN-next-counting', 'EN §3 ## Next', /counted as the items in THIS change's section/],
  ['(5) existing limits', '5-EN-next-overflow-advisory', 'EN §3 ## Next', /reports the overflow — advisory, never a block/],
  ['(5) existing limits', '5-EN-retry-counting', 'EN §1 R2', /counted per reviewer session that died before its verdict line landed/],
  ['(5) existing limits', '5-EN-round-counting', 'EN §1 R4', /never summed across families/],
  ['(5) existing limits', '5-EN-reframe-does-not-reset', 'EN §1 R4', /cumulative counts MUST NOT reset/],
  ['(5) existing limits', '5-EN-four-actions-not-commands', 'EN §4 Review', /actions, not commands/],
  ['(5) existing limits', '5-EN-four-actions-exception', 'EN §4 Review', /The one exception is the re-verify path/],
];

function checkOne(d, m) {
  const [, id, blockName, re] = m;
  const extract = BLOCKS[blockName];
  assert.ok(extract, `unknown block ${blockName}`);
  let b;
  // a cut that destroys the block's own anchor is still THIS meaning going red — say so by name
  try { b = extract(d); } catch (e) { assert.fail(`lost meaning ${id}: ${blockName} no longer locatable (${e.message})`); }
  assert.match(b, re, `lost meaning ${id} in ${blockName}`);
}

const GROUPS = [...new Set(MEANINGS.map((m) => m[0]))];
for (const g of GROUPS) {
  test(`SR ${g} is carried by the runbook, inside its own block`, () => {
    const d = docs();
    for (const m of MEANINGS.filter((x) => x[0] === g)) checkOne(d, m);
  });
}

test('SR-06 degradation: cutting any one meaning turns its own check red and names it', () => {
  const base = docs();
  const docOf = { EN: 'EN', CMD: 'CMD' };
  for (const m of MEANINGS) {
    const [, id, blockName, re] = m;
    const key = blockName.startsWith('EN') ? 'EN' : 'CMD';
    assert.ok(docOf[key], 'doc key');
    const cut = { ...base, [key]: base[key].replace(re, '') };
    assert.notStrictEqual(cut[key], base[key], `cutting ${id} changed nothing — the regex never matched`);
    assert.throws(() => checkOne(cut, m), (e) => e.message.includes(id),
      `cutting ${id} did not turn its own check red, or the failure did not name it`);
  }
});
