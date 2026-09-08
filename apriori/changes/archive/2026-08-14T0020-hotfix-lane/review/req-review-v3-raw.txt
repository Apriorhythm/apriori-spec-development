<!-- provenance: provider=openai model=gpt-5.6-sol session=019ff946-122a-7532-ac83-e50910aa0efc date=2026-08-13 round=STEP0-r3 transport=codex-exec-wsl-proxy -->

核验结果：上一轮 REQ-4/7/13/15/16/17 的针对性修复成立；REQ-5、REQ-14 reopened。另发现 6 条新问题，并重新发现 goal 审计问题 REQ-1。

**REQ-1（reopened）— 风险：阻断（最高优先输入仍不能自证 verbatim）。**  
依据：[goal-verbatim.md](/root/apriori-spec-development/apriori/changes/hotfix-lane/requirement/goal-verbatim.md:1) 注释明确称 owner 原文中“仓库当前状态至 A 节”重复出现两次并已原样保留；但文件中 `# 仓库当前状态` 和 `## A. hotfix` 都只出现一次。要么正文漏了一份重复内容，要么注释不实；两者都使“全文原样落盘”无法成立。应补回原文，或在确认原文并未重复后纠正 provenance 注释。

**REQ-5（reopened）— 风险：阻断（字段契约仍有未定义矛盾态）。**  
依据：[字段契约](/root/apriori-spec-development/apriori/changes/hotfix-lane/requirement/req-v3.md:35) 的 delta 行只规定“可选、须可解析”，没有规定 `no-code + 非零 delta` 为 F1；但 [分级函数 R0 行](/root/apriori-spec-development/apriori/changes/hotfix-lane/requirement/req-v3.md:52) 又声称该组合“已是 F1”。实际按表执行时，该输入通过字段校验，再因“delta 非零”在次序 2 落入 R2。应把该矛盾及其他跨字段不变量明确列入 F1 表，而不是靠判定行括注补充。

**REQ-14（reopened）— 风险：阻断（ADDED→R2 仍违背最高优先输入，论证是 absence of evidence）。**  
依据：owner 原文把“改契约”明确列为大爆炸半径依据，[goal-verbatim.md](/root/apriori-spec-development/apriori/changes/hotfix-lane/requirement/goal-verbatim.md:27)；v3 虽承认 ADDED 是规范性契约扩展，却仍将其归 R2，理由只是三条已观察回归“无一是 ADDED 型”，见 [req-v3.md](/root/apriori-spec-development/apriori/changes/hotfix-lane/requirement/req-v3.md:50)。三例样本中未出现某类回归，不能证明该类低风险；新 scenario 绑定测试也只证明新增行为自身，不证明它与存量行为无交互。若要偏离“改契约→高半径”，必须作为 owner 待裁的显式例外，而不能作为已收敛分级规则。

**REQ-18（new）— 风险：阻断（β/γ 仍让已知高危 MODIFY 进入 hotfix）。**  
依据：[req-v3.md](/root/apriori-spec-development/apriori/changes/hotfix-lane/requirement/req-v3.md:55) 承认单模块 MODIFIED 无法机械区分“改口径”和“改措辞”，但处理结果是一律 R2；Q-1 又继续保留不带标注的 β，以及“缺标注按 β”的 γ。于是 owner 和缺陷账明确点名的“改数据形态/改选取口径”只要发生在单模块且未标 blast，就会机械获准进入 hotfix。这不是诚实披露即可接受的残余误差，而是硬准入规则在核心反例上确定失效。若无法可靠识别，应 fail-up 将未标明的 MODIFIED 归 R3，或把 β/可漏标 γ 标成必须由 owner 明示放弃该拍板后才合法。

**REQ-19（new）— 风险：高（字段契约预裁了 prior art 的定位头必填性）。**  
依据：[字段表](/root/apriori-spec-development/apriori/changes/hotfix-lane/requirement/req-v3.md:38) 要求所有 code-* 必须带 `touched-modules`，下一行又要求 `fix-ref` 与其成对；因此所有 code-* 实际都强制 `fix-ref`。但 prior art 明确保留“定位头必填 vs 成对全缺可选”候选，并在 Q9 待 owner 裁，[req-v13.md](/root/apriori-spec-development/apriori/changes/hotfix-channel/requirement/req-v13.md:151)。v3 的 Q-8 声称这些选择仍待裁，却已在上游字段合法性中排除了选填案。字段表应按 Q-8 选择参数化，或把定位头必填单列本 change 的待裁提案。

**REQ-20（new）— 风险：高（affected-scenario-ids 不是可靠的 scope key）。**  
依据：[req-v3.md](/root/apriori-spec-development/apriori/changes/hotfix-lane/requirement/req-v3.md:43) 以 scenario ID 直接表达受影响 scope，但 state A 不保证 ID 唯一；prior art 已明确记录 duplicate ID 合法出现、verify 才判 GAPS，并为此保留 k1/k2 两种寻址方案，[req-v13.md](/root/apriori-spec-development/apriori/changes/hotfix-channel/requirement/req-v13.md:49)。当同一 ID 有多个 occurrence 时，字段无法说明本次影响哪个 requirement/模块，scoped verify 也会得到歧义。应复用 Q-8 所裁的 k1/k2：重复即 F1，或使用 requirement/module+occurrence 复合键，并补重复、跨模块同 ID 的 AC。

**REQ-21（new）— 风险：高（π1 与 prior art 签收候选存在非法组合）。**  
依据：[π1](/root/apriori-spec-development/apriori/changes/hotfix-lane/requirement/req-v3.md:62) 把截图可查证时点定义为“归档前的人类签收呈阅”，但只说明裁 d 时由 dry-run 实现；prior art 的 a/b/c 候选并不保证展示截图或任何 dry-run，而 Q-8 尚未裁掉它们。若最终选择 a/b/c+π1，截图可能在无人查看后即被清理，“可查证价值已兑现”不成立。应给出签收×截图存续期合法组合矩阵：π1 强绑 d，或为 a/b/c 增加明确的人类查看动作。

**REQ-22（new）— 风险：阻断（“hotfix 无 P8/无评审”被当成事实，提前弱化 state A）。**  
依据：[A2-④](/root/apriori-spec-development/apriori/changes/hotfix-lane/requirement/req-v3.md:27) 直接断言 hotfix 无 P8/无评审轮，[docs 格](/root/apriori-spec-development/apriori/changes/hotfix-lane/requirement/req-v3.md:79) 也据此删除 P8；但 owner goal 没有拍板移除一致性评审，prior art 也仍是未裁候选空间。state A 对 docs-only 明确要求 `check green + P8 consistency review` 共同替代测试，[RUNBOOK.md](/root/apriori-spec-development/RUNBOOK.md:251)。Q-11 又只询问 R2 点检，无法让 owner 选择 R1/docs 是否保留评审。应把“无评审”提升为显式、覆盖所有半径/profile 的待裁维度，并说明它对瞒报防线和 docs oracle 的后果。

**REQ-23（new）— 风险：高（“不做新鲜度”会使机械证据门可被旧工件满足）。**  
依据：[req-v3.md](/root/apriori-spec-development/apriori/changes/hotfix-lane/requirement/req-v3.md:63) 仍把证据新鲜度“不做”列为普通候选。若 E2E PASS 文件或截图路径来自旧运行，存在性检查仍会通过，不能证明当前 bundle/代码经过验证，重新打开“轻量通道零验证”窗口。该候选与机械退出条件目标不兼容，应移出，或像 Q-3 的弱证据引用一样标为“仅在 owner 明示放弃当前代码绑定保证后合法”；时间戳或 d1 内容哈希至少应有一种成为强制方案。

VERDICT: 9 issues open