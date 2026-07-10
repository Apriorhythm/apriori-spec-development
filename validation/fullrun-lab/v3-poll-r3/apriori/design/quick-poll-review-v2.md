<!-- Recorded on behalf of the reviewer (codex, session 019f3f5c-4773-7d62-b167-4a4eda741ae6, read-only sandbox).
     Raw output archived verbatim at apriori/review/quick-poll-step2-review-v2-raw.txt. -->

# quick-poll STEP2 spec/design 评审 v2

## Round-1 问题复核(SPEC-1..6)

- **SPEC-1 verified** — PC-16 + 所有 POST 解析前校验 Content-Type,415 `UNSUPPORTED_MEDIA_TYPE`;spec/design/tasks 一致。
- **SPEC-2 verified** — close token contract 固定为 body `{adminToken}` 或 `X-Admin-Token`,body 优先;可绑定 CL-01/03/04。
- **SPEC-3 verified** — CL-07/CL-08 覆盖 closed/expired 分享页只读、隐藏投票表单。
- **SPEC-4 verified** — lazy-close 写盘经 `runExclusive`,队列内二次 load/recheck/save;磁盘唯一写者是队列内 fn。
- **SPEC-5 verified** — queue 改为 `prev.catch().then(fn)`、tail 永不 reject、`map.get(id)===tail` 条件清理;一次 persist failure 不毒化后续。
- **SPEC-6 verified** — SEC-02 覆盖投票后动态视图;客户端仅 `textContent`/安全属性,禁 innerHTML。

## STEP2 checklist 复跑
- Scenario coverage:AC-1..19 + 新增路径均有稳定 ID,绑定点充分。
- 外部共享状态:磁盘 JSON 与 per-poll queue 三时刻完整;lazy-close 不再是队列外写者。
- 当前态/约定:greenfield 无冲突,方向与 requirement/proposal 一致。
- Spec vs design:无 spec 声明而 design 缺失、或 design 引入而 spec 未声明的风险行为。
- 安全/持久化/并发:admin token 隔离、XSS、path traversal、Content-Type、持久化失败、atomic write、close/vote 串行均有可执行设计;CC-02 fsync file+dir 支撑 ack 后持久化;CC-01/CC-03 由 per-poll queue 支撑;CC-04 不破坏旧 JSON 也不阻断后续队列。

无新 formal issue,无新 advisory。

VERDICT: no major issues, ready to proceed to execution
