'use strict';
// 6.1 · three closure disciplines from the milestone-1 code-quality verdict (three arms, same change):
//  (1) P3 item 6 covers gaps the producer admitted ANYWHERE (code comments, notes), not only the summary;
//  (2) review-ready requires reclaiming dead code / contradicting comments this change introduced;
//  (3) Build & Test names the user-visible-error floor: a failed user-facing call must be visible.
const { test } = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const ROOT = path.join(__dirname, '..');
const EN = fs.readFileSync(path.join(ROOT, 'RUNBOOK.md'), 'utf8');
const CN = fs.readFileSync(path.join(ROOT, 'RUNBOOK_cn.md'), 'utf8');
function section(doc, startRe, endRe) {
  const s = doc.search(startRe); assert.ok(s >= 0, `missing section ${startRe}`);
  const rest = doc.slice(s); const e = rest.slice(1).search(endRe);
  return e >= 0 ? rest.slice(0, e + 1) : rest;
}
const item = (sec, n) => sec.split('\n').find((l) => new RegExp(`^${n}\\. `).test(l)) || '';

test('RC-01 P3 item 6: producer-admitted gaps anywhere must close as fixed / accepted in gates / rejected', () => {
  const en = item(section(EN, /^### P3/m, /^### P4/m), 6);
  const cn = item(section(CN, /^### P3/m, /^### P4/m), 6);
  assert.ok(/code comments/.test(en) && /gates/.test(en) && /rejected/.test(en), 'EN P3 item 6');
  assert.ok(/代码注释/.test(cn) && /gates/.test(cn) && /拒收/.test(cn), 'CN P3 item 6');
});

test('RC-02 review-ready reclaims dead code and contradicting comments (runbook bullet + P2)', () => {
  const enRD = section(EN, /^### Review & Deliver/m, /^### /m);
  const cnRD = section(CN, /^### Review & Deliver/m, /^### /m);
  assert.ok(/dead code/.test(enRD) && /contradict/.test(enRD), 'EN Review & Deliver bullet');
  assert.ok(/死代码/.test(cnRD) && /矛盾的注释/.test(cnRD), 'CN Review & Deliver bullet');
  const enP2 = section(EN, /^### P2/m, /^### P3/m), cnP2 = section(CN, /^### P2/m, /^### P3/m);
  assert.ok(/dead code/.test(enP2), 'EN P2 review-ready'); assert.ok(/死代码/.test(cnP2), 'CN P2 review-ready');
});

test('RC-03 Build & Test names the user-visible-error floor (runbook bullet + P2)', () => {
  const enBT = section(EN, /^### Build & Test/m, /^### /m);
  const cnBT = section(CN, /^### Build & Test/m, /^### /m);
  assert.ok(/User-visible error discipline/.test(enBT) && /stale/.test(enBT), 'EN Build & Test bullet');
  assert.ok(/用户可见错误纪律/.test(cnBT) && /旧渲染/.test(cnBT), 'CN Build & Test bullet');
  const enP2 = section(EN, /^### P2/m, /^### P3/m), cnP2 = section(CN, /^### P2/m, /^### P3/m);
  assert.ok(/user-visible call/.test(enP2), 'EN P2 build'); assert.ok(/用户可见的调用/.test(cnP2), 'CN P2 build');
});
