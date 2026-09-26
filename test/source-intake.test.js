'use strict';
// source-intake — PR-53 (P2 four-question source check), PR-54 (Ground: a discussion held elsewhere
// is source material), PR-55 (discuss can save from that document), PR-56 (building a design
// concluded elsewhere identifies the work). Text-level, like the other PR scenarios: each pins the
// sentence that carries the rule, in both editions, so removing it turns the assertion red.
const { test } = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');

const ROOT = path.join(__dirname, '..');
const read = (p) => fs.readFileSync(path.join(ROOT, p), 'utf8');
const EN = read('RUNBOOK.md');
const CN = read('RUNBOOK_cn.md');

function block(text, headingRe) {
  const m = text.match(headingRe);
  if (!m) return '';
  const rest = text.slice(m.index);
  const next = rest.slice(m[0].length).search(/^#{2,3} /m);
  return next < 0 ? rest : rest.slice(0, m[0].length + next);
}

test('PR-53 P2 carries the four-question source check in both editions', () => {
  const p2en = block(EN, /^### P2 — producer.*$/m);
  const p2cn = block(CN, /^### P2 —— 生产方.*$/m);
  assert.ok(p2en && p2cn, 'P2 blocks present');
  // the four questions, in order, inside the Specify part (before [Build & Test])
  const specEn = p2en.slice(0, p2en.indexOf('[Build & Test]'));
  assert.match(specEn, /check the contract against its sources — four questions/);
  assert.match(specEn, /does every requirement in the sources you are delivering land somewhere \(a scenario, an explicit out-of-scope line, or an ## Open item\)/);
  assert.match(specEn, /does every scenario trace to a source \(a requirement section, a prototype, an owner decision\)/);
  assert.match(specEn, /is every condition clear enough to test/);
  assert.match(specEn, /do two sources disagree anywhere, and is that settled by a recorded decision or left open/);
  assert.match(specEn, /A choice the sources leave to you is `decision: producer — <choice>`/);
  assert.match(specEn, /a user-visible behavior no source settles is the owner's question — an ## Open item, not your choice/);
  assert.match(specEn, /only an unproven fact is an assumption/);
  const specCn = p2cn.slice(0, p2cn.indexOf('【Build & Test】'));
  assert.match(specCn, /拿契约对照它的来源——四问/);
  assert.match(specCn, /你要交付的来源里的每条要求是否都有落点\(一个 scenario、一句明确的范围外说明,或一条 ## Open 条目\)/);
  assert.match(specCn, /每个 scenario 是否都能追到来源\(需求章节、原型、所有者决定\)/);
  assert.match(specCn, /每个条件是否清楚到可以测/);
  assert.match(specCn, /来源之间有没有冲突,冲突是由已记录的决定解决了还是留作未决/);
  assert.match(specCn, /来源留给你的选择记为 `decision: producer — <选择>`/);
  assert.match(specCn, /没有任何来源裁定的用户可见行为是所有者的问题——记为 ## Open 条目,不是你的选择/);
  assert.match(specCn, /只有未证实的事实才是 assumption/);
  // P3 stays frozen (RIB-10, the 2026-09-20 human ruling)
  const FROZEN = { 'RUNBOOK.md': '97a85ca560d41c70', 'RUNBOOK_cn.md': 'd3c2c74d8aa3f3b6' };
  for (const [file, want] of Object.entries(FROZEN)) {
    const m = read(file).match(/### P3 [\s\S]*?(?=### P4 )/);
    assert.strictEqual(crypto.createHash('sha256').update(m[0]).digest('hex').slice(0, 16), want, `${file}: P3 changed`);
  }
});

test('PR-54 Ground registers a discussion held elsewhere as source material', () => {
  const gEn = block(EN, /^### Ground — check the real facts.*$/m);
  const gCn = block(CN, /^### Ground —— 提方案之前先核对真实事实.*$/m);
  assert.match(gEn, /\*\*Discussion held elsewhere is source material, not a decision\.\*\*/);
  assert.match(gEn, /`observed: <path> — <version or date>; approved: <what the owner approved in it, or "unknown">`/);
  assert.match(gEn, /It becomes a `decision` only as far as the owner approved it, in their words/);
  assert.match(gEn, /a draft section, an option not chosen, and anything whose approval is unknown stay material — never a decision/);
  assert.match(gEn, /it does not authorize `apriori new` or development/);
  assert.match(gEn, /its own next steps \(a plan, an execution skill\) are not chained on automatically — a plan the owner did authorize stays theirs to use/);
  assert.match(gCn, /\*\*在别处进行过的讨论是来源材料,不是决定。\*\*/);
  assert.match(gCn, /`observed: <路径> — <版本或日期>;批准范围:<所有者在其中批准了什么,或「未知」>`/);
  assert.match(gCn, /它只在所有者批准的范围内、用所有者的话成为 `decision`/);
  assert.match(gCn, /草案部分、没选中的方案、批准情况未知的内容都仍是材料——绝不是决定/);
  assert.match(gCn, /不授权 `apriori new` 或开发/);
  assert.match(gCn, /它自带的下一步\(计划、执行技能\)也不自动接上——所有者确实授权过的计划仍归他使用/);
});

test('PR-55 a discussion held elsewhere can be saved from its document', () => {
  const dEn = block(EN, /^### Discuss first — where anything not yet stateable.*$/m);
  const dCn = block(CN, /^### 先讨论 —— 还说不清成一个 change 的都落这里.*$/m);
  assert.match(dEn, /\*\*The discussion may already have happened elsewhere\.\*\*/);
  assert.match(dEn, /there is nothing to re-discuss: the save registers the document as source material \(§ Ground\)/);
  assert.match(dEn, /records their approved choices as `decision` only as far as they approved them/);
  assert.match(dEn, /The same two approvals apply/);
  assert.match(dCn, /\*\*讨论也可能已经在别处进行过。\*\*/);
  assert.match(dCn, /没有要重新讨论的东西:保存把这份文档作为来源材料登记\(见 § Ground\)/);
  assert.match(dCn, /只在人批准的范围内把他批准的选择记为 `decision`/);
  assert.match(dCn, /两份批准照旧适用/);
  const p6en = block(EN, /^### P6 — discuss first.*$/m);
  const p6cn = block(CN, /^### P6 —— 先讨论.*$/m);
  assert.match(p6en, /If we already discussed it elsewhere and I point you at the document, save from the document — register it as source material and record as decisions only what I approved in it/);
  assert.match(p6cn, /如果我们已经在别处讨论过、我把文档指给你,就从这份文档保存——把它作为来源材料登记,只把我在其中批准的内容记为决定/);
  // the thin shell (DS-02/DS-16: < 2600 chars) points at the rule by SECTION instead of restating it
  const tpl = read('templates/discuss.md').replace(/\s+/g, ' ');
  assert.match(tpl, /§4 The Flow → "Discuss first"\*\* — this stance in full, including the two approvals and saving from a document discussed elsewhere\./);
});

test('PR-56 building a design concluded elsewhere identifies the work', () => {
  const cmd = read('templates/command.md');
  const work = cmd.slice(cmd.indexOf('Work a change'), cmd.indexOf('Discuss first'));
  assert.match(work.replace(/\s+/g, ' '), /A design they concluded elsewhere and now ask you to build — they point at the document — identifies the work even without a change name: name the change for it, and register the document in Ground as source material\./);
  // the exhaustiveness clause is still the template's last routing rule
  const last = cmd.trimEnd().split('\n\n').pop();
  assert.match(last, /^The two branches are exhaustive and this is the last routing rule/);
  const twoEn = EN.slice(EN.indexOf('**Two doors in'), EN.indexOf('**Kickoff prompt'));
  const twoCn = CN.slice(CN.indexOf('**两扇门'), CN.indexOf('**启动提示词'));
  assert.match(twoEn, /A request to build a design already concluded elsewhere — the human points at the document — identifies the work too; the document is registered in Ground as source material/);
  assert.match(twoCn, /人要求按一份已在别处讨论定稿的设计开工——并指出那份文档——同样算指明了工作;那份文档在 Ground 里作为来源材料登记/);
});
