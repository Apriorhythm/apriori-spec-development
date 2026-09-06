'use strict';
// 6.1 · enumerated requirements carry their boundary semantics (milestone-1 replay, KD-11 root cause):
// both RUNBOOK editions must (1) demand a per-item boundary-semantics decision at Specify,
// (2) carry it in the producer prompt P2, and (3) make the reviewer P3 check it item by item.
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

test('ES-01 Specify demands a boundary-semantics decision per enumerated item (both editions)', () => {
  const en = section(EN, /^### Specify/m, /^### /m);
  const cn = section(CN, /^### Specify/m, /^### /m);
  assert.ok(/Enumerated requirements carry their boundary semantics/.test(en), 'EN Specify bullet');
  assert.ok(/open-ended interval/.test(en) && /future/.test(en) && /block or warn/.test(en), 'EN names the three semantics');
  assert.ok(/枚举类需求逐项带边界语义/.test(cn), 'CN Specify bullet');
  assert.ok(/开区间/.test(cn) && /未来/.test(cn) && /阻断还是提醒/.test(cn), 'CN names the three semantics');
});

test('ES-02 P2 carries the enumeration rule into the producer prompt (both editions)', () => {
  const en = section(EN, /^### P2/m, /^### P3/m);
  const cn = section(CN, /^### P2/m, /^### P3/m);
  assert.ok(/enumerat/i.test(en) && /boundary semantics/.test(en), 'EN P2');
  assert.ok(/枚举/.test(cn) && /边界语义/.test(cn), 'CN P2');
});

test('ES-03 P3 item 3 checks every enumerated item\'s boundary semantics (both editions)', () => {
  const en = section(EN, /^### P3/m, /^### P4/m);
  const cn = section(CN, /^### P3/m, /^### P4/m);
  const item3en = en.split('\n').find((l) => /^3\. /.test(l)) || '';
  const item3cn = cn.split('\n').find((l) => /^3\. /.test(l)) || '';
  assert.ok(/enumerated list/.test(item3en) && /boundary semantics/.test(item3en), 'EN P3 item 3');
  assert.ok(/枚举清单/.test(item3cn) && /边界语义/.test(item3cn), 'CN P3 item 3');
});
