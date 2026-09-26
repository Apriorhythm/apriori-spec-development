'use strict';
// review-round-scope — PR-59 (§4 Review & Deliver: from round 2 on, a round judges the previous
// round's open findings ADDRESSED / NOT ADDRESSED and reviews the fix diff with what it affects; a
// new finding outside that diff still counts when it violates the current contract or a safety
// constraint, anything else is advisory and does not extend the loop; wording is judged by effect,
// not by location) and PR-60 (R2's resume clause points at that scope; P3 stays frozen). Both editions.
const { test } = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');

const ROOT = path.join(__dirname, '..');
const read = (p) => fs.readFileSync(path.join(ROOT, p), 'utf8');
const EN = read('RUNBOOK.md');
const CN = read('RUNBOOK_cn.md');

test('PR-59 a later review round is scoped to what changed (both editions)', () => {
  const en = EN.match(/^- \*\*A later round is scoped to what changed\.\*\*.*$/m);
  assert.ok(en, 'EN bullet present');
  assert.match(en[0], /From round 2 on, the producer's resume message \(R2\) asks the reviewer to judge each finding still open from the previous round as ADDRESSED or NOT ADDRESSED/);
  assert.match(en[0], /review the fix diff together with what it affects — its callers, shared state and tests, never trimmed to the edited lines/);
  assert.match(en[0], /A new finding outside that diff still counts when it violates the current contract or a safety constraint; anything else is advisory and does not extend the loop/);
  assert.match(en[0], /A finding is wording only when fixing it changes neither the contract nor how anyone would execute it — where it sits in a document does not make it advisory/);
  assert.match(en[0], /This scope rides on a resumed reviewer session, which already holds the previous round\. A later round run in a fresh reviewer session instead — R2's non-Codex path when that session is not resumed, or the fresh `claude` session that finishes a round after transport recovery failed — gets only the default input above and reviews the whole change as round 1 does; the previous round's conclusions are not repackaged into it\./);
  const cn = CN.match(/^- \*\*后续轮次只审改了什么。\*\*.*$/m);
  assert.ok(cn, 'CN bullet present');
  assert.match(cn[0], /从第 2 轮起,生产方的 resume 消息\(R2\)请评审方把上一轮每条仍未决的发现判为 ADDRESSED 或 NOT ADDRESSED/);
  assert.match(cn[0], /审查修复 diff 连同它影响到的东西——调用方、共享状态与测试,绝不裁剪到只看改动的那几行/);
  assert.match(cn[0], /该 diff 之外的新发现,若违反当前契约或安全约束,照样计入;其余是 advisory,不延长循环/);
  assert.match(cn[0], /一条发现只有在修它既不改变契约、也不改变任何人会怎么执行时才算纯措辞——它在文档里的位置不决定它是不是 advisory/);
  assert.match(cn[0], /这一范围依托于被 resume 的评审会话——它本来就握有上一轮。若后续轮次改由新开的评审会话来跑——R2 的无 Codex 路径且该会话未被 resume,或调用恢复失败后接手续完这一轮的新开 `claude` 会话——它只拿上面的默认输入,像第 1 轮那样审整个 change;上一轮的结论不转包给它。/);
});

// RRS-02 (review round 1): placement is pinned per edition — inside that edition's Review & Deliver
// section, the scope bullet is the very next bullet after the one-independent-review bullet and the
// very bullet before the disposition bullet.
function reviewDeliverBullets(doc, heading) {
  const start = doc.search(new RegExp('^### ' + heading, 'm'));
  assert.ok(start >= 0, `Review & Deliver heading found: ${heading}`);
  const rest = doc.slice(start + 4);
  const end = rest.search(/^### /m);
  const section = end >= 0 ? rest.slice(0, end) : rest;
  return section.split('\n').filter((l) => l.startsWith('- **'));
}
for (const [label, doc, heading, before, self, after] of [
  ['EN', EN, 'Review & Deliver — ', '- **Then one independent review**', '- **A later round is scoped to what changed.**', '- **Disposition of findings'],
  ['CN', CN, 'Review & Deliver —— ', '- **然后一次独立评审**', '- **后续轮次只审改了什么。**', '- **发现的处置'],
]) {
  test(`PR-59 ${label}: the scope bullet sits between the independent-review and disposition bullets of Review & Deliver`, () => {
    const bullets = reviewDeliverBullets(doc, heading);
    const i = bullets.findIndex((l) => l.startsWith(self));
    assert.ok(i > 0, `${label}: scope bullet inside Review & Deliver`);
    assert.ok(bullets[i - 1].startsWith(before), `${label}: immediately after the independent-review bullet, got ${bullets[i - 1].slice(0, 40)}`);
    assert.ok(bullets[i + 1] && bullets[i + 1].startsWith(after), `${label}: immediately before the disposition bullet`);
    assert.strictEqual(doc.split('\n').filter((l) => l.startsWith(self)).length, 1, `${label}: exactly one scope bullet in the edition`);
  });
}

test('PR-60 R2 points the resume message at that scope; P3 stays frozen (both editions)', () => {
  assert.match(EN, /\(rounds 2\+: `codex exec resume -c sandbox_mode="read-only" <session-id> "\.\.\."`, the message scoped as §4 Review & Deliver says;/);
  assert.match(CN, /\(第 2 轮起 `codex exec resume -c sandbox_mode="read-only" <session-id> "\.\.\."`,消息范围按 §4 Review & Deliver 所述;/);
  const FROZEN = { 'RUNBOOK.md': '97a85ca560d41c70', 'RUNBOOK_cn.md': 'd3c2c74d8aa3f3b6' };
  for (const [file, want] of Object.entries(FROZEN)) {
    const m = read(file).match(/### P3 [\s\S]*?(?=### P4 )/);
    assert.strictEqual(crypto.createHash('sha256').update(m[0]).digest('hex').slice(0, 16), want, `${file}: P3 changed`);
  }
});
