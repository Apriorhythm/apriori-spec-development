# Design — unattributed-fail(事实对齐)

## 现状事实
- `TAP_RE = /^(ok|not ok)\s+\d+\s+-\s+(.*)$/gm` 只吃全形;`POINT_LINE_RE = /^(?:ok|not ok)(?:\s|$)/` 只用于 plan 计数。
- `parseTap` 已产出 `untaggedFails`(全形无 ID 的 not ok),进 `failCount`(:270)但不进 verdict;infra 规则 :194 只在 `failCount===0` 时把非零退出判 ERROR。
- verdict.clean 由 evaluate 按有 ID 结果算;cli 出口 :334 `errors→2; clean&&!dup→0; else 1`。

## 方案
- `parseTap` 增列 `unattributedFailures: string[]`(原始行全文):遍历行(剥一个尾随 CR),列 0 `/^not ok(?:\s|$)/`(与 POINT_LINE_RE 同形——`not ok:` 诊断前缀保持非 point/非 failure,SR-29);余文 `/#\s*(SKIP|TODO)\b/i` → 跳过;TAP_RE 全形且 leadId 命中 → 既有归因路径(不重复计);其余推入数组。`parseTap` 返回值新增 `unattributedFailures` 数组,**同时保留导出字段 `untaggedFails: unattributedFailures.length`**(doctor 消费兼容)。
- `evaluate`:verdict 增 `unattributed`(数组),`clean` 增加 `unattributed.length === 0` 条件。
- `failCount = 有 ID fail + unattributedFailures.length`(:194 infra 规则语义自然保持:真无失败才 ERROR)。
- `formatReport`:新组头 `✗ UNATTRIBUTED FAILURES (not ok without a scenario ID): N`;前 20 行,每行 >120 截断加 `…`;>20 追加 `… and N more`。
- `verifyJson`:顶层 `unattributedFailures: {count, lines}`(全文),**全结果类恒定存在**——GREEN/GAPS/ERROR(含 run.errors 非空)一律输出,默认 `{count: 0, lines: []}`。
- cli 出口不改(errors→2 优先;clean 含新条件)。gate C1 不改,继承。

## SPEC 触点
ADDED 新 Requirement,SR-33..38(SR-38 = gate C1 继承);SR-01..32 不动(SR-11/14 语义被强化但文字不矛盾)。
