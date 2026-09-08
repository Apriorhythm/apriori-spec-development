<!-- provenance: provider=openai model=gpt-5.6-sol session=019ff946-122a-7532-ac83-e50910aa0efc date=2026-08-13 round=STEP0-r39 transport=codex-exec-wsl-proxy -->

核验结果：REQ-76、REQ-78、REQ-79 的主体修复已落盘；REQ-77 尚有残留，并发现两处新的契约缺口。lineage、design-first 边界未见新增问题。

### REQ-77 — Q-3=ii 在 R2 的 `GREEN` 语义仍未完全消除

风险：阻断

依据：

- R2 前半格已正确区分：Q-3=i 消费现场 `GREEN`，Q-3=ii 消费证据中的 `PASS/FAIL`。
- 但同一格后面的 Q-4c 分键契约仍写成“`tests:` 键 GREEN”，没有按 Q-3 参数化。[req-v37.md:94](/mnt/d/Workbench/misc/apriori-spec-development/apriori/changes/hotfix-lane/requirement/req-v37.md:94)
- 因而 `Q-3=ii × Q-4=c × keyed tests:` 仍有两种解释：证据 `PASS` 即满足，或者还必须执行现场 verify 得到 `GREEN`。这正是本轮声称清除的简写歧义。

应改成唯一映射：`tests:` 键按所选 Q-3 证明机制验收——i 为现场 `GREEN`，ii 为证据工件对应 ID 的 `PASS`。

### REQ-80 — Q-3=ii 要求的基线字段没有随 Q-6b 参数化

风险：阻断

依据：

- Q-3=ii 无条件要求“工件携 Q-6b 基线/摘要字段，缺字段拒绝”。[req-v37.md:94](/mnt/d/Workbench/misc/apriori-spec-development/apriori/changes/hotfix-lane/requirement/req-v37.md:94)
- 但 Q-6b 仍有三个合法候选：f1 是工件代码基线行；f2 是 d1 摘要绑定工件哈希及代码基线；f3 只有时间戳弱新鲜度。[req-v37.md:75](/mnt/d/Workbench/misc/apriori-spec-development/apriori/changes/hotfix-lane/requirement/req-v37.md:75)
- 因此 f2 并不天然要求字段位于证据工件内，f3 更没有代码基线字段；当前规则会把 owner 可合法选择的 f2/f3 判为缺字段，或迫使实现者自行猜测“Q-6b 字段”究竟指什么。
- AC-D3 虽新增 Q-3/Q-4/Q-8-Q7c 轴，却未纳入决定该工件形状的 Q-6b 轴，无法捕获上述分支冲突。[req-v37.md:113](/mnt/d/Workbench/misc/apriori-spec-development/apriori/changes/hotfix-lane/requirement/req-v37.md:113)

需逐个定义 f1/f2/f3 的必需字段、字段所在载体及拒绝条件，并把 Q-6b 纳入相关覆盖维度。

### REQ-81 — Q-3=ii 证据结果域没有闭合

风险：高

依据：

- 当前只规定 final scope 内每个 ID 恰一条，缺失或重复拒绝，却没有规定证据中出现 scope 外 ID 时如何处理。[req-v37.md:94](/mnt/d/Workbench/misc/apriori-spec-development/apriori/changes/hotfix-lane/requirement/req-v37.md:94)
- 于是额外 `PASS` 是否允许、额外 `FAIL` 是因“任一 FAIL”拒绝还是因其域外而拒绝，均没有唯一答案。
- singleton `no-test:` 令 final scope 为空时，也未明确 Q-3=ii 工件应缺席、必须存在零行工件，还是两者皆可；AC 虽列出该交叉组合，却没有钉死这一预期。[req-v37.md:117](/mnt/d/Workbench/misc/apriori-spec-development/apriori/changes/hotfix-lane/requirement/req-v37.md:117)

应定义结果键集合与 final scope 严格相等，并单列空 scope 时证据工件的基数规则及 AC 正反例。

VERDICT: 3 issues open