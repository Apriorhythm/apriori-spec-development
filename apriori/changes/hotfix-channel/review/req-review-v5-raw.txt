<!-- provenance: provider=openai model=gpt-5.6-sol session=019ff8f0-a6af-7ad1-88fc-551b1b4e45d4 date=2026-08-13 round=STEP0-r5 transport=codex-exec-wsl-proxy -->

# req-review-v5 — hotfix-channel 需求复审

评审对象：`apriori/changes/hotfix-channel/requirement/req-v5.md`

评审标准：本 change 为 design-first；不要求 requirement 预先裁定 Q1–Q9，只判断决策空间、候选后果、约束与 acceptance 是否完整、真实。

## r4 五项核验

| ID | 复核结果 | 依据 |
|---|---|---|
| REQ-2 | verified | d1-ext 已移除；批准记录回到 bundle 内排除域，不再形成第四写入面。 |
| REQ-5 | reopened | g1b 已正确移除，但“声明制 / 隐式 verify / 证据引用”仍未覆盖 no-test 理由在后两案中的载体与放行逻辑。 |
| REQ-6 | reopened | delta∪decisions 并集修正了 delta-only 情形，但遗漏新加入的零-delta代码修复；C6 的 BLOCKED 与 B9 advisory 之间也未定级。 |
| REQ-12 | verified | r2 已明确只能补充 r1，r2-only 被排除，AC12 已加入资格允许/拒绝与升格路径。 |
| REQ-13 | reopened | spec-preserving 修复已成为合法形态，但缺少 touched-module/provenance，导致 Q3、C6 与 B9 无法覆盖该形态。 |

## 正式 findings

### REQ-5 — 候选 ii/iii 不能独立承接显式 no-test 理由

风险：若 Q7 选择“隐式运行 verify”或“引用既有 verify 证据”，AI 无法确定一个没有通过测试、但具备合法 no-test 理由的 hotfix 应如何表示和通过 preflight。

依据：

- 产品目标要求测试绑定或显式 no-test 理由。
- c1/c2/c3 定义了声明载体，但 Q7 又把“声明制 / 隐式 verify / 证据引用”列为机制大类，文本没有说明载体是否仍与 ii/iii 正交组合。
- state A verify 遇到无测试 active scenario 只会给出 UNBOUND/GAPS，不会读取或认可 no-test 理由。
- 因而候选 ii 若把 GREEN 作为准入条件，会禁止所有 no-test；若允许 GAPS，又缺少区分“合法理由”和漏测的规则。
- 候选 iii 同样只证明某次 verify 的结果，不能自行保存 no-test 理由。
- AC3 对 ii/iii 只断言运行工件或证据新鲜度，没有断言 no-test 理由的存在、格式和归档保留。

需要明确两层机制是正交还是互斥：测试存在性可由声明、实时 verify 或新鲜证据证明；未绑定路径则始终必须使用某个 c1/c2/c3 载体保存非空理由。

### REQ-6 — C6 的触发来源与结果等级仍未闭合

风险：合法代码 hotfix 可能被错误标成 C6 `n/a`，或在 B9 声称“仅 advisory”的同时得到 `GATE: BLOCKED`。

依据：

- m2 现在用 `delta 触及模块 ∪ decisions 目标模块` 触发 C6，正确覆盖了有 delta 无 decisions 的类别 1。
- v5 同时新增零-delta spec-preserving 代码修复；它可能没有 delta，也没有 decisions，因此该并集为空，m2 会把 C6 标成 `n/a`，尽管代码 commit 已使 Contract freshness 变 stale。
- state A 的 C6 对 stale `source-commit` 给出 `blocked`，不是提示。
- B9/r1 又规定 hotfix 归档只打印 freshness advisory，“提示而非拒绝”。
- “C6 是核查面、archive advisory 是披露面”没有说明 m2 下 C6 应保留 BLOCKED、降为非阻塞状态，还是只报告详情。若保留 state A 等级，类别 1 hotfix 的 gate 通常无法 PASS；若降级，则需要明确这是 hotfix 专属映射且正式 change C6 不变。

Q8 需要分别列明 hotfix C6 的模块来源和 verdict 等级；正式 change 的 C6 仍须保持 state A。

### REQ-13 — 零-delta代码修复缺少机器可见的 touched-module/provenance

风险：新合法化的 spec-preserving 修复会绕开防逃逸尺度、KB freshness 披露和 C6，且档案无法可靠指向实际代码修复。

依据：

- 类别 1 现在允许没有 delta，但必填头只有 name/date/承接类别，结论只要求回归说明。
- Q3 的候选阈值基于 mutation operation 数和跨模块数；零 delta 时 operation 数恒为零，模块来源也未定义。
- B9 要求对“涉及模块”打印 freshness advisory，却没有说明零-delta bundle 如何声明这些模块。
- B6 的 C6 并集同样无法发现这种代码修复。
- 没有代码 commit/ref 或 touched source/module 字段时，也无法区分本 hotfix 引入的 freshness debt 与此前已经存在的 stale 状态。
- AC4 只验证 bundle 移动和测试声明，没有验证 touched modules、代码出处或相应 freshness advisory。

需要为类别 1 定义机器可见的代码修复定位信息及错误谱，例如 touched modules/source paths 和 commit/ref；具体格式可留给 STEP2，但其是否必填、如何驱动 Q3/C6/B9、缺失时是否拒绝必须进入决策空间。

### REQ-14 — scenario ID 并不总是唯一目标键

风险：含重复 scenario ID 的 delta 在声明制下无法一一归属测试/no-test 声明，可能被错误接受后把 living store 置为永久 GAPS。

依据：

- B5 宣称目标键已“唯一化”为 scenario ID。
- state A 明确允许扫描出同一 ID 的多个 scenario occurrence，并将 duplicate ID 判为 GAPS；delta parser 本身不会把 scenario ID 重复当作格式错误。
- 两个新增或修改的 scenario 若使用同一 ID，会折叠成同一个 manifest key。
- 写一条声明时无法判断它覆盖哪个 occurrence；写两条又触发“同键重复”错误。
- B5/F1 没有明确把“delta/projection 中派生目标键重复”列为归档拒绝条件。
- AC3 也没有覆盖重复 scenario ID。

应选择并声明：duplicate derived keys 在 global preflight 直接拒绝，或目标键增加 occurrence/file/requirement 定位；不能称 scenario ID 天然唯一。

### REQ-15 — 倾向载体 c1 与 AC1 的“两文件”成本上限表面冲突

风险：推荐设计可能无法通过自己的成本验收，或实现者为了达标把不同职责私自合并。

依据：

一个带 spec 变化的类别 1 hotfix，在倾向方案 c1 下通常至少要人工填写：

1. `hotfix-state.md` 中的 headers/conclusion；
2. `specs/...` delta；
3. 独立的 `bindings.md`。

这已经是三个手工编辑文件，而 AC1 要求每类 `≤2` 个。文档没有说明：

- `bindings.md` 是否由 scaffold 根据 delta 自动生成并不计人工编辑；
- conclusion/bindings 是否允许同文件；
- 文件计数是否只统计某类文件；
- 选择 c1 是否必须同时调整 AC1 阈值。

“阈值可在 gate③ 调整”允许人类改标准，但当前 decision packet 应先如实指出 c1 对现有阈值的直接代价。AC1 也应按最终载体重新断言，而非保留一个默认无法满足的组合。

## 其余维度

- 目标态 B：三类对象及 Q1–Q9 的主要选择已清晰，未要求提前裁定。
- 异常路径：F1/F2、签收摘要、TOCTOU、no-test 债务和 supersession 路径均已充分陈列。
- state A：AM-17、普通 change gate、UNBOUND/GAPS 和部分提交语义均声明不变；C6 hotfix 等级仍需上述澄清。
- target lineage：`on-the-fly` v4 产品线、main 暂不动、不合并 v1/v3，声明仍真实。
- won't-do：存在且覆盖要求范围。

## Advisories

- p1 已诚实说明零-delta修复不强制机器测试声明；若保留，建议 gate③ packet 明示它放弃了机器可见的 test/no-test 留痕，不能只写“机制面较少”。
- s3 允许冲突的双 active Decisions，虽已标为弱化，但与 RUNBOOK 的“旧 decision 仅由 supersession 失效”语义张力很大；建议 gate③ 优先比较 s1/s2。
- `approval.md` 应在 STEP2 定义为 command-owned 文件，并规定预存在或人工修改的处理方式；现阶段不计正式问题。

## Ledger delta

| ID | Status flip |
|---|---|
| REQ-2 | fixed → verified |
| REQ-5 | fixed → open（候选 ii/iii 缺显式 no-test 理由的载体与放行契约） |
| REQ-6 | fixed → open（零-delta代码修复未进入 C6 模块并集，BLOCKED 与 advisory 等级未裁） |
| REQ-12 | fixed → verified |
| REQ-13 | fixed → open（零-delta代码修复缺 touched-module/code provenance，Q3/C6/B9 无法覆盖） |
| REQ-14 | new → open（重复 scenario ID 使声明目标键不唯一） |
| REQ-15 | new → open（倾向 c1 通常需编辑三文件，与 AC1 两文件上限冲突） |

VERDICT: 5 issues open