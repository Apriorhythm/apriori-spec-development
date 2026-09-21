'use strict';
// SR2 — W2：显式化「round 2 停滞」与「§0 Fix Packet 普通 REVISE」的分流条件。
// 预注册 W2-EXPERIMENT-PREREG.md（2026-09-22 冻结）。三条静态正反例：
//   普通 round 1 REVISE 仍进 Fix Packet · 停滞且未重开则停 · 有效 reframe 后可恢复修复流程。
const { test } = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.join(__dirname, '..');
const read = (p) => fs.readFileSync(path.join(ROOT, p), 'utf8');
const docs = () => ({ EN: read('RUNBOOK.md'), CN: read('RUNBOOK_cn.md') });

function upto(text, startRe, endRe, label) {
  const m = text.match(startRe);
  assert.ok(m, `block start not found: ${label}`);
  const rest = text.slice(m.index);
  const j = rest.slice(m[0].length).search(endRe);
  return j < 0 ? rest : rest.slice(0, m[0].length + j);
}
const BLOCKS = {
  'EN §0 fix packet': (d) => upto(d.EN, /- \*\*REVISE cuts the session/, /\n- \*\*/, 'EN fix packet'),
  'CN §0 fix packet': (d) => upto(d.CN, /- \*\*REVISE 切断会话/, /\n- \*\*/, 'CN fix packet'),
  'EN §1 R1 stall':   (d) => upto(d.EN, /^3\. \*\*A review family stalled/m, /^4\. \*\*/m, 'EN R1.3'),
  'CN §1 R1 stall':   (d) => upto(d.CN, /^3\. \*\*某个评审 family/m, /^4\. \*\*/m, 'CN R1.3'),
};

const MEANINGS = [
  // Fix Packet 入口就地展开停滞判别
  ['SR2-01-EN-stall-check-first', 'EN §0 fix packet',
    /already stalled after its own round 2[\s\S]{0,200}do not enter this section's fix loop/],
  ['SR2-01-CN-stall-check-first', 'CN §0 fix packet',
    /已在它自己的第 2 轮后停滞[\s\S]{0,200}不进入本节的修复回路/],
  // 必须带「尚未有效重开」限定 —— 否则会挡死合法恢复
  ['SR2-02-EN-not-yet-reopened', 'EN §0 fix packet', /no valid owner reframe has reopened it/],
  ['SR2-02-CN-not-yet-reopened', 'CN §0 fix packet', /尚无有效的 owner reframe 重开它/],
  // R1 第3类互指
  ['SR2-03-EN-r1-points-back', 'EN §1 R1 stall',
    /does not enter §0's ordinary REVISE\/Fix Packet fix loop/],
  ['SR2-03-CN-r1-points-back', 'CN §1 R1 stall',
    /不进入 §0 的普通 REVISE\/Fix Packet 修复回路/],
  // 授权内修复也要等这个决策点
  ['SR2-04-EN-authorized-fix-waits', 'EN §1 R1 stall',
    /a fix that is inside the delegation waits for this decision point too/],
  ['SR2-04-CN-authorized-fix-waits', 'CN §1 R1 stall',
    /授权内的修复也要等这个决策点处理完/],
];

function checkOne(d, m) {
  const [id, blockName, re] = m;
  let b;
  try { b = BLOCKS[blockName](d); }
  catch (e) { assert.fail(`lost meaning ${id}: ${blockName} no longer locatable (${e.message})`); }
  assert.match(b, re, `lost meaning ${id} in ${blockName}`);
}

test('SR2 停滞分流条件在双语两处落点就地展开', () => {
  const d = docs();
  for (const m of MEANINGS) checkOne(d, m);
});

test('SR2-05 三条正反例：普通 REVISE 仍走修复 · 停滞则停 · 有效重开后可恢复', () => {
  const d = docs();
  for (const [lang, fp, r1] of [['EN', BLOCKS['EN §0 fix packet'](d), BLOCKS['EN §1 R1 stall'](d)],
                                ['CN', BLOCKS['CN §0 fix packet'](d), BLOCKS['CN §1 R1 stall'](d)]]) {
    // 正例1：普通 REVISE 的修复回路本身必须仍在
    assert.match(fp, lang === 'EN' ? /the fix round runs in a fresh or cleared session/
                                   : /修复轮换一个全新或已清空的会话跑/, `${lang}: 普通 REVISE 修复回路被删`);
    // 正例2：停滞分支必须以「尚未有效重开」为条件，而非无条件封堵
    assert.match(fp, lang === 'EN' ? /no valid owner reframe has reopened it/
                                   : /尚无有效的 owner reframe 重开它/, `${lang}: 停滞分支缺"尚未重开"限定`);
    // 正例3：R1 第3类保留 owner reframe 的重开出口（有效重开后可恢复）
    assert.match(r1, lang === 'EN' ? /reframe <family> round <n> <split\|tests\|redo>/
                                   : /reframe <family> round <n> <split\|tests\|redo>/, `${lang}: reframe 重开出口被删`);
  }
});

test('SR2-06 退化：删掉任一条含义，其自身检查必须变红并点名', () => {
  const base = docs();
  for (const m of MEANINGS) {
    const [id, blockName, re] = m;
    const key = blockName.startsWith('EN') ? 'EN' : 'CN';
    const cut = { ...base, [key]: base[key].replace(re, '') };
    assert.notStrictEqual(cut[key], base[key], `cutting ${id} changed nothing — regex never matched`);
    assert.throws(() => checkOne(cut, m), (e) => e.message.includes(id),
      `cutting ${id} did not turn its own check red, or the failure did not name it`);
  }
});
