<!-- provenance: provider=openai model=gpt-5.6-sol session=019ff946-122a-7532-ac83-e50910aa0efc date=2026-08-13 round=STEP0-r7 transport=codex-exec-wsl-proxy -->

核验结果：REQ-31 已闭合；REQ-23、REQ-26、REQ-28、REQ-32 仍有残口。lineage 实测无误：当前 HEAD 为 `7b8d5c6`，main 基点为 `10aef21`，v3 `59289ce` 确为祖先。未发现越过 design-first 边界的实现要求。

### Findings

**REQ-23 — 外仓截图基线仍无合法语义**  
风险：高  
依据：[req-v7.md:70](/mnt/d/Workbench/misc/apriori-spec-development/apriori/changes/hotfix-lane/requirement/req-v7.md:70) 无条件要求截图记录基线等于“本仓 HEAD”；[req-v7.md:73](/mnt/d/Workbench/misc/apriori-spec-development/apriori/changes/hotfix-lane/requirement/req-v7.md:73) 又允许工件来自外仓，并承认本仓 preflight 不可判。诚实填写外仓 commit 会因不等于本仓 HEAD 被拒；填写本仓 HEAD 则虚假声称截图在该代码上运行。x1 没有定义对此 equality oracle 的替代值或豁免路径。当地仓旧图复用问题已修，但外仓输入域仍未闭合。

**REQ-26 — R0-with-decisions 的评审投影缺 profile 条件**  
风险：高  
依据：[req-v7.md:30](/mnt/d/Workbench/misc/apriori-spec-development/apriori/changes/hotfix-lane/requirement/req-v7.md:30) 定义 `docs-P8` 只控制 docs profile；但 [req-v7.md:31](/mnt/d/Workbench/misc/apriori-spec-development/apriori/changes/hotfix-lane/requirement/req-v7.md:31) 写成只要 `docs-P8=retain`，任何 R0-with-decisions 都需点检。于是 `backend/ui/未声明 × none × retain` 同时可解释为需评审和不需评审，违背 AC-D3 的唯一投影。应明确条件是否为 `profile=docs && docs-P8=retain`。

**REQ-28 — 有类型表分支仍不是定义完整的机械函数**  
风险：阻断  
依据：[req-v7.md:44](/mnt/d/Workbench/misc/apriori-spec-development/apriori/changes/hotfix-lane/requirement/req-v7.md:44) 同时声明所有 `code-*` 必须出现 `frontend-touched`，又声明有类型表时该字段“不出现”；[req-v7.md:56](/mnt/d/Workbench/misc/apriori-spec-development/apriori/changes/hotfix-lane/requirement/req-v7.md:56) 却继续以 `frontend-touched:yes` 判定 R3。正文没有定义这是申报字段还是派生变量，也没有定义类型表值域、未知/多类型模块及推导失败的 F1 行。无类型表分支已经闭合，有类型表分支仍无法机械实现。

**REQ-32 — “无 scenario 一律 R3”没有进入分级函数**  
风险：阻断  
依据：[req-v7.md:57](/mnt/d/Workbench/misc/apriori-spec-development/apriori/changes/hotfix-lane/requirement/req-v7.md:57) 的次序 2 仍会把带 `blast:low` 的 MODIFIED 或获 Q-12 例外的 ADDED 判为 R2；[req-v7.md:77](/mnt/d/Workbench/misc/apriori-spec-development/apriori/changes/hotfix-lane/requirement/req-v7.md:77) 才在分级函数之外追加“无 scenario 块一律 R3”。而 AC-D1 又明确把唯一分级函数限定为字段表、不变量表、判定次序表。因此同一合法输入仍有 R2/R3 两个结果。应把“任一 MODIFIED/ADDED 块无 scenario → R3”放到次序 1 或次序 2 的先决条件中。

**REQ-33 — 漏采 prior art 定位头的一项必需一致性契约**  
风险：高  
依据：prior art [req-v13.md:14](/mnt/d/Workbench/misc/apriori-spec-development/apriori/changes/hotfix-channel/requirement/req-v13.md:14) 要求字段存在时 `touched-modules ⊇ delta 触及模块`，缺失 delta 模块为 F1；选填案同样继承该校验。v7 声称引用定位头契约，但 [req-v7.md:42](/mnt/d/Workbench/misc/apriori-spec-development/apriori/changes/hotfix-lane/requirement/req-v7.md:42) 至 [req-v7.md:50](/mnt/d/Workbench/misc/apriori-spec-development/apriori/changes/hotfix-lane/requirement/req-v7.md:50) 的“F1 全谱”完全漏掉该不变量。union 半径计算不能替代定位头真实性校验；这是漏引两个候选都共同要求的契约，不是代 owner 预裁 Q-8。

**REQ-34 — `clean tree` oracle 会拒绝正常的在途 hotfix bundle**  
风险：阻断  
依据：[req-v7.md:73](/mnt/d/Workbench/misc/apriori-spec-development/apriori/changes/hotfix-lane/requirement/req-v7.md:73) 对任何 dirty/staged/untracked 文件全仓拒绝。但 state A 明定 bundle 在 `apriori/changes/<change>/` 中在途写作并由 archive 移动（[RUNBOOK.md:166](/mnt/d/Workbench/misc/apriori-spec-development/RUNBOOK.md:166)、[RUNBOOK.md:185](/mnt/d/Workbench/misc/apriori-spec-development/RUNBOOK.md:185)）；真实初始化器只忽略 `apriori/tmp/`（[lib/init.js:84](/mnt/d/Workbench/misc/apriori-spec-development/lib/init.js:84)），因此新建的 hotfix bundle 本身通常就是 untracked/dirty。当前仓顶层忽略 `apriori/*` 只是 dogfood 特例，不能证明消费者可行。需求必须定义“代码工作树 clean”的路径排除集合，或明确要求预先提交 bundle 的新事务流程及其成本。

**REQ-35 — docs profile 的 delta 行没有可诚实表达的 `change-kind`**  
风险：阻断  
依据：[req-v7.md:91](/mnt/d/Workbench/misc/apriori-spec-development/apriori/changes/hotfix-lane/requirement/req-v7.md:91) 明确允许 docs 项目产生文档/spec delta；但字段契约只有 `no-code/code-trivial/code-behavior`，且 [req-v7.md:50](/mnt/d/Workbench/misc/apriori-spec-development/apriori/changes/hotfix-lane/requirement/req-v7.md:50) 规定 `no-code + delta = F1`。docs-only 项目若选 `code-*`，又被迫虚构代码 fix-ref、前后端触及信号和代码基线。故 R2×docs 的 delta 格在合法输入域中不可达，与 B-C 表冲突。

**REQ-36 — v7 声称新增的关键 AC 未进入正式 AC-I 清单**  
风险：高  
依据：正文分别声称截图三种拒绝例、γ′ 边界 verdict、无-scenario R3“入 AC”，但 [req-v7.md:114](/mnt/d/Workbench/misc/apriori-spec-development/apriori/changes/hotfix-lane/requirement/req-v7.md:114) 只列截图行存在性、一般 f1 失配、marker F1 和六格投影，没有混合运行标识、截图哈希失配、完整 old/new→边界 verdict、无-scenario/mixed-block 反例。按当前 AC-I，STEP2 可不设计这些 oracle 仍形式达标，五项收口无法被验收。

VERDICT: 8 issues open