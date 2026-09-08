<!-- provenance: provider=openai model=gpt-5.6-sol session=019ff946-122a-7532-ac83-e50910aa0efc date=2026-08-13 round=STEP0-r18 transport=codex-exec-wsl-proxy -->

已重读 req-v16、RUNBOOK.md、lib/ 现状及 prior art。四项中三项已闭合；二元组改造仍有残留。另发现一项新的评审内容绑定缺口。

### REQ-53 — 阻断：分级函数仍未实现全输入域二元组输出

**风险：** 下游准入以 `(radius, R2-subtype)` 为输入，但合法判定分支仍可能只产生标量，无法机械投影，违背“输出显式二元组”的声明。

**依据：**

- 次序 0.5 的定位头失败分支仍输出裸 `R3`。
- 次序 1 的 F1/无 scenario 块分支仍输出裸 `R3拒绝`。
- Q-12=yes 的裁定摘要仍写成 `→ R2`，未明确为 `(R2,whitelist)`。
- AC-I 新增断言只覆盖两个 R2 子型，没有断言所有非 R2 分支必须输出 `(Rx,n/a)`。

见 [req-v16.md:55](/mnt/d/Workbench/misc/apriori-spec-development/apriori/changes/hotfix-lane/requirement/req-v16.md:55)、[req-v16.md:56](/mnt/d/Workbench/misc/apriori-spec-development/apriori/changes/hotfix-lane/requirement/req-v16.md:56)、[req-v16.md:114](/mnt/d/Workbench/misc/apriori-spec-development/apriori/changes/hotfix-lane/requirement/req-v16.md:114)、[req-v16.md:129](/mnt/d/Workbench/misc/apriori-spec-development/apriori/changes/hotfix-lane/requirement/req-v16.md:129)。

因此 r17 的第一项只能判为部分收口；REQ-53 不能关闭。

### REQ-58 — 阻断：verdict 摘要既未定义散列域，也未强制绑定被评审代码基线

**风险：** 旧代码评审可以在代码变化后继续通过机械验收，无法证明 verdict 针对当前实现。

**依据：**

- 内容绑定只称为“bundle 业务摘要”，没有定义文件集合、规范化、排序或散列算法。
- 即使将其解释为 prior art 的 d1，d1 覆盖的是 bundle 业务内容及目标 store/truth，不包含源码 HEAD/tree。
- HEAD/tree 只在 f2 中出现，而 f2 是依赖 owner 选择的可选方案；f1 的新鲜度只能证明测试工件在当前 HEAD 生成，不能证明 reviewer 审过当前 HEAD。
- `fix-ref` 的机械约束仅是提交存在，也没有要求等于当前 HEAD。

可构造绕过：在 HEAD=A 完成评审并生成 verdict；随后把实现改至 HEAD=B，保持 bundle 内容不变并在 B 重跑测试。旧 verdict 摘要、最新 f1 和 clean-tree 可以同时通过，但语义评审仍针对 A。

见 [req-v16.md:31](/mnt/d/Workbench/misc/apriori-spec-development/apriori/changes/hotfix-lane/requirement/req-v16.md:31)、[req-v16.md:50](/mnt/d/Workbench/misc/apriori-spec-development/apriori/changes/hotfix-lane/requirement/req-v16.md:50)、[req-v16.md:73](/mnt/d/Workbench/misc/apriori-spec-development/apriori/changes/hotfix-lane/requirement/req-v16.md:73)、[req-v16.md:74](/mnt/d/Workbench/misc/apriori-spec-development/apriori/changes/hotfix-lane/requirement/req-v16.md:74)；prior-art d1 域见 [req-v13.md:92](/mnt/d/Workbench/misc/apriori-spec-development/apriori/changes/hotfix-channel/requirement/req-v13.md:92)。

其余三项——B-C 两层模型口径、R2-whitelist×trivial 验证下限、verdict 基数/顺序定式——本轮核验通过；未发现新的 lineage 或 state A 冲突。

VERDICT: 2 issues open