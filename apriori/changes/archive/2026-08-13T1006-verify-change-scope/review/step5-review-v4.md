# STEP5 implementation review v4 — verify-change-scope

## 结论摘要

Round 4 的两项 closing 修复均成立。IMPL-3 与 IMPL-5 可以标为 verified；未发现新的 spec-vs-code gap。

实现、SPEC、DESIGN、测试、RUNBOOK、CLI docs、CHANGELOG 和 gate C1 现已形成一致闭环。producer 报告的 306/306 GREEN 与 `check --self` PASS 被接受；read-only sandbox 限制未计为 finding。

## Closing findings recheck

### IMPL-3 — verified

human store-report oracle 已完整覆盖其硬保证：

- 21 条 `unattributedFailures` 证明只展示前 20 条并输出 `… and 1 more`；
- 200-char 对抗行实际进入 store section；
- 展示行去除缩进后不超过 120 字符，并以 `…` 结尾；
- duplicate 行的严格断言要求出现文件 token；
- GREEN fixture 断言六类 count 均稳定存在且为零；
- 非空 fixture 同时覆盖 `boundRed`、`unbound`、`orphan`、`unidentified`、`unattributedFailures`、`duplicates` 的 count 和明细。

这些断言与 `formatReport()` 的实际渲染分支一一对应，不再允许“JSON 正确但 human 丢信息”或“只输出非空类别”的弱实现通过。

### IMPL-5 — verified

四类 JSON outcome 现已得到符合 AC7/B6 的 oracle：

- GREEN：完整 `deepStrictEqual`，包括 change-scoped 顶层字段、完整 `storeReport`、`changeScope`、`projection`、`exec`、`specFiles` 和 `stderr`；
- GAPS：完整 `deepStrictEqual`，锁定 scoped `unbound` 与 full-projection store view；
- pre-test ERROR：完整 shape，动态 error text 单独匹配，`storeReport`/`changeScope` absent；
- post-TAP ERROR：完整 `deepStrictEqual`，锁定 full-projection verdict arrays、全部 `exec` 成员、`projection`、`specFiles`、`duplicates`、`unattributedFailures` 和 `stderr`，并证明 ERROR 路径不执行 scope split。

执行保证也已覆盖：

- normal path：1 projection、1 spawn、2 matcher batches；
- invalid-pattern：0 projection、0 spawn；
- projection failure：1 projection、0 spawn；
- title-batch failure：0 spawn；
- TAP-batch failure：先发生恰好 1 spawn；
- post-TAP ERROR：1 projection、1 spawn、2 matcher batches；
- sibling titles 位于第一次 matcher payload；
- report 不会二跑测试。

## 最终 P8 checklist

- Semantic faithfulness：SR-56..64、修改后的 SR-16..24、GT-26..27 均有与场景 INTENT 对齐的正反 oracle。
- Missing behavior：未发现 SPEC 已要求但代码未实现的行为。
- Visibility：范围外 red、duplicate、unidentified、orphan、unattributed failure 均保留于完整 store report；异常 sibling 不被静默授予 exemption。
- External input handling：sibling scan 具备三级 containment/type guard、no-symlink-follow、strict delta parsing、operation/block filtering 和 fault-tolerant traversal。
- Hard guarantees：
  - `byte-identical`：`--specs` human/JSON golden；
  - `exactly two batches`：计数 seam；
  - `never re-runs tests`：spawn sentinel；
  - `fail-closed`：ID-less、true orphan、malformed/REMOVED/symlinked/unreadable sibling 反例；
  - `absent never null`：module API 与四类 JSON outcome；
  - 完整 human store report：六类、明细、20-item/120-char truncation；
  - 单一 projection/TAP snapshot：路径计数与共享绑定结果。
- Design fidelity：最终 sibling trust model、change scope、output contract、gate detail 和文档均与实现一致。
- SPEC-6：严格 repository-declaration trust boundary 已闭合；有效 sibling ADDED/MODIFIED declaration 可归属，异常材料只减少 exemption，未归因失败仍为 GAPS。

## Advisories

无阻断性 advisory。`safeMdWalk` 注释可在未来小幅澄清“文件 `lstat` guard 位于调用方”，但当前整体行为和测试均正确，不构成 formal gap。

## Ledger delta

| ID | Status delta | Reason |
|---|---|---|
| IMPL-3 | fixed (r4) → verified | human 六类稳定视图、非空明细、zero counts、20-item 截断、120-char cap、ellipsis 与 duplicate file provenance 均有直接 oracle |
| IMPL-5 | fixed (r4) → verified | 四类 JSON outcome 与全部条件式执行次数保证均已由完整或对抗性 oracle 锁定 |

VERDICT: no spec-vs-code gaps
