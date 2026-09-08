# Issue ledger — unattributed-fail

Rows recorded on behalf of the reviewer (codex session 019f4b30-68f9-7222-9b64-17f52a333b4c; raws beside their docs in this dir).

| ID | Issue | Risk | Round found | Status |
|---|---|---|---|---|
| UF-1 | unattributedFailures 的 JSON 形状与人类报告截断规则未精确定义。 | 实现/测试分叉,P8 无法判定合同。 | STEP0·r1 | verified |
| UF-2 | 未归因失败与 Bail out/plan mismatch/重号等 infra ERROR 并存时的优先级未定。 | 新 GAPS 分支可能遮蔽既有 fail-closed ERROR。 | STEP0·r1 | verified |
| UF-3 | 裸 not ok 的 SKIP/TODO 识别与缩进嵌套排除缺精确分类器。 | 合法 TAP 误伤,或 nested TAP 误计顶层失败。 | STEP0·r1 | verified |
| UF-4 | 需求称既有场景 SR-01..19,仓库现实是 SR-01..32。 | 回归范围被错误缩小。 | STEP0·r1 | verified |
| UF-5 | "untagged ok 点照旧列出"与当前报告/JSON 行为不符。 | 暗含未声明的输出变化。 | STEP0·r1 | verified |
| UFSPEC-1 | /^not ok\b/ 会把 not ok: 诊断前缀误判为失败,违背 SR-29 形状纪律。 | 合法 TAP false red。 | STEP2·r1 | verified |
| UFSPEC-2 | 设计未声明保留 parseTap 的 untaggedFails 导出(doctor 在消费)。 | 非目标表面崩溃/漂移。 | STEP2·r1 | verified |
| UFSPEC-3 | gate C1 继承无绑定场景。 | gate 路径漏修。 | STEP2·r1 | verified |
| UFSPEC-4 | SR-34 漏 not ok - desc 半形。 | 分类器漏形状仍机械过。 | STEP2·r1 | verified |
| UFSPEC-5 | JSON 新字段未绑定全结果类存在性。 | 机器合同条件性漂移。 | STEP2·r1 | verified |
| UFSPEC-ADV-1 | Advisory:截断 120 是否含省略号需明确。 | 边界理解分歧。 | STEP2·r1 | advisory-acked |
| UFIMPL-1 | gate C1 的 gap counts 不含 unattributed(仅此类时 detail 为空)。 | 阻断原因不可见,违背 SR-38。 | STEP5·r1 | verified |
| UFIMPL-2 | zeroTapParsed 不认 unattributedFailures,unattributed-only 裸流被误升 ERROR。 | 真实失败被误判 infra,违背 SR-34。 | STEP5·r1 | verified |
