<!-- provenance: provider=openai model=gpt-5.6-sol session=019ff946-122a-7532-ac83-e50910aa0efc date=2026-08-13 round=STEP0-r26 transport=codex-exec-wsl-proxy -->

已确认 req-v24 为真实新字节，lineage 与仓库一致。REQ-63 对 c1′ 正常路径已闭合；新发现载体候选未完整投影。

### REQ-64 — 阻断：bindings 需求函数只落到 c1′ 节基数，未覆盖 Q-8 保留的其他载体

**风险：** owner 选择 c1、c2 或 c3 后，bindings 的存在性、摘要抽取及非法组合没有唯一机械结果。

**依据：**

- 参数化函数写在 c1′ 的“定式标题基数”规则内，AC-I 也只覆盖 c1′。
- Q-8 仍保留 prior-art 的 c1/c1′/c2/c3 全部载体候选。
- c1 下未规定“应为 0”时文件必须不存在还是允许空文件，也未同步相同的缺失/多余 F1 规则。
- c2/c3 将 bindings 放在 delta 块或随块注释中，但 doc-fix 明确要求 bindings=0；其域外/多余声明如何识别、摘要如何抽取均未投影。
- 更直接的未定义组合是 `code-* 零 delta + Q7c=p2 + c2/c3`：p2 要求 bundle 级声明，而 c2/c3 的载体依赖 delta 块；零 delta 时没有可承载位置。正文没有将这些组合判非法，也没有指定替代位置。

因此当前函数不是 `change-kind × 目标键 × Q7c × carrier` 的全域函数，AC-D2 所称“全笛卡尔无空格”在 Q-8 载体维度仍不成立。

见 [req-v24.md:26](/mnt/d/Workbench/misc/apriori-spec-development/apriori/changes/hotfix-lane/requirement/req-v24.md:26)、[req-v24.md:31](/mnt/d/Workbench/misc/apriori-spec-development/apriori/changes/hotfix-lane/requirement/req-v24.md:31)、[req-v24.md:109](/mnt/d/Workbench/misc/apriori-spec-development/apriori/changes/hotfix-lane/requirement/req-v24.md:109)、[req-v24.md:114](/mnt/d/Workbench/misc/apriori-spec-development/apriori/changes/hotfix-lane/requirement/req-v24.md:114)、[req-v24.md:125](/mnt/d/Workbench/misc/apriori-spec-development/apriori/changes/hotfix-lane/requirement/req-v24.md:125)，以及 prior-art [req-v13.md:48](/mnt/d/Workbench/misc/apriori-spec-development/apriori/changes/hotfix-channel/requirement/req-v13.md:48)、[req-v13.md:59](/mnt/d/Workbench/misc/apriori-spec-development/apriori/changes/hotfix-channel/requirement/req-v13.md:59)。

未发现新的 state A、lineage或半径—profile 耦合问题。

VERDICT: 1 issues open