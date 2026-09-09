'use strict';
// batch-c-r11 — sandbox evidence gets a three-way disposition (matrix §五′-3 row 11,
// §四 R2 ruling; battery E3 = 3/4 proved the blocked chain is a LIVE mechanism, so this
// row REWRITES the wording, it does not delete it).
//
// The old rule — "A read-only reviewer's dynamic observations are untrustworthy … only
// its static reads count" — handed the evidence ruling back to the party under review and
// let "not reproduced" pass as "disproved" (Astra R2, plan/19 §四). The rewritten rule
// classifies every dynamic observation into exactly one of three dispositions:
//   ① a located product failure       — producer confirms with real-environment evidence
//   ② an environment limitation with a positive control — the same operation succeeding
//     in the real environment is on record
//   ③ cause undetermined              — the observation is KEPT and routed through the
//     Open/owner mechanism; "not reproduced" is never "disproved"
// Only ② may exclude the product inference; the pre-existing semantics "dismissing a
// sandbox artifact requires real-environment evidence" is folded into ① and ②.
//
// These anchors are the pre-registered rollback criterion: RED before the rewrite, green
// after; any regression that resurrects the blanket-dismissal sentence, drops one of the
// three categories, or lets the reviewer self-adjudicate again fails here. Both editions
// (RUNBOOK.md / RUNBOOK_cn.md) stay in sync.
const { test } = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.join(__dirname, '..');
const EN = fs.readFileSync(path.join(ROOT, 'RUNBOOK.md'), 'utf8');
const CN = fs.readFileSync(path.join(ROOT, 'RUNBOOK_cn.md'), 'utf8');
const ok = (t, s, m) => assert.ok(t.includes(s), `${m ?? 'expected'}: ${s}`);
const not = (t, s, m) => assert.ok(!t.includes(s), `${m ?? 'unexpected'}: ${s}`);

test('SE-01 the blanket-dismissal sentence is gone from both editions', () => {
  // the old R2 sentence (RUNBOOK.md:99 / RUNBOOK_cn.md:99) — every fragment must vanish
  not(EN, 'dynamic observations are untrustworthy', 'RUNBOOK.md still carries the blanket dismissal');
  not(EN, 'only its static reads count', 'RUNBOOK.md still hands the ruling to static reads alone');
  not(CN, '动态观测不可信', 'RUNBOOK_cn.md still carries the blanket dismissal');
  not(CN, '只有静态阅读作数', 'RUNBOOK_cn.md still hands the ruling to static reads alone');
});

test('SE-02 EN R2 carries the three-way disposition with its real-environment anchors', () => {
  ok(EN, 'three-way disposition', 'EN R2 lacks the disposition header');
  // ① located product failure, confirmed by the producer with real-environment evidence
  ok(EN, 'a located product failure — the producer confirms it with real-environment evidence');
  // ② environment limitation, only with a positive control on record
  ok(EN, 'an environment limitation with a positive control — evidence is on record that the same operation succeeds in the real environment');
  // ③ cause undetermined — keep the observation, route to Open/owner
  ok(EN, 'cause undetermined — keep the observation (inputs, environment differences, rerun results) and route it through the Open/owner mechanism');
});

test('SE-03 EN R2 keeps the guardrails: only ② excludes, artifact dismissal needs evidence, no ruling hand-back', () => {
  ok(EN, 'Only ② excludes the product inference');
  // the pre-existing "dismissing needs real-environment evidence" semantics, folded into ①②
  ok(EN, 'dismissing an observation as a sandbox artifact requires that real-environment evidence');
  ok(EN, '"not reproduced" is never "disproved"');
  ok(EN, 'the evidence ruling never goes back to the party under review');
});

test('SE-04 CN R2 carries the same three categories, in sync', () => {
  ok(CN, '按**三类处置**');
  ok(CN, '已定位的产品失败——由生产方以真实环境证据确认');
  ok(CN, '有正面对照支持的环境限制——同一操作在真实环境成功的证据在案');
  ok(CN, '原因未定——保留观察(输入、环境差异、复跑结果),走 Open/owner 机制裁决');
  ok(CN, '只有第 ② 类可排除产品推断');
  ok(CN, '「未复现」永远不等于「已证伪」');
  ok(CN, '证据裁决也绝不交回被评审者');
});

test('SE-05 the P3 prompt scope line records the observation instead of self-ruling it an artifact', () => {
  // old wording (RUNBOOK.md:350 / RUNBOOK_cn.md:341) gone
  not(EN, 'treat degraded output as a sandbox artifact, not a finding',
    'the P3 prompt still tells the reviewer to self-adjudicate');
  not(CN, '降级的输出按沙箱伪象处理,不作为发现',
    'the CN P3 prompt still tells the reviewer to self-adjudicate');
  // new wording: record for R2's three-way disposition; no self-ruling, no verdict leak
  ok(EN, "record degraded output as an observation — inputs, environment difference, rerun result — for R2's three-way disposition; do not rule it a sandbox artifact yourself and do not fold it into the verdict line (R2)");
  ok(CN, '降级的输出作为观察记录下来——输入、环境差异、复跑结果——交 R2 的三类处置;不得自行裁定它是沙箱伪象,也不把它折进结论行(R2)');
});

test('SE-06 fixed conditions: the rewrite touches neither the recipe nor the session policy', () => {
  // matrix row 11 fixed condition — the surrounding R2 mechanics stay byte-anchored
  ok(EN, 'do not simulate one', 'R2 lost its no-simulation tail');
  ok(CN, '禁止模拟评审', 'CN R2 lost its no-simulation tail');
  ok(EN, 'one retry only', 'R2 reviewer-death retry policy drifted');
  ok(CN, '只重试一次', 'CN R2 reviewer-death retry policy drifted');
});
