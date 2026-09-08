<!-- provenance: provider=openai model=gpt-5.6-sol session=019ff946-122a-7532-ac83-e50910aa0efc date=2026-08-13 round=STEP0-r1 transport=codex-exec-wsl-proxy -->

**REQ-1 — 风险：阻断（最高优先输入不可审计）。**  
依据：[goal-verbatim.md](/root/apriori-spec-development/apriori/changes/hotfix-lane/requirement/goal-verbatim.md:1) 自称“verbatim”，实际仅 6 行摘要，并把铁规矩、A/B/C 全文指向不可归档的“会话记录”；[req-v1.md](/root/apriori-spec-development/apriori/changes/hotfix-lane/requirement/req-v1.md:72) 又引用不存在于该输入文件的“goal §C”。异构评审无法判断需求是否漏掉或改写了 owner 最高优先拍板，后续 raw 也无法复核。应把 owner 全文原样落盘，摘要只能另存。

**REQ-2 — 风险：中（target lineage 表述不真实/有歧义）。**  
依据：[req-v1.md](/root/apriori-spec-development/apriori/changes/hotfix-lane/requirement/req-v1.md:3) 声称“不合并 v1/v3”。实读 git graph：`on-the-fly` HEAD 为 `7b8d5c6`、基于 main `10aef21`，P0 代码提交 `4127653` 确为祖先，v1 不是祖先；但 `git merge-base HEAD v3` 等于 v3 tip `59289ce`，即 v3 已完整处于当前谱系。若本意是“不再合并独立分支 tip”，须这样直述；当前文字作为历史 lineage 断言为假。其余 on-the-fly/main/P0 状态属实。

**REQ-3 — 风险：阻断（把待裁候选误升格为已收敛契约）。**  
依据：[req-v1.md](/root/apriori-spec-development/apriori/changes/hotfix-lane/requirement/req-v1.md:26) 直接“采纳”专名状态文件、d+d1、c1′、k1、t1、o1、r1+r2、w2、s2；但 [req-v13.md](/root/apriori-spec-development/apriori/changes/hotfix-channel/requirement/req-v13.md:141) 明列这些为 Q1–Q9 的候选/倾向，且 [hotfix-channel/flow-state.md](/root/apriori-spec-development/apriori/changes/hotfix-channel/flow-state.md:31) 仍停在 gate② PENDING。`VERDICT: 0` 只证明需求候选空间无重大缺口，不等于 owner 已选择倾向项。Q-4 事后“整包确认”不能消除正文已按既成事实推导的污染。

**REQ-4 — 风险：阻断（A3 的硬/软信号声明不诚实）。**  
依据：[req-v1.md](/root/apriori-spec-development/apriori/changes/hotfix-lane/requirement/req-v1.md:37) 已承认 apriori 看不到应用仓 diff，却把作者填写的 `touched-modules` 数量和可选 blast 标注称为“硬信号”；它们只是“文档字节可解析”，不是真实爆炸半径的硬观测。`change-kind` 谎报只能在事后审计中暴露，并不能阻止本次以 R0/R1 归档，因此“软信号只能往上推、不能往下拉”的 fail-up 保证不成立。尤其零 delta 必须靠软声明才能区分 no-code 与 spec-preserving code fix，软声明事实上决定了降到 R0/R1。

**REQ-5 — 风险：阻断（A3 没有形成全输入域上的机械判定函数）。**  
依据：[req-v1.md](/root/apriori-spec-development/apriori/changes/hotfix-lane/requirement/req-v1.md:40) 使用未定义、不可由现有 parser 判断的“ADDED 澄清类”；同文件 [Q-1](/root/apriori-spec-development/apriori/changes/hotfix-lane/requirement/req-v1.md:92) 又未裁定契约标注。需求还自行承认 β 无法识别单模块“改口径”类 MODIFIED，γ 的标注却是可选的，遗漏标注即可落入 R2。缺失/未知 `change-kind`、标注缺失、声明与 delta 冲突时到底 F1 拒绝还是归哪级也未定义，不能兑现“机械可判”。

**REQ-6 — 风险：阻断（R2 明文允许 REMOVED，与自身定义及新 goal 冲突）。**  
依据：[req-v1.md](/root/apriori-spec-development/apriori/changes/hotfix-lane/requirement/req-v1.md:41) 定义 R2 为“不改契约”，却允许 `REMOVED`；现行 [RUNBOOK.md](/root/apriori-spec-development/RUNBOOK.md:185) 明定 REMOVED 会把 store requirement 标成 deprecated、停止要求其 scenarios，显然改变应然契约。prior art 的 BR-007 REMOVED hotfix 示例因此已被新 goal 的“契约变化进 R3”推翻，不能继续隐式保留。

**REQ-7 — 风险：高（爆炸半径漏算 Decisions 写回）。**  
依据：R0 只看零 delta 与 no-code，B-C 又称“结论即全部”；但 [req-v13.md](/root/apriori-spec-development/apriori/changes/hotfix-channel/requirement/req-v13.md:27) 允许一个 bundle 向多个模块追加 Decisions，s2 还会原子修改旧 active decision。现行 [RUNBOOK.md](/root/apriori-spec-development/RUNBOOK.md:225) 将 Decisions 定义为 doc-is-truth invariant，跨模块 mutation 也触犯现行 Large tripwire。于是一个多模块、甚至推翻既有 invariant 的业务事实可伪装成 R0，零验证归档；半径模型只量代码面，漏掉 truth 面副作用。

**REQ-8 — 风险：阻断（B-C 并非完整决策表）。**  
依据：[req-v1.md](/root/apriori-spec-development/apriori/changes/hotfix-lane/requirement/req-v1.md:49) 候选 profile 有 `ui/backend/fullstack/docs`，表却只有未声明/backend/ui，且 ui 仅覆盖“touch 前端文件”；fullstack、docs、ui-profile 的后端-only/N/A、各半径下正式 medium/large 的组合均没有格子，后两行还以大片空白代替 n/a。backend 列与未声明列基本相同，也没有兑现 backend profile 的升格效果。这与同文件 AC-D2/D3 的“空格显式 n/a、全笛卡尔积覆盖”直接冲突。

**REQ-9 — 风险：阻断（UI 表格分支本身不可机械选择）。**  
依据：[req-v1.md](/root/apriori-spec-development/apriori/changes/hotfix-lane/requirement/req-v1.md:60) 以“本次 touch 前端文件”为进入 ui 规则的条件，但 A3 已声明 apriori 看不到应用仓 diff；`touched-modules` 也没有模块→前端/backend 的类型表，外仓 `fix-ref` 仅拟做格式判断。`ui: not-applicable — 理由` 只检查作者写了一行，不能证明前端未受影响。实现无法机械判断应要求截图还是接受 N/A。

**REQ-10 — 风险：阻断（“只强制证据存在”可让失败证据放行，弱化 state A）。**  
依据：[req-v1.md](/root/apriori-spec-development/apriori/changes/hotfix-lane/requirement/req-v1.md:51) 明说“不强制内容”，E2E 工件又定义为“pass/fail 输出”；照此规则，一份明确 `FAIL` 的文件也满足存在性。现行 [RUNBOOK.md](/root/apriori-spec-development/RUNBOOK.md:251) 要求 UI 的 E2E/visual regression 是额外退出条件，STEP5 退出还要求 tests green。应区分“截图不机械判断视觉内容”与“测试结果必须可机械判 PASS”，并定义证据与本次运行的绑定/新鲜度。

**REQ-11 — 风险：高（hotfix 与正式 trivial 出现验证套利，所谓双向一致性为假）。**  
依据：A3 将“单模块行为修复”归 R2并禁 no-test，但 [RUNBOOK.md](/root/apriori-spec-development/RUNBOOK.md:93) 的现行 trivial 正是 bugfix/single file/no new behavior；B-C 却把所有“正式 trivial change”套 R1，允许 no-test。[req-v1.md](/root/apriori-spec-development/apriori/changes/hotfix-lane/requirement/req-v1.md:70) 声称同半径同 profile 使用同一张表，与实际相反。必须定义 radius→正式 tier 的机械映射，或让正式 trivial 也先分 R1/R2。

**REQ-12 — 风险：高（宣称保留 g1 逼偿，但零 delta R1 没有债务载体）。**  
依据：[req-v1.md](/root/apriori-spec-development/apriori/changes/hotfix-lane/requirement/req-v1.md:69) 称 R1 的 no-test 会继续通过 g1 债务阻塞逼偿；但 R1 包含零 delta code fix，而 [req-v13.md](/root/apriori-spec-development/apriori/changes/hotfix-channel/requirement/req-v13.md:50) 的 g1 只能靠 active scenario 变成 UNBOUND 触发 store/gate GAPS。零 delta 没有目标 scenario，prior art 的 p1 甚至不要求机器声明，因此不会形成任何可阻塞、可补偿的债务。当前文字制造了不存在的防线。

**REQ-13 — 风险：高（“绑定测试绿”的证明契约被漏引，验收不可测）。**  
依据：B-C 多格要求“受影响 scenario 绑定测试绿”，但没有裁定 tests 声明究竟是自报、归档时隐式跑 scoped verify，还是引用既有证据及其新鲜度；这些在 [req-v13.md](/root/apriori-spec-development/apriori/changes/hotfix-channel/requirement/req-v13.md:58) 仍是候选。现行 [lib/gate.js](/root/apriori-spec-development/lib/gate.js:297) 只认 `flow-state.md`，C1 仅运行现有 change projection；零 delta code fix 没有 delta scenario 可作为 scope。仅引用 c1′ 载体不能证明 GREEN，AC-I 的“逐格机械检查”因而没有可实现 oracle。

VERDICT: 13 issues open