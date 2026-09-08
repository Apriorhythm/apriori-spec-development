# gate③ ruling — hotfix-lane（owner 授权代裁）

**授权**：owner 于 2026-08-14 就 gate③ packet 回复 verbatim「你决定」——裁定权由 owner 明示委托给生产方 agent 行使。本文即 gate③ 的裁定记录；owner 任意时刻可推翻其中任一条。

**裁定原则**（三条，供 owner 事后复核我的取舍依据）：
1. **fail-up 优先**：不确定处选更严的一侧——机械面误拒可修，误放不可回收。
2. **少一条机制胜过多一条选项**：能不引入的新机械面就不引入（10 分钟预算的真实敌人是形式面数量，不是单步耗时）。
3. **不弱化 state A**：正式流程的 gate 七项、verify 三态、AM-17 分毫不动。

## 一、主决策

| Q | 裁定 | 理由 |
|---|---|---|
| **Q-1 降级机制** | **γ'（human-owned `blast: low` 白名单标注）**，强绑签收 d | β'（delta 一律 R3）会让 hotfix 永远不能写 spec——那等于砍掉 goal A 的「结论 + spec delta」一半，"最小回写单元"名存实亡。治理成本（标注只能人授、改标注走正式 change）接受。 |
| **Q-4 no-test 存废** | **a：hotfix 通道整体无 no-test** | 分级细化后 R1 零 delta 无债务载体、R2 强制测试、R0 无代码——保留 no-test 只会新增一条无机械逼偿的债务通道。goal 原文的「或显式 no-test 理由」在分级下自然收敛。 |
| **Q-8 签收** | **d + d1**（两步式 + 业务摘要令牌） | 候选中唯一保持 gate④ 语义（人看过的内容 = 落盘的内容）；a/b/c 是纪律背书，d2/d3 不绑内容。 |
| **Q-3 测试证明** | **i：归档 preflight 隐式跑 scoped verify** | 机械 oracle；ii 须 owner 明示放弃机械保证才合法，无理由主动放弃。 |
| **Q-5 正式 trivial 半径否决** | **b：仅 behavior 子型机械否决，whitelist R2 交 state A human 判定** | a 会把带标注的展示类修复也赶去 medium，过严；b 不动 state A 的 trivial 三资格。 |
| **Q-11 评审两轴** | **code-review-scope = R2 × docs-P8 = retain** | none 的后果是瞒报型漂移零防线；all-code 让 R1 也付点检成本，与 10 分钟预算冲突。docs 的 check+P8 组合是 state A 契约，不砍。 |
| **Q-2 profile 值集** | **ui / backend / fullstack / docs** | 与 goal 方向一致；backend/docs ≈ 现状如实标注。 |
| **Q-2c 模块类型表** | **不引入（28-a 对称申报 frontend-touched/backend-touched）** | 类型表要维护 module→类型映射并带一整套 malformed 谱；申报案同样能硬拒双端，机制面少一条。 |
| **Q-6a 截图存续期** | **π1（仪器留 apriori/tmp，呈阅时点可查证）**；**截图义务按档：全量档强制、增量档 advisory（owner 2026-08-14 直接裁定，verbatim「D」——推翻我方原口径「增量档也强制记录行」）** | π2 的复制事务链未闭合（D7）；π3 多一套 hash oracle。π1 与 d 组合即可满足"人看过"。 |
| **Q-6b 新鲜度** | **{f1}（工件携代码基线行 + clean tree）** | f2 绑 d1 且把安全打开适用面扩到证据树，平台面代价大；f3 是明示弱化。 |
| **Q-6c clean-tree** | **t1（排除集外全严格）** | t2 只在无评审组合可用，而我裁了 scope=R2 有评审。 |
| **Q-12 ADDED 例外** | **no（ADDED 默认 R3，不启用机械白名单②）** | 论证局限如实——缺陷账无 ADDED 型回归属 absence of evidence，不足以支撑放宽。需要时由人授 `blast: low` 走 γ'。 |
| **Q-7 runbook-version** | **4.0 → 4.1** | 新增流程语义节。 |
| **Q-10 R0 decisions 上限 N** | **N = 3** | 单次 hotfix 追加超过三条业务事实，已是知识批量回流，应走正式 change。 |

## 二、prior art 逐项（命名空间 Q-8/…）

位置 **a**（changes/ 复用 + `hotfix-state.md` 专名互斥）· 载体 **c1'**（bindings 节住状态文件，守住 AC1 两文件上限）· 零 delta 声明 **p1** · 键唯一性 **k1**（duplicate = F1）· fix-ref 校验 **v1**（仅格式+声明）· 仓域 **w2**（外仓合法 + unverifiable 明示）· 单仓域 **λ1** · ID 归属 **t1**（dry-run 分配）· 并发 **o1**（接受残余 TOCTOU，如实声明）· KB freshness **r1 + r2** · supersession **s2**（原子 supersede + 呈阅含旧条目）· 定位头 **必填** · gate 映射 **m1**（gate 对 hotfix bundle 拒绝并指路，全部检查住在 hotfix preflight）——**m1 下 C6 等级 e 案不适用**（无 gate 映射即无 C6 投影），联动项随之消解。

## 三、π2 分支（packet 第六节）

**裁：改裁 π1**（见 Q-6a）。据此 `DES24-3..7`（π2 复制事务链五项）为**未选方案的出域项**，按 design D7 两步流转：生产方记 `rejected` + 理由 → reviewer 复核转 `rejected-verified`。π2 的重新准入协议因此不触发；design D7 与 `design-drafts/` 中的 π2 内容保留为将来若改裁 π2 的起点。

## 四、Q-9：hotfix-channel bundle 去留

**裁：标记为被 hotfix-lane 取代（superseded），bundle 原样保留不删**——其 req-v13 是本 change 的候选空间基线，删除会让 gate③ 的引用悬空。在其 flow-state 记一条 superseded 注记即可。

## 五、由裁定连带确定的事项

- 合法联合选项表（design D3）在本裁定下的实例：γ'×d ✓；π1×d ✓；{f1}×任意签收 ✓；t2 不适用（有评审）；p2×c2/c3 不适用（裁 p1+c1'）；d×π2 命令数联动不适用（裁 π1）。
- 安全打开适用面：本裁定连带**禁用可选 `hash=` 字段**（π1+{f1} 下它不被任何 oracle 消费，却会触发安全打开——写了也白写，只增平台风险；出现即 F1）。四条件由此确定均不命中 → 平台限制不生效，Windows 类平台照常可归档（选 π1+{f1} 的额外收益）。
- AC1 阈值**按形态参数化**（reviewer 指出「两文件」推论不覆盖 UI+delta 组合）：命令数恒 ≤3、脚本墙钟恒 ≤10:00；手工编辑文件数——零 delta 形态 ≤1（仅 hotfix-state.md）；含 delta 形态 ≤2（+ delta 文件）；含 delta 且 ui×frontend:yes 形态 ≤3（+ evidence/screenshots.md）。**scaffold 与 evidence 记录行的骨架由命令预填**，作者只填值——但骨架预填不改变「该文件被人工编辑过」的事实，故按上表计而非声称为零。
  - **修订（2026-08-14，owner 裁定；lab 实证驱动）**：上表漏算了 γ' 点检本身的留痕。γ' 裁定要求 `(R2, whitelist)` 走一轮点检，而「一轮」按既有证据规则（D-GT-3 / gate C5）是 **doc + raw 成对两份**——故含 delta 的 R2 形态实为 **≤4**（hotfix-state + delta + round-n.md + round-n-raw.txt），叠加 ui×frontend:yes 为 **≤5**。这是两条规则相乘的结构性结果，非偶发超支。**裁定：改数字，不动机制**——命令数 ≤3 三形态实测全部达成，多出的两份是评审留痕而非操作负担；压到 ≤3 的两条路（合并 doc+raw 使通道留痕与正式流程分叉／降级 R2-whitelist 点检为可选）代价均高于承认估计有误。原 ≤2/≤3 为设计期估计，lab 实测（`~/terra/p0-hotfix-lane-lab/`）证伪之，以实测值为准。
  - **修订后的 AC1**：命令数 ≤3（恒）· 墙钟 ≤10:00（恒）· 手工文件数——零 delta ≤1 · 含 delta 且无点检 ≤2 · 含 delta 且走点检（即 R2-whitelist）≤4 · 再叠 ui×frontend:yes ≤5。
- 后续实现 change 的 AC-I 基线 = `design-drafts/cli-checkpoints.md` 中与本裁定相关的条目；未选方案（π2/π3、f2/f3、c1/c2/c3、m2/m3、k2、v2、o2/o3、s1/s3、Q-4b/c、Q-12=yes 等）的检查点随之出域，实现 change 不必覆盖。

## 六、下一步

STEP3（tasks.md）**待生成**（本文签发时尚未存在——初稿曾误称已生成，reviewer 指出后更正）；实现（STEP4/5）尚未开始。owner 可在任何时点推翻本裁定或叫停。

## 七、owner 事后直接裁定（推翻本文原口径处）

- **截图义务按档参数化**（2026-08-14，owner verbatim「D」）：全量档（medium/large）保留强制；**增量档（hotfix/trivial）降为 advisory**——frontend:yes 无记录行时打印提示、不阻塞归档，n/a 行不强制；提供即全谱校验（malformed 仍 F1）。理由：截图对沉默错误无证明力（复盘墙四），却是 AC1 预算的主要压力源；且此降级不弱化 state A（截图现行本就是自觉项，advisory 仍强于现状）。

## 八、待 owner 裁的范围问题（本文签发后新出现，非本文已裁事项）

- **正式流程侧的机械化本 change 做不做**（decision-summary §七）：goal B 原文要求 E2E/视觉验证升格为机械退出条件；hotfix 通道这半可机械化，正式流程那半需新增 gate 检查项与前端触及载体，与本 change 自设的「gate 七项分毫不动」冲突。生产方提案 (i) 延期至 successor change（倾向），备选 (ii) 本轮做全并松绑该不变量。**在 owner 裁定前不得记为定案**——评审已指出生产方无权单方缩减最高优先目标的范围。
