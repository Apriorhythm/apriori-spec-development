<!-- provenance: provider=openai model=gpt-5.6-sol session=019ff946-122a-7532-ac83-e50910aa0efc date=2026-08-13 round=STEP0-r19 transport=codex-exec-wsl-proxy (retry after network drop, recorded) -->

已确认 req-v17 为真实新字节，lineage 与仓库一致。REQ-53 已闭合；REQ-58 仅部分闭合。

### REQ-58 — 阻断：`HEAD` 仍不能无条件代表 reviewer 实际看到的代码

**风险：** 未提交代码可以在评审后继续变化，而摘要保持不变，陈旧 verdict 仍可能通过。

**依据：**

- 摘要只绑定当前 `HEAD`；`HEAD` 不包含 staged/unstaged 工作树内容。
- clean-tree 约束只属于待裁的 f1；Q-6 仍允许选择 f2/f3，并未把 clean-tree 设为启用评审时的无条件前提。
- state A 的顺序是先完成 STEP5/P8，直到 STEP6/P9 前才要求提交实现，因此 P8 合法发生在 dirty worktree 上。
- 当前 `lib/gate.js` 也没有工作树清洁度检查。

反例：`HEAD=A`、工作树实现为 B 时完成评审；随后把未提交实现改为 C。bundle 和 `HEAD` 均未变化，preflight 重算摘要仍相等，但 verdict 实际只评审过 B。选择 f3 时没有其他机械防线拦截。

见 [req-v17.md:31](/mnt/d/Workbench/misc/apriori-spec-development/apriori/changes/hotfix-lane/requirement/req-v17.md:31)、[req-v17.md:73](/mnt/d/Workbench/misc/apriori-spec-development/apriori/changes/hotfix-lane/requirement/req-v17.md:73)、[req-v17.md:123](/mnt/d/Workbench/misc/apriori-spec-development/apriori/changes/hotfix-lane/requirement/req-v17.md:123)、[RUNBOOK.md:249](/mnt/d/Workbench/misc/apriori-spec-development/RUNBOOK.md:249)、[RUNBOOK.md:257](/mnt/d/Workbench/misc/apriori-spec-development/RUNBOOK.md:257)、[gate.js:310](/mnt/d/Workbench/misc/apriori-spec-development/lib/gate.js:310)。

因此“HEAD 变化会失配”本身成立，但“摘要绑定被评代码且独立于 f2”尚不成立：还需绑定工作树内容，或把 clean-tree 强制为所有评审组合的无条件前提。

未发现新的 lineage、prior-art 或二元组全域问题。

VERDICT: 1 issues open