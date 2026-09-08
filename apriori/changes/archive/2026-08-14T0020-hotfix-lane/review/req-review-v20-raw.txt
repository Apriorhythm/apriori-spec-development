<!-- provenance: provider=openai model=gpt-5.6-sol session=019ff946-122a-7532-ac83-e50910aa0efc date=2026-08-13 round=STEP0-r20 transport=codex-exec-wsl-proxy -->

已确认 req-v18 为真实新字节，lineage 仍与仓库一致。REQ-58 的 dirty-worktree 方向正确，但尚未机械闭合；另发现一个摘要自失效问题。

### REQ-58 — 阻断：无条件 clean-tree 仍可被 `t2` 弱化，且排除集引用失效

**风险：** owner 合法裁定 `t2` 后，未跟踪源码仍可在评审后变化而不改变 HEAD，陈旧 verdict 继续通过。

**依据：**

- 新规则只声明“不随 Q-6b 的 f 候选走”，没有声明独立于 Q-6c 的 `t1/t2`。
- Q-6c 仍保留 `t2 = untracked 忽略`。未跟踪源码可能参与构建或运行；修改它既不改变 HEAD，也不会被 t2 拦截。
- 新规则引用“排除集同 B4”，但正文 B4 是“受影响 scope 的机械契约”，没有 clean-tree 排除集；真正的排除集定义在 f1。
- AC-I 仍只列 f1 的 dirty-tree 断言，没有覆盖“f2/f3 + 含评审组合也必须拒绝 dirty/untracked”的新无条件规则。

见 [req-v18.md:31](/mnt/d/Workbench/misc/apriori-spec-development/apriori/changes/hotfix-lane/requirement/req-v18.md:31)、[req-v18.md:73](/mnt/d/Workbench/misc/apriori-spec-development/apriori/changes/hotfix-lane/requirement/req-v18.md:73)、[req-v18.md:76](/mnt/d/Workbench/misc/apriori-spec-development/apriori/changes/hotfix-lane/requirement/req-v18.md:76)、[req-v18.md:114](/mnt/d/Workbench/misc/apriori-spec-development/apriori/changes/hotfix-lane/requirement/req-v18.md:114)、[req-v18.md:123](/mnt/d/Workbench/misc/apriori-spec-development/apriori/changes/hotfix-lane/requirement/req-v18.md:123)。

因此 REQ-58 仍只能判为部分闭合。

### REQ-59 — 阻断：摘要域包含 flow-state，形成必然的评审自失效循环

**风险：** 合法完成一次评审后，按 RUNBOOK 更新流程状态就会改变摘要，导致 preflight 强制要求再次评审；下一轮又必须更新 flow-state，循环无法收敛。

**依据：**

- 摘要域定义为“bundle 内全部文件”，只排除 approval 和评审工件域。
- RUNBOOK 将 flow-state 与 requirement review、ledger、raw 分列为不同工件；flow-state 不属于已声明的评审工件域。
- RUNBOOK 强制每轮结束后立即更新 flow-state；现实文件也会更新 `round`、`next-action` 和 verdict 记录。
- 因此 reviewer 看到摘要 H1 后，落盘本轮状态会产生 H2；归档 preflight 重算必不等于 verdict 中的 H1。即使重审 H2，下一次状态更新仍产生 H3。

见 [req-v18.md:31](/mnt/d/Workbench/misc/apriori-spec-development/apriori/changes/hotfix-lane/requirement/req-v18.md:31)、[RUNBOOK.md:156](/mnt/d/Workbench/misc/apriori-spec-development/RUNBOOK.md:156)、[RUNBOOK.md:164](/mnt/d/Workbench/misc/apriori-spec-development/RUNBOOK.md:164)、[flow-state.md:7](/mnt/d/Workbench/misc/apriori-spec-development/apriori/changes/hotfix-lane/flow-state.md:7)。

未发现新的 lineage、prior-art 或 B-C 组合冲突。

VERDICT: 2 issues open