'use strict';
// RIB — W3 内容筛选边界（`W3-BOUNDARY-RULING.md` R2，人类 2026-09-22 批准）。
// 裁定：不按来源路径一刀切；按**主动传播行为及其承载的语义**判断。
// 每条含义在英文 runbook 的**所属块内**断言（runbook 只有英文一版）；RIB-09 是退化harness。
const { test } = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');

const ROOT = path.join(__dirname, '..');
const read = (p) => fs.readFileSync(path.join(ROOT, p), 'utf8');
const docs = () => ({ EN: read('RUNBOOK.md') });   // the runbook is English only (runbook-english-only)

function upto(text, startRe, endRe, label) {
  const m = text.match(startRe);
  assert.ok(m, `block start not found: ${label}`);
  const rest = text.slice(m.index);
  const j = rest.slice(m[0].length).search(endRe);
  return j < 0 ? rest : rest.slice(0, m[0].length + j);
}
const BLOCKS = {
  'EN §4 review input': (d) => upto(d.EN, /- \*\*Then one independent review\*\*/, /\n- \*\*/, 'EN review input'),
  'EN §4 three kinds':  (d) => upto(d.EN, /- \*\*Three kinds only\.\*\*/, /\n- \*\*/, 'EN three kinds'),
};

// [id, block, regex]
const MEANINGS = [
  // 一般输入边界落在 Review & Deliver
  ['RIB-01-EN-no-repackaging', 'EN §4 review input',
    /do not repackage a prior review's conclusions into the next reviewer's default input/],
  // 防改写绕行：换措辞/换字段不豁免
  ['RIB-02-EN-rewording-no-exemption', 'EN §4 review input',
    /dropping the source name, rewording it, or re-labelling it/],
  // 独立核验后可记录（不因结论相同就禁止）
  ['RIB-03-EN-independent-recheck-allowed', 'EN §4 review input',
    /re-established yourself[\s\S]{0,140}record it/],
  // 不误伤既有机制：存档与 Fix Packet 保留
  ['RIB-04-EN-archive-and-packet-intact', 'EN §4 review input',
    /leaves the review archive and the Fix Packet untouched/],
  // diff 不按路径裁剪 + 理由（不以"评审方未受影响"为据）
  ['RIB-05-EN-no-diff-trimming', 'EN §4 review input',
    /The diff is not trimmed by path/],
  // 落实方式落在 Ground：三类字段一体适用
  ['RIB-06-EN-all-three-kinds', 'EN §4 three kinds',
    /applies to all three kinds alike/],
  // 记历史材料：记其存在与结构性事实，不转述结论
  ['RIB-07-EN-existence-not-conclusion', 'EN §4 three kinds',
    /record that it exists[\s\S]{0,140}not what it concluded/],
  // 先写入再删除不豁免
  ['RIB-08-EN-write-then-delete', 'EN §4 review input',
    /writing it in and deleting it later does not undo/],
];

function checkOne(d, m) {
  const [id, blockName, re] = m;
  const extract = BLOCKS[blockName];
  assert.ok(extract, `unknown block ${blockName}`);
  let b;
  try { b = extract(d); } catch (e) { assert.fail(`lost meaning ${id}: ${blockName} no longer locatable (${e.message})`); }
  assert.match(b, re, `lost meaning ${id} in ${blockName}`);
}

test('RIB W3 内容筛选边界：两处落点各自承载其含义', () => {
  const d = docs();
  for (const m of MEANINGS) checkOne(d, m);
});

test('RIB-09 退化：删掉任一条含义，其自身检查必须变红并点名', () => {
  const base = docs();
  for (const m of MEANINGS) {
    const [id, blockName, re] = m;
    const key = 'EN';
    const cut = { ...base, [key]: base[key].replace(re, '') };
    assert.notStrictEqual(cut[key], base[key], `cutting ${id} changed nothing — regex never matched`);
    assert.throws(() => checkOne(cut, m), (e) => e.message.includes(id),
      `cutting ${id} did not turn its own check red, or the failure did not name it`);
  }
});

// 裁定明写 "P3 逐字不动" —— 钉住它，防止实施时越界。
test('RIB-10 P3 模板逐字未动', () => {
  const FROZEN = { 'RUNBOOK.md': '97a85ca560d41c70' };
  for (const [file, want] of Object.entries(FROZEN)) {
    const m = read(file).match(/### P3 [\s\S]*?(?=### P4 )/);
    assert.ok(m, `${file}: P3 section not found`);
    const got = crypto.createHash('sha256').update(m[0]).digest('hex').slice(0, 16);
    assert.strictEqual(got, want, `${file}: P3 模板被改动（裁定要求逐字不动）`);
  }
});
