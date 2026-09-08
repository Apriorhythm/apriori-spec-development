<!-- provenance: provider=openai model=gpt-5.6-sol session=019ff946-122a-7532-ac83-e50910aa0efc date=2026-08-13 round=STEP0-r36 transport=codex-exec-wsl-proxy -->

核验结论：REQ-72、REQ-74 已收口；REQ-73 保持 verified。REQ-75 的条件式后果与 skip-only 已修正，但结果聚合仍缺一个交集分支，因此不能关闭。未发现新的 lineage、design-first、A3 或 AC-D6 问题。

### REQ-75 — 高：同一 ID 同时 pass 与 fail 时结果不唯一

**风险：** AC 可被实现成“只要有一次通过即 GREEN”，从而让同一场景同时存在失败结果时错误放行，违背 state A 的 fail-closed 聚合语义。

**依据：**

- AC-I 当前定义：“无有效结果→UNBOUND、有通过→GREEN、有失败→RED”：[req-v34.md:117](/mnt/d/Workbench/misc/apriori-spec-development/apriori/changes/hotfix-lane/requirement/req-v34.md:117)。当同一 ID 同时有 pass 和 fail 时，后两项同时命中，没有判定优先级。
- state A 会聚合同一 ID 的全部 TAP 点，分别累计 `pass`、`fail`、`skip`：[spec-runner.js:342](/mnt/d/Workbench/misc/apriori-spec-development/lib/spec-runner.js:342)。
- 实际判定次序是：
  - `pass=0 ∧ fail=0` → UNBOUND；
  - 否则仅当 `fail=0` → GREEN；
  - 任何 `fail>0` → RED，即 fail 优先于 pass：[spec-runner.js:381](/mnt/d/Workbench/misc/apriori-spec-development/lib/spec-runner.js:381)。

结果谱应改成互斥有序函数：`fail>0 → RED；否则 pass>0 → GREEN；否则 → UNBOUND`，并补“同 ID 一 pass + 一 fail → RED”的 AC。

VERDICT: 1 issues open