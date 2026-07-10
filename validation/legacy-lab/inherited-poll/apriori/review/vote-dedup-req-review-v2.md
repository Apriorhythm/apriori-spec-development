# vote-dedup req-v2 需求评审

## 结论摘要

本轮未发现需计入 verdict 的正式问题。`req-v2.md` 已逐条实质处理 round 1 的 REQ-001..REQ-007；目标态、异常路径、数据模型兼容、验收标准和 lineage 均足够明确，可进入实现设计/实现阶段。

| 维度 | Verdict | 说明 |
|---|---|---|
| 1. 目标态 B 是否清晰无歧义 | 通过 | cookie 名称、属性、签发入口、签名格式、错误码、`voted` 契约均已封版 |
| 2. 边界与异常路径是否覆盖 | 通过 | 已覆盖无/非法 cookie、重复、跨 poll、并发、持久化失败回滚、密钥缺失/损坏 |
| 3. 是否存在隐含但未声明的状态变化/副作用 | 通过 | `voters` 新字段、旧数据兼容、公开/admin 视图裁剪均已声明 |
| 4. 验收标准是否可测试 | 通过 | AC1..AC11 均可表达为 API、领域层或浏览器端到端断言 |
| 5. 是否与当前状态 A 冲突 | 通过 | 与 KB 描述的当前无 cookie、无服务端去重、`votes` 计票语义、无 fsync 保证一致 |
| 6. 目标 lineage 是否声明且匹配现实 | 通过 | 需求声明 `master`；当前分支为 `master`，HEAD 为 KB 记录的 `3f1d30954a9d5b500f8a6708b9070d51e045aac5` |

## 正式问题

### 维度 1：目标态 B 是否清晰无歧义

未发现正式问题。REQ-001、REQ-002、REQ-006 已关闭。

### 维度 2：边界与异常路径是否覆盖

未发现正式问题。REQ-003、REQ-004 已关闭。

### 维度 3：是否存在隐含但未声明的状态变化/副作用

未发现正式问题。REQ-005 已关闭。

### 维度 4：验收标准是否可测试

未发现正式问题。REQ-007 已关闭。

### 维度 5：是否与当前状态 A 冲突

未发现正式问题。

### 维度 6：目标 lineage 是否声明且匹配现实

未发现正式问题。

## Round 1 复核

| ID | Round 2 复核 |
|---|---|
| REQ-001 | 已充分修复：开放问题已封版，403、API-only cookie 签发、领域层接口变化均已声明 |
| REQ-002 | 已充分修复：`voted` 在 GET、POST 成功、POST 失败、admin view 的行为均已声明 |
| REQ-003 | 已充分修复：B4 声明同步原子调用链，AC8 覆盖同 cookie 并发投票 |
| REQ-004 | 已充分修复：B4 声明持久化失败回滚，AC9 覆盖失败注入 |
| REQ-005 | 已充分修复：B8 声明 `voters` 摘要字段、旧 poll 兼容和 `votes` 计票语义不变 |
| REQ-006 | 已充分修复：B1/B2/AC10 声明 cookie 名、Max-Age、密钥路径、生成/复用/损坏行为 |
| REQ-007 | 已充分修复：AC7 已拆成 API 断言与 Browser 断言 |

## Advisories

- ADV-r2-001：第 4 节的领域层接口说明里，`view(poll, voterId?)` “省略时 `voted` 恒为 `false`”与“admin 视图不暴露该字段”放在同一句中，容易让实现者误读为 admin 可复用并返回 `voted:false`。B6 的外部行为已经足够明确，所以不计入正式问题；建议实现设计阶段把公开投影和 admin 投影的函数边界写清楚。
- ADV-r2-002：AC7-Browser 删除 cookie 后立即点击投票时，现有页面有 3 秒轮询 `load()`，测试实现应避免轮询在点击前重新领取 cookie。需求本身可测，但测试代码需要控制时序。

## LEDGER DELTA

无新增或重开正式问题；无需向 `apriori/review/vote-dedup-issues.md` 追加 formal row。

VERDICT: no major issues

> (recorded on behalf of the reviewer — codex gpt-5.5, session 019f4127-1cdf-7e32-a569-e568fe86ff58 resumed, read-only sandbox; raw output: vote-dedup-req-review-v2-raw.txt)
