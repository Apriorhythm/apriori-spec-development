<!-- provenance: provider=openai model=gpt-5.6-sol session=019ff946-122a-7532-ac83-e50910aa0efc date=2026-08-13 round=STEP0-r22 transport=codex-exec-wsl-proxy -->

已确认 req-v20 为真实新字节，lineage 与仓库一致。REQ-58 与 REQ-60 的原问题均已闭合；发现一项新的摘要域重叠。

### REQ-61 — 阻断：`bindings` 同时属于摘要正列与状态文件排除域

**风险：** prior-art 合法候选 c1′ 下，摘要算法无法唯一判断 bindings 是否参与散列；若排除优先，评审后可修改绑定声明而不失配；若正列优先，则“排除整个状态文件”并非真实规则。

**依据：**

- v20 将 `bindings` 列为必须参与摘要的业务实体。
- 同一句又把“流程状态文件（hotfix-state 类）”整体列入完整排除域。
- 本 change 按引用保留的 prior-art c1′ 候选明确规定：bindings manifest 是 `hotfix-state.md` 内的一节。
- Q-8 尚未裁定 c1/c1′/c2/c3，因此不能假定 bindings 一定位于独立文件。
- AC-I 只要求“更新 hotfix-state 不失配”，没有同时断言“c1′ 下仅修改其中 bindings 节必须失配”。

由此 c1′ 组合存在两种互斥解释：

- 按文件排除：bindings 可在评审后改变，旧 verdict 仍通过；
- 按实体正列：需要从 hotfix-state 抽取并规范化业务节，只排流程元数据，但正文尚未定义这种“部分文件排除”语义。

见 [req-v20.md:31](/mnt/d/Workbench/misc/apriori-spec-development/apriori/changes/hotfix-lane/requirement/req-v20.md:31)、[req-v20.md:114](/mnt/d/Workbench/misc/apriori-spec-development/apriori/changes/hotfix-lane/requirement/req-v20.md:114)、[req-v20.md:125](/mnt/d/Workbench/misc/apriori-spec-development/apriori/changes/hotfix-lane/requirement/req-v20.md:125)，以及 prior-art [req-v13.md:48](/mnt/d/Workbench/misc/apriori-spec-development/apriori/changes/hotfix-channel/requirement/req-v13.md:48)。

未发现新的 state A、lineage 或 B-C 笛卡尔组合冲突。

VERDICT: 1 issues open