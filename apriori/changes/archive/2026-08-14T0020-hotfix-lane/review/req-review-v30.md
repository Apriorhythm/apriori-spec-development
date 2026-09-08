<!-- provenance: provider=openai model=gpt-5.6-sol session=019ff946-122a-7532-ac83-e50910aa0efc date=2026-08-13 round=STEP0-r30 transport=codex-exec-wsl-proxy -->

核验结果：v28 为真实新字节，lineage 仍准确。REQ-69 已完整收口；REQ-70 的新增分支已落文，但旧契约未同步且保留案仍不可验收，因此需按 state A 规则重开原 ID。未发现其他独立新问题。

- **REQ-70｜风险：阻断｜Q-4 保留案与正式函数、B-C 表及 AC 仍互相矛盾。**  
  **依据：**新增段允许 Q-4 不移除时使用 singleton `no-test:`，却仍称其“半径/准入/债务后果须按 owner 裁定单独定义” [req-v28.md:31](/mnt/d/Workbench/misc/apriori-spec-development/apriori/changes/hotfix-lane/requirement/req-v28.md:31)，没有给出可裁候选及各自预期结果。与此同时：

  - 同一段前部仍写“no-test 已按 Q-4 收敛移除”，把待裁项当成既定事实。
  - 正式推论仍原样写“no-test 彻底消失——R1 无载体”，与新增的“R1 在 p2 下存在 singleton 载体”直接冲突 [req-v28.md:62](/mnt/d/Workbench/misc/apriori-spec-development/apriori/changes/hotfix-lane/requirement/req-v28.md:62)。
  - B-C 表仍规定 R1 必须 scoped verify GREEN、R2 “no-test 无此选项” [req-v28.md:90](/mnt/d/Workbench/misc/apriori-spec-development/apriori/changes/hotfix-lane/requirement/req-v28.md:90)，没有参数化 Q-4 保留案。
  - AC 只说保留案“后果按裁定断言” [req-v28.md:114](/mnt/d/Workbench/misc/apriori-spec-development/apriori/changes/hotfix-lane/requirement/req-v28.md:114)，但未定义应断言什么，属于循环 oracle。
  - state A 的 verify 不识别 `no-test`，scenario 没有测试仍为 UNBOUND [RUNBOOK.md:250](/mnt/d/Workbench/misc/apriori-spec-development/RUNBOOK.md:250)；零 delta 又不会制造新的 store UNBOUND，故该声明究竟是冗余留痕还是验证豁免必须在 owner 选择前讲清。

  应现在就参数化列出保留案的合法候选：适用 R1/R2 范围、是否替代 scoped GREEN、准入结果、可观察债务与清偿路径；同步需求函数、推论、B-C 表、Q-4 摘要及确定预期的 AC。owner 只选择方案，不负责现场补设计。

VERDICT: 1 issues open