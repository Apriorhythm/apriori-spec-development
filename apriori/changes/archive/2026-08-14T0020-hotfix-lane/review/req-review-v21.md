<!-- provenance: provider=openai model=gpt-5.6-sol session=019ff946-122a-7532-ac83-e50910aa0efc date=2026-08-13 round=STEP0-r21 transport=codex-exec-wsl-proxy -->

已确认 req-v19 为真实新字节，lineage 与仓库一致。REQ-59 的状态文件自失效循环已闭合；REQ-58 尚有决策摘要残口，并发现一项新的摘要域缺失。

### REQ-58 — 高：Q-6 决策摘要仍把 `t2` 表述为全局候选

**风险：** gate③ owner 可能按 Q-6 直接选择“忽略 untracked”，与正文“含评审组合必须拒绝 untracked”形成两份契约。

**依据：**

- 正文明确限定：`t2` 只可用于无评审组合。
- AC-I 也要求含评审组合下 `t2` 不豁免。
- 但 Q-6c 仍无条件写作 `t2（untracked 忽略）`，未注明仅适用于无评审组合。
- AC-D5 又声明 Q-1..Q-12 是交给 owner 的完整决策摘要，因此不能依赖 owner 回查长段正文补足限制。

见 [req-v19.md:31](/mnt/d/Workbench/misc/apriori-spec-development/apriori/changes/hotfix-lane/requirement/req-v19.md:31)、[req-v19.md:112](/mnt/d/Workbench/misc/apriori-spec-development/apriori/changes/hotfix-lane/requirement/req-v19.md:112)、[req-v19.md:114](/mnt/d/Workbench/misc/apriori-spec-development/apriori/changes/hotfix-lane/requirement/req-v19.md:114)、[req-v19.md:123](/mnt/d/Workbench/misc/apriori-spec-development/apriori/changes/hotfix-lane/requirement/req-v19.md:123)。

### REQ-60 — 阻断：摘要正列漏掉决定分级、评审范围和验证范围的声明字段

**风险：** 评审后可以修改关键声明而不使摘要失配，旧 verdict 会被复用于不同的半径、测试 scope 或 UI 证据义务。

**依据：**

- 摘要正列只有 `delta + decisions + conclusion + bindings`。
- 字段契约另有 `change-kind`、`touched-modules`、`frontend-touched`、`backend-touched`、`affected-scenario-ids` 等输入。
- 这些字段分别决定半径/R2 子型、跨模块 fail-up、截图要求和 scoped verify 范围，却既未进入摘要正列，也没有独立的新鲜度绑定。
- prior art 中 `bindings` 专指 scenario 的 `tests/no-test` 声明，并不包含上述定位头和分级字段，因此不能把它们解释为已经被 `bindings` 覆盖。

可构造绕过：在 reviewer 审查 `affected-scenario-ids=S1、frontend-touched=yes` 后，将其改成 `S2/no`；delta、代码 HEAD、conclusion 和 bindings 均不变，摘要仍相等，但 preflight 会验证另一组场景并取消截图义务。

见 [req-v19.md:31](/mnt/d/Workbench/misc/apriori-spec-development/apriori/changes/hotfix-lane/requirement/req-v19.md:31)、[req-v19.md:41](/mnt/d/Workbench/misc/apriori-spec-development/apriori/changes/hotfix-lane/requirement/req-v19.md:41)、[req-v19.md:48](/mnt/d/Workbench/misc/apriori-spec-development/apriori/changes/hotfix-lane/requirement/req-v19.md:48)、[req-v19.md:79](/mnt/d/Workbench/misc/apriori-spec-development/apriori/changes/hotfix-lane/requirement/req-v19.md:79)、[req-v13.md:48](/mnt/d/Workbench/misc/apriori-spec-development/apriori/changes/hotfix-channel/requirement/req-v13.md:48)。

未发现新的 lineage、state A 或 B-C 笛卡尔组合冲突。

VERDICT: 2 issues open