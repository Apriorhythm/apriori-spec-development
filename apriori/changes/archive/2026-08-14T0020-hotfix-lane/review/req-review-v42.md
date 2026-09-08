<!-- provenance: provider=openai model=gpt-5.6-sol session=019ff946-122a-7532-ac83-e50910aa0efc date=2026-08-13 round=STEP0-r42 transport=codex-exec-wsl-proxy -->

核验结果：REQ-81 已完整收口；REQ-82 的集合枚举已落盘，但签收联动仍少一层约束。lineage、design-first 边界、prior-art 原义及 state A 对照未见其他新增问题。

### REQ-82 — f2 只强绑 `d`，没有强绑其实际依赖的 `d1`

风险：阻断

依据：

- f2 的定义明确依赖“d1 摘要”承载工件哈希和代码基线。[req-v40.md:77](/mnt/d/Workbench/misc/apriori-spec-development/apriori/changes/hotfix-lane/requirement/req-v40.md:77)
- prior art 中 d1/d2/d3 是候选 d 下三个不同的新鲜度方案；d2 只重查 CAS，d3 不绑定内容，均不存在 f2 所需的摘要字段。[req-v13.md:91](/mnt/d/Workbench/misc/apriori-spec-development/apriori/changes/hotfix-channel/requirement/req-v13.md:91)
- 但 v40 将 `{f2}` 和 `{f1+f2}` 仅写成“绑签收 d”，Q-6 摘要也仍是“绑 d”。[req-v40.md:77](/mnt/d/Workbench/misc/apriori-spec-development/apriori/changes/hotfix-lane/requirement/req-v40.md:77) [req-v40.md:126](/mnt/d/Workbench/misc/apriori-spec-development/apriori/changes/hotfix-lane/requirement/req-v40.md:126)
- 因而 `{f2} × d+d2`、`{f2} × d+d3` 当前表面合法，实际却没有可供校验的 d1 摘要，无法满足 f2 oracle。

应将 `{f2}`、`{f1+f2}` 强绑到 `d+d1`，明确与 a/b/c、d+d2、d+d3 的配对非法，并在 AC 加入至少一个非法配对拒绝例及一个 `d+d1` 正例。

VERDICT: 1 issues open