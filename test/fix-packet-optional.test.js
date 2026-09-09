'use strict';
// batch-c-r13 — the Fix Packet fresh-session hard law becomes a recommendation
// (matrix §五′-3 row 13; battery E2 = 0/4, work/results/exist/RESULTS.md +
// RESULTS-mac.md, and plan/22 RC1-14: every collected arm holds exactly one
// producer jsonl — the mandate saw zero compliance while the in-session fixes
// were of acceptable quality; the pre-registered branch for E2 = 0 is "ratify
// the status quo": a discipline-text subtraction, zero behavior change).
//
// ONLY the mandate is downgraded — the Fix Packet mechanism itself survives as
// the recommended handoff tool (plan/09:33 lab evidence supports it lowering
// the fix unit cost; the E2/RC1-14 evidence only shows nobody obeys the
// mandate, not that the mechanism is useless). New rule, both editions: after
// REVISE the fix round may continue in the producing session; when context has
// grown long, or the same family is not converging across rounds, hand off to
// a fresh session with a Fix Packet — whose content definition (blocking
// P0/P1, minimal repro, files involved, verification commands, explicit
// non-goals, advisory exclusion) is retained verbatim in spirit and anchored
// here. These anchors are the rollback criterion: RED before the rewrite,
// green after.
const { test } = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.join(__dirname, '..');
const EN = fs.readFileSync(path.join(ROOT, 'RUNBOOK.md'), 'utf8');
const CN = fs.readFileSync(path.join(ROOT, 'RUNBOOK_cn.md'), 'utf8');
const ok = (t, s, m) => assert.ok(t.includes(s), `${m ?? 'expected'}: ${s}`);
const not = (t, s, m) => assert.ok(!t.includes(s), `${m ?? 'unexpected'}: ${s}`);

test('FP-01 the hard law is gone from both editions', () => {
  // §0 bullet (RUNBOOK.md:69 / RUNBOOK_cn.md:69)
  not(EN, 'REVISE cuts the session', 'RUNBOOK.md still states the fresh-session mandate');
  not(EN, 'the fix round runs in a fresh or cleared session',
    'RUNBOOK.md still mandates the fresh session');
  not(CN, 'REVISE 切断会话', 'RUNBOOK_cn.md still states the fresh-session mandate');
  not(CN, '修复轮换一个全新或已清空的会话跑', 'RUNBOOK_cn.md still mandates the fresh session');
  // §4 re-verify tail (RUNBOOK.md:286 / RUNBOOK_cn.md:277)
  not(EN, 'On REVISE, start that round in a fresh session with a Fix Packet',
    'the §4 re-verify tail still mandates the fresh session');
  not(CN, 'REVISE 时,这一轮在新会话里、带着 Fix Packet 开始',
    'the CN §4 re-verify tail still mandates the fresh session');
});

test('FP-02 EN §0: fix in place is legal, the Fix Packet handoff is the recommendation', () => {
  ok(EN, 'REVISE: fix in place, or hand off with a Fix Packet (recommended, not required).');
  ok(EN, 'the fix round may continue in the producing session');
  ok(EN, 'When context has already grown long, or the same family is not converging across rounds, the recommended move is to hand the fix round to a fresh or cleared session');
});

test('FP-03 CN §0 mirrors the same downgrade, in sync', () => {
  ok(CN, 'REVISE:可原会话续修,长会话或不收敛时建议 Fix Packet 交接(建议,非强制)。');
  ok(CN, '修复轮可以在原会话继续');
  ok(CN, '当上下文已长,或同族多轮仍不收敛时,建议把修复轮交给一个全新或已清空的会话');
});

test('FP-04 the Fix Packet content definition survives, verbatim, in both editions', () => {
  // the mechanism is kept — only the mandate went. Content definition anchored:
  ok(EN, 'one short **Fix Packet** — a handoff message, not a file: the blocking P0/P1, a minimal repro, the files involved, the verification commands that must pass, the explicit non-goals');
  ok(EN, 'Advisory findings stay out unless the owner escalates one, or fixing it is a direct prerequisite of a P0/P1 fix');
  ok(EN, 'This is context hygiene, not a lower bar: every P0/P1 is still fixed');
  ok(CN, '一份简短的 **Fix Packet**(一条交接消息,不是文件):阻塞性的 P0/P1、最小复现、相关文件、必须跑通的验证命令、明确的非目标');
  ok(CN, 'advisory 默认不进入,除非所有者明确升级,或修它是修某个 P0/P1 的直接前置');
  ok(CN, '这是上下文卫生,不是降低标准:每个 P0/P1 照样要修');
});

test('FP-05 the §4 re-verify tail carries the recommendation wording', () => {
  ok(EN, 'On REVISE, the fix round may continue in the same session; a Fix Packet handoff to a fresh session is recommended once context has grown long or the family is not converging');
  ok(CN, 'REVISE 后可在原会话继续修复;上下文已长或同族多轮不收敛时,建议带 Fix Packet 交接新会话');
});

test('FP-06 fixed conditions: session hygiene and the re-verify path stay anchored', () => {
  // the neighboring session-hygiene bullet is untouched — sessions MAY still be fresh
  ok(EN, 'each phase may run in a fresh session', 'the session-hygiene bullet drifted');
  ok(CN, '每个阶段都可以换新会话', 'the CN session-hygiene bullet drifted');
  // the re-verify path itself is untouched: REVISE with changed code still re-verifies
  ok(EN, 'review returns REVISE and product code or tests changed',
    'the re-verify trigger drifted');
  ok(CN, '评审结论为 REVISE 且产品代码或测试发生了变化', 'the CN re-verify trigger drifted');
  // OPM-05 companion: the Fix Packet rule stays in the shipped runbook
  ok(EN, 'Fix Packet');
  ok(CN, 'Fix Packet');
});
