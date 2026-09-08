# Issue ledger — hotfix-lane

<!-- recorded on behalf of the reviewer (codex read-only sandbox), R2 transcription rule; raws: review/*-raw.txt; Risk 列为 reviewer 原话风险级 -->

<!-- 终态转换记录（2026-08-14，归档时）：STEP2 的 169 条 DES 行此前停在 `fixed(vN)`——修复已落地但账本未翻终态。
     依据 STEP2·r28 的 reviewer 逐字判定「VERDICT: 0 issues open」（design-review-v28-final.md + raw）——终轮零开口
     即 reviewer 对全部在册 finding 的复核结论——统一转为 `verified`，原 fixed 的修复内容原文保留在状态串内，不丢信息。
     此转换由归档阶段的 gate C4 与 GT-15 抓出（in-flight 阶段 fixed 合法、archived 阶段要求终态），非事后补写。
     DES24-3..7 五行为 π2 分支的 `rejected-verified`，本就终态，未动。 -->

| ID | Issue | Risk | Round found | Status |
|---|---|---|---|---|
| REQ-1 | goal-verbatim 仅摘要非全文，最高优先输入不可审计 | 阻断 | STEP0·r1 | verified — r4 核验通过 |
| REQ-2 | lineage 断言"不合并 v1/v3"为假（v3 已在谱系） | 中 | STEP0·r1 | verified — r2 核验通过 |
| REQ-3 | 把 req-v13 待裁候选误升格为已收敛契约 | 阻断 | STEP0·r1 | verified — r2 核验通过 |
| REQ-4 | 硬/软信号声明不诚实（touched-modules 是申报不是硬观测；fail-up 不成立） | 阻断 | STEP0·r1 | verified — r3 核验通过 |
| REQ-5 | 分级不是全输入域的机械判定函数（ADDED 澄清类未定义、缺失/矛盾未定义） | 阻断 | STEP0·r1 | verified — r4 核验通过 |
| REQ-6 | R2 允许 REMOVED 与"不改契约"自相矛盾 | 阻断 | STEP0·r1 | verified — r2 核验通过 |
| REQ-7 | 爆炸半径漏算 Decisions 写回（跨模块/supersession 可伪装 R0 零验证） | 高 | STEP0·r1 | verified — r3 核验通过 |
| REQ-8 | B-C 非完整决策表（fullstack/docs 缺列、backend 升格无内容、留白） | 阻断 | STEP0·r1 | verified — r2 核验通过 |
| REQ-9 | "touch 前端文件"分支不可机械选择 | 阻断 | STEP0·r1 | verified — r2 核验通过 |
| REQ-10 | "只强制存在性"会放行 FAIL 证据，弱化 state A | 阻断 | STEP0·r1 | verified — r2 核验通过 |
| REQ-11 | hotfix 与正式 trivial 验证套利，"同一张表"为假 | 高 | STEP0·r1 | verified — r2 核验通过 |
| REQ-12 | 零 delta R1 无 g1 债务载体，防线是虚构的 | 高 | STEP0·r1 | verified — r2 核验通过 |
| REQ-13 | "绑定测试绿"证明契约漏引，AC-I 无 oracle | 高 | STEP0·r1 | verified — r3 核验通过 |
| REQ-14 | ADDED-only 被错当不改契约（ADDED 追加规范性要求） | 阻断 | STEP0·r2 | verified — r4 核验通过 |
| REQ-15 | profile 升格/耦合表/owner tier 方向三方矛盾 | 阻断 | STEP0·r2 | verified — r3 核验通过 |
| REQ-16 | docs profile 复用绑定测试格与 state A 冲突 | 高 | STEP0·r2 | verified — r3 核验通过 |
| REQ-17 | 截图证据存续期与可查证性未闭合；背景措辞失实 | 高 | STEP0·r2 | verified — r3 核验通过 |
| REQ-18 | β/γ 让未标注高危 MODIFY 机械进入 hotfix（核心反例确定失效） | 阻断 | STEP0·r3 | verified — r4 核验通过 |
| REQ-19 | 字段契约预裁 prior art 定位头必填性 | 高 | STEP0·r3 | verified — r6 核验通过 |
| REQ-20 | affected-scenario-ids 非可靠 scope key（duplicate occurrence 歧义） | 高 | STEP0·r3 | verified — r4 核验通过 |
| REQ-21 | π1 与签收 a/b/c 非法组合 | 高 | STEP0·r3 | verified — r4 核验通过 |
| REQ-22 | "hotfix 无 P8"被当事实预裁，弱化 state A docs oracle | 阻断 | STEP0·r3 | verified — r4 核验通过 |
| REQ-23 | 新鲜度"不做"候选重开零验证窗口 | 高 | STEP0·r3 | verified — r8 核验通过 |
| REQ-24 | R0×ui/fullstack 字段契约与耦合表不可同时满足 | 阻断 | STEP0·r4 | verified — r5 核验通过 |
| REQ-25 | 混合 bundle 跨模块总半径漏算（并集未查） | 高 | STEP0·r4 | verified — r5 核验通过 |
| REQ-26 | Q-11 候选重叠且非可执行决策表 | 高 | STEP0·r4 | verified — r8 核验通过 |
| REQ-27 | 永久 blast:low 是无边界未来降级授权 | 阻断 | STEP0·r4 | verified — r5 核验通过（原问题闭合，补偿派生 REQ-30/31） |
| REQ-28 | 无类型表时双端高风险信号失效 | 高 | STEP0·r4 | verified — r8 核验通过（类型表 malformed 谱转 REQ-41） |
| REQ-29 | AC 残留 v3 语义（双验收基线）+ 旧引用 | 阻断 | STEP0·r4 | verified — r6 核验通过 |
| REQ-30 | modified-integrity 能力声明不实（只报丢行不报新增改写） | 高 | STEP0·r5 | verified — r6 核验通过 |
| REQ-31 | γ'+a/b/c+none 组合下越界替换无人查看 | 阻断 | STEP0·r5 | verified — r7 核验通过 |
| REQ-32 | 无 scenario 的 delta 块可用任意 GREEN ID 伪造覆盖 | 阻断 | STEP0·r6 | verified — r8 核验通过 |
| REQ-33 | 漏引 prior art 定位头超集一致性契约 | 高 | STEP0·r7 | verified — r8 核验通过 |
| REQ-34 | clean-tree oracle 拒绝正常在途 bundle | 阻断 | STEP0·r7 | verified — r8 核验通过（排除集绕过转 REQ-38） |
| REQ-35 | docs delta 无可诚实表达的 change-kind | 阻断 | STEP0·r7 | verified — r10 核验通过 |
| REQ-36 | 声称入 AC 的关键 oracle 未进正式 AC-I 清单 | 高 | STEP0·r7 | verified — r8 核验通过 |
| REQ-37 | doc-fix 与 scoped verify 契约冲突（docs 无 TAP oracle） | 阻断 | STEP0·r8 | verified — r12 核验通过 |
| REQ-38 | apriori/** 排除集可绕过 profile/类型表/证据规则变更 | 阻断 | STEP0·r8 | verified — r10 核验通过 |
| REQ-39 | gate③ 决策面漏 t1/t2 与 γ' 连带确认 | 高 | STEP0·r8 | verified — r10 核验通过 |
| REQ-40 | doc-fix fix-ref 静默预用 v2 强校验 | 高 | STEP0·r8 | verified — r12 核验通过 |
| REQ-41 | 类型表 malformed 输入域未定义 | 高 | STEP0·r8 | verified — r12 核验通过 |
| REQ-42 | 版本工件与账本事实漂移（v9 为 v8 字节副本而账本先翻 fixed） | 阻断 | STEP0·r9 | verified — r12 核验通过（顺序纪律生效后一致性确认） |
| REQ-43 | 点检/P8 verdict 未绑定最终 bundle，可复用陈旧 verdict | 阻断 | STEP0·r10 | verified — r12 核验通过（r15 摘要自报残口转 REQ-55） |
| REQ-44 | doc-fix 与 fix-ref 配对契约冲突（无唯一合法定位头形状） | 阻断 | STEP0·r12 | verified — r13 核验通过 |
| REQ-45 | clean-tree 只排本 bundle 破坏并行 change 独立性 | 阻断 | STEP0·r12 | verified — r13 核验通过 |
| REQ-46 | Q-12=yes 无机械分级分支（ADDED 无既有块可标） | 阻断 | STEP0·r12 | verified — r14 核验通过 |
| REQ-47 | Q-6 排除集与正文互斥（owner 会看到两个契约） | 高 | STEP0·r13 | verified — r14 核验通过 |
| REQ-48 | R1×docs n/a 把 docs trivial 一并消灭，与 state A 冲突 | 阻断 | STEP0·r13 | verified — r14 核验通过（后续派生 REQ-49..52） |
| REQ-49 | R1-doc 单模块自动降级是系统性 fail-down | 阻断 | STEP0·r14 | verified — r15 核验通过 |
| REQ-50 | waive 指路不能恢复 state A 的 P8（正式流程被 Q-11 静默弱化） | 阻断 | STEP0·r14 | verified — r15 核验通过 |
| REQ-51 | R1-doc 评审格两个互斥投影 | 高 | STEP0·r14 | verified — r16 核验通过 |
| REQ-52 | R1-doc 未入值域，正文与 AC 执行旧契约 | 阻断 | STEP0·r14 | verified — r15 核验通过 |
| REQ-53 | Q-5b 未入正式表且破坏半径唯一决定准入 | 阻断 | STEP0·r15 | verified — r19 核验通过 |
| REQ-54 | Q-5b 未披露其扩大 state A Trivial 定义 | 高 | STEP0·r15 | verified — r17 核验通过 |
| REQ-55 | verdict 摘要为自报值不能证明内容经评审 | 阻断 | STEP0·r15 | verified — r18 核验通过（基数定式） |
| REQ-56 | 倾向 c 无可执行三资格判定输入 | 阻断 | STEP0·r16 | verified — r17 核验通过 |
| REQ-57 | Q-5b 新增的 R2-whitelist×trivial 无验证下限 | 阻断 | STEP0·r17 | verified — r18 核验通过 |
| REQ-58 | verdict 摘要未定义散列域且未绑定被评代码基线（旧评审可跨 HEAD 复用） | 阻断 | STEP0·r18 | verified — r29 评审确认连同转正 |
| REQ-59 | 摘要域含 flow-state 形成评审自失效循环 | 阻断 | STEP0·r20 | verified — r21 核验通过 |
| REQ-60 | 摘要正列漏申报字段（改声明可复用旧 verdict 换契约） | 阻断 | STEP0·r21 | verified — r22 核验通过 |
| REQ-61 | bindings 同属摘要正列与状态文件排除域（c1' 下互斥解释） | 阻断 | STEP0·r22 | verified — r23 核验通过（正常路径；malformed 谱转 REQ-62） |
| REQ-62 | c1' 节切分无 malformed 唯一结果（重复标题可致摘要/解析两可） | 高 | STEP0·r23 | verified — r25 核验通过（需求函数缺口转 REQ-63） |
| REQ-63 | bindings 必需性仅由目标键决定，doc-fix 无诚实形态且禁 p2 | 阻断 | STEP0·r25 | verified — r26 核验通过（载体投影缺口转 REQ-64） |
| REQ-64 | bindings 需求函数未按载体投影（c1/c2/c3 与 p2 组合未定义） | 阻断 | STEP0·r26 | verified — r27 核验通过（基数分层转 REQ-65） |
| REQ-65 | c2/c3 载体基数与逐目标键基数混层 | 阻断 | STEP0·r27 | verified — r28 核验通过（p2 矛盾转 REQ-67） |
| REQ-66 | p2×c2/c3 联动约束未入决策摘要契约 | 高 | STEP0·r27 | verified — r28 核验通过（能力声明转 REQ-68） |
| REQ-67 | 零 delta p2 与行数==键数正面矛盾 | 阻断 | STEP0·r28 | verified — r29 核验通过 |
| REQ-68 | STEP2 机械拒绝声明无 oracle；Q7a/Q7c 编号碰撞 | 高 | STEP0·r28 | verified — r29 核验通过 |
| REQ-69 | 非所裁载体中的 bindings 形态未定义（互斥不真） | 阻断 | STEP0·r29 | verified — r30 核验通过 |
| REQ-70 | Q-4×p2 行类型联动未闭合（R1 无载体推论失实） | 高 | STEP0·r29 | verified — r33 核验通过（r32 收口确认） |
| REQ-71 | Q-4 降级经正式表泄漏到正式 trivial | 阻断 | STEP0·r31 | verified — r32 核验通过 |
| REQ-72 | R2 no-test 禁令误称 owner 拍板（预裁 Q-4） | 阻断 | STEP0·r32 | verified — r36 核验通过 |
| REQ-73 | AC-D6 固定 3 处计数与参数化 Q-4 不一致 | 高 | STEP0·r33 | verified — r34 核验通过 |
| REQ-74 | 按键切分静默丢弃既有 affected ID（无留痕验证逃逸） | 阻断 | STEP0·r34 | verified — r36 核验通过 |
| REQ-75 | UNBOUND→阻塞被误写为必然后果（state A 按实际 TAP 分类） | 高 | STEP0·r34 | verified — r37 核验通过（阶段标定转 REQ-78） |
| REQ-76 | 正式表残留 Q-4 仅作用 R1 旧口径（c 案 R2 泄漏两可） | 高 | STEP0·r37 | verified — r38 核验通过 |
| REQ-77 | Q-3=ii 合法候选未投影进 B-C 与 AC | 阻断 | STEP0·r37 | verified — r40 核验通过 |
| REQ-78 | no-test TAP 结果函数未标定发生阶段 | 高 | STEP0·r37 | verified — r38 核验通过 |
| REQ-79 | 新参数轴未入 AC 覆盖域；scope 重叠歧义 | 高 | STEP0·r38 | verified — r39 核验通过 |
| REQ-80 | ii 基线字段未随 Q-6b 参数化（f2/f3 被误拒） | 阻断 | STEP0·r39 | verified — r41 核验通过 |
| REQ-81 | ii 结果域未闭合（scope 外 ID/空 scope 工件基数） | 高 | STEP0·r39 | verified — r42 核验通过 |
| REQ-82 | Q-6b 误作互斥单轴（f1+f2 叠加无 oracle 与联动） | 阻断 | STEP0·r41 | verified — r43 核验通过 |
| DES-1 | 机械接口仍推迟实现（req 明确留 STEP2 的定式未定） | 阻断 | STEP2·r1 | verified — r28「VERDICT: 0 issues open」终审确认；修复内容：v2: D6 定式节——节标题/摘要算法/子型序列化/ii 工件/记录行/verdict 区/config 四列 |
| DES-2 | decision-summary.md 缺失 | 高 | STEP2·r1 | verified — r28「VERDICT: 0 issues open」终审确认；修复内容：v2: decision-summary.md 成稿 |
| DES-3 | D1.1 未物化 doc-fix 字段契约 | 高 | STEP2·r1 | verified — r28「VERDICT: 0 issues open」终审确认；修复内容：v2: D1.1 补 doc-fix 契约行全部不变量 |
| DES-4 | D1.2 复活已删的 2a；proposal 漏白名单② | 高 | STEP2·r1 | verified — r28「VERDICT: 0 issues open」终审确认；修复内容：v2: 2a 行删除；proposal 补白名单② |
| DES-5 | D1.3 走查不随待裁参数变化 | 高 | STEP2·r1 | verified — r28「VERDICT: 0 issues open」终审确认；修复内容：v2: D1.3 参数化标注（N 案/Q-4 案） |
| DES-6 | D2.3 非全笛卡尔物化 | 高 | STEP2·r1 | verified — r28「VERDICT: 0 issues open」终审确认；修复内容：v2: D2.3 重制表 A（五半径×五 profile 显式 n/a）/表 B/表 C 六格 |
| DES-7 | D3 漏六组联动且错误收窄 Q-3×Q-4 | 高 | STEP2·r1 | verified — r28「VERDICT: 0 issues open」终审确认；修复内容：v2: D3 补六组联动；Q-3×Q-4 修正 ii×c 合法交叉 |
| DES-8 | D1.4 实现触点不完整/有误（bin dispatch、spec-runner scope、resolve/status 触点） | 高 | STEP2·r1 | verified — r28「VERDICT: 0 issues open」终审确认；修复内容：v2: D1.4 补 bin dispatch/spec-runner scope 接口/status-gate 触点修正/新模块提案 |
| DES-9 | HL-GRADE/BIND 漏 AC-I 多项 | 高 | STEP2·r1 | verified — r28「VERDICT: 0 issues open」终审确认；修复内容：v2: HL-GRADE-21..25、HL-BIND-09 补/11/12 |
| DES-10 | HL-VERIFY 漏 ii/Q-4c 交叉与错误谱 | 高 | STEP2·r1 | verified — r28「VERDICT: 0 issues open」终审确认；修复内容：v2: HL-VERIFY-08/09 |
| DES-11 | HL-REV/REG 漏评审六格与耦合逐格 | 高 | STEP2·r1 | verified — r28「VERDICT: 0 issues open」终审确认；修复内容：v2: HL-REV-06、HL-REG-05 |
| DES-12 | RUNBOOK 草案与 req/现行命令语义冲突 | 高 | STEP2·r1 | verified — r28「VERDICT: 0 issues open」终审确认；修复内容：v2: 专属 hotfix 归档命令显式/ADDED 措辞修正/签收命名空间 |
| DES-13 | 草案非可落地双语 delta；config 行列式不符 | 中 | STEP2·r1 | verified — r28「VERDICT: 0 issues open」终审确认；修复内容：v2: 双语同步义务声明；config 行四列含 Default |
| DES2-1 | D6 缺完整唯一 bundle 机器语法（状态文件布局/c1 路径/c2 c3 语法/fix-ref grammar/ii 路径/approval 位置） | 阻断 | STEP2·r2 | verified — r28「VERDICT: 0 issues open」终审确认；修复内容：v3: D6.1 全语法——状态文件布局/节序/c1 路径/c2 c3 语法+剥离边界/fix-ref grammar/ii 固定路径/approval 结构 |
| DES2-2 | 评审摘要与 d1 令牌错误合并单一摘要域 | 阻断 | STEP2·r2 | verified — r28「VERDICT: 0 issues open」终审确认；修复内容：v3: D6.2 双摘要域——digest-core 公共核+d1 令牌扩展域分离 |
| DES2-3 | 摘要可能漏 conclusion（业务节未正列） | 高 | STEP2·r2 | verified — r28「VERDICT: 0 issues open」终审确认；修复内容：v3: 业务节正列 {Conclusion, Bindings}——conclusion 恒入域 |
| DES2-4 | ii/截图定式承载不了 f2/f3 oracle（timestamp/哈希位置/转义/时区） | 高 | STEP2·r2 | verified — r28「VERDICT: 0 issues open」终审确认；修复内容：v3: D6.3——ii 工件 timestamp 字段/f2 哈希位置=令牌输入/记录行键值定式+fail-closed 无转义/ISO UTC 秒 |
| DES2-5 | verdict 行定式与 state A ^VERDICT: 接口冲突；check/phrase table 触点漏列 | 高 | STEP2·r2 | verified — r28「VERDICT: 0 issues open」终审确认；修复内容：v3: D6.4 verdict 行 ^VERDICT: 前缀兼容+role/digest 尾注；check/phrase table 触点入 D1.4 |
| DES2-6 | 表 C none×retain 吞掉 docs 的 R0+decisions 条件分支 | 高 | STEP2·r2 | verified — r28「VERDICT: 0 issues open」终审确认；修复内容：v3: 表 C none×retain 补 docs 条件分支 |
| DES2-7 | D1.4 预裁实现拓扑（CLI grammar/位置候选 b/m3/复用原语失实） | 高 | STEP2·r2 | verified — r28「VERDICT: 0 issues open」终审确认；修复内容：v3: CLI grammar 子动作显式/位置候选 b 注记/m3 补列/复用原语措辞修正为新事务设计 |
| DES2-8 | D3 与决策摘要漏联动候选；Q-9 命名错；候选未全枚举 | 高 | STEP2·r2 | verified — r28「VERDICT: 0 issues open」终审确认；修复内容：v3: D3 补四组联动+去重；decision-summary Q-9 命名修正+prior art 全候选枚举 |
| DES2-9 | 检查点非一例一 ID 可追踪映射；元要求未场景化 | 高 | STEP2·r2 | verified — r28「VERDICT: 0 issues open」终审确认；修复内容：v3: cli-checkpoints 重写一例一 ID（HL-F/G/B/V/E/R/X/C/K 共 150+ 例，表 C 逐格 HL-R-14..22、表 A 逐格 HL-C、t2 正例、同名行例、w/x/m 参数化例） |
| DES2-10 | RUNBOOK 草案无双语可评审文本 | 中 | STEP2·r2 | verified — r28「VERDICT: 0 issues open」终审确认；修复内容：v3: RUNBOOK 草案 EN/CN 逐句对应可评审文本（语义敏感段全覆盖） |
| DES3-1 | 状态文件语法非全域唯一+Conclusion 条件反写 | 阻断 | STEP2·r3 | verified — r28「VERDICT: 0 issues open」终审确认；修复内容：v4: 基数按 requiredness/列表与 k2 语法/kinds 一致性约束/date 语法/未知字段与节 F1/Conclusion 条件修正 |
| DES3-2 | CLI/approval 只实现 d+d1 预裁签收案 | 高 | STEP2·r3 | verified — r28「VERDICT: 0 issues open」终审确认；修复内容：v4: CLI 与 approval 按 a/b/c/d+d1 d2 d3 全案参数化 |
| DES3-3 | d1 扩展串接不可稳定复算；digest-core 漏 name/date/kinds | 阻断 | STEP2·r3 | verified — r28「VERDICT: 0 issues open」终审确认；修复内容：v4: d1 精确串接（hex core+域前缀行+SHA-256+空集零行）；digest-core 补头部字段全集 |
| DES3-4 | fix-ref/截图 grammar 有歧义；f3 无完整判定函数 | 高 | STEP2·r3 | verified — r28「VERDICT: 0 issues open」终审确认；修复内容：v4: 外仓双正则/记录行保留键子串 F1/f3 严格大于判定函数 |
| DES3-5 | verdict 结论短语未枚举 | 高 | STEP2·r3 | verified — r28「VERDICT: 0 issues open」终审确认；修复内容：v4: 结论短语枚举四组入 phrase table；role 枚举二值 |
| DES3-6 | 正式表 R0/R1 下限自相矛盾 | 高 | STEP2·r3 | verified — r28「VERDICT: 0 issues open」终审确认；修复内容：v4: 正式 R0/R1 下限独立列出（state A 恒定；复用仅覆盖面概念） |
| DES3-7 | D3 漏 d×d1d2d3 成组等四处；两处后果失真 | 高 | STEP2·r3 | verified — r28「VERDICT: 0 issues open」终审确认；修复内容：v4: D3 补 d×子案成组/d×π/Q-4b p2 限 R1/w2×选填后果修正 |
| DES3-8 | 决策摘要漏 d2/d3；载体倾向不唯一；c1 连带缺 | 高 | STEP2·r3 | verified — r28「VERDICT: 0 issues open」终审确认；修复内容：v4: 摘要补 d2/d3 成组；载体倾向唯一 c1'；c1 连带 AC1 调整入摘要 |
| DES3-9 | 检查点多结果同 ID；漏 backend-touched/f1 f3/m/签收路径例；表 A 同左压缩 | 高 | STEP2·r3 | verified — r28「VERDICT: 0 issues open」终审确认；修复内容：v4: 检查点全拆分一例一 ID+backend 三态+f1/f3 失配+签收与 gate 映射全案例+表 A 全格展开 |
| DES3-10 | 双语文本四处预裁/超契约（ADDED 矛盾/外仓/π/Q-3 与截图量词） | 高 | STEP2·r3 | verified — r28「VERDICT: 0 issues open」终审确认；修复内容：v4: 双语四处修正（白名单句重构/w x 案化/π 案化/Q-3 Q-4 案化+量词还原） |
| DES4-1 | kinds 未禁 1×2 互斥；流程节未枚举 | 高 | STEP2·r4 | verified — r28「VERDICT: 0 issues open」终审确认；修复内容：v5: kinds 1×2 互斥+流程节枚举 {## Gates} |
| DES4-2 | bindings 无 keyed 语法；c3 剥离语义误改 | 阻断 | STEP2·r4 | verified — r28「VERDICT: 0 issues open」终审确认；修复内容：v5: keyed 行键前置统一语法；c3 随块合入恢复、仅 c2 剥离 |
| DES4-3 | approval 定式与 a/b/c/d2/d3 冲突；c 案轴误设 | 高 | STEP2·r4 | verified — r28「VERDICT: 0 issues open」终审确认；修复内容：v5: approval 一切案统一落点+字段随案；c 案回写=b 式 sign-off |
| DES4-4 | k2 无 occurrence 且未贯穿全链 | 高 | STEP2·r4 | verified — r28「VERDICT: 0 issues open」终审确认；修复内容：v5: k2 含 occurrence+保留字符 F1+全链成本连带声明 |
| DES4-5 | π3 无哈希载体；路径根未定 | 高 | STEP2·r4 | verified — r28「VERDICT: 0 issues open」终审确认；修复内容：v5: hash 字段（π3 必需）+路径根=仓根统一 |
| DES4-6 | role×phrase 未配对；γ' 第三行歧义；评审工件选择未定 | 高 | STEP2·r4 | verified — r28「VERDICT: 0 issues open」终审确认；修复内容：v5: role×phrase 配对表+γ' boundary 尾注不增行+N 十进制+轮次定式命名与最大 n 选择 |
| DES4-7 | summary γ' 错绑 d+d1 | 高 | STEP2·r4 | verified — r28「VERDICT: 0 issues open」终审确认；修复内容：v5: summary γ' 绑定修正为 d 任子案或点检 |
| DES4-8 | checkpoints 漏身份/事务/truth/kinds/c3/π 载体面 | 高 | STEP2·r4 | verified — r28「VERDICT: 0 issues open」终审确认；修复内容：v5: HL-I/HL-T 组+kinds/节/语法例+c3 双例+π2 π3 载体例 |
| DES4-9 | f3 文件级 mtime 与实体级语义不一致 | 中 | STEP2·r4 | verified — r28「VERDICT: 0 issues open」终审确认；修复内容：v5: f3 文件级近似诚实标注（只误拒不误放） |
| DES4-10 | runbook 把正式 trivial 纳入 Q-3/Q-4 | 高 | STEP2·r4 | verified — r28「VERDICT: 0 issues open」终审确认；修复内容：v5: runbook 增量档拆 hotfix 与正式 trivial 两句 |
| DES5-1 | k2 未端到端（序号/排序源/接口/工件仍 ID 级） | 阻断 | STEP2·r5 | verified — r28「VERDICT: 0 issues open」终审确认；修复内容：v6: k2 序号/排序源定式+复合键全链一致无坍缩 |
| DES5-2 | bindings parser 歧义（-->、: 切分、容器内容） | 高 | STEP2·r5 | verified — r28「VERDICT: 0 issues open」终审确认；修复内容：v6: 首 marker 切分+键禁子串+c3 禁 -->+容器内容限定 |
| DES5-3 | π2/π3 载体未唯一+路径逃逸风险 | 高 | STEP2·r5 | verified — r28「VERDICT: 0 issues open」终审确认；修复内容：v6: π2 目录定式+π3 SHA-256+hash= 入保留清单+路径安全四拒 |
| DES5-4 | round 别名/孤立轮次/boundary requiredness 未定 | 高 | STEP2·r5 | verified — r28「VERDICT: 0 issues open」终审确认；修复内容：v6: 无前导零+孤立轮次 F1+boundary requiredness 双向 |
| DES5-5 | D3 漏 ii×Q-4b×p2 合法组合 | 高 | STEP2·r5 | verified — r28「VERDICT: 0 issues open」终审确认；修复内容：v6: D3 补 ii×Q-4b×p2 合法行 |
| DES5-6 | summary 表二混 hotfix 与正式 trivial | 高 | STEP2·r5 | verified — r28「VERDICT: 0 issues open」终审确认；修复内容：v6: summary 表二拆 hotfix/正式 trivial 两行 |
| DES5-7 | runbook 债务载体陈述不实 | 高 | STEP2·r5 | verified — r28「VERDICT: 0 issues open」终审确认；修复内容：v6: 债务载体句修正——零 delta 特殊点=无投影 |
| DES5-8 | runbook 漏 phrase-table delta | 高 | STEP2·r5 | verified — r28「VERDICT: 0 issues open」终审确认；修复内容：v6: phrase-table delta EN/CN 节新增 |
| DES5-9 | checkpoints 残余复合 ID+新定式负例漏 | 高 | STEP2·r5 | verified — r28「VERDICT: 0 issues open」终审确认；修复内容：v6: 复合 ID 全拆+HL-N-01..18 补例 |
| DES6-1 | kinds 一致性排除纯业务事实 {3} | 高 | STEP2·r6 | verified — r28「VERDICT: 0 issues open」终审确认；修复内容：v7: 含 2 改单向蕴含；no-code 合法组合 {2}/{3}/{2,3}；HL-N-19 |
| DES6-2 | k2 多文件/current-delta 非唯一；TAP 结果模型未闭合 | 高 | STEP2·r6 | verified — r28「VERDICT: 0 issues open」终审确认；修复内容：v7: 复合键加承载文件身份段+delta 目标段；TAP 裸 ID 复制语义诚实标注 |
| DES6-3 | 首 marker 切分解析不了 singleton | 高 | STEP2·r6 | verified — r28「VERDICT: 0 issues open」终审确认；修复内容：v7: 词法入口两分——行首式 singleton/首 marker keyed+尾冒号键 |
| DES6-4 | digest-core 无长度前缀存在分组歧义 | 高 | STEP2·r6 | verified — r28「VERDICT: 0 issues open」终审确认；修复内容：v7: 实体记录 type-tag+长度前缀唯一编码 |
| DES6-5 | hash= 漏出显式清单；hex 未限定；realpath/组件 symlink 未查 | 高 | STEP2·r6 | verified — r28「VERDICT: 0 issues open」终审确认；修复内容：v7: hash= 入清单+64 位小写 hex+realpath containment+逐组件 symlink |
| DES6-6 | π2 复制未入事务与摘要生命周期 | 高 | STEP2·r6 | verified — r28「VERDICT: 0 issues open」终审确认；修复内容：v7: π2 复制为 dry-run 前置步骤——digest/呈阅/归档一致视图；path= 改写；无回滚问题 |
| DES6-7 | phrase-table boundary 错写全角色选填 | 中 | STEP2·r6 | verified — r28「VERDICT: 0 issues open」终审确认；修复内容：v7: phrase-table boundary 双向 requiredness EN/CN |
| DES6-8 | 检查点残余复合 ID+九类新例缺 | 高 | STEP2·r6 | verified — r28「VERDICT: 0 issues open」终审确认；修复内容：v7: HL-I-04/T-08/T-13/N-11 拆分+HL-N-19..30 补例 |
| DES7-1 | 检查点 HL-F-36b 仍旧双向与 N-19 冲突 | 高 | STEP2·r7 | verified — r28「VERDICT: 0 issues open」终审确认；修复内容：v8: HL-F-36b 单向+N-19/N-31 通过例 |
| DES7-2 | k2 组件字符集/前缀/MODIFIED provenance/ordinal 未唯一 | 高 | STEP2·r7 | verified — r28「VERDICT: 0 issues open」终审确认；修复内容：v8: 固定前缀 store=/delta=+封闭字符集+MODIFIED 取 store 身份+ordinal 定义 |
| DES7-3 | spec-runner 触点低估（duplicate 链/fan-out/报告） | 高 | STEP2·r7 | verified — r28「VERDICT: 0 issues open」终审确认；修复内容：v8: spec-runner 触点全谱——occurrence/duplicate 参数化/投影/fan-out/报告 |
| DES7-4 | digest tag 可换行注入；排序未定 | 高 | STEP2·r7 | verified — r28「VERDICT: 0 issues open」终审确认；修复内容：v8: tag 双长度前缀+UTF-8 字节序 |
| DES7-5 | 截图定式内部矛盾+三 oracle 缺（AC 有预期设计无函数） | 高 | STEP2·r7 | verified — r28「VERDICT: 0 issues open」终审确认；修复内容：v8: 禁子串唯一清单+三 oracle 入定式 |
| DES7-6 | π2 前置复制破坏零写入与可重入 | 高 | STEP2·r7 | verified — r28「VERDICT: 0 issues open」终审确认；修复内容：v8: π2 作者编辑动作+三步可重入+approve 不复制+写集合分界 |
| DES7-7 | AC-I 六类新失败边界缺+复合 ID 残余 | 高 | STEP2·r7 | verified — r28「VERDICT: 0 issues open」终审确认；修复内容：v8: HL-F-34/36/G-17 拆分+HL-N-31..41 补例 |
| DES8-1 | DES7-1 检查点修复未落盘（账本先翻工件未写——事故三） | 阻断 | STEP2·r8 | verified — r28「VERDICT: 0 issues open」终审确认；修复内容：v9: HL-F-36 单向拆分真实落盘并 grep 验证 |
| DES8-2 | DES7-7 拆分与 HL-N-31..41 未落盘（同事故） | 阻断 | STEP2·r8 | verified — r28「VERDICT: 0 issues open」终审确认；修复内容：v9: HL-F-34a b/G-17a-d 拆分+HL-N-31..41 真实落盘并 grep 验证 |
| DES8-3 | k2 carrier/ID 切分未定且 ID 可含 / | 高 | STEP2·r8 | verified — r28「VERDICT: 0 issues open」终审确认；修复内容：v9: 最后一个 / 切分+ID 禁 / |
| DES8-4 | MODIFIED 新增 scenario 无合法 carrier | 高 | STEP2·r8 | verified — r28「VERDICT: 0 issues open」终审确认；修复内容：v9: carrier 归属函数=裸 ID 存在性；MODIFIED 新增取 delta 身份 |
| DES8-5 | d1 扩展域行拼接可注入 | 高 | STEP2·r8 | verified — r28「VERDICT: 0 issues open」终审确认；修复内容：v9: d1 扩展复用双长度前缀记录编码 |
| DES8-6 | 截图第二份清单冲突残留 | 高 | STEP2·r8 | verified — r28「VERDICT: 0 issues open」终审确认；修复内容：v9: 旧枚举句删除只留唯一清单 |
| DES8-7 | π2 碰撞拒与同内容 no-op 边界两可 | 中 | STEP2·r8 | verified — r28「VERDICT: 0 issues open」终审确认；修复内容：v9: basename→source 单射；同源 no-op/异源碰撞拒 |
| DES8-8 | summary d1 内容绑定过度保证 | 高 | STEP2·r8 | verified — r28「VERDICT: 0 issues open」终审确认；修复内容：v9: d1 绑定域如实收窄措辞 |
| DES9-1 | MODIFIED 裸 ID 存在性非 occurrence 全域函数 | 阻断 | STEP2·r9 | verified — r28「VERDICT: 0 issues open」终审确认；修复内容：v10: occurrence 级顺序配对+尾部归 delta+删减无键 |
| DES9-2 | k2 标题类型与 rename 取值未定 | 高 | STEP2·r9 | verified — r28「VERDICT: 0 issues open」终审确认；修复内容：v10: requirement 块标题+rename 取最终名 |
| DES9-3 | π2 步骤③崩溃不可重入 | 高 | STEP2·r9 | verified — r28「VERDICT: 0 issues open」终审确认；修复内容：v10: 步骤③ temp+rename 原子替换 |
| DES9-4 | π2 辅助命令缺 grammar；d×π2 破 AC1 未披露 | 高 | STEP2·r9 | verified — r28「VERDICT: 0 issues open」终审确认；修复内容：v10: hotfix evidence 入 grammar+D3/summary 披露 AC1 联动 |
| DES9-5 | verdict role/digest 语法可选与强制绑定矛盾 | 高 | STEP2·r9 | verified — r28「VERDICT: 0 issues open」终审确认；修复内容：v10: role/digest 必填各恰一；runbook 同步 |
| DES9-6 | AC-I 缺新函数边界七例 | 高 | STEP2·r9 | verified — r28「VERDICT: 0 issues open」终审确认；修复内容：v10: HL-N-42..52 补例 |
| DES9-7 | module-type-map 无封闭 grammar | 中 | STEP2·r9 | verified — r28「VERDICT: 0 issues open」终审确认；修复内容：v10: module grammar 封闭+malformed 例+不可表达→保守 R3 |
| DES10-1 | 标题含 / 破坏切分 | 高 | STEP2·r10 | verified — r28「VERDICT: 0 issues open」终审确认；修复内容：v11: 标题禁 / |
| DES10-2 | ordinal 块内/文件内双定义 | 高 | STEP2·r10 | verified — r28「VERDICT: 0 issues open」终审确认；修复内容：v11: ordinal 统一块内序 |
| DES10-3 | module 示例非法+token 推导缺 | 高 | STEP2·r10 | verified — r28「VERDICT: 0 issues open」终审确认；修复内容：v11: token 推导函数+真实示例 |
| DES10-4 | d×π2 与 HL-K-01 矛盾 | 高 | STEP2·r10 | verified — r28「VERDICT: 0 issues open」终审确认；修复内容：v11: 未调阈值×d×π2=非法联合；HL-K-01 参数化 |
| DES10-5 | temp 残留重跑未定 | 高 | STEP2·r10 | verified — r28「VERDICT: 0 issues open」终审确认；修复内容：v11: temp 固定名+计划步删除重建+与 state A 差异声明 |
| DES10-6 | d1 域总序与 f2 封闭集缺 | 高 | STEP2·r10 | verified — r28「VERDICT: 0 issues open」终审确认；修复内容：v11: 域总序固定+f2=evidence/ 树正列 |
| DES10-7 | AC-I 六新边界缺 | 高 | STEP2·r10 | verified — r28「VERDICT: 0 issues open」终审确认；修复内容：v11: HL-N-53..59 |
| DES11-1 | k2 n 两套口径冲突 | 高 | STEP2·r11 | verified — r28「VERDICT: 0 issues open」终审确认；修复内容：v12: ordinal 全文唯一块内序 |
| DES11-2 | token 推导非单值函数+示例词表外 | 高 | STEP2·r11 | verified — r28「VERDICT: 0 issues open」终审确认；修复内容：v12: 两 canonical 形态推导+碰撞 F1+真实词表示例 |
| DES11-3 | π2 temp 非只读计划且无并发安全 | 高 | STEP2·r11 | verified — r28「VERDICT: 0 issues open」终审确认；修复内容：v12: ①纯只读+残留 temp F1+进程唯一 temp 名 |
| DES11-4 | f2 全树无 fail-closed 遍历契约 | 高 | STEP2·r11 | verified — r28「VERDICT: 0 issues open」终审确认；修复内容：v12: lstat 逐项/非 regular F1/不可读 F1/快照边界声明 |
| DES11-5 | summary 保留已判非法组合 | 高 | STEP2·r11 | verified — r28「VERDICT: 0 issues open」终审确认；修复内容：v12: summary 同步非法联合措辞 |
| DES11-6 | verdict digest 词法不封闭 | 中 | STEP2·r11 | verified — r28「VERDICT: 0 issues open」终审确认；修复内容：v12: digest 恰 64 位小写 |
| DES11-7 | AC-I 新边界缺 | 中 | STEP2·r11 | verified — r28「VERDICT: 0 issues open」终审确认；修复内容：v12: HL-N-60..68 |
| DES12-1 | 配对域停留裸 ID 全局（跨 requirement 错配） | 高 | STEP2·r12 | verified — r28「VERDICT: 0 issues open」终审确认；修复内容：v13: 配对域=(requirement 身份×ID) 块内 |
| DES12-2 | temp fail-closed 与可重入/旧检查点矛盾 | 高 | STEP2·r12 | verified — r28「VERDICT: 0 issues open」终审确认；修复内容：v13: 残留 temp 双点 F1+清理后重跑幂等口径统一；HL-N-45/56 改写 |
| DES12-3 | f2 量词拒绝合法目录（f2×π2 自相矛盾） | 高 | STEP2·r12 | verified — r28「VERDICT: 0 issues open」终审确认；修复内容：v13: 目录=遍历节点；叶须 regular |
| DES12-4 | approve 重算不保证最终归档字节 | 高 | STEP2·r12 | verified — r28「VERDICT: 0 issues open」终审确认；修复内容：v13: fd 散列+approve 写前 manifest CAS 终核 |
| DES12-5 | runbook digest 词法未同步 | 中 | STEP2·r12 | verified — r28「VERDICT: 0 issues open」终审确认；修复内容：v13: EN/CN digest 64 位小写同步 |
| DES12-6 | AC-I 相反预期+五例缺 | 中 | STEP2·r12 | verified — r28「VERDICT: 0 issues open」终审确认；修复内容：v13: HL-N-69..73+相反预期消除 |
| DES13-1 | 终核非最终归档边界 | 高 | STEP2·r13 | verified — r28「VERDICT: 0 issues open」终审确认；修复内容：v14: 复核到写集合开始点=机械保证；此后窗口 o1 同级如实声明 |
| DES13-2 | lstat→open 竞态 | 高 | STEP2·r13 | verified — r28「VERDICT: 0 issues open」终审确认；修复内容：v14: O_NOFOLLOW+fstat regular+dev inode 三件套 |
| DES13-3 | π2 路径归档后失效 | 高 | STEP2·r13 | verified — r28「VERDICT: 0 issues open」终审确认；修复内容：v14: path=bundle 根相对——归档后仍解析 |
| DES13-4 | temp 名不消并发争用 | 高 | STEP2·r13 | verified — r28「VERDICT: 0 issues open」终审确认；修复内容：v14: 并发不受支持如实声明+last-writer 语义 |
| DES13-5 | AC 终态并发边界缺 | 中 | STEP2·r13 | verified — r28「VERDICT: 0 issues open」终审确认；修复内容：v14: HL-N-74..77 |
| DES14-1 | bundle 相对错扩 π1/π3 | 高 | STEP2·r14 | verified — r28「VERDICT: 0 issues open」终审确认；修复内容：v15: 根按 π 参数化——π2 bundle/π1 仓根 tmp/π3 外部无 containment |
| DES14-2 | 三件套未封祖先替换 | 高 | STEP2·r14 | verified — r28「VERDICT: 0 issues open」终审确认；修复内容：v15: 叶三件套=机械保证+祖先竞态 o1 残余如实+anchoring 列可选 |
| DES14-3 | 可修复收敛无依据 | 中 | STEP2·r14 | verified — r28「VERDICT: 0 issues open」终审确认；修复内容：v15: 静默丢行如实披露+人工串行修复路径 |
| DES14-4 | AC 复合 ID 复活+三例缺 | 中 | STEP2·r14 | verified — r28「VERDICT: 0 issues open」终审确认；修复内容：v15: 74a-c 拆分+75b c+78/79 |
| DES15-1 | π1×f2 未绑截图字节 | 高 | STEP2·r15 | verified — r28「VERDICT: 0 issues open」终审确认；修复内容：v16: π1×f2 hash 必填+ext-artifact 入 d1+机械校验 |
| DES15-2 | π3 无词法与解析根 | 高 | STEP2·r15 | verified — r28「VERDICT: 0 issues open」终审确认；修复内容：v16: π3 三形态词法+本地目标错误谱+URI 声明值 |
| DES15-3 | O_NOFOLLOW 无平台边界 | 中 | STEP2·r15 | verified — r28「VERDICT: 0 issues open」终审确认；修复内容：v16: 能力探测 fail-closed+D1.4 平台触点 |
| DES15-4 | AC 新参数空间缺 | 中 | STEP2·r15 | verified — r28「VERDICT: 0 issues open」终审确认；修复内容：v16: HL-N-80..84 |
| DES16-1 | ext-artifact 未入 d1 序列化 | 高 | STEP2·r16 | verified — r28「VERDICT: 0 issues open」终审确认；修复内容：v17: 第五域+集合去重 |
| DES16-2 | ext-artifact 未继承安全打开与终核 | 高 | STEP2·r16 | verified — r28「VERDICT: 0 issues open」终审确认；修复内容：v17: 终核并集+三件套适用 |
| DES16-3 | π3 URI 与 hash oracle 矛盾 | 高 | STEP2·r16 | verified — r28「VERDICT: 0 issues open」终审确认；修复内容：v17: URI 移除——oracle 唯一 |
| DES16-4 | f2×π3-URI 绕过截图哈希 | 高 | STEP2·r16 | verified — r28「VERDICT: 0 issues open」终审确认；修复内容：v17: 随 URI 移除消解 |
| DES16-5 | π3 三形态非机械词法 | 中 | STEP2·r16 | verified — r28「VERDICT: 0 issues open」终审确认；修复内容：v17: 二形态词法唯一 |
| DES16-6 | AC 新交叉缺 | 中 | STEP2·r16 | verified — r28「VERDICT: 0 issues open」终审确认；修复内容：v17: HL-N-85..88+82c 改拒 |
| DES17-1 | π3 二形态词法未闭合（盘符/UNC/无斜杠 URI） | 高 | STEP2·r17 | verified — r28「VERDICT: 0 issues open」终审确认；修复内容：v18: 六分支有序词法闭合（URI/UNC/drive-abs/drive-rel/POSIX/仓根相对） |
| DES17-2 | ext-artifact 去重缺 canonical path 函数 | 高 | STEP2·r17 | verified — r28「VERDICT: 0 issues open」终审确认；修复内容：v18: canonical path 函数（分隔符归一/折叠/. 消解/不折大小写）+同 canonical 异 hash F1 |
| DES17-3 | f2 平台不可用后果未入 owner 决策材料 | 中 | STEP2·r17 | verified — r28「VERDICT: 0 issues open」终审确认；修复内容：v18: decision-summary Q-6b 与 RUNBOOK Platform note 双处披露 |
| DES17-4 | AC 解析与去重边界缺 | 中 | STEP2·r17 | verified — r28「VERDICT: 0 issues open」终审确认；修复内容：v18: HL-N-82b..f/86a..e/84b |
| DES18-1 | URI 分支吞掉盘符路径（drive 分支不可达） | 阻断 | STEP2·r18 | verified — r28「VERDICT: 0 issues open」终审确认；修复内容：v19: drive 分支前置+URI scheme≥2 字符 |
| DES18-2 | canonical path 未绑为唯一解析路径 | 高 | STEP2·r18 | verified — r28「VERDICT: 0 issues open」终审确认；修复内容：v19: canonical path 为唯一解析/打开路径，别名不单独解析 |
| DES18-3 | O_NOFOLLOW 能力探测无机械 oracle | 中 | STEP2·r18 | verified — r28「VERDICT: 0 issues open」终审确认；修复内容：v19: 行为探针 oracle+errno 容忍集+无法建 symlink 亦 fail-closed |
| DES18-4 | AC 含不可满足预期+别名/探针例缺 | 中 | STEP2·r18 | verified — r28「VERDICT: 0 issues open」终审确认；修复内容：v19: HL-N-82d1/d2/e/f/g、86f、84c/84d |
| DES19-1 | 探针违反 F1 全局零写入 | 高 | STEP2·r19 | verified — r28「VERDICT: 0 issues open」终审确认；修复内容：v20: 探针移出归档命令——evidence/dry-run 仪器动作、写入限 apriori/tmp、与 F1 写集合分界；归档只读结论 |
| DES19-2 | 探针临时对象生命周期未定义 | 高 | STEP2·r19 | verified — r28「VERDICT: 0 issues open」终审确认；修复内容：v20: O_EXCL+进程唯一前缀+仅删本进程对象+清理失败告警不改判+fd 关闭 |
| DES19-3 | canonical 破坏 UNC 根 | 高 | STEP2·r19 | verified — r28「VERDICT: 0 issues open」终审确认；修复内容：v20: π3 收窄仓根相对——UNC/drive/绝对根消失，canonical 无需根感知 |
| DES19-4 | π3 的 .. 无唯一语义 | 高 | STEP2·r19 | verified — r28「VERDICT: 0 issues open」终审确认；修复内容：v20: π3 的 .. 一律 F1（与 π1/π2 同） |
| DES19-5 | 顶层 path 语法与绝对路径矛盾 | 中 | STEP2·r19 | verified — r28「VERDICT: 0 issues open」终审确认；修复内容：v20: 收窄后顶层 <相对路径> 与各分支一致，矛盾消解 |
| DES19-6 | AC 探针与规范化边界缺 | 中 | STEP2·r19 | verified — r28「VERDICT: 0 issues open」终审确认；修复内容：v20: HL-N-82a..g 重制、84e..i、86g |
| DES20-1 | 探针命令归属自相矛盾 | 阻断 | STEP2·r20 | verified — r28「VERDICT: 0 issues open」终审确认；修复内容：v21: 删除独立探针——逐文件真实路径安全打开，命令归属问题随根消解 |
| DES20-2 | 探测结论无定式字段与绑定 | 高 | STEP2·r20 | verified — r28「VERDICT: 0 issues open」终审确认；修复内容：v21: 无离线结论可伪造/复用——绑定问题随根消解 |
| DES20-3 | 探针文件系统不覆盖实际散列路径 | 高 | STEP2·r20 | verified — r28「VERDICT: 0 issues open」终审确认；修复内容：v21: 在实际散列路径上执行，文件系统覆盖问题随根消解 |
| DES20-4 | π3 仍可 symlink 逃逸 | 高 | STEP2·r20 | verified — r28「VERDICT: 0 issues open」终审确认；修复内容：v21: π3 containment 同 π1/π2——逐组件 symlink+realpath 越根 F1 |
| DES20-5 | π2 复制前 source 载体未定义 | 高 | STEP2·r20 | verified — r28「VERDICT: 0 issues open」终审确认；修复内容：v21: π2 两态记录行（src= 复制前/path= 复制后、并存 F1、preflight 只收复制后态） |
| DES20-6 | AC 闭环缺 | 中 | STEP2·r20 | verified — r28「VERDICT: 0 issues open」终审确认；修复内容：v21: HL-N-84 重制、82h/82i、39b..e |
| DES21-1 | 摘要仍称 f2 全域 fail-closed（漏静默残余） | 高 | STEP2·r21 | verified — r28「VERDICT: 0 issues open」终审确认；修复内容：v22: 摘要补报错型/静默型两分支残余披露 |
| DES21-2 | src= 未入保留 marker，两态不可唯一解析 | 高 | STEP2·r21 | verified — r28「VERDICT: 0 issues open」终审确认；修复内容：v22: src= 入唯一 marker 清单+两态封闭 grammar |
| DES21-3 | π2 目标路径生成函数缺失 | 高 | STEP2·r21 | verified — r28「VERDICT: 0 issues open」终审确认；修复内容：v22: 目标函数固定 evidence/screenshots/<basename> |
| DES21-4 | π2 source 域与摘要"仓外改裁 π2"矛盾 | 高 | STEP2·r21 | verified — r28「VERDICT: 0 issues open」终审确认；修复内容：v22: src 域限 apriori/tmp+仓外须先手工放入并计入 AC1，摘要同步 |
| DES21-5 | π3 containment 与读取间 TOCTOU 未声明 | 高 | STEP2·r21 | verified — r28「VERDICT: 0 issues open」终审确认；修复内容：v22: π3 hash 读取一律经受检 fd，与 f2 同；残余同 o1 级如实 |
| DES21-6 | AC 内含与正文相反的旧断言（75c） | 高 | STEP2·r21 | verified — r28「VERDICT: 0 issues open」终审确认；修复内容：v22: HL-N-75c 删除 |
| DES21-7 | RUNBOOK 未同步新 π 契约+AC 边界缺 | 中 | STEP2·r21 | verified — r28「VERDICT: 0 issues open」终审确认；修复内容：v22: RUNBOOK EN/CN π 契约同步+HL-N-39f..i、82j/82k |
| DES22-1 | π3 的平台限制误归因 f2 | 高 | STEP2·r22 | verified — r28「VERDICT: 0 issues open」终审确认；修复内容：v23: 适用面=f2 或 π3 任一命中；摘要/RUNBOOK/D1.4 同步 |
| DES22-2 | open 报错非完整契约（常量缺失折零） | 高 | STEP2·r22 | verified — r28「VERDICT: 0 issues open」终审确认；修复内容：v23: 常量存在性与非零检查前置，禁位或折零 |
| DES22-3 | π2 复制 TOCTOU | 高 | STEP2·r22 | verified — r28「VERDICT: 0 issues open」终审确认；修复内容：v23: π2 复制经受检 fd，与 π3/f2 同 |
| DES22-4 | HL-N-82j 预期强于正文 | 高 | STEP2·r22 | verified — r28「VERDICT: 0 issues open」终审确认；修复内容：v23: 82j 拆末端拒/祖先残余两例 |
| DES22-5 | 仓外搬运无法按 AC1 计量 | 高 | STEP2·r22 | verified — r28「VERDICT: 0 issues open」终审确认；修复内容：v23: 手工搬运以命令计——仓外源阈值 ≤5 联动入 D3/摘要/HL-K-01 |
| DES22-6 | 可选 hash 无全域 oracle | 中 | STEP2·r22 | verified — r28「VERDICT: 0 issues open」终审确认；修复内容：v23: hash 出现即校验的全域 oracle |
| DES22-7 | RUNBOOK π2 契约未同步完整 | 中 | STEP2·r22 | verified — r28「VERDICT: 0 issues open」终审确认；修复内容：v23: RUNBOOK 补 src 域限制与搬入成本 |
| DES23-1 | 安全打开适用面漏 π2 与任意 hash | 高 | STEP2·r23 | verified — r28「VERDICT: 0 issues open」终审确认；修复内容：v24: 适用面=f2∨π2 复制∨π3∨任一 hash；三处同步 |
| DES23-2 | AC1 联合表漏 a/b/c×π2×仓外源 | 高 | STEP2·r23 | verified — r28「VERDICT: 0 issues open」终审确认；修复内容：v24: 四格命令数联合表+仅调 ≤4 选外源亦非法 |
| DES23-3 | π2 destination 写入可逃逸且非幂等 | 阻断 | STEP2·r23 | verified — r28「VERDICT: 0 issues open」终审确认；修复内容：v24: 目标侧安全写入协议（父目录复核/受检 fd 比较/O_EXCL tmp+rename/残留 tmp F1） |
| DES23-4 | hash oracle 无 target 投影与同 fd 规则 | 高 | STEP2·r23 | verified — r28「VERDICT: 0 issues open」终审确认；修复内容：v24: target(π,state) 投影+π2 同一受检 fd 规则 |
| DES23-5 | AC 错误谱缺 | 中 | STEP2·r23 | verified — r28「VERDICT: 0 issues open」终审确认；修复内容：v24: HL-N-84e1..e3、84i1..i5、84j..84q |
| DES24-1 | 平台规避指引与安全打开适用面矛盾 | 高 | STEP2·r24 | verified — r28「VERDICT: 0 issues open」终审确认；修复内容：v26: 四触发条件口径统一于摘要/RUNBOOK/D1.4——非 π2 事务链项 |
| DES24-2 | AC1 四格表与检查点互斥预期 | 阻断 | STEP2·r24 | verified — r28「VERDICT: 0 issues open」终审确认；修复内容：v26: HL-K-01 与 HL-N-84i5 按四格函数统一；D3 与摘要同步——非 π2 事务链项 |
| DES24-3 | evidence/screenshots/ 创建契约缺失 | 高 | STEP2·r24 | rejected-verified — gate③ 裁定改裁 π1（gate3-ruling.md §三）；reviewer concurrence 2026-08-14 verbatim「Reviewer concurrence：DES24-3..7 → rejected-verified」（review/gate3-concurrence.md + raw） |
| DES24-4 | O_EXCL 只护 temp，最终 rename 可静默覆盖 | 高 | STEP2·r24 | rejected-verified — gate③ 裁定改裁 π1（gate3-ruling.md §三）；reviewer concurrence 2026-08-14 verbatim「Reviewer concurrence：DES24-3..7 → rejected-verified」（review/gate3-concurrence.md + raw） |
| DES24-5 | 目标侧祖先替换可把 temp 写出 bundle | 高 | STEP2·r24 | rejected-verified — gate③ 裁定改裁 π1（gate3-ruling.md §三）；reviewer concurrence 2026-08-14 verbatim「Reviewer concurrence：DES24-3..7 → rejected-verified」（review/gate3-concurrence.md + raw） |
| DES24-6 | temp 命名空间与合法 basename 碰撞 | 高 | STEP2·r24 | rejected-verified — gate③ 裁定改裁 π1（gate3-ruling.md §三）；reviewer concurrence 2026-08-14 verbatim「Reviewer concurrence：DES24-3..7 → rejected-verified」（review/gate3-concurrence.md + raw） |
| DES24-7 | AC 未覆盖目标提交错误谱 + 84q 复合 ID | 中 | STEP2·r24 | rejected-verified — gate③ 裁定改裁 π1（gate3-ruling.md §三）；reviewer concurrence 2026-08-14 verbatim「Reviewer concurrence：DES24-3..7 → rejected-verified」（review/gate3-concurrence.md + raw） |
| DES26-1 | 平台口径残留两处相反结论 | 高 | STEP2·r26 | verified — r28「VERDICT: 0 issues open」终审确认；修复内容：v27: 四触发条件统一，摘要与 RUNBOOK 末句同改 |
| DES26-2 | D3 与摘要保留旧无条件表述 | 阻断 | STEP2·r26 | verified — r28「VERDICT: 0 issues open」终审确认；修复内容：v27: 四格函数三处同一 |
| DES26-3 | 账本拆行覆写了 r24 finding 身份 | 阻断 | STEP2·r26 | verified — r28「VERDICT: 0 issues open」终审确认；修复内容：v27: 按 design-review-v24 原文恢复 ID→finding 映射 |
| DES26-4 | 两分支账本状态机未闭合 | 阻断 | STEP2·r26 | verified — r28「VERDICT: 0 issues open」终审确认；修复内容：v27: π1/π3 分支 rejected-verified 终结；π2 分支 waiver 不解阻塞+successor 行+二次 gate③ |
| DES27-1 | 摘要与 flow-state 沿用覆写前身份口径 | 高 | STEP2·r27 | verified — r28「VERDICT: 0 issues open」终审确认；修复内容：v28: 更正为 DES24-3..7 五项属 π2 链，1/2 已 fixed 属包级 |
| DES27-2 | D3 非法列不完整 | 高 | STEP2·r27 | verified — r28「VERDICT: 0 issues open」终审确认；修复内容：v28: 非法列补三格 |
| DES27-3 | successor 行违反 finding 身份规则；waiver 语义误用 | 阻断 | STEP2·r27 | verified — r28「VERDICT: 0 issues open」终审确认；修复内容：v28: 改为原 ID 重开收敛；π1/π3 分支两步 rejected→rejected-verified；不以 waiver 终结 |
