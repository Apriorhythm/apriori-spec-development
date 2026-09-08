<!-- provenance: provider=openai model=gpt-5.6-sol session=019ff946-122a-7532-ac83-e50910aa0efc date=2026-08-13 round=STEP0-r41 transport=codex-exec-wsl-proxy -->

核验结果：REQ-80 的直接修复已完成；REQ-81 的空-scope 归一过宽，产生跨 profile 冲突；另发现 Q-6b 候选形状未闭合。lineage、prior-art 引用、design-first 边界及 state A 对照未见其他新增问题。

### REQ-81 — 空 scope 错把非测试证据的 Q-6b 新鲜度一并归为 n/a

风险：阻断

依据：

- 新规则规定 final scope 为空时，“Q-3 与 Q-6b 的一切证据要求不适用”。[req-v39.md:94](/mnt/d/Workbench/misc/apriori-spec-development/apriori/changes/hotfix-lane/requirement/req-v39.md:94)
- 但同一 B-C 行的 UI/fullstack 投影仍要求 `frontend-touched: yes` 时提供页面截图；测试 scope 为空并不消除截图义务。[req-v39.md:94](/mnt/d/Workbench/misc/apriori-spec-development/apriori/changes/hotfix-lane/requirement/req-v39.md:94)
- Q-6b 明确也绑定截图类工件：f2 工件哈希包含截图，截图记录自身另有代码基线规则。[req-v39.md:73](/mnt/d/Workbench/misc/apriori-spec-development/apriori/changes/hotfix-lane/requirement/req-v39.md:73)
- 因此 `R2-behavior × ui × frontend=yes × singleton no-test × empty scope` 下，一处要求截图，另一处又取消其 Q-6b 新鲜度，机械退出条件不唯一且可能放行陈旧截图。

空 scope 应只令“Q-3 测试证明工件及其 Q-6b 投影”归 n/a；截图/E2E 等仍存在的 profile 证据必须继续执行各自的新鲜度契约。AC 需补这个交叉例。

### REQ-82 — Q-6b 被当成互斥三案，但正文又允许 `f1 + f2` 叠加

风险：阻断

依据：

- 新参数化把 f1、f2、f3 写成逐案分支，AC-D3 也将“Q-6b 案”作为单一选择轴。[req-v39.md:94](/mnt/d/Workbench/misc/apriori-spec-development/apriori/changes/hotfix-lane/requirement/req-v39.md:94) [req-v39.md:113](/mnt/d/Workbench/misc/apriori-spec-development/apriori/changes/hotfix-lane/requirement/req-v39.md:113)
- 但新鲜度定义明确倾向“f1 底线 + 裁 d 叠加 f2”，说明 f1 与 f2 并非互斥候选。[req-v39.md:77](/mnt/d/Workbench/misc/apriori-spec-development/apriori/changes/hotfix-lane/requirement/req-v39.md:77)
- 开放问题摘要仍写 `f1/f2/f3`，没有列出合法选择集合，也未明确叠加时 oracle 是取并集还是由 f2 取代 f1。[req-v39.md:126](/mnt/d/Workbench/misc/apriori-spec-development/apriori/changes/hotfix-lane/requirement/req-v39.md:126)
- f2 又强绑签收 d，故这不是单轴内部措辞问题，而是 Q-6b×Q-8 签收的联合候选问题；当前合法联合表要求没有将它具体闭合。[req-v39.md:115](/mnt/d/Workbench/misc/apriori-spec-development/apriori/changes/hotfix-lane/requirement/req-v39.md:115)

需列出 Q-6b 的合法选择集合，例如是否允许 `{f1}`、`{f2}`、`{f3}`、`{f1+f2}`，并为组合案定义累加 oracle、d/d1 强绑及 AC 覆盖；不应替 owner 预先决定哪些集合保留。

VERDICT: 2 issues open