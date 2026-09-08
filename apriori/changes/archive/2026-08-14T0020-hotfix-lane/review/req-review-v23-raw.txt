<!-- provenance: provider=openai model=gpt-5.6-sol session=019ff946-122a-7532-ac83-e50910aa0efc date=2026-08-13 round=STEP0-r23 transport=codex-exec-wsl-proxy -->

已确认 req-v21 为真实新字节，lineage 与仓库一致。REQ-61 的正常路径已闭合；发现一项新的切分失败态缺口。

### REQ-62 — 高：c1′ 节切分没有定义 malformed 输入的唯一结果

**风险：** 状态文件节标题异常时，摘要域无法机械唯一确定；不同实现可能选择首节、末节或拼接，造成 bindings 未被摘要覆盖，或合法 bundle 被不一致地处理。

**依据：**

- 正文只规定“以定式标题机械判定”，未规定 bindings 标题缺失、重复、错序、嵌套或 bindings 行落在流程节时应如何处理。
- prior art 的 F1 错误谱覆盖 bindings 键和值的语法错误，但没有定义新引入的 c1′ 容器节边界错误。
- AC-I 仅覆盖两个合法结构变化：修改流程节不失配、修改 bindings 节失配；没有 malformed 节结构的拒绝断言。
- 精确标题可以留到 STEP2，但标题基数、归属规则以及异常必须 fail-closed 属于需求语义，否则“正列实体恒入域”仍不是全输入域机械契约。

例如出现两个 bindings 标题时，若摘要器取首节、归档解析器取末节，攻击者可在评审后修改实际消费的第二节而保持摘要不变。

见 [req-v21.md:31](/mnt/d/Workbench/misc/apriori-spec-development/apriori/changes/hotfix-lane/requirement/req-v21.md:31)、[req-v21.md:114](/mnt/d/Workbench/misc/apriori-spec-development/apriori/changes/hotfix-lane/requirement/req-v21.md:114)，以及 prior-art [req-v13.md:48](/mnt/d/Workbench/misc/apriori-spec-development/apriori/changes/hotfix-channel/requirement/req-v13.md:48)、[req-v13.md:49](/mnt/d/Workbench/misc/apriori-spec-development/apriori/changes/hotfix-channel/requirement/req-v13.md:49)。

未发现新的 state A、lineage、B-C 组合或 prior-art 误用问题。

VERDICT: 1 issues open