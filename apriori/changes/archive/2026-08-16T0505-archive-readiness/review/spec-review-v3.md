# spec-review-v3 — archive-readiness SPEC + DESIGN review（STEP2 Round 3）

评审基于 revised design/tasks/spec deltas、`step2-amendment.md`、冻结需求、living store、KB 与实际源码；未修改任何文件。

## Per-issue disposition

### SPEC-1 — verified

回归复核通过。`ledgerFindings` 仍是 gate/archive 共享的唯一 ledger predicate；`readinessOf` 的签名与 D1.4 仍明确由自身拥有 guard → read → parse，且不接收 caller 传入的 `state` / `tier` / `flowText`。本轮修改未破坏该修复。

### SPEC-2 — verified

两条 round-2 残余均已修复。

1. `\w` 问题：生产方拒绝“只改示例为 ASCII reason”的建议是正确的。该建议只能让测试例绕过问题，不能修复真实仓库中中文 `gates:` 理由全部非法的根因。`step2-amendment.md` 将 predicate 改为 `[\p{L}\p{N}]` + `u` flag，技术上正确：实测纯中文理由通过，纯标点理由仍不通过。  
   这是冻结需求的一处实质修正，必须按 amendment 写法在 gate④ 单独呈报；但作为 spec/design 目标，它现在是一致且可测试的。

2. `forceGrants` 证据返回：`Map<class,{granted,firstLine,payload}>` 关闭了原 `Set<class>` 丢失获胜记录的问题。同一次 last-decision scan 同时决定授权并保存 `firstLine`，`readinessOf.forced[].entry` 不再需要二次推导。

### SPEC-3 — verified

`containDefect` 的 `enoent` 已是公开结果；artifact/review-root 两个调用点均定义了处置；非 null 返回值明确带 `path: target`；两次 `realpathSync` 独立执行；混合 `ENOENT` + 非 `ENOENT` 时非 `ENOENT` 优先，避免 trivial tier fail-open。AM-115 与 B3/B4 任务覆盖了 realpath-stage ENOENT 和混合错误控制。

### SPEC-4 — verified

回归复核通过。B0-2 仍要求在改 `gate.js` 前采集 state-A golden；RY-01/RY-02 对 golden 比对，不对 refactor 后的 gate 自比较；B2 后禁止重生成 golden。本轮未破坏该隔离。

### SPEC-5 — verified

回归复核通过。AM-111 的 grant/revoke/grant 都要求合法 reason；无 reason revoke 被忽略，与 grant 的 reason 规则一致。本轮 Unicode reason predicate 修改后，该场景仍可测试且语义一致。

### SPEC-6 — verified

D7 现在闭合：

- 集合定义改为 `req-final IDs + STEP2-derived IDs`。
- RY-01..RY-11 均逐项映射到任务。
- AM-114、AM-115、RY-11 均列明 provenance。
- AM-99..AM-106 明确为一次性迁移/文档验收，无 living scenario，且给出理由。
- CLI delta 与 D7 均使用 `AM-01..AM-98, AM-107..AM-115`。
- dry-run 归档复核通过：AM-12 是唯一 dropped；AM-19 与 CL-03 的 `! missing` 是有意 clause rewrite；未发现其他静默丢失。

### SPEC-7 — verified

B1 的迁移判据仍是“状态 A 下会越过 readiness 插入点”，覆盖 CLI 与直接 `archiveChange()` API 调用。RY-03/RY-04 现在绑定到 B2 实现的具名生产函数 `stepOverlay(state,name)`，不再需要测试内重述 STEP6 规则；B4 的 RY-11 静态断言要求 `readinessOf` 调用该函数。D6c 也列出 RY-03/RY-04、RY-11、AM-115 的首次变绿批次。

## New issues

无新的 blocking issue。

## Evidence handling judgment

`spec-review-v2.md` / `spec-review-v2-raw.txt` 从 Codex session rollout 恢复，raw 文件带 provenance 与 recovery 说明，并明确缺失 banner/tool trace。按 RUNBOOK R2 的核心目的判断，这是可接受的证据处理：恢复的是评审方模型输出本文与 verdict，不是生产方转述；缺失的外围工具轨迹已如实标注。该事故应在 gate④材料中保留说明，但不构成 spec/design 阻塞。

## Advisories

### A-1 — `req-final.md` 仍有一处历史 `\w` 字样

`req-final.md` 的 AM-110 摘要仍写“无 `\w` 理由”，而同一节规范规则和 amendment 已改为 `[\p{L}\p{N}]`。当前 design/spec/tasks 均已使用正确 predicate，因此不阻塞 STEP2；但建议把该残留改成“无合法 reason”或“理由不含 `[\p{L}\p{N}]`”，避免后续读者误读。

### A-2 — D1.2 的 `containDefect` 摘要签名可同步补 `path`

D1.2 的正文明确“返回值一律带 `path`”，但顶部简写签名仍写成 `{kind:'enoent'}` / `{kind:'escape'}` / `{kind:'io-error', code}`。当前正文足够决定实现，不阻塞；建议把摘要签名也改成带 `path` 的形态，减少二次误读。

### A-3 — D2 worked table 仍使用兼容旧格式时间戳

D2 正文已支持 RUNBOOK 规范 `YYYY-MM-DDTHH:MM`，也兼容旧 `T\d{4}`；表格仍用 `T1800`。不影响 parser 结论，但测试语料最好至少有一条规范格式，避免把兼容路径误认为唯一规范。

## Dimension verdicts

1. Spec deltas faithfully express the amended requirement: pass.
2. Design implementable without divergent choices: pass, subject to A-2 cleanup.
3. Delta grammar: pass; AM-12 is the only dropped scenario.
4. Scenario/test binding: pass.
5. Conflicts with living store/KB/state A: no blocking conflict found.
6. Batch plan: pass; B1/B2/B4 sequencing no longer permits the previously identified fake-green path.

VERDICT: no major issues, ready to proceed to execution
