<!-- provenance: provider=openai model=gpt-5.6-sol session=019ff946-122a-7532-ac83-e50910aa0efc date=2026-08-13 round=STEP0-r25 transport=codex-exec-wsl-proxy -->

已确认 req-v23 为真实新字节，lineage 与仓库一致。REQ-62 的条件基数及 AC-I 分支已经闭合；发现一项新的声明需求函数冲突。

### REQ-63 — 阻断：以“delta 目标键非空”唯一决定 bindings 必需性，无法覆盖 docs 与零 delta 候选

**风险：** 已声明合法的 doc-fix 路径没有可诚实填写的 bindings 形态；同时 prior-art 的零 delta p2 候选会被新基数规则禁止。

**依据：**

- c1′ 规则现在规定：只要 delta 目标键非空就必须有 bindings 节；无目标键则必须没有该节。
- doc-fix 必须携带非零 delta，且可降入 R2 的 MODIFIED/ADDED 块必须含 scenario，因此必然产生目标键。
- 但 doc-fix 的证明契约明确规定 scoped verify 不适用，只使用 `check + P8`。
- prior-art bindings 的合法行只有 `tests:` 或 `no-test:`；本 change 又待 owner 确认 hotfix 全域移除 no-test。对 docs 而言，填写 `tests:` 会虚构不存在的 scenario 级 TAP 绑定，填写 `no-test:` 又被 Q-4 收紧禁止。
- 反方向也有冲突：Q-8 仍把 prior-art Q7c 的零 delta p1/p2 交 owner 裁定；若裁 p2，零 delta code fix 必须有 bundle 级 tests/no-test 声明，但“delta 目标键为空 ⇒ bindings 标题必须为 0”会将其判为 F1。

因此 bindings 的 requiredness 不能只由 delta 目标键决定，至少需要参数化 `change-kind/profile` 及 Q7c 裁定，并为 doc-fix 定义诚实的 check/P8 绑定形态或显式免除。

见 [req-v23.md:31](/mnt/d/Workbench/misc/apriori-spec-development/apriori/changes/hotfix-lane/requirement/req-v23.md:31)、[req-v23.md:50](/mnt/d/Workbench/misc/apriori-spec-development/apriori/changes/hotfix-lane/requirement/req-v23.md:50)、[req-v23.md:62](/mnt/d/Workbench/misc/apriori-spec-development/apriori/changes/hotfix-lane/requirement/req-v23.md:62)、[req-v23.md:77](/mnt/d/Workbench/misc/apriori-spec-development/apriori/changes/hotfix-lane/requirement/req-v23.md:77)、[req-v23.md:125](/mnt/d/Workbench/misc/apriori-spec-development/apriori/changes/hotfix-lane/requirement/req-v23.md:125)，以及 prior-art [req-v13.md:49](/mnt/d/Workbench/misc/apriori-spec-development/apriori/changes/hotfix-channel/requirement/req-v13.md:49)、[req-v13.md:59](/mnt/d/Workbench/misc/apriori-spec-development/apriori/changes/hotfix-channel/requirement/req-v13.md:59)。

未发现新的 state A、lineage 或 B-C 笛卡尔投影问题。

VERDICT: 1 issues open