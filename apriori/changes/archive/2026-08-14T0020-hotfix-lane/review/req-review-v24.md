<!-- provenance: provider=openai model=gpt-5.6-sol session=019ff946-122a-7532-ac83-e50910aa0efc date=2026-08-13 round=STEP0-r24 transport=codex-exec-wsl-proxy -->

已确认 req-v22 为真实新字节，lineage 与仓库一致。REQ-62 的重复、嵌套和域外声明路径已落盘，但缺失标题语义仍自相矛盾。

### REQ-62 — 阻断：c1′ 的标题基数同时被定义为“恰一”和“可为零”

**风险：** 无需 bindings 的合法 bundle 没有唯一机械结果；实现可能要求空节，也可能允许无节，导致同一输入在摘要器与归档解析器间产生不同判定。

**依据：**

- 正文先规定 c1′ 状态文件内 bindings 标题“基数恰一”。
- 紧接着又规定“标题缺失 = 无 bindings 节”，仅在“有 delta 需声明”时按缺声明拒绝。这意味着无需声明时基数可以为零。
- spec-preserving 零 delta、纯排查结论都是目标态合法主形态；prior art 的 Q7c 也保留零 delta 不强制 bindings 的 p1 候选。因此不能把“恰一”解释成所有 c1′ bundle 一律强制空 bindings 节。
- AC-I 只列标题重复、嵌套、域外 bindings 行，没有覆盖“零标题且无需声明应通过”与“零标题但需要声明应拒绝”的条件分支，也漏了正文声称的错序例。

机械契约应明确为：标题基数只能为 `{0,1}`；需要 bindings 时必须为 1，不需要时 0/1 是否均合法需唯一规定；`>1`、嵌套、错序、域外声明一律 F1。

见 [req-v22.md:24](/mnt/d/Workbench/misc/apriori-spec-development/apriori/changes/hotfix-lane/requirement/req-v22.md:24)、[req-v22.md:31](/mnt/d/Workbench/misc/apriori-spec-development/apriori/changes/hotfix-lane/requirement/req-v22.md:31)、[req-v22.md:114](/mnt/d/Workbench/misc/apriori-spec-development/apriori/changes/hotfix-lane/requirement/req-v22.md:114)，以及 prior-art [req-v13.md:59](/mnt/d/Workbench/misc/apriori-spec-development/apriori/changes/hotfix-channel/requirement/req-v13.md:59)。

未发现新的 state A、lineage、B-C 或 prior-art 误用问题。

VERDICT: 1 issues open