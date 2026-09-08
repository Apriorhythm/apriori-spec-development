<!-- provenance: provider=openai model=gpt-5.6-sol session=019ff946-122a-7532-ac83-e50910aa0efc date=2026-08-13 round=STEP0-r2 transport=codex-exec-wsl-proxy -->

核验结果：REQ-1/2/3/6/8/9/10/11/12 已按上一轮问题本身收口；REQ-4/5/7/13 仍未闭合。另发现 4 条 v2 新问题。

**REQ-4（reopened）— 风险：阻断（补偿链包含虚假能力声明）。**  
依据：[req-v2.md](/root/apriori-spec-development/apriori/changes/hotfix-lane/requirement/req-v2.md:38) 称整体瞒报导致的 spec 漂移“最终被 verify/gate 暴露”。但 [RUNBOOK.md](/root/apriori-spec-development/RUNBOOK.md:250) 的 verify 只核对 spec scenario 与测试结果的绑定，gate C1 也只是调用 verify；它们不判断代码是否偷偷改变了 spec 语义。真正承担 spec-vs-code 一致性的是 STEP5 的异构 P8，而 hotfix 正在绕过该流程。瞒报零 delta 且旧测试仍绿时，verify/gate 可永久 PASS。应删除该补偿保证，或给 hotfix 增加真实的一致性检查/评审证据。

**REQ-5（reopened）— 风险：阻断（分级函数仍不是全输入域函数）。**  
依据：[req-v2.md](/root/apriori-spec-development/apriori/changes/hotfix-lane/requirement/req-v2.md:40) 宣称输入包含 `touched-modules`、`frontend-touched`、decisions 形状等，但次序 0 仅覆盖 `change-kind` 缺失/未知和两个矛盾组合。以下输入没有唯一结果：

- `touched-modules` 缺失、空值、未知模块或格式非法；
- `frontend-touched` 缺失仅在 ui profile 另有默认，非 ui 下及未知值未定义；
- `no-code + 零 delta + touched-modules=1` 会穿透到 R0，尽管声明互相矛盾；
- `code-trivial + 零 delta + touched-modules 缺失` 中的 `≤1` 无定义；
- decisions 格式非法、模块缺失或条数不可计时无 F1 规则。

“全输入域”须先给字段 requiredness、合法值和 malformed 错误谱，再保证每种合法输入命中且仅命中一个结果。

**REQ-7（reopened）— 风险：高（R0 decisions 上限没有进入执行规则）。**  
依据：[req-v2.md](/root/apriori-spec-development/apriori/changes/hotfix-lane/requirement/req-v2.md:48) 声称单模块非 supersession decisions 超过 N 时“R3 行已拦”，但次序 1 只写了 supersession 或跨模块，没有 `decision-count > N` 条件。因此任意多条单模块 decision 都会落入 R0。“N 待裁”可以保留，但条件必须参数化地写入判定函数和 AC。

**REQ-13（reopened）— 风险：阻断（仍保留违反机械化目标的合法候选）。**  
依据：[req-v2.md](/root/apriori-spec-development/apriori/changes/hotfix-lane/requirement/req-v2.md:65) 的 Q-3a 仍把“纯自报”列为绑定测试证明契约；[Q-3b](/root/apriori-spec-development/apriori/changes/hotfix-lane/requirement/req-v2.md:107) 仍允许零 delta code fix 申报空受影响集。若两者之一被选中，R1/R2 可以没有可运行 scope、没有 GREEN oracle，与 owner“机械退出条件”及“不能留下轻量通道零验证窗口”的已拍板方向冲突。这不是普通强弱偏好：弱候选须标成“仅在 owner 明示放弃机械化目标后才合法”，否则应移出候选空间。

**REQ-14（new）— 风险：阻断（ADDED-only 被错误地当作不改变契约）。**  
依据：[req-v2.md](/root/apriori-spec-development/apriori/changes/hotfix-lane/requirement/req-v2.md:47) 将 `code-trivial + ADDED-only` 归 R1，[第 50 行](/root/apriori-spec-development/apriori/changes/hotfix-lane/requirement/req-v2.md:50) 更直接断言“新增场景描述不改变既有契约”。现行 [RUNBOOK.md](/root/apriori-spec-development/RUNBOOK.md:185) 的 ADDED 会向 living store 追加新的规范性 requirement；新增 scenario 也会增加 verify 必须满足的行为集合，显然属于契约变化。删除“澄清类”语义后，机器更无法区分澄清与新增行为。按已拍板的“改契约 → R3”，ADDED 应默认 R3；若要允许纯澄清，必须另有机械可判载体及语义。

**REQ-15（new）— 风险：阻断（profile 升格、耦合表和 owner tier 方向三方矛盾）。**  
依据：

- [B2](/root/apriori-spec-development/apriori/changes/hotfix-lane/requirement/req-v2.md:56) 说 ui profile 的升格增量是 E2E 工件和截图；
- hotfix 的 ui/fullstack 格 [第 75–76 行](/root/apriori-spec-development/apriori/changes/hotfix-lane/requirement/req-v2.md:75) 却只要求绑定测试和截图/N/A，完全没有 E2E；
- 正式流程把 medium/large 的 R0/R1 仍设为“同 hotfix 对应行”，R2 又写“增量覆盖”，而 owner 原文 [第 42–48 行](/root/apriori-spec-development/apriori/changes/hotfix-lane/requirement/goal-verbatim.md:42) 给出的方向是 medium/large 全量 E2E+截图，hotfix/trivial 才增量。

因此 AC-D3 宣称的 profile×radius×channel/tier 全覆盖目前没有唯一预期结果。需要显式决定覆盖面先由 tier/channel还是 radius决定，并在每个 ui/fullstack 格写清 E2E 是否必需；若偏离 owner 方向，应列为独立待裁项而非静默改写。

**REQ-16（new）— 风险：高（docs profile 与 state A 验证契约冲突）。**  
依据：[耦合表](/root/apriori-spec-development/apriori/changes/hotfix-lane/requirement/req-v2.md:72) 将 docs 列写成与未声明相同，即 R1/R2 要“绑定测试绿”；但现行 [RUNBOOK.md](/root/apriori-spec-development/RUNBOOK.md:251) 明定 docs-only 由 `apriori check` green + P8 consistency review 替代测试/verify。B2 自己也承认 docs 的机械证据是 check。应为 docs 列定义 `check` oracle，以及 hotfix 是否仍需/如何替代 P8；不能复用绑定测试格。

**REQ-17（new）— 风险：高（截图“证据”的存续期与可查证性未闭合）。**  
依据：[req-v2.md](/root/apriori-spec-development/apriori/changes/hotfix-lane/requirement/req-v2.md:59) 把截图称为人类可查证物，但文件只留在 gitignored 的 `apriori/tmp/`，归档物只保存路径和作者观察，且仅检查“归档时刻存在”。归档后该路径可能被清理或覆盖，人类及后续审计者无法再查证图片；可选的 d1 哈希也只能证明某些字节曾参与摘要，不能恢复或查看内容。此外，[RUNBOOK.md](/root/apriori-spec-development/RUNBOOK.md:391) 已存在“截图作仪器、持久化文本观察”的概念，因此背景所称“根本没有概念”也不符合 state A；真正缺的是机械退出条件和持久证据。需求须明确截图只需在何个人类 gate 前可见、谁确认、何时可删；若要求归档后仍可查，则当前 tmp-only 方案不满足目标。

VERDICT: 8 issues open